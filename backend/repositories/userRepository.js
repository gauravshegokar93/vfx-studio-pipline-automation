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
      where.push(`(
          um.FullName LIKE @Q
          OR um.Email LIKE @Q
          OR um.EmployeeCode LIKE @Q
        )`);
    }

    if (filters.departmentId) {
      const deptIdNum = parseInt(filters.departmentId, 10);
      if (!isNaN(deptIdNum)) {
        request.input('DepartmentId', sql.BigInt, deptIdNum);
        where.push('um.HomeDepartmentId = @DepartmentId');
      }
    }

    if (filters.teamId) {
      const teamIdNum = parseInt(filters.teamId, 10);
      if (!isNaN(teamIdNum)) {
        request.input('TeamId', sql.BigInt, teamIdNum);
        where.push('um.HomeTeamId = @TeamId');
      }
    }

    if (filters.role) {
      request.input('Role', sql.NVarChar, filters.role);
      where.push('rm.RoleName = @Role');
    }

    if (filters.roleId) {
      const roleIdNum = parseInt(filters.roleId, 10);
      if (!isNaN(roleIdNum)) {
        request.input('RoleId', sql.BigInt, roleIdNum);
        where.push('um.RoleId = @RoleId');
      }
    }

    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      request.input('IsActive', sql.Bit, filters.status ? 1 : 0);
      where.push('um.IsActive = @IsActive');
    }

    if (filters.reportingManagerId) {
      const rmIdNum = parseInt(filters.reportingManagerId, 10);
      if (!isNaN(rmIdNum)) {
        request.input('ReportingManagerId', sql.BigInt, rmIdNum);
        where.push('um.ReportingManagerId = @ReportingManagerId');
      }
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
          um.Mobile,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.ReportingManagerId,
          mgr.FullName AS ReportingManagerName,
          um.IsActive,
          um.JoiningDate
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
      ${whereSql}
      ORDER BY um.FullName ASC
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
          um.Mobile,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.ReportingManagerId,
          mgr.FullName AS ReportingManagerName,
          um.IsActive,
          um.JoiningDate
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
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
          um.Mobile,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.ReportingManagerId,
          mgr.FullName AS ReportingManagerName,
          um.IsActive,
          um.JoiningDate
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
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
          um.Mobile,
          um.RoleId,
          rm.RoleName,
          um.HomeDepartmentId,
          dm.DepartmentName,
          um.HomeTeamId,
          tm.TeamName,
          um.ReportingManagerId,
          mgr.FullName AS ReportingManagerName,
          um.IsActive,
          um.JoiningDate
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
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
  request.input('JoiningDate', sql.Date, user.joiningDate || null);

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
          IsActive,
          JoiningDate
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
          @IsActive,
          @JoiningDate
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

async function countActiveSuperAdmins() {
  return withDb(async (pool) => {
    const request = pool.request();
    const result = await request.query(`
      SELECT COUNT(*) AS c
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON um.RoleId = rm.RoleId
      WHERE (um.RoleId = 1 OR rm.RoleName = 'Super Admin') AND um.IsActive = 1
    `);
    return result.recordset[0]?.c || 0;
  });
}

async function countSubordinates(userId) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('UserId', sql.BigInt, userId);
    const result = await request.query(`
      SELECT COUNT(*) AS c
      FROM UserMaster
      WHERE ReportingManagerId = @UserId AND UserId <> @UserId
    `);
    return result.recordset[0]?.c || 0;
  });
}

