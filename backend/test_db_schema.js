const { sql, config } = require('./config/db');

async function test() {
  try {
    const pool = await sql.connect(config);
    const revResult = await pool.request().query("SELECT TOP 1 * FROM TaskReview");
    console.log("TaskReview Schema:", Object.keys(revResult.recordset[0] || {}));
    
    const rewResult = await pool.request().query("SELECT TOP 1 * FROM TaskRework");
    console.log("TaskRework Schema:", Object.keys(rewResult.recordset[0] || {}));

    pool.close();
  } catch (error) {
    console.error(error);
  }
}
test();
