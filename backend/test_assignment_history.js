const { sql, config } = require('./config/db');

async function test() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TOP 1 * FROM TaskAssignmentHistory");
    console.log("TaskAssignmentHistory Schema:", Object.keys(result.recordset[0] || {}));
    pool.close();
  } catch (error) {
    console.error(error);
  }
}
test();
