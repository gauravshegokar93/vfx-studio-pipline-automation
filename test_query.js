const { sql, config } = require('./backend/config/db.js');
async function run() {
  try {
    const pool = await sql.connect(config);
    const r = await pool.request().query(`
      SELECT TOP 5 
        t.TaskID, 
        t.TaskCode, 
        sm.ShotCode,
        (
          SELECT TOP 1 ibr.Complexity 
          FROM ImportBatchRow ibr 
          JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
          JOIN ProjectMaster p ON p.ProjectID = ib.ProjectID 
          JOIN ReelMaster rm ON rm.ProjectID = p.ProjectID 
          JOIN SequenceMaster seq ON seq.ReelId = rm.ReelId 
          WHERE seq.SequenceId = sm.SequenceId 
          AND (ibr.ShotName = sm.ShotCode OR ibr.ClientShotName = sm.ShotCode) 
          ORDER BY ibr.CreatedDate DESC
        ) AS Complexity 
      FROM TaskMaster t 
      JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    `);
    console.log(JSON.stringify(r.recordset, null, 2));
    pool.close();
  } catch(e) {
    console.error(e);
  }
}
run();