async function countUserDependentRecords(userId) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('UserId', sql.BigInt, userId);

    const q = `
      SELECT
        (SELECT COUNT(*) FROM TaskAssignment WHERE UserID = @UserId OR AssignedBy = @UserId) +
        (SELECT COUNT(*) FROM TaskAssignmentHistory WHERE AssignedToUserID = @UserId OR AssignedByUserID = @UserId) +
        (SELECT COUNT(*) FROM TimeLog WHERE UserID = @UserId) +
        (SELECT COUNT(*) FROM TaskReview WHERE ReviewerID = @UserId) +
        (SELECT COUNT(*) FROM TaskRework WHERE RequestedBy = @UserId OR AssignedToUserID = @UserId OR AssignedByUserID = @UserId OR CreatedBy = @UserId OR ModifiedBy = @UserId) +
        (SELECT COUNT(*) FROM TaskComment WHERE UserID = @UserId) +
        (SELECT COUNT(*) FROM TaskHistory WHERE ChangedBy = @UserId) +
        (SELECT COUNT(*) FROM TaskTransferHistory WHERE TransferredByUserID = @UserId OR FromUserID = @UserId OR ToUserID = @UserId) +
        (SELECT COUNT(*) FROM LeaveRequest WHERE UserId = @UserId OR SupervisorId = @UserId OR ApprovedBy = @UserId OR RejectedBy = @UserId OR CancelledBy = @UserId) +
        (SELECT COUNT(*) FROM UserTransferHistory WHERE UserId = @UserId OR OldReportingManagerId = @UserId OR NewReportingManagerId = @UserId OR TransferredBy = @UserId) +
        (SELECT COUNT(*) FROM ImportBatch WHERE StartedBy = @UserId) +
        (SELECT COUNT(*) FROM UserMaster WHERE CreatedBy = @UserId OR ModifiedBy = @UserId) AS TotalCount
    `;

    const result = await request.query(q);
    return result.recordset[0]?.TotalCount || 0;
  });
}

async function setUserStatus(userId, isActive, operatorId) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('UserId', sql.BigInt, userId);
    request.input('IsActive', sql.Bit, isActive ? 1 : 0);
    request.input('OperatorId', sql.BigInt, operatorId || null);

    await request.query(`
      UPDATE UserMaster
      SET IsActive = @IsActive,
          ModifiedOn = GETDATE(),
          ModifiedBy = @OperatorId
      WHERE UserId = @UserId
    `);
    return isActive ? 1 : 0;
  });
}

async function deleteUserPermanently(userId) {
  return withDb(async (pool) => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const r1 = new sql.Request(transaction);
      r1.input('UserId', sql.BigInt, userId);
      await r1.query(`DELETE FROM UserPermission WHERE UserId = @UserId`);

      const r2 = new sql.Request(transaction);
      r2.input('UserId', sql.BigInt, userId);
      await r2.query(`DELETE FROM UserSessions WHERE UserId = @UserId`);

      const r3 = new sql.Request(transaction);
      r3.input('UserId', sql.BigInt, userId);
      await r3.query(`DELETE FROM UserMaster WHERE UserId = @UserId`);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  });
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
        SET IsActive = @IsActive,
            ModifiedOn = GETDATE()
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

// ==========================================
// Get Reporting Leads (for dropdown)
// Returns active users with Lead/Manager roles
// optionally filtered by departmentId and/or teamId
// ==========================================
async function getReportingLeads({ departmentId, teamId, role } = {}) {
  return withDb(async (pool) => {
    const request = pool.request();
    const where = [
      `um.IsActive = 1`
    ];

    // Artist / QC Artist can only report to Team Leads (4)
    if (role === 'Artist' || role === 'QC Artist') {
      where.push(`rm.RoleName = 'Team Lead'`);
    } 
    // Team Lead can report to Production Head (2) or Project Manager (3)
    else if (role === 'Team Lead') {
      where.push(`rm.RoleName IN ('Production Head', 'Project Manager')`);
    }
    // Project Manager reports to Production Head (2)
    else if (role === 'Project Manager') {
      where.push(`rm.RoleName = 'Production Head'`);
    }
    // Default fallback (e.g. for backwards compatibility)
    else {
      where.push(`rm.RoleName IN ('Production Head', 'Project Manager', 'Team Lead')`);
    }

    if (departmentId && (role === 'Artist' || role === 'QC Artist')) {
      const dId = parseInt(departmentId, 10);
      if (!isNaN(dId)) {
        request.input('DepartmentId', sql.BigInt, dId);
        where.push('um.HomeDepartmentId = @DepartmentId');
      }
    }

    if (teamId && (role === 'Artist' || role === 'QC Artist')) {
      const tId = parseInt(teamId, 10);
      if (!isNaN(tId)) {
        request.input('TeamId', sql.BigInt, tId);
        where.push('um.HomeTeamId = @TeamId');
      }
    }

    const result = await request.query(`
      SELECT
        um.UserId,
        um.EmployeeCode,
        um.FullName,
        um.RoleId,
        rm.RoleName,
        um.HomeDepartmentId,
        dm.DepartmentName,
        um.HomeTeamId,
        tm.TeamName
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE ${where.join(' AND ')}
      ORDER BY um.FullName ASC
    `);
    return result.recordset;
  });
}

