const sql = require('mssql');
const config = require('./config/db');

async function test() {
  try {
    const pool = await sql.connect(config.config);
    const res = await pool.request().query("SELECT u.FullName, d.DepartmentName, t.TeamName FROM UserMaster u LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId LEFT JOIN TeamMaster t ON u.HomeTeamId = t.TeamId WHERE d.DepartmentName NOT IN ('Roto', 'Paint', 'Comp', 'CG')");
    console.log(res.recordset);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

test();
