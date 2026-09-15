const { sql, config } = require('./config/db');

async function run() {
  await sql.connect(config);
  
  // Check existing production TaskAssignment data to understand CG mapping
  const r1 = await sql.query(`
    SELECT TOP 20 
      t.TaskID, t.TaskCode, wsm.StageName, wsm.StageId,
      u.FullName, u.HomeDepartmentId, d.DepartmentName,
      u.HomeTeamId, tm.TeamName, r.RoleName
    FROM TaskAssignment ta
    JOIN TaskMaster t ON ta.TaskID = t.TaskID
    JOIN UserMaster u ON ta.UserID = u.UserId
    LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
    LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
    LEFT JOIN TeamMaster tm ON u.HomeTeamId = tm.TeamId
    LEFT JOIN RoleMaster r ON u.RoleId = r.RoleId
    ORDER BY t.TaskID DESC
  `);
  console.log('=== Existing TaskAssignment data ===');
  if (r1.recordset.length === 0) {
    console.log('  NO assignments exist in production data.');
  } else {
    r1.recordset.forEach(row => {
      console.log('  Task:', row.TaskCode, '| Stage:', row.StageName, '('+row.StageId+')', '| Artist:', row.FullName, '| Dept:', row.DepartmentName, '| Team:', row.TeamName, '| Role:', row.RoleName);
    });
  }
  
  // Tasks by stage
  const r3 = await sql.query(`
    SELECT wsm.StageName, wsm.StageId, COUNT(t.TaskID) as TaskCount
    FROM WorkflowStageMaster wsm
    LEFT JOIN TaskMaster t ON t.WorkflowStageID = wsm.StageId AND t.IsActive = 1
    GROUP BY wsm.StageName, wsm.StageId
    ORDER BY wsm.StageId
  `);
  console.log('\nTasks by Stage:');
  r3.recordset.forEach(r => console.log('  Stage', r.StageId, r.StageName + ':', r.TaskCount, 'tasks'));

  // Team lead situation 
  const r4 = await sql.query(`
    SELECT 
      tm.TeamId, tm.TeamName, tm.IsActive as TeamActive,
      u.UserId, u.FullName, u.IsActive as LeadActive
    FROM TeamMaster tm
    LEFT JOIN UserMaster u ON u.HomeTeamId = tm.TeamId AND u.RoleId = 4
    ORDER BY tm.TeamId, u.FullName
  `);
  console.log('\n=== Team Lead situation ===');
  r4.recordset.forEach(r => {
    if (r.FullName) {
      console.log('  Team', r.TeamId, r.TeamName, '| Lead:', r.FullName, '| Active:', r.LeadActive);
    } else {
      console.log('  Team', r.TeamId, r.TeamName, '| Lead: NONE');
    }
  });

  // Check users by role for scoping 
  const r5 = await sql.query(`
    SELECT r.RoleName, COUNT(u.UserId) as UserCount, SUM(CASE WHEN u.IsActive=1 THEN 1 ELSE 0 END) as ActiveCount
    FROM RoleMaster r
    LEFT JOIN UserMaster u ON u.RoleId = r.RoleId
    GROUP BY r.RoleName, r.RoleId
    ORDER BY r.RoleId
  `);
  console.log('\n=== Users by Role ===');
  r5.recordset.forEach(r => console.log('  ', r.RoleName, '| Total:', r.UserCount, '| Active:', r.ActiveCount));

  // Existing department queue scope queries - check what APIs already do
  const r6 = await sql.query(`
    SELECT TOP 5 t.TaskID, t.TaskCode, wsm.StageName, 
      ta.UserID, u.FullName, u.HomeDepartmentId, d.DepartmentName, u.HomeTeamId
    FROM TaskMaster t
    LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
    LEFT JOIN TaskAssignment ta ON ta.TaskID = t.TaskID
    LEFT JOIN UserMaster u ON ta.UserID = u.UserId
    LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
    WHERE t.IsActive = 1
    ORDER BY t.TaskID DESC
  `);
  console.log('\n=== Sample Active Tasks with Stage + Dept ===');
  r6.recordset.forEach(r => console.log('  Task:', r.TaskCode, '| Stage:', r.StageName, '| Artist:', r.FullName || 'UNASSIGNED', '| Dept:', r.DepartmentName || '-'));

  await sql.close();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
