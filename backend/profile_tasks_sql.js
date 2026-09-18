const { sql, config } = require('./config/db');

async function profileSQL() {
  const pool = await sql.connect(config);
  
  console.log("=== 1. FULL QUERY (TaskMaster + TimeLog + Complexity) ===");
  const start1 = process.hrtime.bigint();
  await pool.request().query(`
    SELECT t.TaskID,
      (
        SELECT TOP 1 ibr.Complexity 
        FROM ImportBatchRow ibr 
        JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
        LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
        LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
        LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
        LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
        WHERE ib.ProjectID = pm.ProjectId
        AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
        AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
        AND ib.ImportStatus = 'APPROVED'
        ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
      ) AS complexity,
      tl.actualHours
    FROM TaskMaster t
    LEFT JOIN (
      SELECT TaskID, SUM(CASE WHEN EndTime IS NOT NULL THEN HoursWorked ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0 END) AS actualHours
      FROM TimeLog GROUP BY TaskID
    ) tl ON t.TaskID = tl.TaskID
  `);
  const lat1 = Number(process.hrtime.bigint() - start1) / 1000000.0;
  console.log(`Time: ${lat1.toFixed(2)}ms`);

  console.log("\n=== 2. QUERY WITHOUT COMPLEXITY LOOKUP ===");
  const start2 = process.hrtime.bigint();
  await pool.request().query(`
    SELECT t.TaskID, tl.actualHours
    FROM TaskMaster t
    LEFT JOIN (
      SELECT TaskID, SUM(CASE WHEN EndTime IS NOT NULL THEN HoursWorked ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0 END) AS actualHours
      FROM TimeLog GROUP BY TaskID
    ) tl ON t.TaskID = tl.TaskID
  `);
  const lat2 = Number(process.hrtime.bigint() - start2) / 1000000.0;
  console.log(`Time: ${lat2.toFixed(2)}ms`);

  console.log("\n=== 3. QUERY WITHOUT TIMELOG AGGREGATION ===");
  const start3 = process.hrtime.bigint();
  await pool.request().query(`
    SELECT t.TaskID,
      (
        SELECT TOP 1 ibr.Complexity 
        FROM ImportBatchRow ibr 
        JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
        LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
        LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
        LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
        LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
        WHERE ib.ProjectID = pm.ProjectId
        AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
        AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
        AND ib.ImportStatus = 'APPROVED'
        ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
      ) AS complexity
    FROM TaskMaster t
  `);
  const lat3 = Number(process.hrtime.bigint() - start3) / 1000000.0;
  console.log(`Time: ${lat3.toFixed(2)}ms`);

  console.log("\n=== 4. IMPORTBATCHROW COUNT ===");
  const countRes = await pool.request().query('SELECT COUNT(*) as cnt FROM ImportBatchRow');
  console.log(`ImportBatchRow Total Rows: ${countRes.recordset[0].cnt}`);

  process.exit(0);
}

profileSQL().catch(console.error);
