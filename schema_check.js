const { sql, config } = require('./backend/config/db.js');
async function run() {
  try {
    const pool = await sql.connect(config);
    const r1 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ImportBatchRow'");
    console.log('ImportBatchRow:', JSON.stringify(r1.recordset));
    const r2 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ShotMaster'");
    console.log('ShotMaster:', JSON.stringify(r2.recordset));
    const r3 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskMaster'");
    console.log('TaskMaster:', JSON.stringify(r3.recordset));
    pool.close();
  } catch(e) {
    console.error(e);
  }
}
run();
