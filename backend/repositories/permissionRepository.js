const { sql, config } = require('../config/db');

async function getPermissions() {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT PermissionId, PermissionName, Description, Category
        FROM PermissionMaster
        WHERE IsActive = 1
        ORDER BY Category, PermissionName
    `);
    return result.recordset;
}

module.exports = {
    getPermissions
};