// ==========================================
// Update User
// ==========================================
async function updateUser(transaction, userId, fields) {
  const request = new sql.Request(transaction);
  request.input('UserId', sql.BigInt, userId);

  const setClauses = [];

  if (fields.name !== undefined) {
    request.input('FullName', sql.NVarChar(255), fields.name);
    setClauses.push('FullName = @FullName');
  }
  if (fields.email !== undefined) {
    request.input('Email', sql.NVarChar(255), fields.email);
    setClauses.push('Email = @Email');
  }
  if (fields.mobile !== undefined) {
    request.input('Mobile', sql.NVarChar(50), fields.mobile || null);
    setClauses.push('Mobile = @Mobile');
  }
  if (fields.roleId !== undefined) {
    request.input('RoleId', sql.BigInt, fields.roleId);
    setClauses.push('RoleId = @RoleId');
  }
  if (fields.departmentId !== undefined) {
    request.input('HomeDepartmentId', sql.BigInt, fields.departmentId || null);
    setClauses.push('HomeDepartmentId = @HomeDepartmentId');
  }
  if (fields.teamId !== undefined) {
    request.input('HomeTeamId', sql.BigInt, fields.teamId || null);
    setClauses.push('HomeTeamId = @HomeTeamId');
  }
  if (fields.reportingManagerId !== undefined) {
    request.input('ReportingManagerId', sql.BigInt, fields.reportingManagerId || null);
    setClauses.push('ReportingManagerId = @ReportingManagerId');
  }
  if (fields.isActive !== undefined) {
    request.input('IsActiveUpdate', sql.Bit, fields.isActive ? 1 : 0);
    setClauses.push('IsActive = @IsActiveUpdate');
  }
  if (fields.joiningDate !== undefined) {
    request.input('JoiningDate', sql.Date, fields.joiningDate || null);
    setClauses.push('JoiningDate = @JoiningDate');
  }
  if (fields.modifiedBy !== undefined) {
    request.input('ModifiedBy', sql.BigInt, fields.modifiedBy || null);
    setClauses.push('ModifiedBy = @ModifiedBy');
  }

  setClauses.push('ModifiedOn = GETDATE()');

  if (setClauses.length === 1) return; // only ModifiedOn, skip

  await request.query(`
    UPDATE UserMaster
    SET ${setClauses.join(', ')}
    WHERE UserId = @UserId
  `);
}

