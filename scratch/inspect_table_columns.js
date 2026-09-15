const { sql, config } = require('../backend/config/db');

async function inspectColumns() {
  try {
    const pool = await sql.connect(config);
    const tables = ['ReelMaster', 'SequenceMaster', 'ShotMaster', 'PriorityMaster', 'ProjectMaster', 'TaskMaster', 'TaskAssignment'];

    for (const table of tables) {
      const res = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table}'
        ORDER BY ORDINAL_POSITION
      `);
      console.log(`\n=== Table: ${table} ===`);
      res.recordset.forEach(c => {
        console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Inspect Columns Error:', err);
    process.exit(1);
  }
}

inspectColumns();
