const { sql, config } = require('../config/db');

async function withDb(callback) {
  const pool = await sql.connect(config);

  try {
    return await callback(pool);
  } finally {
    // mssql pooling handled automatically
  }
}
async function beginTransaction() {
    const pool = await sql.connect(config);

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    return transaction;
}
async function rollbackTransaction(transaction) {

    if (transaction) {

        await transaction.rollback();

    }

}
async function commitTransaction(transaction) {

    if (transaction) {

        await transaction.commit();

    }

}
// ==========================================
// Get All Users
// ==========================================

async function getUsers(filters = {}) {

  return withDb(async (pool) => {

    const request = pool.request();

    let where = [];
    let whereSql = '';

    if (filters.q) {
      request.input('Q', sql.NVarChar, `%${filters.q}%`);
      where.push(`
        (
          um.FullName LIKE @Q
          OR um.Email LIKE @Q
          OR um.EmployeeCode LIKE @Q
        )
      `);
    }

    if (filters.departmentId) {
      request.input('DepartmentId', sql.BigInt, filters.departmentId);
      where.push('um.HomeDepartmentId = @DepartmentId');
    }

    if (filters.role) {
      request.input('Role', sql.NVarChar, filters.role);
      where.push('rm.RoleName = @Role');
    }

    if (filters.status !== undefined) {
      request.input('IsActive', sql.Bit, filters.status);
      where.push('um.IsActive = @IsActive');
    }

    if (where.length > 0) {
      whereSql = 'WHERE ' + where.join(' AND ');
    }

    const result = await request.query(`
      SELECT
          um.UserId,
          um.EmployeeCode,
          um.FullName,
          um.Email,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      ${whereSql}
    `);

    return result.recordset;

  });

}

// ==========================================
// Get User By Id
// ==========================================

async function getUserById(userId) {

  return withDb(async (pool) => {

    const request = pool.request();

    request.input('UserId', sql.BigInt, userId);

    const result = await request.query(`
      SELECT
          um.UserId,
          um.EmployeeCode,
          um.FullName,
          um.Email,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE um.UserId = @UserId
    `);

    return result.recordset[0];

  });

}

// ==========================================
// Get User By Email
// ==========================================

async function getUserByEmail(email) {

  return withDb(async (pool) => {

    const request = pool.request();

    request.input('Email', sql.NVarChar, email);

    const result = await request.query(`
      SELECT
          um.UserId,
          um.EmployeeCode,
          um.FullName,
          um.Email,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE um.Email = @Email
    `);

    return result.recordset[0];

  });

}

// ==========================================
// Get User By Employee Code
// ==========================================

async function getUserByEmployeeCode(employeeCode) {

  return withDb(async (pool) => {

    const request = pool.request();

    request.input('EmployeeCode', sql.NVarChar, employeeCode);

    const result = await request.query(`
      SELECT
          um.UserId,
          um.EmployeeCode,
          um.FullName,
          um.Email,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE um.EmployeeCode = @EmployeeCode
    `);

    return result.recordset[0];

  });

}

// ==========================================
// Create User
// ==========================================

async function createUser(transaction, user) {

  const request = new sql.Request(transaction);

  request.input('UserId', sql.BigInt, user.userId);
  request.input('EmployeeCode', sql.NVarChar(50), user.employeeCode);
  request.input('FullName', sql.NVarChar(255), user.name);
  request.input('Email', sql.NVarChar(255), user.email);
  request.input('RoleId', sql.BigInt, user.roleId);
  request.input('HomeDepartmentId', sql.BigInt, user.departmentId);
  request.input('HomeTeamId', sql.BigInt, user.teamId);
  request.input('ReportingManagerId', sql.BigInt, user.leadId);
  request.input('PasswordHash', sql.NVarChar(sql.MAX), user.passwordHash);
  request.input('IsActive', sql.Bit, user.isActive !== undefined ? user.isActive : 1);

  await request.query(`
      INSERT INTO UserMaster
      (
          UserId,
          EmployeeCode,
          FullName,
          Email,
          RoleId,
          HomeDepartmentId,
          HomeTeamId,
          ReportingManagerId,
          PasswordHash,
          IsActive
      )
      VALUES
      (
          @UserId,
          @EmployeeCode,
          @FullName,
          @Email,
          @RoleId,
          @HomeDepartmentId,
          @HomeTeamId,
          @ReportingManagerId,
          @PasswordHash,
          @IsActive
      )
  `);

}

async function getRoleByName(roleName) {
    return withDb(async (pool) => {
        const request = pool.request();
        request.input('RoleName', sql.NVarChar, roleName);
        const result = await request.query(`
            SELECT RoleId FROM RoleMaster WHERE RoleName = @RoleName
        `);
        return result.recordset[0] || null;
    });
}

async function getNextUserId() {
    const result = await withDb(async (pool) => {
        const request = pool.request();
        return await request.query(`
            SELECT NEXT VALUE FOR dbo.SEQ_UserId AS UserId
        `);
    });
    return result.recordset[0]?.UserId || null;
}

