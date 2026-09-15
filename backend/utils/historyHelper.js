const { sql } = require('../config/db');

/**
 * Helper to log task status changes into TaskHistory
 */
async function logTaskHistory(transaction, taskId, oldStatusId, newStatusId, changedByUserId, remarks = '') {
  const req = new sql.Request(transaction);
  req.input('TaskID', sql.BigInt, taskId);
  req.input('OldStatusID', sql.BigInt, oldStatusId || null);
  req.input('NewStatusID', sql.BigInt, newStatusId);
  req.input('ChangedBy', sql.BigInt, changedByUserId);
  req.input('Remarks', sql.VarChar(500), remarks);

  await req.query(`
    INSERT INTO TaskHistory (TaskID, OldStatusID, NewStatusID, ChangedBy, ChangedDate, Remarks)
    VALUES (@TaskID, @OldStatusID, @NewStatusID, @ChangedBy, GETDATE(), @Remarks)
  `);
}

/**
 * Helper to log a Notification
 */
async function createNotification(transaction, userId, type, title, message, referenceId = null) {
  if (!userId) return; // Don't crash if no user to notify

  const req = new sql.Request(transaction);
  req.input('UserID', sql.BigInt, userId);
  req.input('NotificationType', sql.VarChar(50), type);
  req.input('Title', sql.VarChar(200), title);
  req.input('Message', sql.VarChar(1000), message);
  req.input('ReferenceID', sql.BigInt, referenceId);

  await req.query(`
    INSERT INTO Notification (UserID, NotificationType, Title, Message, IsRead, CreatedDate, ExpiryDate, ReferenceID)
    VALUES (@UserID, @NotificationType, @Title, @Message, 0, GETDATE(), DATEADD(day, 30, GETDATE()), @ReferenceID)
  `);
}

/**
 * Helper to log task assignment into TaskAssignmentHistory
 */
async function logTaskAssignmentHistory(transaction, taskId, assignedToUserId, assignedByUserId, assignmentType, targetHours = null) {
  const req = new sql.Request(transaction);
  req.input('TaskID', sql.BigInt, taskId);
  req.input('AssignedToUserID', sql.BigInt, assignedToUserId);
  req.input('AssignedByUserID', sql.BigInt, assignedByUserId);
  req.input('AssignmentType', sql.NVarChar(100), assignmentType);
  req.input('EstimatedHours', sql.Decimal, targetHours);

  await req.query(`
    INSERT INTO TaskAssignmentHistory (TaskID, AssignedToUserID, AssignedByUserID, AssignmentType, AssignedDate, EstimatedHours, CreatedOn)
    VALUES (@TaskID, @AssignedToUserID, @AssignedByUserID, @AssignmentType, GETDATE(), @EstimatedHours, GETDATE())
  `);
}

module.exports = {
  logTaskHistory,
  createNotification,
  logTaskAssignmentHistory
};
