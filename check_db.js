const { sql, config } = require('./backend/config/db');
sql.connect(config).then(async pool => {
  const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskReview'");
  console.log('TaskReview:', result.recordset);
  
  const result2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskAssignment'");
  console.log('TaskAssignment:', result2.recordset);
  process.exit(0);
});
