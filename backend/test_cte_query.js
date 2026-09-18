const { sql, config } = require('./config/db');

async function testQuery() {
  const pool = await sql.connect(config);
  
  const query = `
    WITH ArtistBase AS (
      SELECT 
        u.UserId,
        u.FullName,
        u.EmployeeCode,
        u.Email,
        u.HomeDepartmentId,
        ISNULL(d.DepartmentName, 'Animation') AS DepartmentName
      FROM UserMaster u
      LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
      LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
      WHERE u.IsActive = 1 AND (r.RoleName = 'Artist' OR u.RoleId = 5)
    ),
    CurrentTaskStats AS (
      SELECT 
        ta.UserID,
        COUNT(DISTINCT ta.TaskID) AS AssignedTaskCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.StatusID != 4 THEN 1 ELSE 0 END) AS ActiveTaskCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.StatusID = 1 THEN 1 ELSE 0 END) AS AssignedCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.StatusID = 2 THEN 1 ELSE 0 END) AS InProgressCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.StatusID = 3 THEN 1 ELSE 0 END) AS ReviewCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.StatusID = 5 THEN 1 ELSE 0 END) AS ReworkCount,
        SUM(CASE WHEN t.IsActive = 1 AND ISNULL(t.IsDeleted, 0) = 0 AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS OverdueCount,
        SUM(ta.TargetHours) AS TargetHours
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID
      GROUP BY ta.UserID
    ),
    CompletedTaskStats AS (
      SELECT 
        ta.UserID,
        COUNT(DISTINCT ta.TaskID) AS CompletedCount
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID
      WHERE t.StatusID = 4 AND ISNULL(t.IsDeleted, 0) = 0
      GROUP BY ta.UserID
    ),
    ReviewStats AS (
      SELECT 
        ta.UserID,
        COUNT(tr.ReviewID) AS ReviewSubmissions
      FROM TaskReview tr
      INNER JOIN TaskAssignment ta ON tr.TaskID = ta.TaskID
      GROUP BY ta.UserID
    ),
    ReworkStats AS (
      SELECT 
        rw.AssignedToUserID AS UserID,
        COUNT(rw.ReworkID) AS ReworkCount
      FROM TaskRework rw
      GROUP BY rw.AssignedToUserID
    ),
    TimeLogStats AS (
      SELECT 
        ta.UserID,
        SUM(
          CASE 
            WHEN tl.EndTime IS NOT NULL THEN tl.HoursWorked
            ELSE DATEDIFF(SECOND, tl.StartTime, GETDATE()) / 3600.0
          END
        ) AS ActualWorkedHours
      FROM TimeLog tl
      INNER JOIN TaskAssignment ta ON tl.TaskID = ta.TaskID
      GROUP BY ta.UserID
    )
    SELECT 
      a.UserId,
      a.FullName,
      a.DepartmentName,
      ISNULL(c.AssignedTaskCount, 0) AS AssignedTaskCount,
      ISNULL(c.ActiveTaskCount, 0) AS ActiveTaskCount,
      ISNULL(c.AssignedCount, 0) AS AssignedCount,
      ISNULL(c.InProgressCount, 0) AS InProgressCount,
      ISNULL(c.ReviewCount, 0) AS ReviewCount,
      ISNULL(c.ReworkCount, 0) AS CurrentReworkCount,
      ISNULL(comp.CompletedCount, 0) AS CompletedCount,
      ISNULL(c.OverdueCount, 0) AS OverdueCount,
      ISNULL(rev.ReviewSubmissions, 0) AS HistoricalReviewSubmissions,
      ISNULL(rew.ReworkCount, 0) AS HistoricalReworkCount,
      ISNULL(c.TargetHours, 0) AS TargetHours,
      ISNULL(tl.ActualWorkedHours, 0) AS ActualWorkedHours
    FROM ArtistBase a
    LEFT JOIN CurrentTaskStats c ON a.UserId = c.UserID
    LEFT JOIN CompletedTaskStats comp ON a.UserId = comp.UserID
    LEFT JOIN ReviewStats rev ON a.UserId = rev.UserID
    LEFT JOIN ReworkStats rew ON a.UserId = rew.UserID
    LEFT JOIN TimeLogStats tl ON a.UserId = tl.UserID
    WHERE a.FullName LIKE '%Gaurav%' OR comp.CompletedCount > 0 OR rev.ReviewSubmissions > 0 OR rew.ReworkCount > 0
    ORDER BY a.FullName ASC;
  `;

  try {
    const res = await pool.request().query(query);
    console.log(JSON.stringify(res.recordset, null, 2));
  } catch (err) {
    console.error(err);
  }
  pool.close();
}

testQuery();
