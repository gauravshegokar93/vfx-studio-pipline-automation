const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sql = require('mssql');
const { config } = require('./config/db');
(async () => {
  const pool = await sql.connect(config);
  const result = await pool.request().input('ArtistId', sql.BigInt, 5).query(`
      WITH ActiveAssignments AS (
        SELECT TaskID, UserID, TargetHours, AssignedDate, Remarks, AssignmentID,
               ROW_NUMBER() OVER(PARTITION BY TaskID ORDER BY AssignmentID DESC) as rn
        FROM TaskAssignment
      )
      SELECT
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        ISNULL(
          (
            SELECT TOP 1 ibr.Complexity 
            FROM ImportBatchRow ibr 
            JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
            WHERE ib.ProjectID = pm.ProjectId
            AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
            AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
            AND ib.ImportStatus = 'APPROVED'
            ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
          ), 'Unknown'
        ) AS complexity
      FROM TaskMaster t
      INNER JOIN ActiveAssignments ta ON t.TaskID = ta.TaskID AND ta.rn = 1
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      WHERE t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL);
  `);
  console.log(JSON.stringify(result.recordset, null, 2));
  process.exit();
})();
