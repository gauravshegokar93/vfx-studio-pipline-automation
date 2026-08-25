const { sql, config } = require('./config/db');
const http = require('http');

async function auditPermissions() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connected to DB for audit.");

        // 1. Read PermissionMaster
        const permResult = await pool.request().query(`
            SELECT PermissionId, PermissionName, Description, Category, IsActive
            FROM PermissionMaster
            WHERE IsActive = 1
            ORDER BY Category, PermissionName
        `);
        
        const catalog = {};
        permResult.recordset.forEach(p => {
            if (!catalog[p.Category]) catalog[p.Category] = [];
            catalog[p.Category].push(p);
        });

        // 2. Read Role Permissions Matrix
        const matrixResult = await pool.request().query(`
            SELECT rm.RoleName, pm.PermissionName
            FROM RolePermission rp
            INNER JOIN RoleMaster rm ON rp.RoleId = rm.RoleId
            INNER JOIN PermissionMaster pm ON rp.PermissionId = pm.PermissionId
            WHERE rp.IsActive = 1 AND rm.IsActive = 1 AND pm.IsActive = 1
        `);

        const roleMatrix = {};
        const expectedRoles = ['Super Admin', 'Production Head', 'Project Manager', 'Team Lead', 'Artist', 'QC Artist'];
        expectedRoles.forEach(r => roleMatrix[r] = []);

        matrixResult.recordset.forEach(r => {
            if (roleMatrix[r.RoleName] !== undefined) {
                roleMatrix[r.RoleName].push(r.PermissionName);
            } else {
                 if (!roleMatrix[r.RoleName]) roleMatrix[r.RoleName] = [];
                 roleMatrix[r.RoleName].push(r.PermissionName);
            }
        });

        // 3. Find current state
        const counts = {};
        expectedRoles.forEach(r => {
            counts[r] = roleMatrix[r].length;
        });
        const artistPerms = roleMatrix['Artist'];

        // 4. Test Artist UserPermission Records
        const userPermResult = await pool.request()
            .input('UserId', sql.BigInt, 5)
            .query(`
                SELECT pm.PermissionName, up.IsGrant
                FROM UserPermission up
                INNER JOIN PermissionMaster pm ON up.PermissionId = pm.PermissionId
                WHERE up.UserId = @UserId AND up.IsActive = 1
            `);
        const testArtistUserPerms = userPermResult.recordset;

        // 5. Effective Permissions & Frontend Effect via Login
        const loginRes = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.write(JSON.stringify({ email: 'test.artist@vfx.com', password: 'Test@12345' }));
            req.end();
        });

        // Get permissions from me endpoint
        let meRes = { body: { permissions: [] } };
        if (loginRes.body && loginRes.body.accessToken) {
             meRes = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: 5000,
                    path: '/api/users/me',
                    method: 'GET',
                    headers: { 'Authorization': 'Bearer ' + loginRes.body.accessToken }
                }, res => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                         try {
                              resolve({ status: res.statusCode, body: JSON.parse(data) });
                         } catch(e) {
                              resolve({ status: res.statusCode, body: {permissions:[]} });
                         }
                    });
                });
                req.on('error', reject);
                req.end();
            });
        }
        
        let frontendPerms = [];
        if (meRes.body && meRes.body.user && meRes.body.user.permissions) {
             frontendPerms = meRes.body.user.permissions;
        } else if (meRes.body && meRes.body.permissions) {
             frontendPerms = meRes.body.permissions;
        }

        const report = {
            catalog,
            roleMatrix,
            counts,
            artistPerms,
            testArtistUserPerms,
            loginResponse: loginRes.body,
            meResponse: meRes.body,
            frontendPerms
        };

        console.log("--- AUDIT_START ---");
        console.log(JSON.stringify(report, null, 2));
        console.log("--- AUDIT_END ---");

    } catch (err) {
        console.error(err);
    } finally {
        if (pool) await pool.close();
    }
}

auditPermissions();
