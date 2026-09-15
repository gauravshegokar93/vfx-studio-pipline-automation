const { sql, config } = require('../backend/config/db');

async function testSqlQueries() {
  try {
    const pool = await sql.connect(config);
    
    console.log('Testing listTasks query...');
    try {
      const req1 = pool.request();
      const res1 = await req1.query(`
        SELECT
          t.TaskID AS id,
          pm.PriorityName AS priority,
          pm.ProjectName AS projectName
        FROM TaskMaster t
        INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
        LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
        LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
        LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
        LEFT JOIN PriorityMaster pm ON t.PriorityID = pm.PriorityId
      `);
      console.log('listTasks query succeeded, rows:', res1.recordset.length);
    } catch (e1) {
      console.error('listTasks Query Error:', e1.message);
    }

    console.log('\nTesting getDepartmentQueue query...');
    try {
      const req2 = pool.request();
      const res2 = await req2.query(`
        SELECT
          t.TaskID AS taskId,
          prm.PriorityName AS priority
        FROM TaskMaster t
        INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
        LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
        LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
        LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
        LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
        LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
        LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
        LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
        LEFT JOIN UserMaster u ON ta.UserID = u.UserId
      `);
      console.log('getDepartmentQueue query succeeded, rows:', res2.recordset.length);
    } catch (e2) {
      console.error('getDepartmentQueue Query Error:', e2.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Connection Error:', err);
    process.exit(1);
  }
}

testSqlQueries();
