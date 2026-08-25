const { sql, config } = require('../config/db');

async function withDb(callback) {
    const pool = await sql.connect(config);
    try {
        return await callback(pool);
    } finally {
        // mssql pooling handled automatically
    }
}

// ==========================================
// Invalidate Refresh Token
// ==========================================

async function invalidateRefreshToken(userId, refreshToken) {
    return withDb(async (pool) => {
        const request = pool.request();
        request.input('UserId', sql.BigInt, userId);
        request.input('RefreshToken', sql.NVarChar(4000), String(refreshToken));
        await request.query(`
            UPDATE UserSessions
            SET IsRevoked = 1
            WHERE RefreshToken = @RefreshToken AND UserId = @UserId;
        `);
    });
}

// ==========================================
// Invalidate All Sessions
// ==========================================

async function invalidateAllSessions(userId) {
    return withDb(async (pool) => {
        const request = pool.request();
        request.input('UserId', sql.BigInt, userId);
        await request.query(`
            UPDATE UserSessions
            SET IsRevoked = 1
            WHERE UserId = @UserId;
        `);
    });
}

// ==========================================
// Exports
// ==========================================

module.exports = {
    withDb,
    invalidateRefreshToken,
    invalidateAllSessions
};
