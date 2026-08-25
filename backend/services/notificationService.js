const notificationRepository = require('../repositories/notificationRepository');
const userRepository = require('../repositories/userRepository');

async function getNotificationsByUser(userId) {
    if (!userId) {
        const err = new Error('User ID is required');
        err.statusCode = 400;
        throw err;
    }
    const notifications = await notificationRepository.getNotificationsByUser(userId);
    return notifications.map(n => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: Boolean(n.isRead),
        readDate: n.readDate,
        createdAt: n.createdAt
    }));
}

async function createNotification(targetUserId, type, title, message) {
    if (!targetUserId || !message) {
        const err = new Error('Target User ID and message are required');
        err.statusCode = 400;
        throw err;
    }

    // Verify recipient exists
    const user = await userRepository.getUserById(targetUserId);
    if (!user) {
        const err = new Error('Recipient user not found');
        err.statusCode = 404;
        throw err;
    }

    const notificationType = type || 'SystemAlert';
    const notificationTitle = title || 'New Notification';

    return await notificationRepository.createNotification(
        targetUserId,
        notificationType,
        notificationTitle,
        message
    );
}

async function markAsRead(notificationId, userId) {
    if (!notificationId || !userId) {
        const err = new Error('Notification ID and User ID are required');
        err.statusCode = 400;
        throw err;
    }

    const success = await notificationRepository.markAsRead(notificationId, userId);
    if (!success) {
        const err = new Error('Notification not found or access denied');
        err.statusCode = 404;
        throw err;
    }
    return { success: true };
}

async function markAllAsRead(userId) {
    if (!userId) {
        const err = new Error('User ID is required');
        err.statusCode = 400;
        throw err;
    }

    const success = await notificationRepository.markAllAsRead(userId);
    return { success: true };
}

module.exports = {
    getNotificationsByUser,
    createNotification,
    markAsRead,
    markAllAsRead
};
