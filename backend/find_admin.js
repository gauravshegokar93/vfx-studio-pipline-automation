const { sql, config } = require('./config/db');

async function run() {
    let pool;
    try {
        pool = await sql.connect(config);
        const adminUsers = await pool.request().query("SELECT TOP 1 Email, RoleId FROM UserMaster WHERE RoleId IN (SELECT RoleId FROM RoleMaster WHERE RoleName = 'Super Admin' OR RoleName = 'Admin')");
        console.log("Admins:", adminUsers.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        if (pool) await pool.close();
    }
}
run();