// ==========================================
// Get Teams with derived lead info
// ==========================================
async function getTeams({ departmentId, activeOnly = true } = {}) {
  return withDb(async (pool) => {
    const request = pool.request();
    const where = [];
    if (activeOnly) where.push('tm.IsActive = 1');
    if (departmentId) {
      const dId = parseInt(departmentId, 10);
      if (!isNaN(dId)) {
        request.input('DepartmentId', sql.BigInt, dId);
        where.push('tm.DepartmentId = @DepartmentId');
      }
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // IMPORTANT: Do NOT use TOP 1 for team leads — non-deterministic.
    // Return ALL active Team Leads per team using FOR XML PATH aggregation.
    // If a team has 0 leads → LeadNames = NULL, LeadCount = 0.
    // If a team has multiple leads → LeadNames = 'Alice, Bob', LeadCount = 2.
    const result = await request.query(`
      SELECT
        tm.TeamId,
        tm.TeamCode,
        tm.TeamName,
        tm.DepartmentId,
        dm.DepartmentName,
        tm.IsActive,
        -- ALL active Team Leads for this team (comma-separated full names)
        (
          SELECT STUFF((
            SELECT ', ' + um2.FullName
            FROM UserMaster um2
            WHERE um2.HomeTeamId = tm.TeamId
              AND um2.RoleId = 4
              AND um2.IsActive = 1
            ORDER BY um2.FullName ASC
            FOR XML PATH('')
          ), 1, 2, '')
        ) AS LeadNames,
        -- Pipe-delimited UserId list for all active leads
        (
          SELECT STUFF((
            SELECT '|' + CAST(um2.UserId AS VARCHAR(20))
            FROM UserMaster um2
            WHERE um2.HomeTeamId = tm.TeamId
              AND um2.RoleId = 4
              AND um2.IsActive = 1
            ORDER BY um2.UserId ASC
            FOR XML PATH('')
          ), 1, 1, '')
        ) AS LeadIds,
        -- Count of active Team Leads
        (
          SELECT COUNT(*)
          FROM UserMaster um2
          WHERE um2.HomeTeamId = tm.TeamId
            AND um2.RoleId = 4
            AND um2.IsActive = 1
        ) AS LeadCount,
        -- Total active members
        (
          SELECT COUNT(*)
          FROM UserMaster um3
          WHERE um3.HomeTeamId = tm.TeamId AND um3.IsActive = 1
        ) AS MemberCount
      FROM TeamMaster tm
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = tm.DepartmentId
      ${whereSql}
      ORDER BY dm.DepartmentName ASC, tm.TeamName ASC
    `);
    return result.recordset;
  });
}

// ==========================================
// Get Team Members
// ==========================================
async function getTeamMembers(teamId) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('TeamId', sql.BigInt, teamId);
    const result = await request.query(`
      SELECT
        um.UserId,
        um.EmployeeCode,
        um.FullName,
        um.Email,
        um.RoleId,
        rm.RoleName,
        um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      WHERE um.HomeTeamId = @TeamId
      ORDER BY rm.RoleLevel ASC, um.FullName ASC
    `);
    return result.recordset;
  });
}

// ==========================================
// Create Team
// ==========================================
async function createTeam({ teamCode, teamName, departmentId, createdBy }) {
  return withDb(async (pool) => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = new sql.Request(transaction);
      
      const maxRes = await request.query(`SELECT ISNULL(MAX(TeamId), 0) + 1 AS NextId FROM TeamMaster WITH (UPDLOCK, HOLDLOCK)`);
      const nextId = maxRes.recordset[0].NextId;

      request.input('TeamId', sql.BigInt, nextId);
      request.input('TeamCode', sql.NVarChar(50), teamCode);
      request.input('TeamName', sql.NVarChar(255), teamName);
      request.input('DepartmentId', sql.BigInt, departmentId || null);
      
      const result = await request.query(`
        INSERT INTO TeamMaster (TeamId, TeamCode, TeamName, DepartmentId, IsActive)
        OUTPUT inserted.TeamId, inserted.TeamCode, inserted.TeamName, inserted.DepartmentId, inserted.IsActive
        VALUES (@TeamId, @TeamCode, @TeamName, @DepartmentId, 1)
      `);
      
      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  });
}

