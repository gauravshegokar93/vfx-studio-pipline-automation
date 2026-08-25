const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

function isValidGuid(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function secured(handler) {
  return authMiddleware(['Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

// 1. List Tasks
async function listTasks(req, res) {
  try {
    const request = (await sql.connect(config)).request();
    const { shotId } = req.query || {};

    const where = [];
    if (shotId) {
      request.input('ShotId', sql.UniqueIdentifier, shotId);
      where.push('t.ShotId = @ShotId');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await request.query(`
      SELECT
        t.TaskId AS id,
        t.ShotId AS shotId,
        t.PipelineStep AS pipelineStep,
        t.TaskName AS taskName,
        ta.SupervisorId AS supervisorId,
        ta.LeadId AS leadId,
        ta.ArtistId AS assignedArtistId,
        t.BidHours AS bidHours,
        t.SpentHours AS spentHours,
        t.RemainingHours AS remainingHours,
        t.Status AS status,
        t.Progress AS progress,
        t.InternalEta AS internalEta,
        t.ReviewStatus AS reviewStatus,
        t.LatestArtistComment AS latestArtistComment,
        t.LatestLeadComment AS latestLeadComment,
        t.LatestSupComment AS latestSupComment,
        t.StartDate AS startDate,
        t.DueDate AS dueDate,
        t.Priority AS priority,
        NULL AS createdAt
      FROM Tasks t
      LEFT JOIN TaskAssignments ta ON t.TaskId = ta.TaskId AND ta.IsCurrent = 1
      ${whereSql}
      ORDER BY t.TaskName ASC;
    `);

    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[listTasks] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks', error: err.message });
  }
}

// 2. Assign Task Artist/Lead
async function assignTask(req, res) {
  const { id } = req.params;
  const { artistId, leadId, supervisorId } = req.body || {};

  console.log('[assignTask] req.params =', req.params);
  console.log('[assignTask] req.body =', req.body);

  if (!isValidGuid(id)) {
    return res.status(400).json({ success: false, message: 'TaskId must be a valid GUID', taskId: id });
  }

  if (artistId && !isValidGuid(artistId)) {
    return res.status(400).json({ success: false, message: 'ArtistId must be a valid GUID', artistId });
  }

  if (leadId && !isValidGuid(leadId)) {
    return res.status(400).json({ success: false, message: 'LeadId must be a valid GUID', leadId });
  }

  if (supervisorId && !isValidGuid(supervisorId)) {
    return res.status(400).json({ success: false, message: 'SupervisorId must be a valid GUID', supervisorId });
  }

  let pool;
  let transaction;
  try {
    pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('[assignTask] taskId =', id);
    console.log('[assignTask] artistId =', artistId || null);
    console.log('[assignTask] leadId =', leadId || null);
    console.log('[assignTask] supervisorId =', supervisorId || null);

    const taskCheckReq = new sql.Request(transaction);
    taskCheckReq.input('TaskId', sql.UniqueIdentifier, id);
    const taskCheck = await taskCheckReq.query('SELECT TaskId FROM Tasks WHERE TaskId = @TaskId');
    if (!taskCheck.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Task not found', taskId: id });
    }

    if (leadId) {
      const leadCheckReq = new sql.Request(transaction);
      const leadCheck = await leadCheckReq.query(`SELECT UserId FROM Users WHERE UserId = '${leadId}'`);
      if (!leadCheck.recordset.length) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'LeadId does not exist', leadId });
      }
    }

    if (artistId) {
      const artistCheckReq = new sql.Request(transaction);
      const artistCheck = await artistCheckReq.query(`SELECT UserId FROM Users WHERE UserId = '${artistId}'`);
      if (!artistCheck.recordset.length) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'ArtistId does not exist', artistId });
      }
    }

    const deactivateReq = new sql.Request(transaction);
    deactivateReq.input('TaskId', sql.UniqueIdentifier, id);
    const deactivateSql = 'UPDATE TaskAssignments SET IsCurrent = 0 WHERE TaskId = @TaskId';
    console.log('[assignTask] deactivate SQL =', deactivateSql);
    await deactivateReq.query(deactivateSql);

    const assignReq = new sql.Request(transaction);
    const assignmentId = require('crypto').randomUUID();
    assignReq.input('AssignmentId', sql.UniqueIdentifier, assignmentId);
    assignReq.input('TaskId', sql.UniqueIdentifier, id);
    assignReq.input('ArtistId', sql.UniqueIdentifier, artistId || null);
    assignReq.input('LeadId', sql.UniqueIdentifier, leadId || null);
    assignReq.input('SupervisorId', sql.UniqueIdentifier, supervisorId || null);
    const insertSql = `
      INSERT INTO TaskAssignments (AssignmentId, TaskId, ArtistId, LeadId, SupervisorId, AssignedAt, IsCurrent)
      VALUES (@AssignmentId, @TaskId, @ArtistId, @LeadId, @SupervisorId, GETDATE(), 1)
    `;
    console.log('[assignTask] insert SQL =', insertSql);
    await assignReq.query(insertSql);

    const statusReq = new sql.Request(transaction);
    statusReq.input('TaskId', sql.UniqueIdentifier, id);
    const checkStatus = await statusReq.query('SELECT Status FROM Tasks WHERE TaskId = @TaskId');

    if (checkStatus.recordset.length > 0 && checkStatus.recordset[0].Status === 'Not Started') {
      const updateStatusReq = new sql.Request(transaction);
      const newStatus = artistId ? 'In Progress' : 'Assigned';
      updateStatusReq.input('TaskId', sql.UniqueIdentifier, id);
      updateStatusReq.input('Status', sql.NVarChar(50), newStatus);
      const updateSql = 'UPDATE Tasks SET Status = @Status WHERE TaskId = @TaskId';
      console.log('[assignTask] update status SQL =', updateSql);
      await updateStatusReq.query(updateSql);
    }

    await transaction.commit();
    return res.json({ success: true, message: 'Task assigned successfully' });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('[assignTask] rollback error:', rollbackErr);
      }
    }
    console.error('[assignTask] req.params =', req.params);
    console.error('[assignTask] req.body =', req.body);
    console.error('[assignTask] SQL error stack =', err?.stack || err);
    console.error('[assignTask] SQL error =', err);
    return res.status(500).json({ success: false, message: 'Failed to assign task', error: err.message });
  }
}

