const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sql = require('mssql');
const { config } = require('./config/db');
(async () => {
  const pool = await sql.connect(config);
  const result = await pool.request().query('SELECT TOP 1 * FROM TaskMaster');
  console.log(Object.keys(result.recordset[0]));
  process.exit();
})();
