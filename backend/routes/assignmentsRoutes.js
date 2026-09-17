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
  const { targetBid, targetHours, remarks } = req.body || {};

  const parsedTaskId = parseInt(taskId, 10);
  const parsedTargetHours = targetBid !== undefined && targetBid !== null && !isNaN(parseFloat(targetBid))
    ? parseFloat(targetBid) * 8
    : (parseFloat(targetHours) || 0);
  const parsedTargetBid = parsedTargetHours / 8;

  if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
    return res.status(400).json({ success: false, message: 'taskId must be a valid positive number' });
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

    // Verify there is an active assignment
    const assignReq = new sql.Request(transaction);
    assignReq.input('TaskId', sql.BigInt, parsedTaskId);
    const assignResult = await assignReq.query(`
      SELECT TOP 1 AssignmentID, UserID, TargetHours
      FROM TaskAssignment 
      WHERE TaskID = @TaskId
      ORDER BY AssignmentID DESC
    `);

    if (assignResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot adjust target: Task is not currently assigned to anyone' });
    }

    const currentAssignment = assignResult.recordset[0];

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

router.post('/', secured(assignTask));
router.put('/:taskId/target', secured(adjustTarget));
router.get('/eligible-artists', securedReadOnly(getEligibleArtists));
router.get('/history/:taskId', securedReadOnly(getAssignmentHistory));
router.get('/workload/:artistId', securedReadOnly(getArtistWorkload));

module.exports = router;
