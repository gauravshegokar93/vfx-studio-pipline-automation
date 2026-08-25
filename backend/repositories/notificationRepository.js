const { sql, config } = require('../config/db');

async function getNotificationsByUser(userId) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('UserId', sql.BigInt, userId)
        .query(`
            SELECT 
                NotificationID as id,
                UserID as userId,
                NotificationType as type,
                Title as title,
                Message as message,
                IsRead as isRead,
                ReadDate as readDate,
                CreatedDate as createdAt
            FROM Notification
            WHERE UserID = @UserId
            ORDER BY CreatedDate DESC
        `);
    return result.recordset;
}

async function createNotification(userId, type, title, message) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('UserId', sql.BigInt, userId)
        .input('NotificationType', sql.VarChar(50), type)
        .input('Title', sql.VarChar(200), title)
        .input('Message', sql.VarChar(sql.MAX), message)
        .query(`
            INSERT INTO Notification (UserID, NotificationType, Title, Message, IsRead, CreatedDate)
            OUTPUT INSERTED.NotificationID as id, INSERTED.CreatedDate as createdAt
            VALUES (@UserId, @NotificationType, @Title, @Message, 0, GETDATE())
        `);
    return result.recordset[0];
}

async function markAsRead(notificationId, userId) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('NotificationID', sql.BigInt, notificationId)
        .input('UserId', sql.BigInt, userId)
        .query(`
            UPDATE Notification
            SET IsRead = 1, ReadDate = GETDATE()
            WHERE NotificationID = @NotificationID AND UserID = @UserId
        `);
    return result.rowsAffected[0] > 0;
}

async function markAllAsRead(userId) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('UserId', sql.BigInt, userId)
        .query(`
            UPDATE Notification
            SET IsRead = 1, ReadDate = GETDATE()
            WHERE UserID = @UserId AND IsRead = 0
        `);
    return result.rowsAffected[0] > 0;
}

module.exports = {
    getNotificationsByUser,
    createNotification,
    markAsRead,
    markAllAsRead
};
