const { sql, config } = require('./config/db');
const bcrypt = require('bcrypt');

async function seedTestData() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connected to DB.");

        // Report Object
        const report = {
            existingRecords: {},
            createdRecords: {},
            reusedRecords: {},
            userDetails: {},
            permissions: [],
            duplicateCheck: "Passed"
        };

        // 1. Role (Artist)
        let roleId;
        const roleResult = await pool.request()
            .input('RoleName', sql.NVarChar, 'Artist')
            .query(`SELECT RoleId FROM RoleMaster WHERE RoleName = @RoleName AND IsActive = 1`);
        
        if (roleResult.recordset.length > 0) {
            roleId = roleResult.recordset[0].RoleId;
            report.existingRecords.ArtistRoleId = roleId;
            report.reusedRecords.Role = "Artist";
        } else {
            console.log("Artist role not found. Creating...");
            const insertRole = await pool.request()
                .input('RoleName', sql.NVarChar, 'Artist')
                .input('RoleLevel', sql.Int, 3) 
                .input('IsActive', sql.Bit, 1)
                .query(`
                    DECLARE @NewId bigint = ISNULL((SELECT MAX(RoleId) FROM RoleMaster), 0) + 1;
                    INSERT INTO RoleMaster (RoleId, RoleName, RoleLevel, IsActive) 
                    VALUES (@NewId, @RoleName, @RoleLevel, @IsActive);
                    SELECT @NewId as RoleId;
                `);
            roleId = insertRole.recordset[0].RoleId;
            report.createdRecords.Role = "Artist";
        }

        // 2. Department (Production)
        let departmentId;
        const deptResult = await pool.request()
            .input('DepartmentName', sql.NVarChar, 'Production')
            .query(`SELECT DepartmentId FROM DepartmentMaster WHERE DepartmentName = @DepartmentName AND IsActive = 1`);
            
        if (deptResult.recordset.length > 0) {
            departmentId = deptResult.recordset[0].DepartmentId;
            report.existingRecords.ProductionDepartmentId = departmentId;
            report.reusedRecords.Department = "Production";
        } else {
            console.log("Production department not found. Creating...");
            const insertDept = await pool.request()
                .input('DepartmentName', sql.NVarChar, 'Production')
                .input('DepartmentCode', sql.NVarChar, 'PROD')
                .input('IsActive', sql.Bit, 1)
                .query(`
                    DECLARE @NewId bigint = ISNULL((SELECT MAX(DepartmentId) FROM DepartmentMaster), 0) + 1;
                    INSERT INTO DepartmentMaster (DepartmentId, DepartmentName, DepartmentCode, IsActive) 
                    VALUES (@NewId, @DepartmentName, @DepartmentCode, @IsActive);
                    SELECT @NewId as DepartmentId;
                `);
            departmentId = insertDept.recordset[0].DepartmentId;
            report.createdRecords.Department = "Production";
        }

        // 3. Team (Artist Team)
        let teamId;
        const teamResult = await pool.request()
            .input('TeamName', sql.NVarChar, 'Artist Team')
            .input('DepartmentId', sql.BigInt, departmentId)
            .query(`SELECT TeamId FROM TeamMaster WHERE TeamName = @TeamName AND DepartmentId = @DepartmentId AND IsActive = 1`);
            
        if (teamResult.recordset.length > 0) {
            teamId = teamResult.recordset[0].TeamId;
            report.existingRecords.ArtistTeamId = teamId;
            report.reusedRecords.Team = "Artist Team";
        } else {
            console.log("Artist Team not found. Creating...");
            const insertTeam = await pool.request()
                .input('TeamName', sql.NVarChar, 'Artist Team')
                .input('TeamCode', sql.NVarChar, 'ART-TM')
                .input('DepartmentId', sql.BigInt, departmentId)
                .input('IsActive', sql.Bit, 1)
                .query(`
                    DECLARE @NewId bigint = ISNULL((SELECT MAX(TeamId) FROM TeamMaster), 0) + 1;
                    INSERT INTO TeamMaster (TeamId, TeamName, TeamCode, DepartmentId, IsActive) 
                    VALUES (@NewId, @TeamName, @TeamCode, @DepartmentId, @IsActive);
                    SELECT @NewId as TeamId;
                `);
            teamId = insertTeam.recordset[0].TeamId;
            report.createdRecords.Team = "Artist Team";
        }

        // 4. User (test.artist@vfx.com)
        let userId;
        const userResult = await pool.request()
            .input('Email', sql.NVarChar, 'test.artist@vfx.com')
            .input('EmployeeCode', sql.NVarChar, 'TEST-ART-001')
            .query(`SELECT UserId, Email, EmployeeCode, FullName FROM UserMaster WHERE Email = @Email OR EmployeeCode = @EmployeeCode`);

        if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].UserId;
            report.reusedRecords.User = userResult.recordset[0].FullName;
        } else {
            console.log("User not found. Creating...");
            const password = "Test@12345";
            const passwordHash = await bcrypt.hash(password, 10);
            
            const insertUser = await pool.request()
                .input('EmployeeCode', sql.NVarChar, 'TEST-ART-001')
                .input('FullName', sql.NVarChar, 'Test Artist')
                .input('Email', sql.NVarChar, 'test.artist@vfx.com')
                .input('RoleId', sql.BigInt, roleId)
                .input('HomeDepartmentId', sql.BigInt, departmentId)
                .input('HomeTeamId', sql.BigInt, teamId)
                .input('PasswordHash', sql.NVarChar, passwordHash)
                .input('IsActive', sql.Bit, 1)
                .input('CreatedOn', sql.DateTime, new Date())
                .query(`
                    DECLARE @NewId bigint = ISNULL((SELECT MAX(UserId) FROM UserMaster), 0) + 1;
                    INSERT INTO UserMaster (UserId, EmployeeCode, FullName, Email, RoleId, HomeDepartmentId, HomeTeamId, PasswordHash, IsActive, CreatedOn) 
                    VALUES (@NewId, @EmployeeCode, @FullName, @Email, @RoleId, @HomeDepartmentId, @HomeTeamId, @PasswordHash, @IsActive, @CreatedOn);
                    SELECT @NewId as UserId;
                `);
            userId = insertUser.recordset[0].UserId;
            report.createdRecords.User = "Test Artist";
        }

        // Fetch User Details to verify
        const userDetailsResult = await pool.request()
            .input('UserId', sql.BigInt, userId)
            .query(`
                SELECT 
                    u.UserId, u.EmployeeCode, u.FullName, u.Email, u.IsActive,
                    r.RoleName, d.DepartmentName, t.TeamName
                FROM UserMaster u
                LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
                LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
                LEFT JOIN TeamMaster t ON u.HomeTeamId = t.TeamId
                WHERE u.UserId = @UserId
            `);
            
        if (userDetailsResult.recordset.length > 0) {
            const u = userDetailsResult.recordset[0];
            report.userDetails = {
                UserId: u.UserId,
                EmployeeCode: u.EmployeeCode,
                FullName: u.FullName,
                Email: u.Email,
                Role: u.RoleName,
                Department: u.DepartmentName,
                Team: u.TeamName,
                Active: u.IsActive ? 'Yes' : 'No'
            };
        }

        // Fetch Role Permissions
        const permResult = await pool.request()
            .input('RoleId', sql.BigInt, roleId)
            .query(`
                SELECT p.PermissionName, p.Category
                FROM RolePermission rp
                JOIN PermissionMaster p ON rp.PermissionId = p.PermissionId
                WHERE rp.RoleId = @RoleId AND rp.IsActive = 1
            `);
        report.permissions = permResult.recordset.map(r => r.PermissionName);

        // Check for duplicates
        const dupUserCheck = await pool.request().query("SELECT COUNT(*) as count FROM UserMaster WHERE Email = 'test.artist@vfx.com' OR EmployeeCode = 'TEST-ART-001'");
        const dupRoleCheck = await pool.request().query("SELECT COUNT(*) as count FROM RoleMaster WHERE RoleName = 'Artist'");
        const dupDeptCheck = await pool.request().query("SELECT COUNT(*) as count FROM DepartmentMaster WHERE DepartmentName = 'Production'");
        const dupTeamCheck = await pool.request().query("SELECT COUNT(*) as count FROM TeamMaster WHERE TeamName = 'Artist Team'");

        if (dupUserCheck.recordset[0].count > 1 || dupRoleCheck.recordset[0].count > 1 || dupDeptCheck.recordset[0].count > 1 || dupTeamCheck.recordset[0].count > 1) {
            report.duplicateCheck = "Failed - Duplicates found";
        }

        console.log("--- SEED_REPORT_START ---");
        console.log(JSON.stringify(report, null, 2));
        console.log("--- SEED_REPORT_END ---");
        
    } catch (err) {
        console.error(err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}
seedTestData();
