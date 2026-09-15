const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');
const { logTaskHistory, logTaskAssignmentHistory, createNotification } = require('../utils/historyHelper');

function secured(handler) {
  return authMiddleware(['Super Admin', 'Admin', 'Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

// 1. GET /api/tasks - List all active tasks from TaskMaster
async function listTasks(req, res) {
  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    const { shotId, projectId, stageId, statusId, artistId, search } = req.query || {};

    const where = ['t.IsActive = 1', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];
    
    if (shotId) {
      const parsedShotId = parseInt(shotId, 10);
      if (!isNaN(parsedShotId)) {
        request.input('ShotId', sql.BigInt, parsedShotId);
        where.push('t.ShotID = @ShotId');
      }
    }

    if (projectId && projectId !== 'all') {
      const parsedProjId = parseInt(projectId, 10);
      if (!isNaN(parsedProjId)) {
        request.input('ProjectId', sql.BigInt, parsedProjId);
        where.push('pm.ProjectId = @ProjectId');
      }
    }

    if (stageId && stageId !== 'all') {
      const parsedStageId = parseInt(stageId, 10);
      if (!isNaN(parsedStageId)) {
        request.input('StageId', sql.BigInt, parsedStageId);
        where.push('t.WorkflowStageID = @StageId');
      }
    }

    if (statusId && statusId !== 'all') {
      if (statusId === 'unassigned') {
        where.push('ta.AssignmentID IS NULL');
      } else {
        const parsedStatusId = parseInt(statusId, 10);
        if (!isNaN(parsedStatusId)) {
          request.input('StatusId', sql.BigInt, parsedStatusId);
          where.push('t.StatusID = @StatusId');
        }
      }
    }

    if (artistId && artistId !== 'all') {
      const parsedArtistId = parseInt(artistId, 10);
      if (!isNaN(parsedArtistId)) {
        request.input('ArtistId', sql.BigInt, parsedArtistId);
        where.push('ta.UserID = @ArtistId');
      }
    }

    if (search && search.trim() !== '') {
      request.input('Search', sql.NVarChar, `%${search.trim()}%`);
      where.push('(t.TaskCode LIKE @Search OR s.ShotCode LIKE @Search OR t.TaskName LIKE @Search)');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        t.TaskID AS id,
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        t.ShotID AS shotId,
        s.ShotCode AS shotCode,
        seq.SequenceCode AS sequenceCode,
        r.ReelName AS reelCode,
        r.ReelName AS reelName,
        pm.ProjectId AS projectId,
        pm.ProjectCode AS projectCode,
        pm.ProjectName AS projectName,
        t.WorkflowStageID AS workflowStageId,
        t.WorkflowStageID AS stageId,
        wsm.StageName AS stageName,
        wsm.StageName AS stage,
        wsm.StageName AS departmentName,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        t.StartDate AS startDate,
        t.DueDate AS dueDate,
        prm.PriorityName AS priority,
        prm.PriorityId AS priorityId,
        ISNULL(st.StatusName, 'Unassigned') AS status,
        t.StatusID AS statusId,
        ta.UserID AS assignedArtistId,
        u.FullName AS assignedArtist,
        ta.AssignedDate AS assignedDate,
        ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        (ISNULL(tl.actualHours, 0) * 60) AS actualMinutes,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) AS remainingHours
      FROM TaskMaster t
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      LEFT JOIN UserMaster u ON ta.UserID = u.UserId
      LEFT JOIN (
        SELECT TaskID, SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ) AS actualHours
        FROM TimeLog
        GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      ${whereSql}
      ORDER BY t.TaskID ASC;
    `;

    const result = await request.query(query);
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[listTasks] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks', error: err.message });
  }
}

// 2. GET /api/tasks/department-queue/:stageId - Fetch unassigned / stage queue tasks with operational filters
async function getDepartmentQueue(req, res) {
  try {
    const { stageId } = req.params;
    const { projectId, statusId, artistId, search } = req.query || {};
    const pool = await sql.connect(config);
    const request = pool.request();

    const where = ['t.IsActive = 1', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];

    if (stageId && stageId.toLowerCase() !== 'all') {
      const parsedStageId = parseInt(stageId, 10);
      if (isNaN(parsedStageId)) {
        return res.status(400).json({ success: false, message: 'Invalid stageId. Must be a bigint number or "all".' });
      }
      request.input('StageId', sql.BigInt, parsedStageId);
      where.push('t.WorkflowStageID = @StageId');
    }

    if (projectId && projectId !== 'all') {
      const parsedProjId = parseInt(projectId, 10);
      if (!isNaN(parsedProjId)) {
        request.input('ProjectId', sql.BigInt, parsedProjId);
        where.push('pm.ProjectId = @ProjectId');
      }
    }

    if (statusId && statusId !== 'all') {
      if (statusId === 'unassigned') {
        where.push('ta.AssignmentID IS NULL');
      } else {
        const parsedStatusId = parseInt(statusId, 10);
        if (!isNaN(parsedStatusId)) {
          request.input('StatusId', sql.BigInt, parsedStatusId);
          where.push('t.StatusID = @StatusId');
        }
      }
    }

    if (artistId && artistId !== 'all') {
      const parsedArtistId = parseInt(artistId, 10);
      if (!isNaN(parsedArtistId)) {
        request.input('ArtistId', sql.BigInt, parsedArtistId);
        where.push('ta.UserID = @ArtistId');
      }
    }

    if (search && search.trim() !== '') {
      request.input('Search', sql.NVarChar, `%${search.trim()}%`);
      where.push('(t.TaskCode LIKE @Search OR s.ShotCode LIKE @Search OR t.TaskName LIKE @Search)');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        t.TaskID AS taskId,
        t.TaskID AS id,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        s.ShotCode AS shotCode,
        seq.SequenceCode AS sequenceCode,
        r.ReelName AS reelCode,
        r.ReelName AS reelName,
        pm.ProjectId AS projectId,
        pm.ProjectCode AS projectCode,
        pm.ProjectName AS projectName,
        t.WorkflowStageID AS stageId,
        ISNULL(wsm.StageName, 'General') AS stage,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        t.DueDate AS dueDate,
        ISNULL(prm.PriorityName, 'Medium') AS priority,
        ISNULL(st.StatusName, 'Unassigned') AS status,
        t.StatusID AS statusId,
        u.FullName AS assignedArtist,
        ta.UserID AS assignedArtistId
      FROM TaskMaster t
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      LEFT JOIN UserMaster u ON ta.UserID = u.UserId
      LEFT JOIN (
        SELECT TaskID, SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ) AS actualHours
        FROM TimeLog
        GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      ${whereSql}
      ORDER BY t.TaskID ASC;
    `;

    const result = await request.query(query);
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getDepartmentQueue] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department queue tasks', error: err.message });
  }
}

// 3. GET /api/tasks/artist/:artistId - Fetch assigned tasks for specific artist
async function getArtistTasks(req, res) {
  try {
    const { artistId } = req.params;
    const parsedArtistId = parseInt(artistId, 10);

    if (isNaN(parsedArtistId)) {
      return res.status(400).json({ success: false, message: 'Invalid artistId. Must be a bigint number.' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('ArtistId', sql.BigInt, parsedArtistId);

    const query = `
      SELECT
        t.TaskID AS taskId,
        t.TaskID AS id,
        ta.AssignmentID AS assignmentId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        s.ShotCode AS shotCode,
        seq.SequenceCode AS sequenceCode,
        r.ReelName AS reelCode,
        r.ReelName AS reelName,
        pm.ProjectId AS projectId,
        pm.ProjectCode AS projectCode,
        pm.ProjectName AS projectName,
        t.WorkflowStageID AS stageId,
        ISNULL(wsm.StageName, 'General') AS stage,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        (ISNULL(tl.actualHours, 0) * 60) AS actualMinutes,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) AS remainingHours,
        t.DueDate AS dueDate,
        ISNULL(st.StatusName, 'Assigned') AS status,
        t.StatusID AS statusId,
        ta.AssignedDate AS assignedDate,
        ta.Remarks AS remarks
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN (
        SELECT TaskID, SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ) AS actualHours
        FROM TimeLog
        GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      WHERE ta.UserID = @ArtistId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ORDER BY ta.AssignedDate DESC;
    `;

    const result = await request.query(query);
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getArtistTasks] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch artist tasks', error: err.message });
  }
}

// 4. GET /api/tasks/:id - Fetch single task details
async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    const parsedTaskId = parseInt(id, 10);
    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ success: false, message: 'Invalid taskId' });
    }
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('TaskId', sql.BigInt, parsedTaskId);

    const query = `
      SELECT
        t.TaskID AS id,
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        t.ShotID AS shotId,
        s.ShotCode AS shotCode,
        seq.SequenceCode AS sequenceCode,
        r.ReelName AS reelCode,
        r.ReelName AS reelName,
        pm.ProjectId AS projectId,
        pm.ProjectCode AS projectCode,
        pm.ProjectName AS projectName,
        t.WorkflowStageID AS workflowStageId,
        t.WorkflowStageID AS stageId,
        wsm.StageName AS stageName,
        wsm.StageName AS stage,
        wsm.StageName AS departmentName,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        t.StartDate AS startDate,
        t.DueDate AS dueDate,
        prm.PriorityName AS priority,
        prm.PriorityId AS priorityId,
        ISNULL(st.StatusName, 'Unassigned') AS status,
        t.StatusID AS statusId,
        ta.UserID AS assignedArtistId,
        u.FullName AS assignedArtist,
        ta.AssignedDate AS assignedDate,
        ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        (ISNULL(tl.actualHours, 0) * 60) AS actualMinutes,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) AS remainingHours
      FROM TaskMaster t
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      LEFT JOIN UserMaster u ON ta.UserID = u.UserId
      LEFT JOIN (
        SELECT TaskID, SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ) AS actualHours
        FROM TimeLog
        GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      WHERE t.TaskID = @TaskId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL);
    `;

    const result = await request.query(query);
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.json({ success: true, item: result.recordset[0] });
  } catch (err) {
    console.error('[getTaskById] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch task', error: err.message });
  }
}