// ==========================================
// Update Team
// ==========================================
async function updateTeam(teamId, { teamName, departmentId, isActive }) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('TeamId', sql.BigInt, teamId);
    const setClauses = [];
    if (teamName !== undefined) {
      request.input('TeamName', sql.NVarChar(255), teamName);
      setClauses.push('TeamName = @TeamName');
    }
    if (departmentId !== undefined) {
      request.input('DepartmentId', sql.BigInt, departmentId || null);
      setClauses.push('DepartmentId = @DepartmentId');
    }
    if (isActive !== undefined) {
      request.input('IsActive', sql.Bit, isActive ? 1 : 0);
      setClauses.push('IsActive = @IsActive');
    }
    if (setClauses.length === 0) return null;
    const result = await request.query(`
      UPDATE TeamMaster
      SET ${setClauses.join(', ')}
      OUTPUT inserted.TeamId, inserted.TeamCode, inserted.TeamName, inserted.DepartmentId, inserted.IsActive
      WHERE TeamId = @TeamId
    `);
    return result.recordset[0];
  });
}

// ==========================================
// Get Org Hierarchy
// Returns departments with teams and users structured
// ==========================================
async function getOrgHierarchy() {
  return withDb(async (pool) => {
    const request = pool.request();
    // Departments
    const depts = await request.query(`
      SELECT DepartmentId, DepartmentName, DepartmentCode, IsActive
      FROM DepartmentMaster
      WHERE IsActive = 1
      ORDER BY DisplayOrder ASC, DepartmentName ASC
    `);

    // Teams — return ALL active leads (no TOP 1)
    const req2 = pool.request();
    const teams = await req2.query(`
      SELECT
        tm.TeamId, tm.TeamName, tm.TeamCode, tm.DepartmentId, tm.IsActive,
        -- All lead names (comma-separated), NULL if none
        (
          SELECT STUFF((
            SELECT ', ' + um2.FullName
            FROM UserMaster um2
            WHERE um2.HomeTeamId = tm.TeamId AND um2.RoleId = 4 AND um2.IsActive = 1
            ORDER BY um2.FullName ASC
            FOR XML PATH('')
          ), 1, 2, '')
        ) AS LeadNames,
        -- All lead IDs (pipe-separated), NULL if none
        (
          SELECT STUFF((
            SELECT '|' + CAST(um2.UserId AS VARCHAR(20))
            FROM UserMaster um2
            WHERE um2.HomeTeamId = tm.TeamId AND um2.RoleId = 4 AND um2.IsActive = 1
            ORDER BY um2.UserId ASC
            FOR XML PATH('')
          ), 1, 1, '')
        ) AS LeadIds,
        -- How many active Team Leads (0 = unassigned, >1 = multiple)
        (
          SELECT COUNT(*)
          FROM UserMaster um2
          WHERE um2.HomeTeamId = tm.TeamId AND um2.RoleId = 4 AND um2.IsActive = 1
        ) AS LeadCount
      FROM TeamMaster tm
      WHERE tm.IsActive = 1
      ORDER BY tm.TeamName ASC
    `);

    // Active users with org info
    const req3 = pool.request();
    const users = await req3.query(`
      SELECT
        um.UserId, um.EmployeeCode, um.FullName,
        um.RoleId, rm.RoleName, rm.RoleLevel,
        um.HomeDepartmentId, um.HomeTeamId,
        um.ReportingManagerId,
        mgr.FullName AS ReportingManagerName,
        um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
      WHERE um.IsActive = 1
      ORDER BY rm.RoleLevel ASC, um.FullName ASC
    `);

    return {
      departments: depts.recordset,
      teams: teams.recordset,
      users: users.recordset
    };
  });
}

// ==========================================
// Validate Team belongs to Department
// Used in createUser/updateUser to prevent dept/team mismatch
// ==========================================
async function validateTeamDepartment(teamId, departmentId) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('TeamId', sql.BigInt, parseInt(teamId, 10));
    request.input('DepartmentId', sql.BigInt, parseInt(departmentId, 10));
    const result = await request.query(`
      SELECT TeamId, TeamName, DepartmentId
      FROM TeamMaster
      WHERE TeamId = @TeamId AND IsActive = 1
    `);
    if (result.recordset.length === 0) {
      return { valid: false, reason: 'Team not found or inactive' };
    }
    const team = result.recordset[0];
    if (String(team.DepartmentId) !== String(departmentId)) {
      return {
        valid: false,
        reason: `Team '${team.TeamName}' belongs to DepartmentId ${team.DepartmentId}, not DepartmentId ${departmentId}. Team and Department must match.`
      };
    }
    return { valid: true, teamName: team.TeamName };
  });
}

