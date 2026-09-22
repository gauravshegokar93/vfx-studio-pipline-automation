const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');
const { logTaskHistory, createNotification } = require('../utils/historyHelper');

// secured: roles that can WRITE assignments
function secured(handler) {
  return authMiddleware(['Super Admin', 'Production Head', 'Project Manager', 'Team Lead'], handler);
}

// securedReadOnly: roles that can READ assignment data
function securedReadOnly(handler) {
  return authMiddleware(['Super Admin', 'Production Head', 'Project Manager', 'Team Lead', 'Artist', 'QC Artist'], handler);
}

// Helper: Department compatibility check using REAL DepartmentMaster names
// WorkflowStageMaster: Roto(1), Paint(2), Comp(3), CG(4)
// DepartmentMaster (Active Production): Roto, Paint, Comp, CG
function validateDepartmentCompatibility(stageName, deptName) {
  const sName = (stageName || '').trim().toLowerCase();
  const dName = (deptName || '').trim().toLowerCase();

  // Roto tasks → Roto dept
  if (sName === 'roto') {
    if (dName === 'roto') return { valid: true };
    return { valid: false, message: `Cannot assign Roto task to artist in '${deptName}' department. Expected Roto department.` };
  }

  // Paint tasks → Paint dept
  if (sName === 'paint') {
    if (dName === 'paint') return { valid: true };
    return { valid: false, message: `Cannot assign Paint task to artist in '${deptName}' department. Expected Paint department.` };
  }

  // Comp tasks → Comp dept
  if (sName === 'comp' || sName === 'compositing') {
    if (dName === 'comp') return { valid: true };
    return { valid: false, message: `Cannot assign Comp task to artist in '${deptName}' department. Expected Comp department.` };
  }

  // CG tasks → CG dept
  if (sName === 'cg') {
    if (dName === 'cg') return { valid: true };
    return { valid: false, message: `Cannot assign CG task to artist in '${deptName}' department. Expected CG department.` };
  }

  // Unknown stage — allow with a warning (don't block unknown stages)
  return { valid: true };
}

