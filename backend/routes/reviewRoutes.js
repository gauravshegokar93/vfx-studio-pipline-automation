const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');
const { logTaskHistory, createNotification } = require('../utils/historyHelper');
const REVIEWER_ROLES = ['Super Admin', 'Admin', 'Production Head', 'Department Supervisor', 'Team Lead', 'QC Artist', 'Lead'];

function securedReviewer(handler) {
  return authMiddleware(REVIEWER_ROLES, handler);
}

function securedAny(handler) {
  return authMiddleware(['Super Admin', 'Admin', 'Production Head', 'Department Supervisor', 'Team Lead', 'QC Artist', 'Lead', 'Artist'], handler);
}

/**
 * 1. POST /api/tasks/:id/submit-review
 * Artist submits an assigned task (Status 2: In Progress, or Status 5: Rework) for review.
 * Closes active TimeLog if present, creates TaskReview ('Submitted'), sets TaskMaster.StatusID = 3 ('Review').
 */
async function submitTaskForReview(req, res) {
  try {
    const taskId = parseInt(req.params.id, 10);
    const authUserId = parseInt(req.user?.userId, 10);
    const { remarks } = req.body || {};

    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'Task ID must be a positive integer.' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Lock and validate TaskMaster & TaskAssignment
      const taskReq = new sql.Request(transaction);
      taskReq.input('TaskId', sql.BigInt, taskId);

      const taskRes = await taskReq.query(`
        SELECT 
          t.TaskID, 
          t.TaskCode, 
          t.TaskName, 
          t.StatusID, 
          st.StatusName,
          ta.UserID AS AssignedUserID,
          ta.AssignedBy AS AssignedByUserID
        FROM TaskMaster t WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
        LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
        WHERE t.TaskID = @TaskId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      `);

      if (!taskRes.recordset || taskRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'TASK_NOT_FOUND', message: `Task ${taskId} not found or inactive.` });
      }

      const task = taskRes.recordset[0];
      const statusIdNum = parseInt(task.StatusID, 10);

      if (statusIdNum === 4 || task.StatusName === 'Completed') {
        await transaction.rollback();
        return res.status(400).json({ error: 'TASK_ALREADY_COMPLETED', message: 'Task is already completed.' });
      }

      if (statusIdNum === 3 || task.StatusName === 'Review') {
        await transaction.rollback();
        return res.status(400).json({ error: 'INVALID_STATUS_TRANSITION', message: 'Task is already submitted for review.' });
      }

      if (statusIdNum !== 2 && statusIdNum !== 5) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'INVALID_STATUS_TRANSITION', 
          message: `Task must be in In Progress (2) or Rework (5) status to submit for review. Current status: ${task.StatusName || task.StatusID}.` 
        });
      }

      if (!task.AssignedUserID) {
        await transaction.rollback();
        return res.status(403).json({ error: 'TASK_NOT_ASSIGNED', message: 'Task is not assigned to any artist.' });
      }

      if (parseInt(task.AssignedUserID, 10) !== authUserId) {
        await transaction.rollback();
        return res.status(403).json({ error: 'NOT_TASK_OWNER', message: 'You can only submit tasks assigned to you.' });
      }

      // 2. Check & close active TimeLog if present
      const logReq = new sql.Request(transaction);
      logReq.input('TaskId', sql.BigInt, taskId);
      logReq.input('UserId', sql.BigInt, authUserId);

      const activeLogRes = await logReq.query(`
        SELECT TOP 1 TimeLogID, StartTime 
        FROM TimeLog WITH (UPDLOCK, HOLDLOCK)
        WHERE TaskID = @TaskId AND UserID = @UserId AND EndTime IS NULL
        ORDER BY TimeLogID DESC
      `);

      if (activeLogRes.recordset && activeLogRes.recordset.length > 0) {
        const activeLog = activeLogRes.recordset[0];
        const closeReq = new sql.Request(transaction);
        closeReq.input('TimeLogId', sql.BigInt, activeLog.TimeLogID);

        await closeReq.query(`
          DECLARE @Now DATETIME2 = GETDATE();
          DECLARE @Start DATETIME2;
          SELECT @Start = StartTime FROM TimeLog WHERE TimeLogID = @TimeLogId;
          
          DECLARE @Seconds INT = DATEDIFF(SECOND, @Start, @Now);
          DECLARE @Hours DECIMAL(10,2) = CASE 
            WHEN @Seconds <= 0 THEN 0.01 
            ELSE ROUND(CAST(@Seconds AS DECIMAL(10,2)) / 3600.0, 2) 
          END;

          UPDATE TimeLog 
          SET EndTime = @Now, HoursWorked = @Hours 
          WHERE TimeLogID = @TimeLogId;
        `);
      }

      // 3. Create TaskReview row ('Submitted')
      const reviewReq = new sql.Request(transaction);
      reviewReq.input('TaskId', sql.BigInt, taskId);
      reviewReq.input('Remarks', sql.VarChar(500), remarks || 'Submitted for review');

      const reviewRes = await reviewReq.query(`
        INSERT INTO TaskReview (TaskID, ReviewerID, ReviewDate, ReviewStatus, Rating, Remarks)
        OUTPUT INSERTED.ReviewID, INSERTED.ReviewDate
        VALUES (@TaskId, NULL, GETDATE(), 'Submitted', NULL, @Remarks)
      `);

      // 4. Update TaskMaster.StatusID = 3 (Review)
      const updateReq = new sql.Request(transaction);
      updateReq.input('TaskId', sql.BigInt, taskId);
      await updateReq.query(`
        UPDATE TaskMaster 
        SET StatusID = 3 
        WHERE TaskID = @TaskId
      `);

      // 5. Log History & Notify
      await logTaskHistory(transaction, taskId, statusIdNum, 3, authUserId, remarks || 'Submitted for review');
      if (task.AssignedByUserID) {
        await createNotification(transaction, task.AssignedByUserID, 'REVIEW_SUBMITTED', 'Task Submitted', `Task ${task.TaskCode} was submitted for review.`, taskId);
      }

      await transaction.commit();

      const newReview = reviewRes.recordset[0];
      return res.status(200).json({
        success: true,
        message: 'Task submitted for review successfully.',
        reviewId: newReview.ReviewID,
        taskId: taskId,
        statusId: 3,
        submissionDate: newReview.ReviewDate
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[submitTaskForReview] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to submit task for review.', details: err.message });
  }
}

