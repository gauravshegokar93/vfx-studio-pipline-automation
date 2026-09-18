async function getEmployeePerformanceReport(artistId) {
  const pool = await sql.connect(config);
  
  // 1. Employee Info
  const userRes = await pool.request()
    .input('UserId', sql.BigInt, artistId)
    .query(`
      SELECT u.UserId AS id, u.EmployeeCode AS employeeCode, u.FullName AS fullName, 
             u.Email AS email, u.CreatedDate AS joiningDate, u.IsActive AS isActive,
             d.DepartmentName AS departmentName, r.RoleName AS roleName, t.TeamName AS teamName,
             rm.FullName AS reportingManager
      FROM UserMaster u
      LEFT JOIN DepartmentMaster d ON u.DepartmentID = d.DepartmentId
      LEFT JOIN RoleMaster r ON u.RoleID = r.RoleId
      LEFT JOIN TeamMaster t ON u.TeamID = t.TeamId
      LEFT JOIN UserMaster rm ON u.ReportingManagerID = rm.UserId
      WHERE u.UserId = @UserId
    `);
  
  const employeeInfo = userRes.recordset[0] || null;
  if (!employeeInfo) throw new Error('Employee not found');

  // 2. KPI / Summary (Reuse Artist Workload logic specifically for this user)
  const kpiRes = await pool.request()
    .input('ArtistId', sql.BigInt, artistId)
    .query(`
      SELECT 
        COUNT(DISTINCT t.TaskID) AS activeTasks,
        SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS reviews,
        SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworks,
        SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS overdue,
        ROUND(SUM(ISNULL(ta.TargetHours, t.EstimatedHours)) / 8.0, 2) AS targetBid,
        ROUND(SUM(ISNULL(tl.actualHours, 0)) / 8.0, 2) AS actualBid,
        ROUND(SUM(ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      LEFT JOIN (
        SELECT TaskID, SUM(CASE WHEN EndTime IS NOT NULL THEN HoursWorked ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0 END) AS actualHours
        FROM TimeLog GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      WHERE ta.UserID = @ArtistId
    `);
  const kpi = kpiRes.recordset[0] || {};

  // 3. Trends (7, 30, 90 days)
  const trendQueries = [7, 30, 90].map(days => {
    return pool.request()
      .input('ArtistId', sql.BigInt, artistId)
      .query(`
        SELECT 
          ${days} AS days,
          COUNT(DISTINCT CASE WHEN th.NewStatusID = 4 AND th.ChangedDate >= DATEADD(day, -${days}, GETDATE()) THEN th.TaskID END) AS tasksCompleted,
          COUNT(DISTINCT CASE WHEN th.NewStatusID = 2 AND th.ChangedDate >= DATEADD(day, -${days}, GETDATE()) THEN th.TaskID END) AS tasksStarted,
          COUNT(DISTINCT CASE WHEN tr.CreatedDate >= DATEADD(day, -${days}, GETDATE()) THEN tr.ReviewID END) AS reviewSubmissions,
          COUNT(DISTINCT CASE WHEN th.NewStatusID = 5 AND th.ChangedDate >= DATEADD(day, -${days}, GETDATE()) THEN th.TaskID END) AS reworks,
          ROUND(ISNULL(SUM(CASE WHEN tl.StartTime >= DATEADD(day, -${days}, GETDATE()) THEN ISNULL(tl.HoursWorked, DATEDIFF(SECOND, tl.StartTime, GETDATE()) / 3600.0) ELSE 0 END), 0), 2) AS loggedHours
        FROM UserMaster u
        LEFT JOIN TaskHistory th ON th.ChangedBy = u.UserId
        LEFT JOIN TaskReview tr ON tr.TaskID IN (SELECT TaskID FROM TaskAssignment WHERE UserID = u.UserId) AND tr.CreatedBy = u.UserId
        LEFT JOIN TimeLog tl ON tl.UserID = u.UserId
        WHERE u.UserId = @ArtistId
      `);
  });
  
  const trendResults = await Promise.all(trendQueries);
  const trends = {
    '7Days': trendResults[0].recordset[0],
    '30Days': trendResults[1].recordset[0],
    '90Days': trendResults[2].recordset[0]
  };

  // 4. Activity History (Unified timeline of top 50 events)
  const historyRes = await pool.request()
    .input('ArtistId', sql.BigInt, artistId)
    .query(`
      SELECT TOP 50 * FROM (
        -- Task Status Changes
        SELECT th.ChangedDate AS eventDate, 'Status Change' AS eventType, 
               'Changed status to ' + ISNULL(ns.StatusName, 'Unknown') AS description,
               t.TaskCode AS taskCode, t.TaskID as taskId
        FROM TaskHistory th
        JOIN TaskMaster t ON th.TaskID = t.TaskID
        LEFT JOIN StatusMaster ns ON th.NewStatusID = ns.StatusId
        WHERE th.ChangedBy = @ArtistId

        UNION ALL
        
        -- Reviews Submitted
        SELECT tr.CreatedDate AS eventDate, 'Review Submitted' AS eventType,
               'Submitted review version ' + ISNULL(tr.VersionNumber, '1') AS description,
               t.TaskCode AS taskCode, t.TaskID as taskId
        FROM TaskReview tr
        JOIN TaskMaster t ON tr.TaskID = t.TaskID
        WHERE tr.CreatedBy = @ArtistId

        UNION ALL
        
        -- TimeLog sessions
        SELECT tl.StartTime AS eventDate, 'Work Logged' AS eventType,
               'Logged ' + CAST(ROUND(ISNULL(tl.HoursWorked, DATEDIFF(SECOND, tl.StartTime, GETDATE()) / 3600.0), 2) AS VARCHAR) + ' hours' AS description,
               t.TaskCode AS taskCode, t.TaskID as taskId
        FROM TimeLog tl
        JOIN TaskMaster t ON tl.TaskID = t.TaskID
        WHERE tl.UserID = @ArtistId

        UNION ALL

        -- Assignments
        SELECT tah.AssignedDate AS eventDate, 'Task Assigned' AS eventType,
               'Assigned task (' + ISNULL(tah.AssignmentType, '') + ')' AS description,
               t.TaskCode AS taskCode, t.TaskID as taskId
        FROM TaskAssignmentHistory tah
        JOIN TaskMaster t ON tah.TaskID = t.TaskID
        WHERE tah.AssignedToUserID = @ArtistId
      ) combined
      ORDER BY eventDate DESC
    `);
  const history = historyRes.recordset || [];

  // 5. Complexity Breakdown (using the exact same logic as Artist Tasks)
  const complexityRes = await pool.request()
    .input('ArtistId', sql.BigInt, artistId)
    .query(`
      SELECT 
        ISNULL((
          SELECT TOP 1 ibr.Complexity 
          FROM ImportBatchRow ibr 
          JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
          WHERE ib.ProjectID = pm.ProjectId
          AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
          AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
          AND ib.ImportStatus = 'APPROVED'
          ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
        ), 'Unknown') AS complexity,
        COUNT(t.TaskID) as taskCount
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      WHERE ta.UserID = @ArtistId
      GROUP BY 
        ISNULL((
          SELECT TOP 1 ibr.Complexity 
          FROM ImportBatchRow ibr 
          JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
          WHERE ib.ProjectID = pm.ProjectId
          AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
          AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
          AND ib.ImportStatus = 'APPROVED'
          ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
        ), 'Unknown')
    `);
  
  const complexityBreakdown = complexityRes.recordset || [];

  // 6. Overdue Tasks Details
  const overdueRes = await pool.request()
    .input('ArtistId', sql.BigInt, artistId)
    .query(`
      SELECT
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        s.ShotCode AS shotCode,
        wsm.StageName AS stage,
        t.DueDate AS dueDate,
        DATEDIFF(day, t.DueDate, GETDATE()) AS daysOverdue,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        ISNULL(st.StatusName, 'Unassigned') AS status,
        ISNULL((
          SELECT TOP 1 ibr.Complexity 
          FROM ImportBatchRow ibr 
          JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
          WHERE ib.ProjectID = pm.ProjectId
          AND (ibr.ShotName = s.ShotCode OR ibr.ClientShotName = s.ShotCode)
          AND (ibr.Episode = seq.SequenceCode OR ibr.Episode = r.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
          AND ib.ImportStatus = 'APPROVED'
          ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
        ), 'Unknown') AS complexity
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN (
        SELECT TaskID, SUM(CASE WHEN EndTime IS NOT NULL THEN HoursWorked ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0 END) AS actualHours
        FROM TimeLog GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      WHERE ta.UserID = @ArtistId
        AND t.DueDate < GETDATE() 
        AND (t.StatusID IS NULL OR t.StatusID != 4)
      ORDER BY daysOverdue DESC
    `);

  const overdueTasks = overdueRes.recordset || [];

  return {
    employeeInfo,
    kpi,
    trends,
    history,
    complexityBreakdown,
    overdueTasks
  };
}
