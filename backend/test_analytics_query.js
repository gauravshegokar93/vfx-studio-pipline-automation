const sql = require('mssql');
const config = require('./config/db');

async function test() {
  try {
    const pool = await sql.connect(config.config);
    const query = `
    SELECT 
      ISNULL(c.Complexity, 'Unknown') AS complexity,
      COUNT(t.TaskID) AS taskVolume,
      SUM(CASE WHEN t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS overdueCount,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedCount,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkCount,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours,
      COALESCE(SUM(t.EstimatedHours), 0) AS estimatedHours
    FROM TaskMaster t
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    OUTER APPLY (
        SELECT TOP 1 ibr.Complexity 
        FROM ImportBatchRow ibr 
        JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
        WHERE ib.ProjectID = pm.ProjectId 
        AND (ibr.ShotName = sm.ShotCode OR ibr.ClientShotName = sm.ShotCode) 
        AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
        AND ib.ImportStatus = 'APPROVED'
        ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
    ) c
    LEFT JOIN (
      SELECT TaskID, SUM(
        CASE 
          WHEN EndTime IS NOT NULL THEN HoursWorked
          ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
        END
      ) AS actualWorkedHours
      FROM TimeLog
      GROUP BY TaskID
    ) tl ON t.TaskID = tl.TaskID
    WHERE (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    GROUP BY c.Complexity
    `;
    const res = await pool.request().query(query);
    console.log(res.recordset);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit();
}

test();
