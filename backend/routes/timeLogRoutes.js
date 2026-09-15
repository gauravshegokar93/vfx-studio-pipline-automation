const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

function secured(handler) {
  return authMiddleware(['Super Admin', 'Admin', 'Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

/**
 * Task Ownership & State Validator
 */
async function validateTaskOwnership(pool, taskId, authUserId) {
  const request = pool.request();
  request.input('TaskId', sql.BigInt, taskId);

  const taskQuery = await request.query(`
    SELECT 
      t.TaskID, 
      t.TaskCode, 
      t.TaskName,
      t.StatusID, 
      ISNULL(st.StatusName, 'Unassigned') AS StatusName,
      ta.UserID AS AssignedUserID
    FROM TaskMaster t
    LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    WHERE t.TaskID = @TaskId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
  `);

  if (!taskQuery.recordset || taskQuery.recordset.length === 0) {
    return { valid: false, httpCode: 404, error: 'TASK_NOT_FOUND', message: `Task ${taskId} not found or inactive.` };
  }

  const task = taskQuery.recordset[0];

  const statusIdNum = parseInt(task.StatusID, 10);

  if (statusIdNum === 4 || task.StatusName === 'Completed') {
    return { valid: false, httpCode: 400, error: 'TASK_ALREADY_COMPLETED', message: 'Task is already completed.' };
  }

  if (statusIdNum === 3 || task.StatusName === 'Review') {
    return { valid: false, httpCode: 400, error: 'INVALID_STATUS_TRANSITION', message: 'Task is currently under review.' };
  }

  if (!task.AssignedUserID) {
    return { valid: false, httpCode: 403, error: 'TASK_NOT_ASSIGNED', message: 'Task has not been assigned to an artist.' };
  }

  if (parseInt(task.AssignedUserID, 10) !== parseInt(authUserId, 10)) {
    return { valid: false, httpCode: 403, error: 'NOT_TASK_OWNER', message: 'You are not assigned to work on this task.' };
  }

  return { valid: true, task };
}

// 1. POST /api/time-logs/start (and /resume) - Start an open work session
async function startTimerSession(req, res) {
  try {
    const { taskId } = req.body || {};
    const parsedTaskId = parseInt(taskId, 10);
    const authUserId = parseInt(req.user?.userId, 10);

    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'taskId must be a valid positive number' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user token' });
    }

    const pool = await sql.connect(config);
    const check = await validateTaskOwnership(pool, parsedTaskId, authUserId);
    if (!check.valid) {
      return res.status(check.httpCode).json({ error: check.error, message: check.message });
    }

    // Concurrency check using transaction with UPDLOCK/HOLDLOCK
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const checkReq = new sql.Request(transaction);
      checkReq.input('TaskId', sql.BigInt, parsedTaskId);
      checkReq.input('UserId', sql.BigInt, authUserId);

      const existingOpen = await checkReq.query(`
        SELECT TOP 1 TimeLogID, StartTime 
        FROM TimeLog WITH (UPDLOCK, HOLDLOCK)
        WHERE TaskID = @TaskId AND UserID = @UserId AND EndTime IS NULL
      `);

      if (existingOpen.recordset && existingOpen.recordset.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          error: 'TIMELOG_ALREADY_RUNNING',
          message: 'A work session is already active for this task.',
          activeSession: {
            timeLogId: existingOpen.recordset[0].TimeLogID,
            startTime: existingOpen.recordset[0].StartTime
          }
        });
      }

      const insertReq = new sql.Request(transaction);
      insertReq.input('TaskId', sql.BigInt, parsedTaskId);
      insertReq.input('UserId', sql.BigInt, authUserId);
      insertReq.input('Remarks', sql.VarChar(500), 'Timer Session');

      const insertRes = await insertReq.query(`
        INSERT INTO TimeLog (TaskID, UserID, WorkDate, StartTime, EndTime, HoursWorked, Remarks, CreatedDate)
        OUTPUT INSERTED.TimeLogID, INSERTED.StartTime, INSERTED.WorkDate
        VALUES (@TaskId, @UserId, CAST(GETDATE() AS DATE), GETDATE(), NULL, 0.00, @Remarks, GETDATE())
      `);

      // Mark TaskMaster StatusID = 2 (In Progress) if unassigned/not already 2
      const updateStatusReq = new sql.Request(transaction);
      updateStatusReq.input('TaskId', sql.BigInt, parsedTaskId);
      await updateStatusReq.query(`
        UPDATE TaskMaster 
        SET StatusID = 2 
        WHERE TaskID = @TaskId AND (StatusID IS NULL OR StatusID != 2)
      `);

      await transaction.commit();

      const newLog = insertRes.recordset[0];
      return res.status(201).json({
        success: true,
        message: 'Work session started successfully',
        timeLog: {
          timeLogId: newLog.TimeLogID,
          taskId: parsedTaskId,
          userId: authUserId,
          workDate: newLog.WorkDate,
          startTime: newLog.StartTime,
          endTime: null,
          hoursWorked: 0
        }
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[startTimerSession] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to start work session', error: err.message });
  }
}

// 2. POST /api/time-logs/stop (and /pause) - Stop/pause an active work session
async function stopTimerSession(req, res) {
  try {
    const { taskId } = req.body || {};
    const parsedTaskId = parseInt(taskId, 10);
    const authUserId = parseInt(req.user?.userId, 10);

    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'taskId must be a valid positive number' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user token' });
    }

    const pool = await sql.connect(config);
    const check = await validateTaskOwnership(pool, parsedTaskId, authUserId);
    if (!check.valid) {
      return res.status(check.httpCode).json({ error: check.error, message: check.message });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const openReq = new sql.Request(transaction);
      openReq.input('TaskId', sql.BigInt, parsedTaskId);
      openReq.input('UserId', sql.BigInt, authUserId);

      const openResult = await openReq.query(`
        SELECT TOP 1 TimeLogID, StartTime 
        FROM TimeLog WITH (UPDLOCK, HOLDLOCK)
        WHERE TaskID = @TaskId AND UserID = @UserId AND EndTime IS NULL
        ORDER BY TimeLogID DESC
      `);

      if (!openResult.recordset || openResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(409).json({
          error: 'NO_ACTIVE_TIMELOG',
          message: 'No active work session exists for this task.'
        });
      }

      const activeLog = openResult.recordset[0];
      const timeLogId = activeLog.TimeLogID;

      const updateReq = new sql.Request(transaction);
      updateReq.input('TimeLogId', sql.BigInt, timeLogId);

      const updateRes = await updateReq.query(`
        DECLARE @Now DATETIME2 = GETDATE();
        DECLARE @Start DATETIME2;
        SELECT @Start = StartTime FROM TimeLog WHERE TimeLogID = @TimeLogId;
        
        DECLARE @Seconds INT = DATEDIFF(SECOND, @Start, @Now);
        DECLARE @Hours DECIMAL(10,2) = CASE 
          WHEN @Seconds <= 0 THEN 0.00
          WHEN CAST(@Seconds AS DECIMAL(10,2)) / 3600.00 < 0.01 THEN 0.01
          ELSE ROUND(CAST(@Seconds AS DECIMAL(10,2)) / 3600.00, 2)
        END;

        UPDATE TimeLog
        SET EndTime = @Now,
            HoursWorked = @Hours
        OUTPUT INSERTED.TimeLogID, INSERTED.StartTime, INSERTED.EndTime, INSERTED.HoursWorked
        WHERE TimeLogID = @TimeLogId;
      `);

      await transaction.commit();

      const closed = updateRes.recordset[0];
      return res.json({
        success: true,
        message: 'Work session stopped successfully',
        timeLog: {
          timeLogId: closed.TimeLogID,
          taskId: parsedTaskId,
          userId: authUserId,
          startTime: closed.StartTime,
          endTime: closed.EndTime,
          hoursWorked: parseFloat(closed.HoursWorked)
        }
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[stopTimerSession] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to stop work session', error: err.message });
  }
}

// 3. POST /api/time-logs - Manual work logging (Secured & Validated)
async function createTimeLog(req, res) {
  try {
    const { taskId, workDate, hoursWorked, remarks } = req.body || {};

    const parsedTaskId = parseInt(taskId, 10);
    const authUserId = parseInt(req.user?.userId, 10);
    const parsedHours = parseFloat(hoursWorked) || 0;

    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'taskId must be a valid positive number' });
    }

    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user token' });
    }

    if (parsedHours <= 0) {
      return res.status(400).json({ error: 'INVALID_HOURS', message: 'hoursWorked must be greater than 0' });
    }

    const pool = await sql.connect(config);
    const check = await validateTaskOwnership(pool, parsedTaskId, authUserId);
    if (!check.valid) {
      return res.status(check.httpCode).json({ error: check.error, message: check.message });
    }

    const logWorkDate = workDate ? new Date(workDate) : new Date();

    const insertReq = pool.request();
    insertReq.input('TaskID', sql.BigInt, parsedTaskId);
    insertReq.input('UserID', sql.BigInt, authUserId);
    insertReq.input('WorkDate', sql.Date, logWorkDate);
    insertReq.input('HoursWorked', sql.Decimal(10, 2), parsedHours);
    insertReq.input('Remarks', sql.VarChar(500), remarks || 'Manual Entry');

    const insertRes = await insertReq.query(`
      INSERT INTO TimeLog (TaskID, UserID, WorkDate, StartTime, EndTime, HoursWorked, Remarks, CreatedDate)
      OUTPUT INSERTED.TimeLogID, INSERTED.CreatedDate
      VALUES (@TaskID, @UserID, @WorkDate, GETDATE(), GETDATE(), @HoursWorked, @Remarks, GETDATE())
    `);

    const newLog = insertRes.recordset[0];

    return res.status(201).json({
      success: true,
      message: 'Time log recorded successfully',
      timeLog: {
        timeLogId: newLog.TimeLogID,
        taskId: parsedTaskId,
        userId: authUserId,
        workDate: logWorkDate.toISOString().slice(0, 10),
        hoursWorked: parsedHours,
        remarks: remarks || 'Manual Entry',
        createdDate: newLog.CreatedDate
      }
    });

  } catch (err) {
    console.error('[createTimeLog] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to record time log', error: err.message });
  }
}

