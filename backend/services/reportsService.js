const { sql, config } = require('../config/db');

/**
 * Executive Dashboard Overview (Production Head / Executive View)
 */
async function getDashboardData({ projectId, dateRange, startDate, endDate } = {}) {
  const pool = await sql.connect(config);
  const request = pool.request();

  let hasProjectFilter = false;
  if (projectId && projectId !== 'all') {
    request.input('ProjectId', sql.BigInt, projectId);
    hasProjectFilter = true;
  }

  let startD = null;
  let endD = null;

  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    if (dateRange === 'today') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startD = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (dateRange === 'this_month') {
      startD = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateRange === 'custom' && startDate && endDate) {
      startD = new Date(startDate + 'T00:00:00');
      endD = new Date(endDate + 'T23:59:59');
    }
  }

  let hasDateFilter = false;
  if (startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
    request.input('StartDate', sql.DateTime2, startD);
    request.input('EndDate', sql.DateTime2, endD);
    hasDateFilter = true;
  }

  // 1. Projects List for dropdown filter
  const projectsListRes = await pool.request().query(`
    SELECT ProjectId AS id, ProjectCode AS projectCode, ProjectName AS projectName
    FROM ProjectMaster
    ORDER BY ProjectName ASC
  `);
  const projectsList = projectsListRes.recordset || [];

  // WHERE conditions
  const pWhere = [];
  const tWhere = ['(t.IsActive = 1 OR t.IsActive IS NULL)', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];
  const timeLogWhere = [];

  if (hasProjectFilter) {
    pWhere.push('p.ProjectId = @ProjectId');
    tWhere.push('pm.ProjectId = @ProjectId');
    timeLogWhere.push('pm.ProjectId = @ProjectId');
  }

  if (hasDateFilter) {
    tWhere.push('t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate');
    timeLogWhere.push('tl.WorkDate >= @StartDate AND tl.WorkDate <= @EndDate');
  }

  const pWhereSql = pWhere.length ? `WHERE ${pWhere.join(' AND ')}` : '';
  const tWhereSql = tWhere.length ? `WHERE ${tWhere.join(' AND ')}` : '';
  const timeLogWhereSql = timeLogWhere.length ? `WHERE ${timeLogWhere.join(' AND ')}` : '';

  // 2. KPI: Active Projects & Total Shots
  const kpiProjectsShots = await request.query(`
    SELECT 
      COUNT(DISTINCT p.ProjectId) AS totalProjects,
      COUNT(DISTINCT sm.ShotId) AS totalShots,
      COUNT(DISTINCT r.ReelId) AS totalReels
    FROM ProjectMaster p
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    ${pWhereSql}
  `);

  // 3. KPI: Task counts & Bid Metrics
  const kpiTasks = await request.query(`
    SELECT 
      COUNT(t.TaskID) AS totalTasks,
      SUM(CASE WHEN ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassignedTasks,
      SUM(CASE WHEN t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedTasks,
      SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewTasks,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS totalEstimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS totalTargetHours
    FROM TaskMaster t
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    ${tWhereSql}
  `);

  // 4. TimeLog / Actual Hours
  const timeLogRes = await request.query(`
    SELECT COALESCE(SUM(
      CASE 
        WHEN tl.EndTime IS NOT NULL THEN tl.HoursWorked
        ELSE DATEDIFF(SECOND, tl.StartTime, GETDATE()) / 3600.0
      END
    ), 0) AS totalActualHours
    FROM TimeLog tl
    LEFT JOIN TaskMaster t ON tl.TaskID = t.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    ${timeLogWhereSql}
  `);

  // 5. Attention Required: Overdue count
  const overdueRes = await request.query(`
    SELECT COUNT(t.TaskID) AS cnt
    FROM TaskMaster t
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    WHERE t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      AND t.DueDate IS NOT NULL AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4)
      ${hasProjectFilter ? 'AND pm.ProjectId = @ProjectId' : ''} 
      ${hasDateFilter ? 'AND t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate' : ''}
  `);

  // 6. Project Production Breakdown Matrix
  const projectProduction = await request.query(`
    SELECT 
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      st.StatusName AS status,
      COUNT(DISTINCT r.ReelId) AS totalReels,
      COUNT(DISTINCT sm.ShotId) AS totalShots,
      COUNT(t.TaskID) AS totalTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassignedTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS estimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours
    FROM ProjectMaster p
    LEFT JOIN StatusMaster st ON p.StatusId = st.StatusId
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    LEFT JOIN TaskMaster t ON t.ShotID = sm.ShotId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ${hasDateFilter ? 'AND t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate' : ''}
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
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
    ${pWhereSql}
    GROUP BY p.ProjectId, p.ProjectCode, p.ProjectName, st.StatusName
    ORDER BY p.ProjectName ASC
  `);

  // 7. Department Status Breakdown
  const deptBreakdown = await request.query(`
    SELECT 
      w.StageId AS stageId,
      w.StageName AS stageName,
      COUNT(t.TaskID) AS totalTasks,
      SUM(CASE WHEN ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassignedTasks,
      SUM(CASE WHEN t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedTasks,
      SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewTasks,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS estimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours
    FROM TaskMaster t
    LEFT JOIN WorkflowStageMaster w ON t.WorkflowStageID = w.StageId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
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
    ${tWhereSql}
    GROUP BY w.StageId, w.StageName
    ORDER BY w.StageId ASC
  `);

  const kpiProj = kpiProjectsShots.recordset?.[0] || { totalProjects: 0, totalShots: 0, totalReels: 0 };
  const kpiTask = kpiTasks.recordset?.[0] || { 
    totalTasks: 0, unassignedTasks: 0, assignedTasks: 0, inProgressTasks: 0, 
    reviewTasks: 0, completedTasks: 0, reworkTasks: 0, totalEstimatedHours: 0, totalTargetHours: 0 
  };

  const totalTasks = kpiTask.totalTasks || 0;
  const completedTasks = kpiTask.completedTasks || 0;
  const overallCompletion = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

  const totalEstBid = Number((kpiTask.totalEstimatedHours / 8.0).toFixed(2));
  const totalTgtBid = Number((kpiTask.totalTargetHours / 8.0).toFixed(2));
  const totalActBid = Number(((timeLogRes.recordset?.[0]?.totalActualHours || 0) / 8.0).toFixed(2));
  const totalRemBid = Number((totalTgtBid - totalActBid).toFixed(2));

  const projectRows = (projectProduction.recordset || []).map(p => {
    const pTotal = p.totalTasks || 0;
    const pDone = p.completedTasks || 0;
    const estBid = Number(((p.estimatedHours || 0) / 8.0).toFixed(2));
    const tgtBid = Number(((p.targetHours || 0) / 8.0).toFixed(2));
    const actBid = Number(((p.actualHours || 0) / 8.0).toFixed(2));
    const remBid = Number((tgtBid - actBid).toFixed(2));

    return {
      id: p.id,
      projectCode: p.projectCode,
      projectName: p.projectName,
      status: p.status || null,
      reels: p.totalReels || 0,
      shots: p.totalShots || 0,
      tasks: pTotal,
      unassigned: p.unassignedTasks || 0,
      assigned: p.assignedTasks || 0,
      inProgress: p.inProgressTasks || 0,
      wip: (p.assignedTasks || 0) + (p.inProgressTasks || 0),
      pendingReview: p.reviewTasks || 0,
      rework: p.reworkTasks || 0,
      completed: pDone,
      completionRate: pTotal > 0 ? Number(((pDone / pTotal) * 100).toFixed(1)) : 0,
      estimatedHours: p.estimatedHours || 0,
      estimatedBid: estBid,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid
    };
  });

  const targetDepts = [
    { stageId: 1, name: 'Roto' },
    { stageId: 2, name: 'Paint' },
    { stageId: 3, name: 'Comp' },
    { stageId: 4, name: 'CG' }
  ];

  const dbDeptMap = new Map();
  (deptBreakdown.recordset || []).forEach(d => {
    if (d.stageName) {
      dbDeptMap.set(d.stageName.toLowerCase(), d);
    }
    if (d.stageId) {
      dbDeptMap.set(String(d.stageId), d);
    }
  });

  const departmentStatus = targetDepts.map(deptObj => {
    let key = deptObj.name.toLowerCase();
    if (key === 'comp') key = 'compositing';
    const found = dbDeptMap.get(String(deptObj.stageId)) || dbDeptMap.get(key) || dbDeptMap.get(deptObj.name.toLowerCase());
    
    const total = found ? (found.totalTasks || 0) : 0;
    const done = found ? (found.completedTasks || 0) : 0;
    const estBid = found ? Number(((found.estimatedHours || 0) / 8.0).toFixed(2)) : 0;
    const tgtBid = found ? Number(((found.targetHours || 0) / 8.0).toFixed(2)) : 0;
    const actBid = found ? Number(((found.actualHours || 0) / 8.0).toFixed(2)) : 0;
    const remBid = Number((tgtBid - actBid).toFixed(2));

    return {
      stageId: deptObj.stageId,
      department: deptObj.name,
      totalTasks: total,
      unassigned: found ? (found.unassignedTasks || 0) : 0,
      assigned: found ? (found.assignedTasks || 0) : 0,
      inProgress: found ? (found.inProgressTasks || 0) : 0,
      wip: found ? ((found.assignedTasks || 0) + (found.inProgressTasks || 0)) : 0,
      pendingReview: found ? (found.reviewTasks || 0) : 0,
      rework: found ? (found.reworkTasks || 0) : 0,
      completed: done,
      completionRate: total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0,
      estimatedBid: estBid,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid
    };
  });

  const unassignedTasks = kpiTask.unassignedTasks || 0;
  const pendingReviews = kpiTask.reviewTasks || 0;
  const overdueTasks = overdueRes.recordset?.[0]?.cnt || 0;
  const blockedTasks = kpiTask.reworkTasks || 0;

  return {
    success: true,
    filter: {
      projectId: projectId || 'all',
      dateRange: dateRange || 'all',
      startDate: startDate || null,
      endDate: endDate || null,
      appliedDateRangeText: hasDateFilter ? `${startD.toISOString().split('T')[0]} to ${endD.toISOString().split('T')[0]}` : 'All Dates'
    },
    projectsList,
    kpi: {
      activeProjects: kpiProj.totalProjects || 0,
      totalReels: kpiProj.totalReels || 0,
      totalShots: kpiProj.totalShots || 0,
      activeTasks: totalTasks,
      overallCompletion: overallCompletion,
      totalEstimatedBid: totalEstBid,
      totalTargetBid: totalTgtBid,
      totalActualBid: totalActBid,
      totalRemainingBid: totalRemBid
    },
    projectProduction: projectRows,
    departmentStatus: departmentStatus,
    attentionRequired: {
      unassignedTasks,
      pendingReviews,
      overdueTasks,
      blockedTasks
    },
    bidVsActual: {
      totalBidHours: kpiTask.totalEstimatedHours || 0,
      totalActualHours: timeLogRes.recordset?.[0]?.totalActualHours || 0,
      totalEstimatedBid: totalEstBid,
      totalTargetBid: totalTgtBid,
      totalActualBid: totalActBid,
      totalRemainingBid: totalRemBid,
      hasReliableLogs: true
    }
  };
}

