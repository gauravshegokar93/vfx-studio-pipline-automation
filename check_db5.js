const { sql, config } = require('./backend/config/db');
sql.connect(config).then(async pool => {
  const r = await pool.request().query("SELECT * FROM TaskAssignment WHERE TaskID=370");
  console.log('Assignments:', r.recordset);
  const r2 = await pool.request().query("SELECT * FROM TimeLog WHERE TaskID=370");
  console.log('TimeLogs:', r2.recordset);
  process.exit(0);
}).catch(console.error);