// 4. GET /api/time-logs/task/:taskId - Fetch historical sessions for a task
async function getTimeLogsByTask(req, res) {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId, 10);

    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'Invalid taskId' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('TaskId', sql.BigInt, parsedTaskId);

    const result = await request.query(`
      SELECT 
        tl.TimeLogID AS timeLogId,
        tl.TimeLogID AS id,
        tl.TaskID AS taskId,
        tl.UserID AS userId,
        u.FullName AS userName,
        u.FullName AS artistName,
        tl.WorkDate AS workDate,
        tl.StartTime AS startTime,
        tl.EndTime AS endTime,
        tl.HoursWorked AS hoursWorked,
        (ISNULL(tl.HoursWorked, 0) * 60) AS totalMinutes,
        tl.Remarks AS remarks,
        tl.CreatedDate AS createdDate
      FROM TimeLog tl
      LEFT JOIN UserMaster u ON tl.UserID = u.UserId
      WHERE tl.TaskID = @TaskId
      ORDER BY tl.CreatedDate DESC, tl.TimeLogID DESC
    `);

    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getTimeLogsByTask] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch time logs', error: err.message });
  }
}

// 5. GET /api/time-logs/task/:taskId/summary - Fetch task time summary & active session
async function getTimeLogSummary(req, res) {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId, 10);

    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'Invalid taskId' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('TaskId', sql.BigInt, parsedTaskId);

    const taskQuery = await request.query(`
      SELECT 
        t.TaskID AS taskId,
        t.EstimatedHours AS estimatedHours,
        (t.EstimatedHours / 8.0) AS estimatedBid,
        ta.TargetHours AS targetHours,
        (ta.TargetHours / 8.0) AS targetBid,
        ta.UserID AS assignedArtistId
      FROM TaskMaster t
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      WHERE t.TaskID = @TaskId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    `);

    if (!taskQuery.recordset || taskQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'TASK_NOT_FOUND', message: `Task ${parsedTaskId} not found or inactive.` });
    }

    const task = taskQuery.recordset[0];

    const logsReq = pool.request();
    logsReq.input('TaskId', sql.BigInt, parsedTaskId);
    const logsRes = await logsReq.query(`
      SELECT 
        TimeLogID AS timeLogId,
        UserID AS userId,
        StartTime AS startTime,
        EndTime AS endTime,
        HoursWorked AS hoursWorked,
        CASE 
          WHEN EndTime IS NULL THEN DATEDIFF(SECOND, StartTime, GETDATE())
          ELSE NULL
        END AS currentElapsedSeconds
      FROM TimeLog
      WHERE TaskID = @TaskId
    `);

    const sessions = logsRes.recordset || [];
    let closedHoursSum = 0;
    let activeSession = null;

    for (const session of sessions) {
      if (session.endTime === null) {
        activeSession = {
          timeLogId: session.timeLogId,
          userId: session.userId,
          startTime: session.startTime,
          elapsedSeconds: Math.max(0, session.currentElapsedSeconds || 0)
        };
      } else {
        closedHoursSum += parseFloat(session.hoursWorked) || 0;
      }
    }

    let activeHours = 0;
    if (activeSession) {
      activeHours = activeSession.elapsedSeconds / 3600.0;
    }

    const actualWorkedHours = Math.round((closedHoursSum + activeHours) * 100) / 100;
    const actualWorkedMinutes = Math.round(actualWorkedHours * 60);

    const baseAllocationHours = task.targetHours ?? task.estimatedHours ?? 0;
    const remainingHours = Math.round((baseAllocationHours - actualWorkedHours) * 100) / 100;

    return res.json({
      success: true,
      taskId: parsedTaskId,
      estimatedHours: task.estimatedHours,
      estimatedBid: task.estimatedBid,
      targetHours: task.targetHours || 0,
      targetBid: task.targetBid || 0,
      actualWorkedHours,
      actualWorkedMinutes,
      remainingHours,
      sessionCount: sessions.length,
      activeSession
    });

  } catch (err) {
    console.error('[getTimeLogSummary] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch time log summary', error: err.message });
  }
}

router.post('/start', secured(startTimerSession));
router.post('/resume', secured(startTimerSession));
router.post('/stop', secured(stopTimerSession));
router.post('/pause', secured(stopTimerSession));
router.post('/', secured(createTimeLog));
router.get('/task/:taskId/summary', secured(getTimeLogSummary));
router.get('/task/:taskId', secured(getTimeLogsByTask));

module.exports = router;