/**
 * 2. GET /api/reviews/queue
 * Fetch all tasks currently in status 3 (Review) for Reviewers.
 */
async function getReviewQueue(req, res) {
  try {
    const pool = await sql.connect(config);
    const queueReq = pool.request();

    const result = await queueReq.query(`
      SELECT 
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        ISNULL(t.EstimatedHours, 0) AS estimatedHours,
        ROUND(ISNULL(t.EstimatedHours, 0) / 8.0, 2) AS estimatedBid,
        ISNULL(ta.TargetHours, 0) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, 0) / 8.0, 2) AS targetBid,
        st.StatusId AS statusId,
        ISNULL(st.StatusName, 'Review') AS statusName,
        w.StageID AS stageId,
        w.StageName AS stageName,
        u.UserID AS assignedUserId,
        u.FullName AS assignedArtistName,
        u.Email AS assignedArtistEmail,
        s.ShotID AS shotId,
        s.ShotCode AS shotCode,
        tr.ReviewID AS reviewId,
        tr.ReviewDate AS submissionDate,
        tr.Remarks AS submissionRemarks,
        ISNULL(tl.ActualWorkedHours, 0.00) AS actualWorkedHours,
        ROUND(ISNULL(tl.ActualWorkedHours, 0.00) / 8.0, 2) AS actualWorkedBid
      FROM TaskMaster t
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN WorkflowStageMaster w ON t.WorkflowStageID = w.StageId
      LEFT JOIN UserMaster u ON ta.UserID = u.UserId
      LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
      OUTER APPLY (
        SELECT TOP 1 ReviewID, ReviewDate, Remarks 
        FROM TaskReview 
        WHERE TaskID = t.TaskID AND ReviewStatus = 'Submitted'
        ORDER BY ReviewID DESC
      ) tr
      OUTER APPLY (
        SELECT ROUND(SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ), 2) AS ActualWorkedHours
        FROM TimeLog
        WHERE TaskID = t.TaskID
      ) tl
      WHERE t.StatusID = 3 AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ORDER BY tr.ReviewDate DESC, t.TaskID DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.recordset.length,
      tasks: result.recordset
    });
  } catch (err) {
    console.error('[getReviewQueue] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch review queue.', details: err.message });
  }
}

/**
 * 3. GET /api/tasks/:id/reviews
 * Return chronological review and rework history for a given task.
 */
async function getTaskReviews(req, res) {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID', message: 'Task ID must be a positive integer.' });
    }

    const pool = await sql.connect(config);
    const reqDb = pool.request();
    reqDb.input('TaskId', sql.BigInt, taskId);

    const reviewsRes = await reqDb.query(`
      SELECT 
        tr.ReviewID AS reviewId,
        tr.TaskID AS taskId,
        tr.ReviewerID AS reviewerId,
        ru.FullName AS reviewerName,
        tr.ReviewDate AS reviewDate,
        tr.ReviewStatus AS reviewStatus,
        tr.Rating AS rating,
        tr.Remarks AS remarks,
        au.FullName AS artistName
      FROM TaskReview tr
      LEFT JOIN UserMaster ru ON tr.ReviewerID = ru.UserId
      LEFT JOIN TaskAssignment ta ON tr.TaskID = ta.TaskID
      LEFT JOIN UserMaster au ON ta.UserID = au.UserId
      WHERE tr.TaskID = @TaskId
      ORDER BY tr.ReviewID ASC
    `);

    const reworksRes = await reqDb.query(`
      SELECT 
        rw.ReworkID AS reworkId,
        rw.TaskID AS taskId,
        rw.RequestedBy AS requestedBy,
        requ.FullName AS requestedByName,
        rw.RequestedDate AS requestedDate,
        rw.Reason AS reason,
        rw.ReviewID AS reviewId,
        rw.AssignedToUserID AS assignedToUserId,
        au.FullName AS assignedToUserName,
        rw.AssignedByUserID AS assignedByUserId,
        rw.ReworkRound AS reworkRound,
        rw.PreviousWorkedMinutes AS previousWorkedMinutes,
        rw.AdditionalWorkedMinutes AS additionalWorkedMinutes,
        rw.TotalWorkedMinutes AS totalWorkedMinutes,
        rw.ReviewerRemarks AS reviewerRemarks,
        rw.IsCompleted AS isCompleted,
        rw.CreatedDate AS createdDate
      FROM TaskRework rw
      LEFT JOIN UserMaster requ ON rw.RequestedBy = requ.UserId
      LEFT JOIN UserMaster au ON rw.AssignedToUserID = au.UserId
      WHERE rw.TaskID = @TaskId
      ORDER BY rw.ReworkID ASC
    `);

    return res.status(200).json({
      success: true,
      taskId,
      reviews: reviewsRes.recordset,
      reworks: reworksRes.recordset
    });
  } catch (err) {
    console.error('[getTaskReviews] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch task review history.', details: err.message });
  }
}

/**
 * 4. POST /api/reviews/:reviewId/approve
 * Reviewer approves a submitted review. Updates TaskReview ('Approved') and TaskMaster.StatusID = 4 ('Completed').
 */
async function approveReview(req, res) {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const authUserId = parseInt(req.user?.userId, 10);
    const { rating, remarks } = req.body || {};

    if (isNaN(reviewId) || reviewId <= 0) {
      return res.status(400).json({ error: 'INVALID_REVIEW_ID', message: 'Review ID must be a positive integer.' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Lock TaskReview
      const revReq = new sql.Request(transaction);
      revReq.input('ReviewId', sql.BigInt, reviewId);

      const revRes = await revReq.query(`
        SELECT ReviewID, TaskID, ReviewStatus 
        FROM TaskReview WITH (UPDLOCK, HOLDLOCK)
        WHERE ReviewID = @ReviewId
      `);

      if (!revRes.recordset || revRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'REVIEW_NOT_FOUND', message: `Review ${reviewId} not found.` });
      }

      const review = revRes.recordset[0];

      if (review.ReviewStatus !== 'Submitted') {
        await transaction.rollback();
        return res.status(409).json({ 
          error: 'REVIEW_ALREADY_PROCESSED', 
          message: `Review ${reviewId} has already been processed (Current status: ${review.ReviewStatus}).` 
        });
      }

      // 2. Lock TaskMaster
      const taskReq = new sql.Request(transaction);
      taskReq.input('TaskId', sql.BigInt, review.TaskID);

      const taskRes = await taskReq.query(`
        SELECT t.TaskID, t.StatusID, ta.UserID AS AssignedUserID 
        FROM TaskMaster t WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
        WHERE t.TaskID = @TaskId
      `);

      if (!taskRes.recordset || taskRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'TASK_NOT_FOUND', message: `Task ${review.TaskID} not found.` });
      }

      const task = taskRes.recordset[0];
      if (parseInt(task.StatusID, 10) !== 3) {
        await transaction.rollback();
        return res.status(409).json({ 
          error: 'INVALID_STATUS_TRANSITION', 
          message: `Task ${review.TaskID} is not in Review status (Current status ID: ${task.StatusID}).` 
        });
      }

      // 3. Update TaskReview
      const updateRevReq = new sql.Request(transaction);
      updateRevReq.input('ReviewId', sql.BigInt, reviewId);
      updateRevReq.input('ReviewerId', sql.BigInt, authUserId);
      updateRevReq.input('Rating', sql.Int, rating ? parseInt(rating, 10) : null);
      updateRevReq.input('Remarks', sql.VarChar(500), remarks || 'Approved');

      await updateRevReq.query(`
        UPDATE TaskReview 
        SET ReviewStatus = 'Approved', ReviewerID = @ReviewerId, ReviewDate = GETDATE(), Rating = @Rating, Remarks = @Remarks
        WHERE ReviewID = @ReviewId
      `);

      // 4. Update TaskMaster StatusID = 4 (Completed)
      const updateTaskReq = new sql.Request(transaction);
      updateTaskReq.input('TaskId', sql.BigInt, review.TaskID);
      await updateTaskReq.query(`
        UPDATE TaskMaster 
        SET StatusID = 4 
        WHERE TaskID = @TaskId
      `);

      // 5. Log History & Notify
      await logTaskHistory(transaction, review.TaskID, task.StatusID, 4, authUserId, remarks || 'Approved');
      if (task.AssignedUserID) {
        await createNotification(transaction, task.AssignedUserID, 'TASK_APPROVED', 'Task Approved', `Your task ${task.TaskCode || review.TaskID} was approved.`, review.TaskID);
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Task review approved successfully. Task is now Completed.',
        reviewId,
        taskId: review.TaskID,
        statusId: 4
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[approveReview] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to approve review.', details: err.message });
  }
}

/**
 * 5. POST /api/reviews/:reviewId/rework
 * Reviewer requests rework on a submitted review. Updates TaskReview ('Rework'), creates TaskRework, and sets TaskMaster.StatusID = 5 ('Rework').
 */
async function requestRework(req, res) {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const authUserId = parseInt(req.user?.userId, 10);
    const { reason, reviewerRemarks } = req.body || {};

    if (isNaN(reviewId) || reviewId <= 0) {
      return res.status(400).json({ error: 'INVALID_REVIEW_ID', message: 'Review ID must be a positive integer.' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return res.status(400).json({ error: 'REASON_REQUIRED', message: 'A valid reason is required when requesting rework.' });
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Lock TaskReview
      const revReq = new sql.Request(transaction);
      revReq.input('ReviewId', sql.BigInt, reviewId);

      const revRes = await revReq.query(`
        SELECT ReviewID, TaskID, ReviewStatus 
        FROM TaskReview WITH (UPDLOCK, HOLDLOCK)
        WHERE ReviewID = @ReviewId
      `);

      if (!revRes.recordset || revRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'REVIEW_NOT_FOUND', message: `Review ${reviewId} not found.` });
      }

      const review = revRes.recordset[0];

      if (review.ReviewStatus !== 'Submitted') {
        await transaction.rollback();
        return res.status(409).json({ 
          error: 'REVIEW_ALREADY_PROCESSED', 
          message: `Review ${reviewId} has already been processed (Current status: ${review.ReviewStatus}).` 
        });
      }

      // 2. Lock TaskMaster
      const taskId = review.TaskID;
      const taskReq = new sql.Request(transaction);
      taskReq.input('TaskId', sql.BigInt, taskId);

      const taskRes = await taskReq.query(`
        SELECT TaskID, StatusID 
        FROM TaskMaster WITH (UPDLOCK, HOLDLOCK)
        WHERE TaskID = @TaskId
      `);

      if (!taskRes.recordset || taskRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'TASK_NOT_FOUND', message: `Task ${taskId} not found.` });
      }

      const task = taskRes.recordset[0];
      if (parseInt(task.StatusID, 10) !== 3) {
        await transaction.rollback();
        return res.status(409).json({ 
          error: 'INVALID_STATUS_TRANSITION', 
          message: `Task ${taskId} is not in Review status (Current status ID: ${task.StatusID}).` 
        });
      }

      // 3. Update TaskReview status to 'Rework'
      const updateRevReq = new sql.Request(transaction);
      updateRevReq.input('ReviewId', sql.BigInt, reviewId);
      updateRevReq.input('ReviewerId', sql.BigInt, authUserId);
      updateRevReq.input('Remarks', sql.VarChar(500), reviewerRemarks || reason);

      await updateRevReq.query(`
        UPDATE TaskReview 
        SET ReviewStatus = 'Rework', ReviewerID = @ReviewerId, ReviewDate = GETDATE(), Remarks = @Remarks
        WHERE ReviewID = @ReviewId
      `);

      // 4. Find assigned artist & calculate rework round & worked minutes
      const assignReq = new sql.Request(transaction);
      assignReq.input('TaskId', sql.BigInt, taskId);
      const assignRes = await assignReq.query(`
        SELECT TOP 1 UserID FROM TaskAssignment WHERE TaskID = @TaskId ORDER BY AssignmentID DESC
      `);
      const assignedToUserId = assignRes.recordset && assignRes.recordset.length > 0 ? assignRes.recordset[0].UserID : authUserId;

      const roundReq = new sql.Request(transaction);
      roundReq.input('TaskId', sql.BigInt, taskId);
      const roundRes = await roundReq.query(`
        SELECT ISNULL(MAX(ReworkRound), 0) + 1 AS NextRound FROM TaskRework WHERE TaskID = @TaskId
      `);
      const nextRound = roundRes.recordset[0].NextRound;

      const minsReq = new sql.Request(transaction);
      minsReq.input('TaskId', sql.BigInt, taskId);
      const minsRes = await minsReq.query(`
        SELECT CAST(ISNULL(SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked * 60.0
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 60.0
          END
        ), 0) AS INT) AS TotalWorkedMinutes
        FROM TimeLog
        WHERE TaskID = @TaskId
      `);
      const totalWorkedMinutes = minsRes.recordset[0].TotalWorkedMinutes;

      // 5. Insert TaskRework record
      const insertRewReq = new sql.Request(transaction);
      insertRewReq.input('TaskId', sql.BigInt, taskId);
      insertRewReq.input('RequestedBy', sql.BigInt, authUserId);
      insertRewReq.input('Reason', sql.VarChar(500), reason.trim());
      insertRewReq.input('ReviewId', sql.BigInt, reviewId);
      insertRewReq.input('AssignedToUserID', sql.BigInt, assignedToUserId);
      insertRewReq.input('AssignedByUserID', sql.BigInt, authUserId);
      insertRewReq.input('ReworkRound', sql.Int, nextRound);
      insertRewReq.input('PreviousWorkedMinutes', sql.Int, totalWorkedMinutes);
      insertRewReq.input('AdditionalWorkedMinutes', sql.Int, 0);
      insertRewReq.input('TotalWorkedMinutes', sql.Int, totalWorkedMinutes);
      insertRewReq.input('ReviewerRemarks', sql.NVarChar(1000), reviewerRemarks ? reviewerRemarks.trim() : null);
      insertRewReq.input('CreatedBy', sql.BigInt, authUserId);

      const rewRes = await insertRewReq.query(`
        INSERT INTO TaskRework (
          TaskID, RequestedBy, RequestedDate, Reason, StatusID, ReviewID,
          AssignedToUserID, AssignedByUserID, ReworkRound,
          PreviousWorkedMinutes, AdditionalWorkedMinutes, TotalWorkedMinutes,
          ReviewerRemarks, ReworkStartTime, ReworkEndTime, IsCompleted,
          CreatedBy, CreatedDate, IsDeleted
        )
        OUTPUT INSERTED.ReworkID
        VALUES (
          @TaskId, @RequestedBy, GETDATE(), @Reason, 5, @ReviewId,
          @AssignedToUserID, @AssignedByUserID, @ReworkRound,
          @PreviousWorkedMinutes, @AdditionalWorkedMinutes, @TotalWorkedMinutes,
          @ReviewerRemarks, NULL, NULL, 0,
          @CreatedBy, GETDATE(), 0
        )
      `);

      // 6. Update TaskMaster StatusID = 5 (Rework)
      const updateTaskReq = new sql.Request(transaction);
      updateTaskReq.input('TaskId', sql.BigInt, taskId);
      await updateTaskReq.query(`
        UPDATE TaskMaster 
        SET StatusID = 5 
        WHERE TaskID = @TaskId
      `);

      // 7. Log History & Notify
      await logTaskHistory(transaction, taskId, task.StatusID, 5, authUserId, reason.trim());
      if (assignedToUserId) {
        await createNotification(transaction, assignedToUserId, 'REWORK_REQUESTED', 'Rework Requested', `Rework requested for task.`, taskId);
      }

      await transaction.commit();

      const newRework = rewRes.recordset[0];

      return res.status(200).json({
        success: true,
        message: `Rework requested successfully (Round ${nextRound}). Task is now in Rework status.`,
        reworkId: newRework.ReworkID,
        reviewId,
        taskId,
        reworkRound: nextRound,
        statusId: 5
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[requestRework] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to request rework.', details: err.message });
  }
}

// Router routes under /api/reviews
router.get('/queue', securedReviewer(getReviewQueue));
router.post('/:reviewId/approve', securedReviewer(approveReview));
router.post('/:reviewId/rework', securedReviewer(requestRework));

module.exports = router;
module.exports.submitTaskForReview = submitTaskForReview;
module.exports.getTaskReviews = getTaskReviews;
module.exports.securedAny = securedAny;
