const sql = require('mssql');
const config = require('./config/db');

async function test() {
  try {
    const pool = await sql.connect(config.config);
    const query = `
    SELECT 
      u.UserId AS userId,
      u.UserId AS id,
      u.FullName AS fullName,
      u.EmployeeCode AS employeeCode,
      u.Email AS email,
      u.HomeDepartmentId AS departmentId,
      ISNULL(d.DepartmentName, 'Animation') AS departmentName,
      COUNT(DISTINCT ta.TaskID) AS assignedTaskCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID != 4 THEN 1 ELSE 0 END) AS activeTaskCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 4 THEN 1 ELSE 0 END) AS completedCount,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS overdueCount,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours,
      (
        SELECT STRING_AGG(ISNULL(c.Complexity, 'Unknown'), ',')
        FROM TaskMaster t2
        JOIN TaskAssignment ta2 ON t2.TaskID = ta2.TaskID
        OUTER APPLY (
            SELECT TOP 1 ibr.Complexity 
            FROM ImportBatchRow ibr 
            JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
            JOIN ShotMaster sm2 ON sm2.ShotId = t2.ShotID 
            JOIN SequenceMaster sq2 ON sm2.SequenceId = sq2.SequenceId 
            JOIN ReelMaster rm2 ON sq2.ReelId = rm2.ReelId 
            JOIN ProjectMaster pm2 ON rm2.ProjectId = pm2.ProjectId 
            WHERE ib.ProjectID = pm2.ProjectId 
            AND (ibr.ShotName = sm2.ShotCode OR ibr.ClientShotName = sm2.ShotCode) 
            AND (ibr.Episode = sq2.SequenceCode OR ibr.Episode = rm2.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
            AND ib.ImportStatus = 'APPROVED'
            ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
        ) c
        WHERE ta2.UserID = u.UserId 
        AND (t2.IsActive = 1 OR t2.IsActive IS NULL) 
        AND (t2.IsDeleted = 0 OR t2.IsDeleted IS NULL)
        AND t2.StatusID != 4
      ) AS taskComplexities
    FROM UserMaster u
    LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
    LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
    LEFT JOIN TaskAssignment ta ON u.UserId = ta.UserID
    LEFT JOIN TaskMaster t ON ta.TaskID = t.TaskID AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
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
    WHERE u.IsActive = 1 AND (r.RoleName = 'Artist' OR u.RoleId = 5)
    GROUP BY u.UserId, u.FullName, u.EmployeeCode, u.Email, u.HomeDepartmentId, d.DepartmentName
    ORDER BY u.FullName ASC;
    `;
    const res = await pool.request().query(query);
    console.log(res.recordset);
  } catch (e) {
    console.error(e.message);
  }
  process.exit();
}

test();