/**
 * Phase 2 — Department Production Progress
 */
async function getDepartmentProgressReport({ projectId, dateRange, startDate, endDate } = {}) {
  const pool = await sql.connect(config);
  const request = pool.request();

  const where = ['(t.IsActive = 1 OR t.IsActive IS NULL)', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];

  if (projectId && projectId !== 'all') {
    request.input('ProjectId', sql.BigInt, projectId);
    where.push('pm.ProjectId = @ProjectId');
  }

  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    let startD = null;
    let endD = null;
    if (dateRange === 'today') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startD = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (dateRange === 'this_month') {
      startD = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateRange === 'custom' && startDate && endDate) {
      startD = new Date(startDate + 'T00:00:00');
      endD = new Date(endDate + 'T23:59:59');
    }

    if (startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
      request.input('StartDate', sql.DateTime2, startD);
      request.input('EndDate', sql.DateTime2, endD);
      where.push('t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate');
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const query = `
    SELECT 
      w.StageId AS stageId,
      ISNULL(w.StageName, 'General') AS stageName,
      COUNT(DISTINCT t.TaskID) AS totalTasks,
      SUM(CASE WHEN ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassignedTasks,
      SUM(CASE WHEN t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedTasks,
      SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewTasks,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkTasks,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS estimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours
    FROM WorkflowStageMaster w
    LEFT JOIN TaskMaster t ON t.WorkflowStageID = w.StageId AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
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
    ${whereSql}
    GROUP BY w.StageId, w.StageName
    ORDER BY w.StageId ASC;
  `;

  const result = await request.query(query);
  const rows = result.recordset || [];

  const items = rows.map(r => {
    const total = r.totalTasks || 0;
    const completed = r.completedTasks || 0;
    const estBid = Number(((r.estimatedHours || 0) / 8.0).toFixed(2));
    const tgtBid = Number(((r.targetHours || 0) / 8.0).toFixed(2));
    const actBid = Number(((r.actualHours || 0) / 8.0).toFixed(2));
    const remBid = Number((tgtBid - actBid).toFixed(2));

    return {
      stageId: r.stageId,
      department: r.stageName,
      stageName: r.stageName,
      totalTasks: total,
      unassigned: r.unassignedTasks || 0,
      assigned: r.assignedTasks || 0,
      inProgress: r.inProgressTasks || 0,
      review: r.reviewTasks || 0,
      rework: r.reworkTasks || 0,
      completed: completed,
      completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
      estimatedHours: r.estimatedHours || 0,
      targetHours: r.targetHours || 0,
      actualHours: r.actualHours || 0,
      estimatedBid: estBid,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid
    };
  });

  return {
    success: true,
    items
  };
}

/**
 * Phase 3 — Artist Workload Report
 */
async function getArtistWorkloadReport({ departmentId, searchQuery } = {}) {
  const pool = await sql.connect(config);
  const request = pool.request();

  const where = ['u.IsActive = 1', '(r.RoleName = \'Artist\' OR u.RoleId = 5)'];

  if (departmentId && departmentId !== 'all') {
    request.input('DepartmentId', sql.BigInt, parseInt(departmentId, 10));
    where.push('u.HomeDepartmentId = @DepartmentId');
  }

  if (searchQuery && searchQuery.trim() !== '') {
    request.input('SearchQuery', sql.NVarChar, `%${searchQuery.trim()}%`);
    where.push('(u.FullName LIKE @SearchQuery OR u.EmployeeCode LIKE @SearchQuery OR d.DepartmentName LIKE @SearchQuery)');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

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
      ${whereSql}
    ),
    CurrentTaskStats AS (
      SELECT 
        ta.UserID,
        COUNT(DISTINCT ta.TaskID) AS AssignedTaskCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.StatusID != 4 THEN 1 ELSE 0 END) AS ActiveTaskCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.StatusID = 1 THEN 1 ELSE 0 END) AS AssignedCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.StatusID = 2 THEN 1 ELSE 0 END) AS InProgressCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.StatusID = 3 THEN 1 ELSE 0 END) AS ReviewCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.StatusID = 5 THEN 1 ELSE 0 END) AS ReworkCount,
        SUM(CASE WHEN (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL) AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS OverdueCount,
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
      WHERE t.StatusID = 4 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
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
    ),
    ComplexityStats AS (
      SELECT 
        ta.UserID,
        STRING_AGG(ISNULL(c.Complexity, 'Unknown'), ',') AS taskComplexities
      FROM TaskMaster t2
      JOIN TaskAssignment ta ON t2.TaskID = ta.TaskID
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
      WHERE (t2.IsActive = 1 OR t2.IsActive IS NULL) 
      AND (t2.IsDeleted = 0 OR t2.IsDeleted IS NULL)
      AND t2.StatusID != 4
      GROUP BY ta.UserID
    )
    SELECT 
      a.UserId AS userId,
      a.UserId AS id,
      a.FullName AS fullName,
      a.EmployeeCode AS employeeCode,
      a.Email AS email,
      a.HomeDepartmentId AS departmentId,
      a.DepartmentName AS departmentName,
      ISNULL(c.AssignedTaskCount, 0) AS assignedTaskCount,
      ISNULL(c.ActiveTaskCount, 0) AS activeTaskCount,
      ISNULL(c.AssignedCount, 0) AS assignedCount,
      ISNULL(c.InProgressCount, 0) AS inProgressCount,
      ISNULL(c.ReviewCount, 0) AS reviewCount,
      ISNULL(c.ReworkCount, 0) AS reworkCount,
      ISNULL(comp.CompletedCount, 0) AS completedCount,
      ISNULL(c.OverdueCount, 0) AS overdueCount,
      ISNULL(rev.ReviewSubmissions, 0) AS historicalReviewSubmissions,
      ISNULL(rew.ReworkCount, 0) AS historicalReworkCount,
      ISNULL(cs.taskComplexities, '') AS taskComplexities,
      ISNULL(c.TargetHours, 0) AS targetHours,
      ISNULL(tl.ActualWorkedHours, 0) AS actualHours
    FROM ArtistBase a
    LEFT JOIN CurrentTaskStats c ON a.UserId = c.UserID
    LEFT JOIN CompletedTaskStats comp ON a.UserId = comp.UserID
    LEFT JOIN ReviewStats rev ON a.UserId = rev.UserID
    LEFT JOIN ReworkStats rew ON a.UserId = rew.UserID
    LEFT JOIN TimeLogStats tl ON a.UserId = tl.UserID
    LEFT JOIN ComplexityStats cs ON a.UserId = cs.UserID
    ORDER BY a.FullName ASC;
  `;

  const result = await request.query(query);
  const rows = result.recordset || [];

  const items = rows.map(r => {
    const tgtBid = Number(((r.targetHours || 0) / 8.0).toFixed(2));
    const actBid = Number(((r.actualHours || 0) / 8.0).toFixed(2));
    const remBid = Math.max(0, Number((tgtBid - actBid).toFixed(2)));

    return {
      artist: {
        id: r.userId,
        userId: r.userId,
        fullName: r.fullName,
        employeeCode: r.employeeCode,
        email: r.email,
        departmentId: r.departmentId,
        departmentName: r.departmentName,
        isActive: true
      },
      taskCount: r.assignedTaskCount || 0,
      activeTaskCount: r.activeTaskCount || 0,
      assignedCount: r.assignedCount || 0,
      inProgressCount: r.inProgressCount || 0,
      reviewCount: r.reviewCount || 0,
      reworkCount: r.reworkCount || 0,
      completedCount: r.completedCount || 0,
      overdueCount: r.overdueCount || 0,
      reviewSubmissions: r.historicalReviewSubmissions || 0,
      historicalReworkCount: r.historicalReworkCount || 0,
      taskComplexities: r.taskComplexities || '',
      allocatedBids: tgtBid,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid
    };
  });

  return {
    success: true,
    items
  };
}

/**
 * Phase 4 — Overdue Tasks Report
 */
async function getOverdueTasksReport({ projectId, stageId } = {}) {
  const pool = await sql.connect(config);
  const request = pool.request();

  const where = [
    't.IsActive = 1',
    '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)',
    't.DueDate IS NOT NULL',
    't.DueDate < GETDATE()',
    '(t.StatusID IS NULL OR t.StatusID != 4)'
  ];

  if (projectId && projectId !== 'all') {
    request.input('ProjectId', sql.BigInt, parseInt(projectId, 10));
    where.push('pm.ProjectId = @ProjectId');
  }

  if (stageId && stageId !== 'all') {
    request.input('StageId', sql.BigInt, parseInt(stageId, 10));
    where.push('t.WorkflowStageID = @StageId');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const query = `
    SELECT
      t.TaskID AS taskId,
      t.TaskCode AS taskCode,
      t.TaskName AS taskName,
      pm.ProjectId AS projectId,
      pm.ProjectName AS projectName,
      s.ShotCode AS shotCode,
      wsm.StageName AS stageName,
      ISNULL(st.StatusName, 'Assigned') AS status,
      t.DueDate AS dueDate,
      u.FullName AS assignedArtist,
      u.UserId AS assignedArtistId,
      t.EstimatedHours AS estimatedHours,
      (t.EstimatedHours / 8.0) AS estimatedBid,
      ta.TargetHours AS targetHours,
      (ta.TargetHours / 8.0) AS targetBid,
      ISNULL(tl.actualHours, 0) AS actualHours,
      (ISNULL(tl.actualHours, 0) / 8.0) AS actualBid,
      (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0 AS remainingBid
    FROM TaskMaster t
    INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
    LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
    LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN UserMaster u ON ta.UserID = u.UserId
    LEFT JOIN (
      SELECT TaskID, SUM(
        CASE 
          WHEN EndTime IS NOT NULL THEN HoursWorked
          ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
        END
      ) AS actualHours
      FROM TimeLog
      GROUP BY TaskID
    ) tl ON t.TaskID = tl.TaskID
    ${whereSql}
    ORDER BY t.DueDate ASC;
  `;

  const result = await request.query(query);
  const items = (result.recordset || []).map(r => ({
    ...r,
    estimatedBid: Number((r.estimatedBid || 0).toFixed(2)),
    targetBid: Number((r.targetBid || 0).toFixed(2)),
    actualBid: Number((r.actualBid || 0).toFixed(2)),
    remainingBid: Number((r.remainingBid || 0).toFixed(2))
  }));

  return {
    success: true,
    count: items.length,
    items
  };
}

/**
 * Studio Analytics Report (Consolidated Executive Intelligence Hub)
 */
async function getAnalyticsReport({ projectId, stageId, artistId, dateRange, startDate, endDate, complexity } = {}) {
  const pool = await sql.connect(config);

  let startD = null;
  let endD = null;

  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    if (dateRange === 'today') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startD = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (dateRange === 'this_month') {
      startD = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateRange === 'custom' && startDate && endDate) {
      startD = new Date(startDate + 'T00:00:00');
      endD = new Date(endDate + 'T23:59:59');
    }
  }

  const hasProjectFilter = projectId && projectId !== 'all';
  const hasStageFilter = stageId && stageId !== 'all';
  const hasArtistFilter = artistId && artistId !== 'all';
  const hasComplexityFilter = complexity && complexity !== 'all';
  const hasDateFilter = startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime());

  const createReq = () => {
    const r = pool.request();
    if (hasProjectFilter) r.input('ProjectId', sql.BigInt, projectId);
    if (hasStageFilter) r.input('StageId', sql.BigInt, parseInt(stageId, 10));
    if (hasArtistFilter) r.input('ArtistId', sql.BigInt, parseInt(artistId, 10));
    if (hasComplexityFilter) r.input('Complexity', sql.VarChar, complexity);
    if (hasDateFilter) {
      r.input('StartDate', sql.DateTime2, startD);
      r.input('EndDate', sql.DateTime2, endD);
    }
    return r;
  };

  // Dropdown Options
  const projectsRes = await pool.request().query(`
    SELECT ProjectId AS id, ProjectCode AS projectCode, ProjectName AS projectName
    FROM ProjectMaster
    ORDER BY ProjectName ASC
  `);

  const stagesRes = await pool.request().query(`
    SELECT StageId AS id, StageName AS stageName
    FROM WorkflowStageMaster
    ORDER BY StageId ASC
  `);

  const artistsRes = await pool.request().query(`
    SELECT u.UserId AS id, u.FullName AS fullName, u.EmployeeCode AS employeeCode, ISNULL(d.DepartmentName, 'Animation') AS departmentName
    FROM UserMaster u
    LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
    LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
    WHERE u.IsActive = 1 AND (r.RoleName = 'Artist' OR u.RoleId = 5)
    ORDER BY u.FullName ASC
  `);

  const complexitiesRes = await pool.request().query(`
    SELECT DISTINCT Complexity AS complexity
    FROM ImportBatchRow
    WHERE Complexity IS NOT NULL AND Complexity != ''
    ORDER BY Complexity ASC
  `);

  // Where clause builders
  const tWhere = ['(t.IsActive = 1 OR t.IsActive IS NULL)', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];
  if (hasProjectFilter) tWhere.push('pm.ProjectId = @ProjectId');
  if (hasStageFilter) tWhere.push('t.WorkflowStageID = @StageId');
  if (hasArtistFilter) tWhere.push('ta.UserID = @ArtistId');
  if (hasDateFilter) tWhere.push('t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate');
  if (hasComplexityFilter) {
    tWhere.push(`(
      SELECT TOP 1 ibr.Complexity 
      FROM ImportBatchRow ibr 
      JOIN ImportBatch ib ON ib.ImportBatchID = ibr.ImportBatchID 
      JOIN ShotMaster sm2 ON sm2.ShotId = t.ShotID 
      JOIN SequenceMaster sq2 ON sm2.SequenceId = sq2.SequenceId 
      JOIN ReelMaster rm2 ON sq2.ReelId = rm2.ReelId 
      JOIN ProjectMaster pm2 ON rm2.ProjectId = pm2.ProjectId 
      WHERE ib.ProjectID = pm2.ProjectId 
      AND (ibr.ShotName = sm2.ShotCode OR ibr.ClientShotName = sm2.ShotCode) 
      AND (ibr.Episode = sq2.SequenceCode OR ibr.Episode = rm2.ReelName OR ibr.Episode IS NULL OR ibr.Episode = '')
      AND ib.ImportStatus = 'APPROVED'
      ORDER BY ibr.CreatedDate DESC, ibr.BatchRowID DESC
    ) = @Complexity`);
  }
  const tWhereSql = tWhere.length ? `WHERE ${tWhere.join(' AND ')}` : '';

  // 2. KPI Summary query
  const kpiReq = createReq();

  // Projects & Shots count starting from ProjectMaster for true studio scope
  const pScopeReq = createReq();
  const pScopeWhere = [];
  if (hasProjectFilter) pScopeWhere.push('p.ProjectId = @ProjectId');
  const pScopeWhereSql = pScopeWhere.length ? `WHERE ${pScopeWhere.join(' AND ')}` : '';

  const pScopeRes = await pScopeReq.query(`
    SELECT 
      COUNT(DISTINCT p.ProjectId) AS totalProjects,
      COUNT(DISTINCT sm.ShotId) AS totalShots
    FROM ProjectMaster p
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    ${pScopeWhereSql}
  `);

  const kpiRes = await kpiReq.query(`
    SELECT 
      COUNT(DISTINCT t.TaskID) AS activeTasks,
      SUM(CASE WHEN ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassignedTasks,
      SUM(CASE WHEN t.StatusID = 1 THEN 1 ELSE 0 END) AS assignedTasks,
      SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS reviewTasks,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS reworkTasks,
      SUM(CASE WHEN t.DueDate IS NOT NULL AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS overdueTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS totalEstimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS totalTargetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS totalActualHours
    FROM TaskMaster t
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
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
    ${tWhereSql}
  `);

  // 3. Department Workload
  const deptReq = createReq();
  const deptRes = await deptReq.query(`
    SELECT 
      w.StageId AS stageId,
      w.StageName AS stageName,
      COUNT(t.TaskID) AS totalTasks,
      SUM(CASE WHEN ta.AssignmentID IS NULL THEN 1 ELSE 0 END) AS unassigned,
      SUM(CASE WHEN t.StatusID = 1 THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN t.StatusID = 3 THEN 1 ELSE 0 END) AS review,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS rework,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completed
    FROM WorkflowStageMaster w
    LEFT JOIN TaskMaster t ON t.WorkflowStageID = w.StageId AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    ${tWhereSql}
    GROUP BY w.StageId, w.StageName
    ORDER BY w.StageId ASC
  `);

  // 4. Project Progress & Bid vs Actual
  const projReq = createReq();
  const projWhere = [];
  if (hasProjectFilter) projWhere.push('p.ProjectId = @ProjectId');
  const projWhereSql = projWhere.length ? `WHERE ${projWhere.join(' AND ')}` : '';

  const projRes = await projReq.query(`
    SELECT 
      p.ProjectId AS projectId,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      COUNT(t.TaskID) AS totalTasks,
      SUM(CASE WHEN t.StatusID = 4 THEN 1 ELSE 0 END) AS completedTasks,
      COALESCE(SUM(t.EstimatedHours), 0) AS estimatedHours,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours
    FROM ProjectMaster p
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    LEFT JOIN TaskMaster t ON t.ShotID = sm.ShotId AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ${hasStageFilter ? 'AND t.WorkflowStageID = @StageId' : ''}
      ${hasDateFilter ? 'AND t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate' : ''}
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      ${hasArtistFilter ? 'AND ta.UserID = @ArtistId' : ''}
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
    ${projWhereSql}
    GROUP BY p.ProjectId, p.ProjectCode, p.ProjectName
    ORDER BY p.ProjectName ASC
  `);

  // 5. Artist Workload
  const artistReq = createReq();
  const artistRes = await artistReq.query(`
    SELECT 
      u.UserId AS artistId,
      u.FullName AS artistName,
      u.EmployeeCode AS employeeCode,
      ISNULL(d.DepartmentName, 'Animation') AS department,
      COUNT(DISTINCT ta.TaskID) AS totalAssignedTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID != 4 THEN 1 ELSE 0 END) AS activeTasks,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 1 THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 2 THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 3 THEN 1 ELSE 0 END) AS review,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 5 THEN 1 ELSE 0 END) AS rework,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.StatusID = 4 THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN t.TaskID IS NOT NULL AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1 ELSE 0 END) AS overdue,
      COALESCE(SUM(ta.TargetHours), 0) AS targetHours,
      COALESCE(SUM(tl.actualWorkedHours), 0) AS actualHours
    FROM UserMaster u
    LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
    LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
    LEFT JOIN TaskAssignment ta ON u.UserId = ta.UserID
    LEFT JOIN TaskMaster t ON ta.TaskID = t.TaskID AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ${hasStageFilter ? 'AND t.WorkflowStageID = @StageId' : ''}
      ${hasDateFilter ? 'AND t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate' : ''}
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster rm ON seq.ReelId = rm.ReelId
    LEFT JOIN ProjectMaster pm ON rm.ProjectId = pm.ProjectId
      ${hasProjectFilter ? 'AND pm.ProjectId = @ProjectId' : ''}
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
    ${hasArtistFilter ? 'AND u.UserId = @ArtistId' : ''}
    GROUP BY u.UserId, u.FullName, u.EmployeeCode, d.DepartmentName
    ORDER BY COALESCE(SUM(ta.TargetHours), 0) DESC
  `);

  // 6. Production Trend (TimeLog by WorkDate)
  const trendReq = createReq();
  const trendWhere = ['tl.WorkDate IS NOT NULL'];
  if (hasProjectFilter) trendWhere.push('pm.ProjectId = @ProjectId');
  if (hasStageFilter) trendWhere.push('t.WorkflowStageID = @StageId');
  if (hasArtistFilter) trendWhere.push('(tl.UserID = @ArtistId OR ta.UserID = @ArtistId)');
  if (hasDateFilter) trendWhere.push('tl.WorkDate >= @StartDate AND tl.WorkDate <= @EndDate');
  const trendWhereSql = `WHERE ${trendWhere.join(' AND ')}`;

  const trendRes = await trendReq.query(`
    SELECT 
      CONVERT(VARCHAR(10), tl.WorkDate, 120) AS workDate,
      SUM(
        CASE 
          WHEN tl.EndTime IS NOT NULL THEN tl.HoursWorked
          ELSE DATEDIFF(SECOND, tl.StartTime, GETDATE()) / 3600.0
        END
      ) / 8.0 AS actualWorkedBid
    FROM TimeLog tl
    INNER JOIN TaskMaster t ON tl.TaskID = t.TaskID AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster rm ON seq.ReelId = rm.ReelId
    LEFT JOIN ProjectMaster pm ON rm.ProjectId = pm.ProjectId
    ${trendWhereSql}
    GROUP BY CONVERT(VARCHAR(10), tl.WorkDate, 120)
    ORDER BY workDate ASC
  `);

  // 7. Review & Rework Analytics
  const reviewReq = createReq();
  const reviewWhere = ['1=1'];
  if (hasProjectFilter) reviewWhere.push('pm.ProjectId = @ProjectId');
  if (hasStageFilter) reviewWhere.push('t.WorkflowStageID = @StageId');
  if (hasArtistFilter) reviewWhere.push('ta.UserID = @ArtistId');
  if (hasDateFilter) reviewWhere.push('tr.ReviewDate >= @StartDate AND tr.ReviewDate <= @EndDate');

  const reviewRes = await reviewReq.query(`
    SELECT 
      SUM(CASE WHEN tr.ReviewStatus = 'Submitted' THEN 1 ELSE 0 END) AS submittedCount,
      SUM(CASE WHEN tr.ReviewStatus = 'Approved' THEN 1 ELSE 0 END) AS approvedCount,
      SUM(CASE WHEN tr.ReviewStatus = 'Rework' THEN 1 ELSE 0 END) AS reworkCount
    FROM TaskReview tr
    INNER JOIN TaskMaster t ON tr.TaskID = t.TaskID AND (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN ShotMaster sm ON t.ShotID = sm.ShotId
    LEFT JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster rm ON seq.ReelId = rm.ReelId
    LEFT JOIN ProjectMaster pm ON rm.ProjectId = pm.ProjectId
    WHERE ${reviewWhere.join(' AND ')}
  `);

  // 8. Overdue Breakdown by Project and Stage
  const overdueReq = createReq();
  const overdueWhere = [
    't.IsActive = 1',
    '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)',
    't.DueDate IS NOT NULL',
    't.DueDate < GETDATE()',
    '(t.StatusID IS NULL OR t.StatusID != 4)'
  ];
  if (hasProjectFilter) overdueWhere.push('pm.ProjectId = @ProjectId');
  if (hasStageFilter) overdueWhere.push('t.WorkflowStageID = @StageId');
  if (hasArtistFilter) overdueWhere.push('ta.UserID = @ArtistId');
  if (hasDateFilter) overdueWhere.push('t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate');

  const overdueProjRes = await overdueReq.query(`
    SELECT pm.ProjectCode AS projectCode, pm.ProjectName AS name, COUNT(t.TaskID) AS count
    FROM TaskMaster t
    INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
    LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    WHERE ${overdueWhere.join(' AND ')}
    GROUP BY pm.ProjectCode, pm.ProjectName
    ORDER BY count DESC
  `);

  const overdueStageRes = await overdueReq.query(`
    SELECT wsm.StageName AS name, COUNT(t.TaskID) AS count
    FROM TaskMaster t
    LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
    LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
    LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    WHERE ${overdueWhere.join(' AND ')}
    GROUP BY wsm.StageName
    ORDER BY count DESC
  `);

  // 9. Attention Required Table
  const attReq = createReq();
  const attRes = await attReq.query(`
    SELECT TOP 15
      t.TaskID AS taskId,
      t.TaskCode AS taskCode,
      t.TaskName AS taskName,
      pm.ProjectId AS projectId,
      pm.ProjectCode AS projectCode,
      pm.ProjectName AS projectName,
      u.UserId AS artistId,
      u.FullName AS artistName,
      st.StatusId AS statusId,
      ISNULL(st.StatusName, 'Unassigned') AS statusName,
      prm.PriorityName AS priority,
      t.DueDate AS dueDate,
      (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualWorkedHours, 0)) / 8.0 AS remainingBid,
      CASE 
        WHEN t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 'Overdue'
        WHEN t.StatusID = 5 THEN 'In Rework'
        WHEN t.StatusID = 3 THEN 'Pending Review'
        WHEN ta.AssignmentID IS NULL THEN 'Unassigned'
        ELSE 'Needs Attention'
      END AS issueReason
    FROM TaskMaster t
    INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
    LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
    LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
    LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
    LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
    LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
    LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
    LEFT JOIN UserMaster u ON ta.UserID = u.UserId
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
    WHERE t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      AND (
        (t.DueDate IS NOT NULL AND t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4))
        OR t.StatusID = 5
        OR t.StatusID = 3
        OR ta.AssignmentID IS NULL
      )
    ${hasProjectFilter ? 'AND pm.ProjectId = @ProjectId' : ''}
    ${hasStageFilter ? 'AND t.WorkflowStageID = @StageId' : ''}
    ${hasArtistFilter ? 'AND ta.UserID = @ArtistId' : ''}
    ${hasDateFilter ? 'AND t.CreatedDate >= @StartDate AND t.CreatedDate <= @EndDate' : ''}
    ORDER BY 
      CASE 
        WHEN t.DueDate < GETDATE() AND (t.StatusID IS NULL OR t.StatusID != 4) THEN 1
        WHEN t.StatusID = 5 THEN 2
        WHEN t.StatusID = 3 THEN 3
        WHEN ta.AssignmentID IS NULL THEN 4
        ELSE 5
      END ASC,
      t.DueDate ASC,
      t.TaskID DESC
  `);

  // 10. Complexity Analytics
  const compReq = createReq();
  const compRes = await compReq.query(`
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
    ${tWhereSql}
    GROUP BY c.Complexity
  `);

  // Format Results
  const kpiRow = kpiRes.recordset?.[0] || {};
  const totalEstBid = Number(((kpiRow.totalEstimatedHours || 0) / 8.0).toFixed(2));
  const totalTgtBid = Number(((kpiRow.totalTargetHours || 0) / 8.0).toFixed(2));
  const totalActBid = Number(((kpiRow.totalActualHours || 0) / 8.0).toFixed(2));
  const totalRemBid = Number((totalTgtBid - totalActBid).toFixed(2));

  const pScopeRow = pScopeRes.recordset?.[0] || {};
  const kpis = {
    activeProjects: pScopeRow.totalProjects || 0,
    totalShots: pScopeRow.totalShots || 0,
    activeTasks: kpiRow.activeTasks || 0,
    activeArtists: (artistsRes.recordset || []).length || 0,
    estimatedBid: totalEstBid,
    allocatedTargetBid: totalTgtBid,
    actualBid: totalActBid,
    remainingBid: totalRemBid,
    unassignedTasks: kpiRow.unassignedTasks || 0,
    assignedTasks: kpiRow.assignedTasks || 0,
    inProgressTasks: kpiRow.inProgressTasks || 0,
    reviewTasks: kpiRow.reviewTasks || 0,
    reworkTasks: kpiRow.reworkTasks || 0,
    completedTasks: kpiRow.completedTasks || 0,
    overdueTasks: kpiRow.overdueTasks || 0
  };

  const taskStatusDistribution = [
    { name: 'Unassigned', count: kpis.unassignedTasks, statusId: null, fill: '#6b7280' },
    { name: 'Assigned', count: kpis.assignedTasks, statusId: 1, fill: '#3b82f6' },
    { name: 'In Progress', count: kpis.inProgressTasks, statusId: 2, fill: '#06b6d4' },
    { name: 'Review', count: kpis.reviewTasks, statusId: 3, fill: '#eab308' },
    { name: 'Rework', count: kpis.reworkTasks, statusId: 5, fill: '#ef4444' },
    { name: 'Completed', count: kpis.completedTasks, statusId: 4, fill: '#22c55e' }
  ];

  const targetDepts = [
    { stageId: 1, name: 'Roto' },
    { stageId: 2, name: 'Paint' },
    { stageId: 3, name: 'Comp' },
    { stageId: 4, name: 'CG' }
  ];

  const deptMap = new Map();
  (deptRes.recordset || []).forEach(d => {
    if (d.stageId) deptMap.set(Number(d.stageId), d);
  });

  const departmentWorkload = targetDepts.map(td => {
    const found = deptMap.get(td.stageId);
    return {
      stageId: td.stageId,
      stageName: td.name,
      unassigned: found ? (found.unassigned || 0) : 0,
      assigned: found ? (found.assigned || 0) : 0,
      inProgress: found ? (found.inProgress || 0) : 0,
      review: found ? (found.review || 0) : 0,
      rework: found ? (found.rework || 0) : 0,
      completed: found ? (found.completed || 0) : 0,
      totalTasks: found ? (found.totalTasks || 0) : 0
    };
  });

  const projectProgress = (projRes.recordset || []).map(p => {
    const total = p.totalTasks || 0;
    const done = p.completedTasks || 0;
    const compRate = total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0;
    return {
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      totalTasks: total,
      completedTasks: done,
      completionRate: compRate
    };
  });

  const bidVsActual = (projRes.recordset || []).map(p => {
    const estBid = Number(((p.estimatedHours || 0) / 8.0).toFixed(2));
    const tgtBid = Number(((p.targetHours || 0) / 8.0).toFixed(2));
    const actBid = Number(((p.actualHours || 0) / 8.0).toFixed(2));
    const remBid = Number((tgtBid - actBid).toFixed(2));
    return {
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      estimatedBid: estBid,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid
    };
  });

  const artistRows = (artistRes.recordset || []).map(a => {
    const tgtBid = Number(((a.targetHours || 0) / 8.0).toFixed(2));
    const actBid = Number(((a.actualHours || 0) / 8.0).toFixed(2));
    const remBid = Number((tgtBid - actBid).toFixed(2));
    return {
      artistId: a.artistId,
      artistName: a.artistName,
      employeeCode: a.employeeCode,
      department: a.department,
      activeTasks: a.activeTasks || 0,
      totalAssignedTasks: a.totalAssignedTasks || 0,
      targetBid: tgtBid,
      actualBid: actBid,
      remainingBid: remBid,
      assigned: a.assigned || 0,
      inProgress: a.inProgress || 0,
      review: a.review || 0,
      rework: a.rework || 0,
      completed: a.completed || 0,
      overdue: a.overdue || 0
    };
  });

  const productionTrend = (trendRes.recordset || []).map(t => ({
    workDate: t.workDate,
    actualBid: Number((t.actualWorkedBid || 0).toFixed(2))
  }));

  const revRow = reviewRes.recordset?.[0] || {};
  const reviewAnalytics = {
    outcomes: [
      { name: 'Submitted', count: revRow.submittedCount || 0, fill: '#eab308' },
      { name: 'Approved', count: revRow.approvedCount || 0, fill: '#22c55e' },
      { name: 'Rework', count: revRow.reworkCount || 0, fill: '#ef4444' }
    ],
    reviewQueueCount: kpis.reviewTasks,
    reworkQueueCount: kpis.reworkTasks
  };

  const overdueAnalytics = {
    totalOverdue: kpis.overdueTasks,
    byProject: (overdueProjRes.recordset || []).map(r => ({ name: r.projectCode || r.name, count: r.count })),
    byStage: (overdueStageRes.recordset || []).map(r => ({ name: r.name || 'Unknown', count: r.count }))
  };

  const attentionRequired = (attRes.recordset || []).map(r => ({
    taskId: r.taskId,
    taskCode: r.taskCode,
    taskName: r.taskName,
    projectId: r.projectId,
    projectCode: r.projectCode,
    projectName: r.projectName,
    artistId: r.artistId,
    artistName: r.artistName || 'Unassigned',
    status: r.statusName,
    statusId: r.statusId,
    priority: r.priority || 'Normal',
    dueDate: r.dueDate,
    remainingBid: Number((r.remainingBid || 0).toFixed(2)),
    issueReason: r.issueReason
  }));

  return {
    success: true,
    filter: {
      projectId: projectId || 'all',
      stageId: stageId || 'all',
      artistId: artistId || 'all',
      dateRange: dateRange || 'all',
      startDate: startDate || null,
      endDate: endDate || null
    },
    options: {
      projects: projectsRes.recordset || [],
      stages: stagesRes.recordset || [],
      artists: artistsRes.recordset || [],
      complexities: (complexitiesRes.recordset || []).map(r => r.complexity)
    },
    kpis,
    taskStatusDistribution,
    departmentWorkload,
    projectProgress,
    bidVsActual,
    artistWorkload: {
      chartData: artistRows.map(a => ({ artistId: a.artistId, artistName: a.artistName, targetBid: a.targetBid, actualBid: a.actualBid })),
      tableData: artistRows
    },
    productionTrend,
    reviewAnalytics,
    overdueAnalytics,
    attentionRequired,
    complexityAnalytics: compRes.recordset || []
  };
}

module.exports = {
  getDashboardData,
  getDepartmentProgressReport,
  getArtistWorkloadReport,
  getOverdueTasksReport,
  getAnalyticsReport
};
