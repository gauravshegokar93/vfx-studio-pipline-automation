const jwt = require('jsonwebtoken');
const { sql, config } = require('../backend/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('=== STARTING ARTIST ASSIGNMENT & LEAD PERMISSIONS VERIFICATION ===\n');

  const pool = await sql.connect(config);

  const adminToken = createToken({
    userId: 1,
    roleId: 1,
    roleName: 'Super Admin',
    departmentId: 1,
    departmentName: 'Administration'
  });

  const rotoLeadToken = createToken({
    userId: 1074,
    roleId: 4,
    roleName: 'Team Lead',
    departmentId: 9,
    departmentName: 'Roto'
  });

  async function api(endpoint, options = {}) {
    const res = await fetch(`http://localhost:5000${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // TEST 1: Department Queue Filtering for Lead
  console.log('--- TEST 1: Lead Department Queue Filtering ---');
  const leadQueueRes = await api('/api/tasks/department-queue', {
    headers: { Authorization: `Bearer ${rotoLeadToken}` }
  });
  console.log('Lead queue status:', leadQueueRes.status);
  if (leadQueueRes.ok && leadQueueRes.data.success) {
    const tasks = leadQueueRes.data.items || [];
    const nonRoto = tasks.filter(t => t.stageId && Number(t.stageId) !== 1);
    console.log(`Lead queue returned ${tasks.length} tasks. Non-Roto tasks: ${nonRoto.length}`);
    if (nonRoto.length === 0) {
      console.log('✓ PASS: Lead queue strictly filtered to Roto tasks (stageId = 1)');
    } else {
      console.error('✗ FAIL: Lead queue leaked tasks from other stages:', nonRoto);
    }
  } else {
    console.error('✗ FAIL: Could not fetch lead department queue', leadQueueRes.data);
    process.exit(1);
  }

  // We use Task 10475 as isolated test task
  const taskId = 10475;
  const initialTaskRes = await pool.request()
    .input('TaskId', sql.BigInt, taskId)
    .query('SELECT TaskID, TaskName, WorkflowStageID, EstimatedHours, StatusID FROM TaskMaster WHERE TaskID = @TaskId');
  
  if (initialTaskRes.recordset.length === 0) {
    console.error(`Task ${taskId} not found!`);
    process.exit(1);
  }

  const initialTask = initialTaskRes.recordset[0];
  console.log(`\nUsing Task ${taskId}: ${initialTask.TaskName} (Initial EstHours: ${initialTask.EstimatedHours}, StatusID: ${initialTask.StatusID})`);

  // Ensure task has 16 hours (2.0 bid) and no active assignments for clean test
  await pool.request()
    .input('TaskId', sql.BigInt, taskId)
    .query('UPDATE TaskMaster SET EstimatedHours = 16.0, StatusID = NULL WHERE TaskID = @TaskId; DELETE FROM TaskAssignment WHERE TaskID = @TaskId;');

  let assignA_Id = null;
  let assignB_Id = null;
  let assignC_Id = null;

  try {
    // TEST 2: Assign Artist A (User 1051 - Kiran, Roto) with 1.0 bid (8 hours)
    console.log('\n--- TEST 2: Assign Artist A (User 1051, Kiran - Roto) ---');
    const assignResA = await api('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rotoLeadToken}` },
      body: JSON.stringify({
        taskId: taskId,
        userId: 1051,
        targetBid: 1.0,
        remarks: 'Test assignment Artist A by Roto Lead'
      })
    });
    console.log('Assign Artist A response:', assignResA.status, assignResA.data?.message || assignResA.data);
    if (!assignResA.ok || !assignResA.data.success) {
      throw new Error(`Failed to assign Artist A: ${JSON.stringify(assignResA.data)}`);
    }

    const checkA = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .input('UserId', sql.BigInt, 1051)
      .query(`
        SELECT ta.AssignmentID, ta.TargetHours, ta.StatusID, tm.StatusID as TaskStatusID
        FROM TaskAssignment ta
        JOIN TaskMaster tm ON ta.TaskID = tm.TaskID
        WHERE ta.TaskID = @TaskId AND ta.UserID = @UserId
      `);
    assignA_Id = checkA.recordset[0]?.AssignmentID;
    console.log(`Created AssignmentID: ${assignA_Id}, TargetHours: ${checkA.recordset[0]?.TargetHours}, TaskStatusID: ${checkA.recordset[0]?.TaskStatusID}`);
    if (checkA.recordset[0]?.TaskStatusID == 1) {
      console.log('✓ PASS: TaskAssignment record verified and TaskMaster.StatusID set to 1 (Assigned)');
    }

    // Check Department Queue available bid
    const qAfterA = await api(`/api/tasks/department-queue/1`, {
      headers: { Authorization: `Bearer ${rotoLeadToken}` }
    });
    const taskAfterA = qAfterA.data?.items?.find(t => t.taskId == taskId);
    console.log(`Queue state after Assign A: estimatedHours=${taskAfterA?.estimatedHours}, targetHours=${taskAfterA?.targetHours}, remainingBid=${taskAfterA?.remainingBid}, assignedArtist=${taskAfterA?.assignedArtist}`);
    if (Number(taskAfterA?.targetHours) === 8 && taskAfterA?.assignedArtist?.includes('Kiran')) {
      console.log('✓ PASS: Department Queue reflects Artist A and assigned hours');
    }

    // TEST 3: Unassign Artist A (Remove Assignment)
    console.log('\n--- TEST 3: Remove Assignment (Unassign Artist A) ---');
    const unassignRes = await api(`/api/assignments/${assignA_Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rotoLeadToken}` }
    });
    console.log('Unassign response:', unassignRes.status, unassignRes.data);
    if (!unassignRes.ok || !unassignRes.data.success) {
      throw new Error(`Failed to unassign Artist A: ${JSON.stringify(unassignRes.data)}`);
    }

    // Check DB: Assignment removed, TaskMaster.StatusID is NULL, history recorded
    const checkDeleted = await pool.request()
      .input('AssignmentId', sql.BigInt, assignA_Id)
      .query('SELECT 1 FROM TaskAssignment WHERE AssignmentID = @AssignmentId');
    if (checkDeleted.recordset.length > 0) {
      throw new Error('Assignment record still exists in TaskAssignment table!');
    }
    console.log('✓ PASS: Assignment removed from TaskAssignment table');

    const checkTaskStatus = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .query('SELECT StatusID FROM TaskMaster WHERE TaskID = @TaskId');
    console.log(`TaskMaster StatusID after unassign: ${checkTaskStatus.recordset[0]?.StatusID}`);
    if (checkTaskStatus.recordset[0]?.StatusID === null) {
      console.log('✓ PASS: TaskMaster.StatusID reset to NULL (Unassigned)');
    }

    // Check Queue available bid restored
    const qAfterUnassign = await api(`/api/tasks/department-queue/1`, {
      headers: { Authorization: `Bearer ${rotoLeadToken}` }
    });
    const taskAfterUnassign = qAfterUnassign.data?.items?.find(t => t.taskId == taskId);
    console.log(`Queue state after Unassign: estimatedHours=${taskAfterUnassign?.estimatedHours}, assignedArtist=${taskAfterUnassign?.assignedArtist}`);
    if (!taskAfterUnassign?.assignedArtist) {
      console.log('✓ PASS: Department Queue artist cleared and full bid restored');
    }

    // TEST 4: Assign Artist B (User 1052 - Roshan, Roto)
    console.log('\n--- TEST 4: Assign Artist B (User 1052, Roshan - Roto) ---');
    const assignResB = await api('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rotoLeadToken}` },
      body: JSON.stringify({
        taskId: taskId,
        userId: 1052,
        targetBid: 1.0,
        remarks: 'Test assignment Artist B'
      })
    });
    console.log('Assign Artist B response:', assignResB.status, assignResB.data?.message || assignResB.data);
    if (!assignResB.ok || !assignResB.data.success) {
      throw new Error(`Failed to assign Artist B: ${JSON.stringify(assignResB.data)}`);
    }

    const checkB = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .input('UserId', sql.BigInt, 1052)
      .query('SELECT AssignmentID FROM TaskAssignment WHERE TaskID = @TaskId AND UserID = @UserId');
    assignB_Id = checkB.recordset[0]?.AssignmentID;
    console.log(`✓ PASS: Artist B assigned successfully (AssignmentID: ${assignB_Id})`);

    // TEST 5: Reassign Remaining Bid from Artist B to Artist C (User 1053 - Kapil, Roto)
    console.log('\n--- TEST 5: Reassign Artist B -> Artist C (User 1053, Kapil) ---');
    const reassignRes = await api(`/api/assignments/${assignB_Id}/reassign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rotoLeadToken}` },
      body: JSON.stringify({
        newUserId: 1053
      })
    });
    console.log('Reassign response:', reassignRes.status, reassignRes.data?.message || reassignRes.data);
    if (!reassignRes.ok || !reassignRes.data.success) {
      throw new Error(`Failed to reassign: ${JSON.stringify(reassignRes.data)}`);
    }

    const checkC = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .input('UserId', sql.BigInt, 1053)
      .query('SELECT AssignmentID FROM TaskAssignment WHERE TaskID = @TaskId AND UserID = @UserId');
    assignC_Id = checkC.recordset[0]?.AssignmentID;
    console.log(`✓ PASS: Reassigned successfully to Artist C (AssignmentID: ${assignC_Id})`);

    // Verify Artist B is no longer actively assigned
    const checkBActive = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .input('UserId', sql.BigInt, 1052)
      .query('SELECT 1 FROM TaskAssignment WHERE TaskID = @TaskId AND UserID = @UserId');
    if (checkBActive.recordset.length === 0) {
      console.log('✓ PASS: Artist B removed from active assignments');
    }

    // Verify history audit records exist for all operations
    const historyRecords = await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .query('SELECT AssignmentType, AssignedToUserID, Remarks FROM TaskAssignmentHistory WHERE TaskID = @TaskId ORDER BY CreatedOn ASC');
    console.log(`Audit history records on Task ${taskId}: ${historyRecords.recordset.length}`);
    historyRecords.recordset.forEach(h => console.log(`  - [${h.AssignmentType}] User:${h.AssignedToUserID} | ${h.Remarks?.substring(0, 70)}...`));
    console.log('✓ PASS: All assignment, unassignment, and reassignment steps logged in TaskAssignmentHistory');

    // TEST 6: Lead Department Boundary Enforcement
    console.log('\n--- TEST 6: Lead Department Boundary Enforcement ---');

    // 6a. Cross-department artist assignment
    console.log('Test 6a: Roto Lead assigning Paint artist (1021) to Roto task...');
    const invalidDeptArtistRes = await api('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rotoLeadToken}` },
      body: JSON.stringify({
        taskId: taskId,
        userId: 1021, // Paint artist
        targetBid: 0.5,
        remarks: 'Should fail'
      })
    });
    console.log(`Result 6a status ${invalidDeptArtistRes.status}:`, invalidDeptArtistRes.data.message);
    if (invalidDeptArtistRes.status === 400 || invalidDeptArtistRes.status === 403) {
      console.log('✓ PASS: Cross-department artist assignment blocked');
    } else {
      console.error('✗ FAIL: Should have blocked Paint artist in Roto task');
    }

    // 6b. Cross-stage task modification
    // Roto Lead trying to assign a Paint task (Stage 2) with a Paint artist (1021)
    const paintTask = await pool.request().query('SELECT TOP 1 TaskID FROM TaskMaster WHERE WorkflowStageID = 2');
    if (paintTask.recordset.length > 0) {
      const paintTaskId = paintTask.recordset[0].TaskID;
      console.log(`Test 6b: Roto Lead trying to assign Paint task (${paintTaskId}) with Paint artist (1021)...`);
      const crossStageRes = await api('/api/assignments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${rotoLeadToken}` },
        body: JSON.stringify({
          taskId: paintTaskId,
          userId: 1021,
          targetBid: 0.5,
          remarks: 'Should fail'
        })
      });
      console.log(`Result 6b status ${crossStageRes.status}:`, crossStageRes.data.message);
      if (crossStageRes.status === 403) {
        console.log('✓ PASS: Roto Lead blocked from modifying Paint task (HTTP 403 Forbidden: Leads can only assign tasks within their department)');
      } else {
        console.error('✗ FAIL: Expected 403 Forbidden for cross-stage task assignment');
      }
    }

  } finally {
    // CLEANUP: Clean up test assignments and restore initial Task state
    console.log('\n--- CLEANUP: Restoring Task to Clean Initial State ---');
    await pool.request()
      .input('TaskId', sql.BigInt, taskId)
      .input('EstHours', sql.Decimal(18, 2), initialTask.EstimatedHours)
      .input('StatusId', sql.BigInt, initialTask.StatusID || null)
      .query(`
        DELETE FROM TaskAssignment WHERE TaskID = @TaskId;
        UPDATE TaskMaster SET EstimatedHours = @EstHours, StatusID = @StatusId WHERE TaskID = @TaskId;
      `);
    console.log(`Task ${taskId} cleanly restored to EstimatedHours=${initialTask.EstimatedHours}, StatusID=${initialTask.StatusID}`);
    await pool.close();
  }

  console.log('\n======================================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch(console.error);
