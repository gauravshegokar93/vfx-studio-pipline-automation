const { sql, config } = require('./config/db');
const http = require('http');

async function apiRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
                } catch(e) {
                    resolve({ status: res.statusCode, body: null });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runSeed() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connected to DB.");

        const permsToInsert = [
            'workspace.artist',
            'dashboard.view',
            'menu.view',
            'projects.view',
            'episodes.view',
            'sequences.view',
            'shots.view',
            'assets.view',
            'tasks.view',
            'tasks.edit',
            'leave.view',
            'leave.create',
            'notifications.view'
        ];

        const roleId = 5;
        const inserted = [];
        const existing = [];
        
        // 1. Insert RolePermissions
        for (const pName of permsToInsert) {
            const pResult = await pool.request()
                .input('PName', sql.NVarChar, pName)
                .query(`SELECT PermissionId FROM PermissionMaster WHERE PermissionName = @PName`);
                
            if (pResult.recordset.length > 0) {
                const permId = pResult.recordset[0].PermissionId;
                const checkRes = await pool.request()
                    .input('RoleId', sql.BigInt, roleId)
                    .input('PermId', sql.Int, permId)
                    .query(`SELECT RolePermissionId FROM RolePermission WHERE RoleId = @RoleId AND PermissionId = @PermId AND IsActive = 1`);
                    
                if (checkRes.recordset.length > 0) {
                    existing.push(pName);
                } else {
                    await pool.request()
                        .input('RoleId', sql.BigInt, roleId)
                        .input('PermId', sql.Int, permId)
                        .input('IsActive', sql.Bit, 1)
                        .query(`
                            INSERT INTO RolePermission (RoleId, PermissionId, IsActive, CreatedOn)
                            VALUES (@RoleId, @PermId, @IsActive, GETDATE());
                        `);
                    inserted.push(pName);
                }
            } else {
                console.warn(`Permission ${pName} not found in PermissionMaster.`);
            }
        }

        // 2. Verify Database
        const artistPermsRes = await pool.request().input('RoleId', sql.BigInt, roleId).query(`
            SELECT pm.PermissionName 
            FROM RolePermission rp
            JOIN PermissionMaster pm ON rp.PermissionId = pm.PermissionId
            WHERE rp.RoleId = @RoleId AND rp.IsActive = 1
        `);
        const finalArtistPerms = artistPermsRes.recordset.map(r => r.PermissionName);

        const artistUserPermsRes = await pool.request().input('UserId', sql.BigInt, 5).query(`
            SELECT COUNT(*) as count FROM UserPermission WHERE UserId = @UserId AND IsActive = 1
        `);
        const userPermCount = artistUserPermsRes.recordset[0].count;

        const superAdminPermsRes = await pool.request().input('RoleId', sql.BigInt, 1).query(`
            SELECT COUNT(*) as count FROM RolePermission WHERE RoleId = @RoleId AND IsActive = 1
        `);
        const superAdminCount = superAdminPermsRes.recordset[0].count;

        // 3. Verify API (Artist)
        const loginRes = await apiRequest('POST', '/api/auth/login', { email: 'test.artist@vfx.com', password: 'Test@12345' });
        let artistToken = null;
        let frontendPerms = [];
        let loginPass = false;
        if (loginRes.status === 200 && loginRes.body.success) {
            loginPass = true;
            artistToken = loginRes.body.accessToken;
            // Depending on the codebase, permissions might be in user object or via /api/users/me
            const meRes = await apiRequest('GET', '/api/users/me', null, artistToken);
            if (meRes.body && meRes.body.user && meRes.body.user.permissions) {
                frontendPerms = meRes.body.user.permissions;
            } else if (meRes.body && meRes.body.permissions) {
                frontendPerms = meRes.body.permissions;
            }
        }

        // 4. Admin API tests (Unauthorized checks)
        let createUsersStatus = 0;
        let putPermsStatus = 0;
        let putRolePermsStatus = 0;
        if (artistToken) {
            const r1 = await apiRequest('POST', '/api/users', { FullName: 'Hacker' }, artistToken);
            createUsersStatus = r1.status;
            
            const r2 = await apiRequest('PUT', '/api/users/5/permissions', { permissions: [] }, artistToken);
            putPermsStatus = r2.status;
            
            const r3 = await apiRequest('PUT', '/api/roles/5/permissions', { permissions: [] }, artistToken);
            putRolePermsStatus = r3.status;
        }

        const report = {
            inserted,
            existing,
            duplicateRecordsCreated: 0,
            artistRolePermCount: finalArtistPerms.length,
            userPermCount,
            frontendPermsCount: frontendPerms.length,
            frontendPerms,
            loginPass,
            unauthorizedTests: {
                usersCreate: createUsersStatus,
                usersPermissions: putPermsStatus,
                rolesEdit: putRolePermsStatus
            },
            superAdminCount
        };

        console.log("--- SEED_RESULT_START ---");
        console.log(JSON.stringify(report, null, 2));
        console.log("--- SEED_RESULT_END ---");

    } catch (e) {
        console.error(e);
    } finally {
        if (pool) await pool.close();
    }
}

runSeed();
