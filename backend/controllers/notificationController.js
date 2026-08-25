const authMiddleware = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

function secured(handler, allowedPermissions = []) {
    return authMiddleware(
        allowedPermissions,
        handler
    );
}

// ==========================================
// Get Notifications
// ==========================================

async function getNotifications(req, res) {
    try {
        // Only fetch notifications for the authenticated user
        const notifications = await notificationService.getNotificationsByUser(req.user.userId);
        return res.json({
            success: true,
            notifications
        });
    } catch (err) {
        console.error('[getNotifications]', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
}

// ==========================================
// Create Notification
// ==========================================

async function createNotification(req, res) {
    try {
        const { targetUserId, type, title, message } = req.body;
        
        const result = await notificationService.createNotification(
            targetUserId, 
            type, 
            title, 
            message
        );

        return res.status(201).json({
            success: true,
            notification: result
        });
    } catch (err) {
        console.error('[createNotification]', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
}

// ==========================================
// Mark as Read
// ==========================================

async function markAsRead(req, res) {
    try {
        const notificationId = req.params.id;
        // Verify that the user marking it as read is the owner
        const result = await notificationService.markAsRead(notificationId, req.user.userId);
        return res.json(result);
    } catch (err) {
        console.error('[markAsRead]', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
}

// ==========================================
// Mark All as Read
// ==========================================

async function markAllAsRead(req, res) {
    try {
        const result = await notificationService.markAllAsRead(req.user.userId);
        return res.json(result);
    } catch (err) {
        console.error('[markAllAsRead]', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
}

module.exports = {
    getNotifications: secured(getNotifications, ['notifications.view']),
    createNotification: secured(createNotification, ['notifications.create']),
    markAsRead: secured(markAsRead, ['notifications.view']),
    markAllAsRead: secured(markAllAsRead, ['notifications.view'])
};