// 3. Artist Update Progress
async function updateProgress(req, res) {
  const { id } = req.params;
  const { progress, comment, internalEta } = req.body || {};

  try {
    const pool = await sql.connect(config);
    const reqUpdate = pool.request();
    
    // Authorization check for Artist task ownership
    if (req.user && req.user.roleName === 'Artist') {
      const verifyReq = pool.request();
      verifyReq.input('TaskId', sql.BigInt, id);
      verifyReq.input('ArtistId', sql.BigInt, req.user.userId);
      const verifyResult = await verifyReq.query(`
        SELECT 1 FROM TaskAssignment
        WHERE TaskID = @TaskId AND UserID = @ArtistId
      `);
      if (verifyResult.recordset.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this task.' });
      }
    }
    
    // Status logic: if progress is 100, status becomes 'Pending Review', else 'In Progress'
    const status = parseInt(progress) === 100 ? 'Pending Review' : 'In Progress';
    const etaDate = internalEta ? new Date(internalEta) : null;

    await reqUpdate.input('TaskId', sql.UniqueIdentifier, id)
                   .input('Progress', sql.Int, parseInt(progress))
                   .input('Comment', sql.NVarChar(sql.MAX), comment || '')
                   .input('InternalEta', sql.Date, etaDate)
                   .input('Status', sql.NVarChar(50), status)
                   .query(`
                       UPDATE Tasks
                       SET Progress = @Progress,
                           LatestArtistComment = @Comment,
                           InternalEta = @InternalEta,
                           ReviewStatus = 'Pending',
                           Status = @Status
                       WHERE TaskId = @TaskId
                   `);

    return res.json({ success: true, message: 'Progress updated successfully' });
  } catch (err) {
    console.error('[updateProgress] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update progress', error: err.message });
  }
}

// 4. Review Task (Lead or Supervisor)
async function reviewTask(req, res) {
  const { id } = req.params;
  const { role, status: reviewStatus, comment } = req.body || {};

  try {
    const pool = await sql.connect(config);
    const reqReview = pool.request();

    let query = '';
    // Status resolution based on role review
    if (role === 'Lead') {
      // Lead review
      const taskStatus = reviewStatus === 'Approved' ? 'Pending Review' : (reviewStatus === 'Changes Requested' ? 'Retake' : 'In Progress');
      query = `
        UPDATE Tasks
        SET ReviewStatus = @ReviewStatus,
            LatestLeadComment = @Comment,
            Status = @Status
        WHERE TaskId = @TaskId
      `;
      reqReview.input('Status', sql.NVarChar(50), taskStatus);
    } else {
      // Supervisor / Production Head review
      const taskStatus = reviewStatus === 'Approved' ? 'Approved' : (reviewStatus === 'Changes Requested' ? 'Retake' : 'In Progress');
      query = `
        UPDATE Tasks
        SET ReviewStatus = @ReviewStatus,
            LatestSupComment = @Comment,
            Status = @Status
        WHERE TaskId = @TaskId
      `;
      reqReview.input('Status', sql.NVarChar(50), taskStatus);
    }

    await reqReview.input('TaskId', sql.UniqueIdentifier, id)
                   .input('ReviewStatus', sql.NVarChar(50), reviewStatus)
                   .input('Comment', sql.NVarChar(sql.MAX), comment || '')
                   .query(query);

    return res.json({ success: true, message: 'Review recorded successfully' });
  } catch (err) {
    console.error('[reviewTask] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record review', error: err.message });
  }
}

// 5. Update Task Status Directly
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  try {
    const pool = await sql.connect(config);
    const reqStatus = pool.request();

    await reqStatus.input('TaskId', sql.UniqueIdentifier, id)
                   .input('Status', sql.NVarChar(50), status)
                   .query('UPDATE Tasks SET Status = @Status WHERE TaskId = @TaskId');

    return res.json({ success: true, message: 'Status updated successfully' });
  } catch (err) {
    console.error('[updateStatus] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
  }
}

router.get('/', secured(listTasks));
router.put('/:id/assign', secured(assignTask));
router.put('/:id/progress', secured(updateProgress));
router.put('/:id/review', secured(reviewTask));
router.put('/:id/status', secured(updateStatus));

module.exports = router;
