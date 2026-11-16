const { sql, config } = require('./backend/config/db');
sql.connect(config).then(async pool => {
  const r1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TimeLog'");
  console.log('TimeLog:', r1.recordset);
  
  const r2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskAssignmentHistory'");
  console.log('TaskAssignmentHistory:', r2.recordset);

  const r3 = await pool.request().query("SELECT * FROM StatusMaster");
  console.log('StatusMaster:', r3.recordset);
  
  process.exit(0);
}).catch(console.error);
