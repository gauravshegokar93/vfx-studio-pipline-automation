const sql = require('mssql');
const config = require('./config/db');

async function testMultiAssign() {
  let pool;
  try {
    pool = await sql.connect(config);
    // get a task and a user
    const taskRes = await pool.request().query("SELECT TOP 3 TaskID FROM TaskMaster WHERE IsActive=1");
    const tasks = taskRes.recordset;
    if(tasks.length < 3) return console.log("Not enough tasks");
    
    const userRes = await pool.request().query("SELECT TOP 1 UserID FROM UserMaster WHERE IsActive=1 AND RoleId IN (5)");
    const user = userRes.recordset[0];
    if(!user) return console.log("No artist found");

    console.log("Found Artist:", user.UserID);
    console.log("Tasks:", tasks.map(t=>t.TaskID));

  } catch(e) {
    console.error(e);
  } finally {
    if(pool) pool.close();
  }
}
testMultiAssign();