async function toggleUserStatus(userId) {

  return withDb(async (pool) => {

    const request = pool.request();

    request.input('UserId', sql.BigInt, userId);

    const check = await request.query(`
        SELECT IsActive
        FROM UserMaster
        WHERE UserId = @UserId
    `);

    if (!check.recordset.length) {

      return null;

    }

    const newStatus = check.recordset[0].IsActive ? 0 : 1;

    const update = pool.request();

    update.input('UserId', sql.BigInt, userId);

    update.input('IsActive', sql.Bit, newStatus);

    await update.query(`
        UPDATE UserMaster
        SET IsActive = @IsActive
        WHERE UserId = @UserId
    `);

    return newStatus === 1;

  });
}

// ==========================================
// Get Password Hash By User Id
// ==========================================

async function getPasswordHashByUserId(userId) {
    return withDb(async (pool) => {
        const request = pool.request();
        request.input('UserId', sql.BigInt, userId);
        const result = await request.query(`
            SELECT UserId, PasswordHash, IsActive
            FROM UserMaster
            WHERE UserId = @UserId
        `);
        return result.recordset[0] || null;
    });
}

// ==========================================
// Update Password Hash
// ==========================================

async function updatePasswordHash(userId, passwordHash) {
    return withDb(async (pool) => {
        const request = pool.request();
        request.input('UserId', sql.BigInt, userId);
        request.input('PasswordHash', sql.NVarChar(sql.MAX), passwordHash);
        await request.query(`
            UPDATE UserMaster
            SET PasswordHash = @PasswordHash,
                ModifiedOn = GETDATE(),
                ModifiedBy = @UserId
            WHERE UserId = @UserId
        `);
    });
}

// ==========================================
// Exports
// ==========================================

async function getUserPermissions(userId) {
    const pool = await sql.connect(config);
    const userResult = await pool.request()
        .input('UserId', sql.BigInt, userId)
        .query('SELECT RoleId FROM UserMaster WHERE UserId = @UserId');
        
    if (userResult.recordset.length === 0) return [];
    
    const roleId = userResult.recordset[0].RoleId;
    
    const result = await pool.request()
        .input('RoleId', sql.BigInt, roleId)
        .input('UserId', sql.BigInt, userId)
        .query(`
          SELECT pm.PermissionName
          FROM RolePermission rp
          JOIN PermissionMaster pm ON rp.PermissionId = pm.PermissionId
          WHERE rp.RoleId = @RoleId AND rp.IsActive = 1 AND pm.IsActive = 1
          UNION
          SELECT pm.PermissionName
          FROM UserPermission up
          JOIN PermissionMaster pm ON up.PermissionId = pm.PermissionId
          WHERE up.UserId = @UserId AND up.IsGrant = 1 AND up.IsActive = 1 AND pm.IsActive = 1
          EXCEPT
          SELECT pm.PermissionName
          FROM UserPermission up
          JOIN PermissionMaster pm ON up.PermissionId = pm.PermissionId
          WHERE up.UserId = @UserId AND up.IsGrant = 0 AND up.IsActive = 1 AND pm.IsActive = 1
        `);
    return result.recordset.map(r => r.PermissionName);
}

async function updateUserPermissions(userId, grantIds, denyIds) {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const request = new sql.Request(transaction);
        request.input('UserId', sql.BigInt, userId);
        
        // Deactivate all existing overrides
        await request.query(`
            UPDATE UserPermission
            SET IsActive = 0, ModifiedOn = GETDATE()
            WHERE UserId = @UserId
        `);
        
        // Helper to insert/update
        const upsertPerm = async (pid, isGrant) => {
            const req2 = new sql.Request(transaction);
            req2.input('UserId', sql.BigInt, userId);
            req2.input('PermissionId', sql.Int, pid);
            req2.input('IsGrant', sql.Bit, isGrant ? 1 : 0);
            await req2.query(`
                IF EXISTS (SELECT 1 FROM UserPermission WHERE UserId = @UserId AND PermissionId = @PermissionId)
                BEGIN
                    UPDATE UserPermission 
                    SET IsActive = 1, IsGrant = @IsGrant, ModifiedOn = GETDATE()
                    WHERE UserId = @UserId AND PermissionId = @PermissionId
                END
                ELSE
                BEGIN
                    INSERT INTO UserPermission (UserId, PermissionId, IsGrant, IsActive, CreatedOn)
                    VALUES (@UserId, @PermissionId, @IsGrant, 1, GETDATE())
                END
            `);
        };

        if (grantIds && grantIds.length > 0) {
            for (const pid of grantIds) {
                await upsertPerm(pid, true);
            }
        }
        
        if (denyIds && denyIds.length > 0) {
            for (const pid of denyIds) {
                await upsertPerm(pid, false);
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

    withDb,

    beginTransaction,

    commitTransaction,

    rollbackTransaction,

    getUsers,

    getUserById,

    getUserByEmail,

    getUserByEmployeeCode,

    createUser,

    getRoleByName,

    getNextUserId,

    getPasswordHashByUserId,

    updatePasswordHash,

    toggleUserStatus,

    getUserPermissions,

    updateUserPermissions

};