// ==========================================
// Get Valid Artists For Stage
// Returns active artists whose HomeDepartmentId is compatible
// with the given pipeline stage.
// CG stage is NOT configured — returns empty with reason.
// ==========================================
async function getValidArtistsForStage({ stageId, stageName, departmentId, teamId } = {}) {
  return withDb(async (pool) => {
    // STAGE → DEPARTMENT mapping (explicit, not inferred from data)
    // This is the authoritative backend configuration.
    // Roto(1) and Paint(2) → Animation (DepartmentId=3)
    // Comp(3) → Compositing (DepartmentId=7)
    // CG(4) → NOT CONFIGURED (no production evidence)
    const STAGE_TO_DEPT_IDS = {
      '1': [3],        // Roto → Animation
      '2': [3],        // Paint → Animation
      '3': [7],        // Comp → Compositing
      '4': null,       // CG → NOT CONFIGURED
      'roto': [3],
      'paint': [3],
      'comp': [7],
      'compositing': [7],
      'cg': null
    };

    const key = stageId ? String(stageId) : (stageName || '').trim().toLowerCase();
    const validDeptIds = STAGE_TO_DEPT_IDS[key];

    if (validDeptIds === null) {
      return {
        configured: false,
        reason: 'not_configured',
        message: `CG stage department mapping is not configured for this studio. Contact your Production Head to configure it.`,
        artists: [],
        compatibleDepartmentIds: []
      };
    }

    if (validDeptIds === undefined) {
      return {
        configured: true,
        reason: 'unknown_stage',
        message: `Unknown pipeline stage (${stageName || stageId}). No department restriction applied.`,
        artists: [],
        compatibleDepartmentIds: []
      };
    }

    // Override if caller wants a specific dept
    const deptFilter = departmentId ? [parseInt(departmentId, 10)] : validDeptIds;

    const request = pool.request();
    const deptList = deptFilter.join(',');
    const where = [
      `um.IsActive = 1`,
      `um.RoleId IN (5, 6)`,           // Artist(5) or QC Artist(6)
      `um.HomeDepartmentId IN (${deptList})`
    ];

    if (teamId) {
      const tId = parseInt(teamId, 10);
      if (!isNaN(tId)) {
        request.input('TeamId', sql.BigInt, tId);
        where.push('um.HomeTeamId = @TeamId');
      }
    }

    const result = await request.query(`
      SELECT
        um.UserId,
        um.EmployeeCode,
        um.FullName,
        um.RoleId,
        rm.RoleName,
        um.HomeDepartmentId,
        dm.DepartmentName,
        um.HomeTeamId,
        tm.TeamName,
        um.ReportingManagerId,
        mgr.FullName AS ReportingManagerName,
        um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      LEFT JOIN UserMaster mgr ON mgr.UserId = um.ReportingManagerId
      WHERE ${where.join(' AND ')}
      ORDER BY dm.DepartmentName ASC, tm.TeamName ASC, um.FullName ASC
    `);

    return {
      configured: true,
      compatibleDepartmentIds: validDeptIds,
      artists: result.recordset
    };
  });
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

    updateUser,

    getRoleByName,

    getNextUserId,

    getPasswordHashByUserId,

    updatePasswordHash,

    toggleUserStatus,

    setUserStatus,

    countActiveSuperAdmins,

    countSubordinates,

    countUserDependentRecords,

    deleteUserPermanently,

    getUserPermissions,

    updateUserPermissions,

    getReportingLeads,

    getTeams,

    getTeamMembers,

    createTeam,

    updateTeam,

    getOrgHierarchy,

    validateTeamDepartment,

    getValidArtistsForStage

};
