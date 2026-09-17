const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

// Allow any authenticated user to fetch their own notifications
function securedAny(handler) {
  return authMiddleware(['Super Admin', 'Admin', 'Production Head', 'Department Supervisor', 'Team Lead', 'QC Artist', 'Lead', 'Artist'], handler);
}

// 1. GET /api/notifications - Fetch all unread/active notifications for the current user
async function getNotifications(req, res) {
  try {
    const authUserId = parseInt(req.user?.userId, 10);
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }

    const pool = await sql.connect(config);
    const reqDb = pool.request();
    reqDb.input('UserId', sql.BigInt, authUserId);

    const result = await reqDb.query(`
      SELECT 
        NotificationID as id,
        NotificationType as type,
        Title as title,
        Message as message,
        IsRead as isRead,
        CreatedDate as createdDate,
        ReferenceID as referenceId
      FROM Notification
      WHERE UserID = @UserId AND (ExpiryDate IS NULL OR ExpiryDate > GETDATE())
      ORDER BY CreatedDate DESC
    `);

    return res.status(200).json({
      success: true,
      notifications: result.recordset
    });
  } catch (err) {
    console.error('[getNotifications] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch notifications.', details: err.message });
  }
}

// 2. POST /api/notifications/:id/read - Mark notification as read
async function markNotificationAsRead(req, res) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const authUserId = parseInt(req.user?.userId, 10);

    if (isNaN(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'Invalid notification ID.' });
    }
    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }

    const pool = await sql.connect(config);
    const reqDb = pool.request();
    reqDb.input('NotificationId', sql.BigInt, notificationId);
    reqDb.input('UserId', sql.BigInt, authUserId);

    const result = await reqDb.query(`
      UPDATE Notification 
      SET IsRead = 1, ReadDate = GETDATE()
      WHERE NotificationID = @NotificationId AND UserID = @UserId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (err) {
    console.error('[markNotificationAsRead] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to mark notification as read.', details: err.message });
  }
}

// 3. POST /api/notifications/mark-all-read - Mark all notifications as read
async function markAllNotificationsAsRead(req, res) {
  try {
    const authUserId = parseInt(req.user?.userId, 10);

    if (isNaN(authUserId) || authUserId <= 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid authenticated user.' });
    }

    const pool = await sql.connect(config);
    const reqDb = pool.request();
    reqDb.input('UserId', sql.BigInt, authUserId);

    const result = await reqDb.query(`
      UPDATE Notification 
      SET IsRead = 1, ReadDate = GETDATE()
      WHERE UserID = @UserId AND IsRead = 0
    `);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      count: result.rowsAffected[0]
    });
  } catch (err) {
    console.error('[markAllNotificationsAsRead] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to mark all notifications as read.', details: err.message });
  }
}

router.get('/', securedAny(getNotifications));
router.post('/mark-all-read', securedAny(markAllNotificationsAsRead));
router.post('/:id/read', securedAny(markNotificationAsRead));

module.exports = router;
