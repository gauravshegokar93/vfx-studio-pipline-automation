const { sql, config } = require('./config/db');

async function verifyDB() {
    try {
        const pool = await sql.connect(config);
        
        console.log("=== RoleMaster ===");
        const roles = await pool.request().query('SELECT RoleId, RoleName, RoleLevel FROM RoleMaster');
        console.table(roles.recordset);

        console.log("=== UserMaster (Safe Columns) ===");
        const users = await pool.request().query('SELECT UserId, EmployeeCode, FullName, Email, RoleId, HomeDepartmentId, HomeTeamId, IsActive FROM UserMaster');
        console.table(users.recordset);
        
        console.log("=== PermissionMaster ===");
        const perms = await pool.request().query('SELECT TOP 5 PermissionId, PermissionName, Category FROM PermissionMaster');
        console.table(perms.recordset);
        
        console.log("=== RolePermission (Sample) ===");
        const rolePerms = await pool.request().query('SELECT TOP 15 * FROM RolePermission');
        console.table(rolePerms.recordset);
        
        console.log("=== UserPermission (Sample) ===");
        const userPerms = await pool.request().query('SELECT TOP 15 * FROM UserPermission');
        console.table(userPerms.recordset);
        
        process.exit(0);
    } catch (err) {
        console.error("DB Error:", err);
        process.exit(1);
    }
}

verifyDB();