const { submitTaskForReview, getTaskReviews, securedAny } = require('./reviewRoutes');

async function createTask(req, res) {
  try {
    const { shotId, taskCode, taskName, estimatedHours, dueDate, priorityId, stageId, assignedArtistId } = req.body;
    
    if (!shotId || !taskName) {
      return res.status(400).json({ success: false, message: 'Missing required fields: shotId, taskName' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    
    request.input('ShotID', sql.BigInt, shotId);
    request.input('TaskCode', sql.VarChar, taskCode || taskName.substring(0, 10).toUpperCase());
    request.input('TaskName', sql.VarChar, taskName);
    request.input('WorkflowStageID', sql.BigInt, stageId || null);
    request.input('PriorityID', sql.BigInt, priorityId || null);
    request.input('StatusID', sql.BigInt, assignedArtistId ? 1 : null); // 1 = Assigned
    request.input('EstimatedHours', sql.Decimal, estimatedHours || 0);
    request.input('StartDate', sql.Date, new Date());
    request.input('DueDate', sql.Date, dueDate ? new Date(dueDate) : null);
    request.input('IsActive', sql.Bit, 1);
    request.input('IsDeleted', sql.Bit, 0);
    request.input('CreatedDate', sql.DateTime2, new Date());
    
    const insertQuery = `
      INSERT INTO TaskMaster (ShotID, TaskCode, TaskName, WorkflowStageID, PriorityID, StatusID, EstimatedHours, StartDate, DueDate, IsActive, IsDeleted, CreatedDate)
      OUTPUT INSERTED.TaskID
      VALUES (@ShotID, @TaskCode, @TaskName, @WorkflowStageID, @PriorityID, @StatusID, @EstimatedHours, @StartDate, @DueDate, @IsActive, @IsDeleted, @CreatedDate);
    `;
    
    // Use transaction for safer history insertion
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const result = await (new sql.Request(transaction)).query(`
        INSERT INTO TaskMaster (ShotID, TaskCode, TaskName, WorkflowStageID, PriorityID, StatusID, EstimatedHours, StartDate, DueDate, IsActive, IsDeleted, CreatedDate)
        OUTPUT INSERTED.TaskID
        VALUES (@ShotID, @TaskCode, @TaskName, @WorkflowStageID, @PriorityID, @StatusID, @EstimatedHours, @StartDate, @DueDate, @IsActive, @IsDeleted, @CreatedDate);
      `);
      const taskId = result.recordset[0].TaskID;

      if (assignedArtistId) {
        const assignReq = new sql.Request(transaction);
        assignReq.input('TaskID', sql.BigInt, taskId);
        assignReq.input('UserID', sql.BigInt, assignedArtistId);
        assignReq.input('AssignedBy', sql.BigInt, req.user?.userId || null);
        assignReq.input('AssignedDate', sql.DateTime2, new Date());
        assignReq.input('TargetHours', sql.Decimal, estimatedHours || 0);
        assignReq.input('StatusID', sql.BigInt, 1);
        
        await assignReq.query(`
          INSERT INTO TaskAssignment (TaskID, UserID, AssignedBy, AssignedDate, TargetHours, StatusID)
          VALUES (@TaskID, @UserID, @AssignedBy, @AssignedDate, @TargetHours, @StatusID);
        `);

        await logTaskHistory(transaction, taskId, null, 1, req.user?.userId || null, 'Task created and assigned');
        await logTaskAssignmentHistory(transaction, taskId, assignedArtistId, req.user?.userId || null, 'Assign', estimatedHours);
        await createNotification(transaction, assignedArtistId, 'NEW_ASSIGNMENT', 'New Assignment', `You have been assigned to new task ${taskCode || taskName.substring(0, 10).toUpperCase()}.`, taskId);
      }

      await transaction.commit();
      return res.json({ success: true, message: 'Task created successfully', taskId });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[createTask] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create task', error: err.message });
  }
}

// 5. GET /api/tasks/:id/timeline - Fetch unified activity timeline
async function getTaskTimeline(req, res) {
  try {
    const { id } = req.params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) return res.status(400).json({ success: false, message: 'Invalid taskId' });

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('TaskId', sql.BigInt, taskId);

    const query = `
      SELECT 
        'assignment' as eventType, 
        ah.CreatedOn as eventDate, 
        u1.FullName as actorName, 
        u2.FullName as targetName, 
        'Assigned task' as action, 
        ah.Remarks as details,
        NULL as statusName
      FROM TaskAssignmentHistory ah
      LEFT JOIN UserMaster u1 ON ah.AssignedByUserID = u1.UserId
      LEFT JOIN UserMaster u2 ON ah.AssignedToUserID = u2.UserId
      WHERE ah.TaskID = @TaskId

      UNION ALL

      SELECT 
        'status_change' as eventType, 
        th.ChangedDate as eventDate, 
        u.FullName as actorName, 
        NULL as targetName, 
        'Changed status to ' + st.StatusName as action, 
        th.Remarks as details,
        st.StatusName as statusName
      FROM TaskHistory th
      LEFT JOIN UserMaster u ON th.ChangedBy = u.UserId
      LEFT JOIN StatusMaster st ON th.NewStatusID = st.StatusId
      WHERE th.TaskID = @TaskId

      UNION ALL

      SELECT 
        'review' as eventType, 
        tr.ReviewDate as eventDate, 
        u.FullName as actorName, 
        NULL as targetName, 
        'Reviewed task: ' + tr.ReviewStatus as action, 
        tr.Remarks as details,
        tr.ReviewStatus as statusName
      FROM TaskReview tr
      LEFT JOIN UserMaster u ON tr.ReviewerID = u.UserId
      WHERE tr.TaskID = @TaskId

      UNION ALL

      SELECT 
        'rework' as eventType, 
        trw.RequestedDate as eventDate, 
        u.FullName as actorName, 
        u2.FullName as targetName, 
        'Requested Rework (Round ' + CAST(trw.ReworkRound AS varchar) + ')' as action, 
        trw.Reason as details,
        'Rework' as statusName
      FROM TaskRework trw
      LEFT JOIN UserMaster u ON trw.RequestedBy = u.UserId
      LEFT JOIN UserMaster u2 ON trw.AssignedToUserID = u2.UserId
      WHERE trw.TaskID = @TaskId

      UNION ALL

      SELECT 
        'timelog' as eventType, 
        tl.EndTime as eventDate, 
        u.FullName as actorName, 
        NULL as targetName, 
        'Logged ' + CAST(tl.HoursWorked AS varchar) + ' hours' as action, 
        tl.Remarks as details,
        NULL as statusName
      FROM TimeLog tl
      LEFT JOIN UserMaster u ON tl.UserID = u.UserId
      WHERE tl.TaskID = @TaskId AND tl.EndTime IS NOT NULL

      ORDER BY eventDate ASC;
    `;

    const result = await request.query(query);
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getTaskTimeline] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch timeline', error: err.message });
  }
}

router.get('/', secured(listTasks));
router.post('/', securedAny(createTask));
router.get('/department-queue/:stageId', secured(getDepartmentQueue));
router.get('/artist/:artistId', secured(getArtistTasks));
router.post('/:id/submit-review', securedAny(submitTaskForReview));
router.get('/:id/reviews', securedAny(getTaskReviews));
router.get('/:id/timeline', securedAny(getTaskTimeline));
router.get('/:id', secured(getTaskById));

module.exports = router;
