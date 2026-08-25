const { sql, config } = require('../config/db');

async function getRoles() {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT RoleId, RoleName, RoleLevel, IsActive
        FROM RoleMaster
    `);
    const roles = result.recordset;
    
    for (let role of roles) {
        const perms = await pool.request()
            .input('RoleId', sql.BigInt, role.RoleId)
            .query(`
                SELECT p.PermissionName
                FROM RolePermission rp
                JOIN PermissionMaster p ON rp.PermissionId = p.PermissionId
                WHERE rp.RoleId = @RoleId AND rp.IsActive = 1 AND p.IsActive = 1
            `);
        role.permissions = perms.recordset.map(p => p.PermissionName);
    }
    
    return roles;
}

async function getRolePermissions(roleId) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('RoleId', sql.BigInt, roleId)
        .query(`
            SELECT p.PermissionId, p.PermissionName, p.Category, p.Description
            FROM RolePermission rp
            JOIN PermissionMaster p ON rp.PermissionId = p.PermissionId
            WHERE rp.RoleId = @RoleId AND rp.IsActive = 1 AND p.IsActive = 1
        `);
    return result.recordset;
}

async function updateRolePermissions(roleId, permissionIds) {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const request = new sql.Request(transaction);
        request.input('RoleId', sql.BigInt, roleId);
        
        // Deactivate existing permissions
        await request.query(`
            UPDATE RolePermission
            SET IsActive = 0, ModifiedOn = GETDATE()
            WHERE RoleId = @RoleId
        `);
        
        // Insert new ones
        if (permissionIds && permissionIds.length > 0) {
            for (const pid of permissionIds) {
                const req2 = new sql.Request(transaction);
                req2.input('RoleId', sql.BigInt, roleId);
                req2.input('PermissionId', sql.Int, pid);
                
                // Try to reactivate if exists, else insert
                await req2.query(`
                    IF EXISTS (SELECT 1 FROM RolePermission WHERE RoleId = @RoleId AND PermissionId = @PermissionId)
                    BEGIN
                        UPDATE RolePermission SET IsActive = 1, ModifiedOn = GETDATE()
                        WHERE RoleId = @RoleId AND PermissionId = @PermissionId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO RolePermission (RoleId, PermissionId, IsActive, CreatedOn)
                        VALUES (@RoleId, @PermissionId, 1, GETDATE())
                    END
                `);
            }
        }
        await transaction.commit();
        return true;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

module.exports = {
    getRoles,
    getRolePermissions,
    updateRolePermissions
};