// 1. POST /api/assignments - Assign task to artist
async function assignTask(req, res) {
  const { taskId, userId, targetBid, targetHours, remarks } = req.body || {};

  const parsedTaskId = parseInt(taskId, 10);
  const parsedUserId = parseInt(userId, 10);
  const parsedTargetHours = targetBid !== undefined && targetBid !== null && !isNaN(parseFloat(targetBid))
    ? parseFloat(targetBid) * 8
    : (parseFloat(targetHours) || 0);
  const parsedTargetBid = parsedTargetHours / 8;

  if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
    return res.status(400).json({ success: false, message: 'taskId must be a valid positive number' });
  }

  if (isNaN(parsedUserId) || parsedUserId <= 0) {
    return res.status(400).json({ success: false, message: 'userId must be a valid positive number' });
  }

  const assignedBy = req.user?.userId;
  if (!assignedBy) {
    return res.status(401).json({ success: false, message: 'Unauthenticated user' });
  }

  let pool;
  let transaction;

  try {
    pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // A & B: Verify TaskMaster exists and is active
    const taskReq = new sql.Request(transaction);
    taskReq.input('TaskId', sql.BigInt, parsedTaskId);
    const taskResult = await taskReq.query(`
      SELECT
        t.TaskID, t.TaskCode, t.WorkflowStageID, wsm.StageName,
        t.EstimatedHours, t.DueDate, t.PriorityID, t.StatusID, t.IsActive, t.IsDeleted
      FROM TaskMaster t
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      WHERE t.TaskID = @TaskId
    `);

    if (taskResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: `Task not found with ID ${parsedTaskId}` });
    }

    const task = taskResult.recordset[0];
    if (task.IsActive === false || task.IsDeleted === true) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot assign an inactive or deleted task' });
    }

    // C & D: Verify UserMaster (Artist) exists and is active
    const userReq = new sql.Request(transaction);
    userReq.input('UserId', sql.BigInt, parsedUserId);
    const userResult = await userReq.query(`
      SELECT
        u.UserId, u.FullName, u.RoleId, r.RoleName,
        u.HomeDepartmentId, d.DepartmentName, u.IsActive,
        u.HomeTeamId, tm.TeamName, tm.DepartmentId as TeamDepartmentId, tm.IsActive as TeamIsActive
      FROM UserMaster u
      LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
      LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
      LEFT JOIN TeamMaster tm ON u.HomeTeamId = tm.TeamId
      WHERE u.UserId = @UserId
    `);

    if (userResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: `User not found with ID ${parsedUserId}` });
    }

    const artist = userResult.recordset[0];
    if (artist.IsActive === false) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot assign task to an inactive artist' });
    }

    // E: Verify Artist Role — must be 'Artist' or 'QC Artist' to receive task assignments
    if (artist.RoleName !== 'Artist' && artist.RoleName !== 'QC Artist') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `User ${artist.FullName} does not have the Artist role (Role: ${artist.RoleName})` });
    }

    // F: Verify Department Compatibility
    const deptCheck = validateDepartmentCompatibility(task.StageName, artist.DepartmentName);
    if (!deptCheck.valid) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: deptCheck.message });
    }

    // F2: Verify Allocation to Prevent Over-Allocation
    const allocReq = new sql.Request(transaction);
    allocReq.input('TaskId', sql.BigInt, parsedTaskId);
    const allocResult = await allocReq.query(`
      SELECT ISNULL(SUM(TargetHours), 0) AS totalTargetHours
      FROM TaskAssignment
      WHERE TaskID = @TaskId
    `);
    const existingTargetHours = allocResult.recordset[0].totalTargetHours;

    // Check if new assignment exceeds the estimated task hours
    if ((existingTargetHours + parsedTargetHours) > (task.EstimatedHours || 0)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Requested allocation exceeds the remaining task bid' });
    }

    // G: Verify Team Validation
    if (artist.HomeTeamId) {
      if (artist.TeamIsActive === false) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Artist team is not active.' });
      }
      if (String(artist.TeamDepartmentId) !== String(artist.HomeDepartmentId)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Selected artist's team does not belong to their department." });
      }
    }

    // 7. Duplicate Assignment Protection
    const checkAssignReq = new sql.Request(transaction);
    checkAssignReq.input('TaskId', sql.BigInt, parsedTaskId);
    checkAssignReq.input('UserId', sql.BigInt, parsedUserId);
    const existingAssign = await checkAssignReq.query(`
      SELECT AssignmentID, UserID FROM TaskAssignment WHERE TaskID = @TaskId AND UserID = @UserId
    `);

    if (existingAssign.recordset.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Task ${parsedTaskId} is already assigned to User ${parsedUserId}`
      });
    }

    // 8. Resolve Assigned StatusId
    const statusReq = new sql.Request(transaction);
    const statusResult = await statusReq.query(`
      SELECT TOP 1 StatusId FROM StatusMaster WHERE StatusName = 'Assigned'
    `);
    const assignedStatusId = statusResult.recordset[0]?.StatusId || 1;

    // 8. Insert into TaskAssignment
    const insertAssignReq = new sql.Request(transaction);
    insertAssignReq.input('TaskId', sql.BigInt, parsedTaskId);
    insertAssignReq.input('UserId', sql.BigInt, parsedUserId);
    insertAssignReq.input('AssignedBy', sql.BigInt, assignedBy);
    insertAssignReq.input('TargetHours', sql.Decimal(18, 2), parsedTargetHours);
    insertAssignReq.input('StatusID', sql.BigInt, assignedStatusId);
    insertAssignReq.input('Remarks', sql.VarChar(500), remarks || null);

    await insertAssignReq.query(`
      INSERT INTO TaskAssignment (TaskID, UserID, AssignedBy, AssignedDate, TargetHours, StatusID, Remarks)
      VALUES (@TaskId, @UserId, @AssignedBy, SYSDATETIME(), @TargetHours, @StatusID, @Remarks)
    `);

    // 9. Insert into TaskAssignmentHistory
    const insertHistReq = new sql.Request(transaction);
    insertHistReq.input('TaskId', sql.BigInt, parsedTaskId);
    insertHistReq.input('AssignedToUserID', sql.BigInt, parsedUserId);
    insertHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
    insertHistReq.input('AssignmentType', sql.NVarChar(50), 'Assign');
    insertHistReq.input('DueDate', sql.DateTime, task.DueDate || null);
    insertHistReq.input('EstimatedHours', sql.Decimal(18, 2), task.EstimatedHours || null);
    insertHistReq.input('PriorityID', sql.BigInt, task.PriorityID || null);
    insertHistReq.input('StatusID', sql.BigInt, assignedStatusId);
    insertHistReq.input('Remarks', sql.NVarChar(1000), remarks || null);

    await insertHistReq.query(`
      INSERT INTO TaskAssignmentHistory (
        TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
        AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
      )
      VALUES (
        @TaskId, @AssignedToUserID, @AssignedByUserID, @AssignmentType,
        GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
      )
    `);

    // 10. Update TaskMaster Status
    const updateTaskReq = new sql.Request(transaction);
    updateTaskReq.input('TaskId', sql.BigInt, parsedTaskId);
    updateTaskReq.input('StatusID', sql.BigInt, assignedStatusId);
    updateTaskReq.input('ModifiedBy', sql.BigInt, assignedBy);

    await updateTaskReq.query(`
      UPDATE TaskMaster
      SET StatusID = @StatusID,
          ModifiedBy = @ModifiedBy,
          ModifiedDate = SYSDATETIME()
      WHERE TaskID = @TaskId
    `);

    // 11. Log History & Notify
    await logTaskHistory(transaction, parsedTaskId, task.StatusID, assignedStatusId, assignedBy, 'Assigned to artist');
    await createNotification(transaction, parsedUserId, 'NEW_ASSIGNMENT', 'New Assignment', `You have been assigned to task ${task.TaskCode || parsedTaskId}.`, parsedTaskId);

    await transaction.commit();

    return res.json({
      success: true,
      message: 'Task assigned successfully',
      assignment: {
        taskId: parsedTaskId,
        userId: parsedUserId,
        assignedBy: assignedBy,
        targetBid: parsedTargetBid,
        targetHours: parsedTargetHours,
        status: 'Assigned'
      }
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('[assignTask] Rollback error:', rollbackErr);
      }
    }
    console.error('[assignTask] Transaction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign task', error: err.message });
  }
}

// 1B. PUT /api/assignments/:taskId/target - Adjust Target Bid without changing assignment
async function adjustTarget(req, res) {
  const { taskId } = req.params;
  const { userId, targetBid, targetHours, remarks } = req.body || {};

  const parsedTaskId = parseInt(taskId, 10);
  const parsedUserId = parseInt(userId, 10);
  const parsedTargetHours = targetBid !== undefined && targetBid !== null && !isNaN(parseFloat(targetBid))
    ? parseFloat(targetBid) * 8
    : (parseFloat(targetHours) || 0);
  const parsedTargetBid = parsedTargetHours / 8;

  if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
    return res.status(400).json({ success: false, message: 'taskId must be a valid positive number' });
  }

  if (isNaN(parsedUserId) || parsedUserId <= 0) {
    return res.status(400).json({ success: false, message: 'userId is required and must be a valid positive number' });
  }

  if (parsedTargetHours < 0) {
    return res.status(400).json({ success: false, message: 'Target hours cannot be negative' });
  }

  const assignedBy = req.user?.userId;
  if (!assignedBy) {
    return res.status(401).json({ success: false, message: 'Unauthenticated user' });
  }

  let pool;
  let transaction;

  try {
    pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Verify TaskMaster exists and is active
    const taskReq = new sql.Request(transaction);
    taskReq.input('TaskId', sql.BigInt, parsedTaskId);
    const taskResult = await taskReq.query(`
      SELECT t.TaskID, t.TaskCode, t.EstimatedHours, t.DueDate, t.PriorityID, t.StatusID, t.IsActive, t.IsDeleted
      FROM TaskMaster t
      WHERE t.TaskID = @TaskId
    `);

    if (taskResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: `Task not found with ID ${parsedTaskId}` });
    }

    const task = taskResult.recordset[0];
    if (task.IsActive === false || task.IsDeleted === true) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot adjust target for an inactive or deleted task' });
    }

    // Verify there is an active assignment for this specific user
    const assignReq = new sql.Request(transaction);
    assignReq.input('TaskId', sql.BigInt, parsedTaskId);
    assignReq.input('UserId', sql.BigInt, parsedUserId);
    const assignResult = await assignReq.query(`
      SELECT AssignmentID, UserID, TargetHours
      FROM TaskAssignment
      WHERE TaskID = @TaskId AND UserID = @UserId
    `);

    if (assignResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot adjust target: Task is not currently assigned to this artist' });
    }

    const currentAssignment = assignResult.recordset[0];

    // Check over-allocation
    const allocReq = new sql.Request(transaction);
    allocReq.input('TaskId', sql.BigInt, parsedTaskId);
    allocReq.input('UserId', sql.BigInt, parsedUserId);
    const allocResult = await allocReq.query(`
      SELECT ISNULL(SUM(TargetHours), 0) AS otherTargetHours
      FROM TaskAssignment
      WHERE TaskID = @TaskId AND UserID != @UserId
    `);
    const otherTargetHours = allocResult.recordset[0].otherTargetHours;

    if ((otherTargetHours + parsedTargetHours) > (task.EstimatedHours || 0)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Requested allocation exceeds the remaining task bid' });
    }

    // Update TaskAssignment
    const updateAssignReq = new sql.Request(transaction);
    updateAssignReq.input('AssignmentID', sql.BigInt, currentAssignment.AssignmentID);
    updateAssignReq.input('TargetHours', sql.Decimal(18, 2), parsedTargetHours);
    updateAssignReq.input('Remarks', sql.VarChar(500), remarks || null);

    await updateAssignReq.query(`
      UPDATE TaskAssignment
      SET TargetHours = @TargetHours,
          Remarks = ISNULL(@Remarks, Remarks)
      WHERE AssignmentID = @AssignmentID
    `);

    // Insert into TaskAssignmentHistory as 'Adjust Target'
    const insertHistReq = new sql.Request(transaction);
    insertHistReq.input('TaskId', sql.BigInt, parsedTaskId);
    insertHistReq.input('AssignedToUserID', sql.BigInt, currentAssignment.UserID);
    insertHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
    insertHistReq.input('AssignmentType', sql.NVarChar(50), 'Adjust Target');
    insertHistReq.input('DueDate', sql.DateTime, task.DueDate || null);
    insertHistReq.input('EstimatedHours', sql.Decimal(18, 2), task.EstimatedHours || null);
    insertHistReq.input('PriorityID', sql.BigInt, task.PriorityID || null);
    insertHistReq.input('StatusID', sql.BigInt, task.StatusID);
    insertHistReq.input('Remarks', sql.NVarChar(1000), remarks || `Target adjusted to ${parsedTargetBid} Bid`);

    await insertHistReq.query(`
      INSERT INTO TaskAssignmentHistory (
        TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
        AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
      )
      VALUES (
        @TaskId, @AssignedToUserID, @AssignedByUserID, @AssignmentType,
        GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
      )
    `);

    // Log History
    await logTaskHistory(transaction, parsedTaskId, task.StatusID, task.StatusID, assignedBy, `Target allocation adjusted to ${parsedTargetBid} Bid (${parsedTargetHours}h)`);

    await transaction.commit();

    return res.json({
      success: true,
      message: 'Target adjusted successfully',
      adjustment: {
        taskId: parsedTaskId,
        userId: currentAssignment.UserID,
        targetBid: parsedTargetBid,
        targetHours: parsedTargetHours
      }
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('[adjustTarget] Rollback error:', rollbackErr);
      }
    }
    console.error('[adjustTarget] Transaction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to adjust target', error: err.message });
  }
}

// 2. GET /api/assignments/history/:taskId - Fetch assignment history log
async function getAssignmentHistory(req, res) {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId, 10);

    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ success: false, message: 'Invalid taskId. Must be a bigint number.' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('TaskId', sql.BigInt, parsedTaskId);

    const query = `
      SELECT
        tah.AssignmentID AS assignmentId,
        tah.TaskID AS taskId,
        tah.AssignedToUserID AS assignedToUserId,
        artist.FullName AS assignedArtistName,
        tah.AssignedByUserID AS assignedByUserId,
        ISNULL(assigner.FullName, 'System') AS assignedByName,
        tah.AssignmentType AS assignmentType,
        tah.AssignedDate AS assignedDate,
        tah.DueDate AS dueDate,
        tah.EstimatedHours AS estimatedHours,
        pm.PriorityName AS priority,
        st.StatusName AS status,
        tah.Remarks AS remarks
      FROM TaskAssignmentHistory tah
      INNER JOIN UserMaster artist ON tah.AssignedToUserID = artist.UserId
      LEFT JOIN UserMaster assigner ON tah.AssignedByUserID = assigner.UserId
      LEFT JOIN StatusMaster st ON tah.StatusID = st.StatusId
      LEFT JOIN PriorityMaster pm ON tah.PriorityID = pm.PriorityId
      WHERE tah.TaskID = @TaskId
      ORDER BY tah.AssignedDate DESC;
    `;

    const result = await request.query(query);
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getAssignmentHistory] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignment history', error: err.message });
  }
}

// 3. GET /api/assignments/workload/:artistId - Fetch allocated workload for artist
async function getArtistWorkload(req, res) {
  try {
    const { artistId } = req.params;
    const parsedArtistId = parseInt(artistId, 10);

    if (isNaN(parsedArtistId)) {
      return res.status(400).json({ success: false, message: 'Invalid artistId. Must be a bigint number.' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('ArtistId', sql.BigInt, parsedArtistId);

    const artistCheck = await request.query(`
      SELECT UserId, FullName FROM UserMaster WHERE UserId = @ArtistId
    `);

    if (artistCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: `Artist not found with ID ${parsedArtistId}` });
    }

    const artistName = artistCheck.recordset[0].FullName;

    const workloadReq = pool.request();
    workloadReq.input('ArtistId', sql.BigInt, parsedArtistId);
    const workloadResult = await workloadReq.query(`
      SELECT
        ISNULL(SUM(ta.TargetHours), 0) AS allocatedHours,
        COUNT(ta.AssignmentID) AS assignedTaskCount
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID
      WHERE ta.UserID = @ArtistId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    `);

    const stats = workloadResult.recordset[0] || { allocatedHours: 0, assignedTaskCount: 0 };

    return res.json({
      success: true,
      artistId: parsedArtistId,
      artistName: artistName,
      allocatedHours: Number(stats.allocatedHours),
      assignedTaskCount: Number(stats.assignedTaskCount)
    });
  } catch (err) {
    console.error('[getArtistWorkload] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch artist workload', error: err.message });
  }
}

// 4. GET /api/assignments/eligible-artists - Fetch eligible artists for a task
async function getEligibleArtists(req, res) {
  try {
    const { taskId } = req.query;
    const parsedTaskId = parseInt(taskId, 10);

    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid taskId.' });
    }

    const pool = await sql.connect(config);
    const taskResult = await pool.request()
      .input('TaskId', sql.BigInt, parsedTaskId)
      .query(`
        SELECT t.TaskID, wsm.StageName
        FROM TaskMaster t
        LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
        WHERE t.TaskID = @TaskId
      `);

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const task = taskResult.recordset[0];

    const usersResult = await pool.request().query(`
      SELECT
        u.UserId, u.FullName, r.RoleName,
        d.DepartmentName, d.DepartmentId,
        tm.TeamName, tm.DepartmentId as TeamDepartmentId, tm.IsActive as TeamIsActive,
        rm.FullName as ReportingManagerName
      FROM UserMaster u
      LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
      LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
      LEFT JOIN TeamMaster tm ON u.HomeTeamId = tm.TeamId
      LEFT JOIN UserMaster rm ON u.ReportingManagerId = rm.UserId
      WHERE u.IsActive = 1 AND r.RoleName IN ('Artist', 'QC Artist')
    `);

    const eligibleArtists = [];
    for (const artist of usersResult.recordset) {
      const deptCheck = validateDepartmentCompatibility(task.StageName, artist.DepartmentName);
      if (!deptCheck.valid) continue;

      if (artist.TeamName) {
        if (artist.TeamIsActive === false) continue;
        if (String(artist.TeamDepartmentId) !== String(artist.DepartmentId)) continue;
      }

      eligibleArtists.push({
        UserId: artist.UserId,
        FullName: artist.FullName,
        RoleName: artist.RoleName,
        DepartmentName: artist.DepartmentName,
        TeamName: artist.TeamName,
        ReportingManagerName: artist.ReportingManagerName,
        compatible: true
      });
    }

    return res.json({ success: true, items: eligibleArtists });
  } catch (err) {
    console.error('[getEligibleArtists] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch eligible artists' });
  }
}

// 5. DELETE /api/assignments/:assignmentId - Unassign artist from task
async function unassignTask(req, res) {
  const { assignmentId } = req.params;
  const parsedAssignmentId = parseInt(assignmentId, 10);

  if (isNaN(parsedAssignmentId) || parsedAssignmentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
  }

  const assignedBy = req.user?.userId;
  if (!assignedBy) {
    return res.status(401).json({ success: false, message: 'Unauthenticated user' });
  }

  let pool;
  let transaction;

  try {
    pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Check if assignment exists
    const checkReq = new sql.Request(transaction);
    checkReq.input('AssignmentID', sql.BigInt, parsedAssignmentId);
    const assignResult = await checkReq.query(`
      SELECT AssignmentID, TaskID, UserID, TargetHours, StatusID
      FROM TaskAssignment
      WHERE AssignmentID = @AssignmentID
    `);

    if (assignResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const assignment = assignResult.recordset[0];

    // 2. Check for production history (TimeLog)
    const historyReq = new sql.Request(transaction);
    historyReq.input('TaskID', sql.BigInt, assignment.TaskID);
    historyReq.input('UserID', sql.BigInt, assignment.UserID);
    const historyResult = await historyReq.query(`
      SELECT TOP 1 TimeLogID FROM TimeLog WHERE TaskID = @TaskID AND UserID = @UserID
    `);

    if (historyResult.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Safe historical unassignment is not supported without schema changes. The artist has production history on this task.',
        limitation: true
      });
    }

    // 3. Get Task info for history logging
    const taskReq = new sql.Request(transaction);
    taskReq.input('TaskID', sql.BigInt, assignment.TaskID);
    const taskResult = await taskReq.query(`
      SELECT TaskID, DueDate, EstimatedHours, PriorityID, StatusID
      FROM TaskMaster WHERE TaskID = @TaskID
    `);

    const task = taskResult.recordset[0] || {};

    // 4. Log unassignment to TaskAssignmentHistory
    const insertHistReq = new sql.Request(transaction);
    insertHistReq.input('TaskId', sql.BigInt, assignment.TaskID);
    insertHistReq.input('AssignedToUserID', sql.BigInt, assignment.UserID);
    insertHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
    insertHistReq.input('AssignmentType', sql.NVarChar(50), 'Unassigned');
    insertHistReq.input('DueDate', sql.DateTime, task.DueDate || null);
    insertHistReq.input('EstimatedHours', sql.Decimal(18, 2), task.EstimatedHours || null);
    insertHistReq.input('PriorityID', sql.BigInt, task.PriorityID || null);
    insertHistReq.input('StatusID', sql.BigInt, assignment.StatusID);
    insertHistReq.input('Remarks', sql.NVarChar(1000), 'Artist unassigned');

    await insertHistReq.query(`
      INSERT INTO TaskAssignmentHistory (
        TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
        AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
      )
      VALUES (
        @TaskId, @AssignedToUserID, @AssignedByUserID, @AssignmentType,
        GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
      )
    `);

    // 5. Delete the TaskAssignment row
    const deleteReq = new sql.Request(transaction);
    deleteReq.input('AssignmentID', sql.BigInt, parsedAssignmentId);
    await deleteReq.query(`
      DELETE FROM TaskAssignment WHERE AssignmentID = @AssignmentID
    `);

    // (Optional) If it was the last assignment, we could update the TaskMaster status, but the instructions say "DO NOT modify other artists" and "Task remains". We leave TaskMaster Status as is for now.

    await transaction.commit();

    return res.json({
      success: true,
      message: 'Artist unassigned successfully',
      assignmentId: parsedAssignmentId,
      taskId: assignment.TaskID,
      userId: assignment.UserID,
      releasedTargetHours: assignment.TargetHours
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('[unassignTask] Rollback error:', rollbackErr);
      }
    }
    console.error('[unassignTask] Transaction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unassign task', error: err.message });
  }
}

// 6. POST /api/assignments/:assignmentId/reassign - Reassign remaining bid
async function reassignRemainingBid(req, res) {
  const { assignmentId } = req.params;
  const { newUserId } = req.body;
  const parsedAssignmentId = parseInt(assignmentId, 10);
  const parsedNewUserId = parseInt(newUserId, 10);

  if (isNaN(parsedAssignmentId) || parsedAssignmentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
  }
  if (isNaN(parsedNewUserId) || parsedNewUserId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid newUserId' });
  }

  const assignedBy = req.user?.userId;
  if (!assignedBy) {
    return res.status(401).json({ success: false, message: 'Unauthenticated user' });
  }

  let pool;
  let transaction;

  try {
    pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Check if original assignment exists
    const checkReq = new sql.Request(transaction);
    checkReq.input('AssignmentID', sql.BigInt, parsedAssignmentId);
    const assignResult = await checkReq.query(`
      SELECT ta.AssignmentID, ta.TaskID, ta.UserID as OriginalUserID, ta.TargetHours, ta.StatusID,
             u.FullName as OriginalArtistName, tm.EstimatedHours, tm.PriorityID, tm.DueDate
      FROM TaskAssignment ta
      JOIN UserMaster u ON ta.UserID = u.UserId
      JOIN TaskMaster tm ON ta.TaskID = tm.TaskID
      WHERE ta.AssignmentID = @AssignmentID
    `);

    if (assignResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Original assignment not found' });
    }

    const origAssign = assignResult.recordset[0];
    const taskId = origAssign.TaskID;
    const origUserId = origAssign.OriginalUserID;

    if (origUserId === parsedNewUserId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'New user cannot be the same as the original user' });
    }

    // 2. Validate new user exists and is active
    const userReq = new sql.Request(transaction);
    userReq.input('NewUserId', sql.BigInt, parsedNewUserId);
    const userResult = await userReq.query(`
      SELECT UserId, IsActive FROM UserMaster WHERE UserId = @NewUserId
    `);
    if (userResult.recordset.length === 0 || !userResult.recordset[0].IsActive) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'New user is invalid or inactive' });
    }

    // 3. Duplicate Assignment Protection for new user
    const checkDupReq = new sql.Request(transaction);
    checkDupReq.input('TaskId', sql.BigInt, taskId);
    checkDupReq.input('NewUserId', sql.BigInt, parsedNewUserId);
    const dupResult = await checkDupReq.query(`
      SELECT 1 FROM TaskAssignment WHERE TaskID = @TaskId AND UserID = @NewUserId
    `);
    if (dupResult.recordset.length > 0) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'New user is already assigned to this task' });
    }

    // 4. Calculate actual hours for ORIGINAL USER ONLY
    const actualReq = new sql.Request(transaction);
    actualReq.input('TaskId', sql.BigInt, taskId);
    actualReq.input('OriginalUserId', sql.BigInt, origUserId);
    const actualResult = await actualReq.query(`
      SELECT ISNULL(SUM(HoursWorked), 0) AS ActualHours FROM TimeLog WHERE TaskID = @TaskId AND UserID = @OriginalUserId
    `);
    const actualHours = actualResult.recordset[0].ActualHours;

    // 5. Calculate remaining hours
    const remainingHours = origAssign.TargetHours - actualHours;
    if (remainingHours <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No remaining allocation to reassign' });
    }

    // 6. Transfer remaining allocation
    if (actualHours === 0) {
      // Case 1: Zero actuals. Delete original assignment.
      const deleteReq = new sql.Request(transaction);
      deleteReq.input('AssignmentID', sql.BigInt, parsedAssignmentId);
      await deleteReq.query(`
        DELETE FROM TaskAssignment WHERE AssignmentID = @AssignmentID
      `);

      // Log unassignment for original artist
      const insertUnassignHistReq = new sql.Request(transaction);
      insertUnassignHistReq.input('TaskId', sql.BigInt, taskId);
      insertUnassignHistReq.input('AssignedToUserID', sql.BigInt, origUserId);
      insertUnassignHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
      insertUnassignHistReq.input('AssignmentType', sql.NVarChar(50), 'Unassigned');
      insertUnassignHistReq.input('DueDate', sql.DateTime, origAssign.DueDate || null);
      insertUnassignHistReq.input('EstimatedHours', sql.Decimal(18, 2), origAssign.EstimatedHours || null);
      insertUnassignHistReq.input('PriorityID', sql.BigInt, origAssign.PriorityID || null);
      insertUnassignHistReq.input('StatusID', sql.BigInt, origAssign.StatusID);
      insertUnassignHistReq.input('Remarks', sql.NVarChar(1000), `Reassigned remaining bid to User ${parsedNewUserId}`);

      await insertUnassignHistReq.query(`
        INSERT INTO TaskAssignmentHistory (
          TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
          AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
        )
        VALUES (
          @TaskId, @AssignedToUserID, @AssignedByUserID, @AssignmentType,
          GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
        )
      `);
    } else {
      // Case 2: Partial actuals. Reduce original assignment TargetHours.
      const updateReq = new sql.Request(transaction);
      updateReq.input('AssignmentID', sql.BigInt, parsedAssignmentId);
      updateReq.input('TargetHours', sql.Decimal(18, 2), actualHours);
      await updateReq.query(`
        UPDATE TaskAssignment SET TargetHours = @TargetHours WHERE AssignmentID = @AssignmentID
      `);

      // Log target adjustment for original artist
      const insertAdjustHistReq = new sql.Request(transaction);
      insertAdjustHistReq.input('TaskId', sql.BigInt, taskId);
      insertAdjustHistReq.input('AssignedToUserID', sql.BigInt, origUserId);
      insertAdjustHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
      insertAdjustHistReq.input('AssignmentType', sql.NVarChar(50), 'Adjust Target');
      insertAdjustHistReq.input('DueDate', sql.DateTime, origAssign.DueDate || null);
      insertAdjustHistReq.input('EstimatedHours', sql.Decimal(18, 2), origAssign.EstimatedHours || null);
      insertAdjustHistReq.input('PriorityID', sql.BigInt, origAssign.PriorityID || null);
      insertAdjustHistReq.input('StatusID', sql.BigInt, origAssign.StatusID);
      insertAdjustHistReq.input('Remarks', sql.NVarChar(1000), `Target reduced to ${actualHours}h due to reassignment of ${remainingHours}h to User ${parsedNewUserId}`);

      await insertAdjustHistReq.query(`
        INSERT INTO TaskAssignmentHistory (
          TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
          AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
        )
        VALUES (
          @TaskId, @AssignedToUserID, @AssignedByUserID, @AssignmentType,
          GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
        )
      `);
    }

    // 7. Verify Total Allocation to Prevent Over-Allocation
    const allocReq = new sql.Request(transaction);
    allocReq.input('TaskId', sql.BigInt, taskId);
    const allocResult = await allocReq.query(`
      SELECT ISNULL(SUM(TargetHours), 0) AS totalTargetHours
      FROM TaskAssignment
      WHERE TaskID = @TaskId
    `);
    const existingTargetHours = allocResult.recordset[0].totalTargetHours;

    // Requested reassignment would cause total TargetHours to exceed TaskMaster.EstimatedHours
    if ((existingTargetHours + remainingHours) > (origAssign.EstimatedHours || 0)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Requested reassignment would cause TaskAssignment total TargetHours to exceed TaskMaster.EstimatedHours' });
    }

    // 8. Resolve Assigned StatusId for new assignment
    const statusReq = new sql.Request(transaction);
    const statusResult = await statusReq.query(`
      SELECT TOP 1 StatusId FROM StatusMaster WHERE StatusName = 'Assigned'
    `);
    const assignedStatusId = statusResult.recordset[0]?.StatusId || 1;

    // 9. Insert into TaskAssignment for new user
    const insertAssignReq = new sql.Request(transaction);
    insertAssignReq.input('TaskId', sql.BigInt, taskId);
    insertAssignReq.input('NewUserId', sql.BigInt, parsedNewUserId);
    insertAssignReq.input('AssignedBy', sql.BigInt, assignedBy);
    insertAssignReq.input('TargetHours', sql.Decimal(18, 2), remainingHours);
    insertAssignReq.input('StatusID', sql.BigInt, assignedStatusId);
    insertAssignReq.input('Remarks', sql.VarChar(500), 'Reassigned remaining bid from original artist');

    await insertAssignReq.query(`
      INSERT INTO TaskAssignment (TaskID, UserID, AssignedBy, AssignedDate, TargetHours, StatusID, Remarks)
      VALUES (@TaskId, @NewUserId, @AssignedBy, SYSDATETIME(), @TargetHours, @StatusID, @Remarks)
    `);

    // 10. Insert into TaskAssignmentHistory for new user
    const insertHistReq = new sql.Request(transaction);
    insertHistReq.input('TaskId', sql.BigInt, taskId);
    insertHistReq.input('NewUserId', sql.BigInt, parsedNewUserId);
    insertHistReq.input('AssignedByUserID', sql.BigInt, assignedBy);
    insertHistReq.input('AssignmentType', sql.NVarChar(50), 'Assign');
    insertHistReq.input('DueDate', sql.DateTime, origAssign.DueDate || null);
    insertHistReq.input('EstimatedHours', sql.Decimal(18, 2), origAssign.EstimatedHours || null);
    insertHistReq.input('PriorityID', sql.BigInt, origAssign.PriorityID || null);
    insertHistReq.input('StatusID', sql.BigInt, assignedStatusId);
    insertHistReq.input('Remarks', sql.NVarChar(1000), `Reassigned from ${origAssign.OriginalArtistName}. Transferred Remaining: ${remainingHours.toFixed(2)} Hours (${(remainingHours/8).toFixed(2)} Bid)`);

    await insertHistReq.query(`
      INSERT INTO TaskAssignmentHistory (
        TaskID, AssignedToUserID, AssignedByUserID, AssignmentType,
        AssignedDate, DueDate, EstimatedHours, PriorityID, StatusID, Remarks, CreatedOn
      )
      VALUES (
        @TaskId, @NewUserId, @AssignedByUserID, @AssignmentType,
        GETDATE(), @DueDate, @EstimatedHours, @PriorityID, @StatusID, @Remarks, GETDATE()
      )
    `);

    // 11. Evaluate TaskMaster Status
    // The task must NOT remain globally locked as Completed if a new artist still needs to execute the transferred work.
    const taskStatusReq = new sql.Request(transaction);
    taskStatusReq.input('TaskId', sql.BigInt, taskId);
    const taskStatusRes = await taskStatusReq.query(`
      SELECT StatusID FROM TaskMaster WHERE TaskID = @TaskId
    `);
    const currentTaskStatusId = taskStatusRes.recordset[0]?.StatusID;

    if (currentTaskStatusId === 4) { // 4 = Completed
      // Check for any active assignments to determine the appropriate workflow status
      const checkActiveReq = new sql.Request(transaction);
      checkActiveReq.input('TaskId', sql.BigInt, taskId);
      const checkActiveRes = await checkActiveReq.query(`
        SELECT StatusID FROM TaskAssignment WHERE TaskID = @TaskId
      `);
      const assignStatuses = checkActiveRes.recordset.map(r => r.StatusID);

      let newGlobalStatusId = assignedStatusId; // Default to Assigned (1)
      if (assignStatuses.includes(2)) {
        newGlobalStatusId = 2; // In Progress
      } else if (assignStatuses.includes(5)) {
        newGlobalStatusId = 5; // Rework
      } else if (assignStatuses.includes(3)) {
        newGlobalStatusId = 3; // Review
      }

      const updateGlobalReq = new sql.Request(transaction);
      updateGlobalReq.input('TaskId', sql.BigInt, taskId);
      updateGlobalReq.input('StatusID', sql.BigInt, newGlobalStatusId);
      updateGlobalReq.input('ModifiedBy', sql.BigInt, assignedBy);
      await updateGlobalReq.query(`
        UPDATE TaskMaster
        SET StatusID = @StatusID,
            ModifiedBy = @ModifiedBy,
            ModifiedDate = SYSDATETIME()
        WHERE TaskID = @TaskId
      `);

      // Log the global status change
      await logTaskHistory(transaction, taskId, currentTaskStatusId, newGlobalStatusId, assignedBy, 'Reopened task due to reassignment of remaining bid');
    } else {
      // TaskMaster status is NOT changed merely because a reassignment occurred (unless it was Completed).
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: 'Remaining bid reassigned successfully',
      taskId: taskId,
      originalUserId: origUserId,
      newUserId: parsedNewUserId,
      transferredHours: remainingHours,
      transferredBid: remainingHours / 8
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('[reassignRemainingBid] Rollback error:', rollbackErr);
      }
    }
    console.error('[reassignRemainingBid] Transaction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reassign remaining bid', error: err.message });
  }
}

router.post('/', secured(assignTask));
router.put('/:taskId/target', secured(adjustTarget));
router.get('/eligible-artists', securedReadOnly(getEligibleArtists));
router.get('/history/:taskId', securedReadOnly(getAssignmentHistory));
router.get('/workload/:artistId', securedReadOnly(getArtistWorkload));
router.delete('/:assignmentId', secured(unassignTask));
router.post('/:assignmentId/reassign', secured(reassignRemainingBid));

module.exports = router;
