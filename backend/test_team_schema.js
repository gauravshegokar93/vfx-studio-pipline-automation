const { sql, config } = require('./config/db');
async function test() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TOP 1 * FROM TeamMaster");
    console.log("TeamMaster Schema:", Object.keys(result.recordset[0] || {}));
    pool.close();
  } catch (err) { console.error(err); }
}
test();
