const { sql, config } = require('./config/db');

async function checkPool() {
  const pool = await sql.connect(config);
  const res = await pool.request().query(`
    SELECT 
      DB_NAME(dbid) as db_name, 
      count(dbid) as connection_count,
      status
    FROM sys.sysprocesses
    WHERE DB_NAME(dbid) = 'VFX_ERP' OR dbid = DB_ID()
    GROUP BY dbid, status;
  `);
  console.log('--- Active Connections ---');
  console.dir(res.recordset);
  process.exit(0);
}

checkPool().catch(console.error);
