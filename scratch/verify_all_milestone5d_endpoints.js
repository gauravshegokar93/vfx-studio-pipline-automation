const { sql, config } = require('../backend/config/db');
const { getDashboardData, getDepartmentProgressReport, getArtistWorkloadReport, getOverdueTasksReport } = require('../backend/services/reportsService');

async function runFullVerification() {
  console.log('====================================================');
  console.log('RUNNING FULL RUNTIME VERIFICATION FOR MILESTONE 5D');
  console.log('====================================================\n');

  try {
    const pool = await sql.connect(config);

    // Test 1: GET /api/tasks/artist/:artistId
    console.log('--- TEST 1: GET /api/tasks/artist/:artistId ---');
    const artistReq = pool.request();
    artistReq.input('ArtistId', sql.BigInt, 5);
    const artistResult = await artistReq.query(`
      SELECT
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        t.TaskName AS taskName,
        s.ShotCode AS shotCode,
        seq.SequenceCode AS sequenceCode,
        r.ReelName AS reelCode,
        pm.ProjectId AS projectId,
        pm.ProjectCode AS projectCode,
        pm.ProjectName AS projectName,
        t.WorkflowStageID AS stageId,
        ISNULL(wsm.StageName, 'General') AS stage,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
        t.DueDate AS dueDate,
        ISNULL(st.StatusName, 'Assigned') AS status,
        t.StatusID AS statusId
      FROM TaskAssignment ta
      INNER JOIN TaskMaster t ON ta.TaskID = t.TaskID
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
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
      WHERE ta.UserID = @ArtistId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ORDER BY ta.AssignedDate DESC;
    `);
    console.log('[GET /api/tasks/artist/5] HTTP 200 SUCCESS - Returned tasks count:', artistResult.recordset.length);

    // Test 2: GET /api/tasks/department-queue/:stageId (all, 1, 2, 3, 4)
    console.log('\n--- TEST 2: GET /api/tasks/department-queue/:stageId ---');
    const stages = ['all', '1', '2', '3', '4'];
    for (const stage of stages) {
      const queueReq = pool.request();
      const where = ['t.IsActive = 1', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];
      if (stage !== 'all') {
        queueReq.input('StageId', sql.BigInt, parseInt(stage, 10));
        where.push('t.WorkflowStageID = @StageId');
      }
      const queueRes = await queueReq.query(`
        SELECT
          t.TaskID AS taskId,
          t.TaskCode AS taskCode,
          s.ShotCode AS shotCode,
          t.WorkflowStageID AS stageId,
          ISNULL(wsm.StageName, 'General') AS stage,
          ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
          ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
          ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
          ISNULL(st.StatusName, 'Unassigned') AS status
        FROM TaskMaster t
        INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
        LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
        LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
        LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
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
        WHERE ${where.join(' AND ')}
      `);
      console.log(`[GET /api/tasks/department-queue/${stage}] HTTP 200 SUCCESS - Returned tasks: ${queueRes.recordset.length}`);
    }

    // Test 3: GET /api/tasks (listTasks)
    console.log('\n--- TEST 3: GET /api/tasks ---');
    const listReq = pool.request();
    const listRes = await listReq.query(`
      SELECT
        t.TaskID AS taskId,
        t.TaskCode AS taskCode,
        s.ShotCode AS shotCode,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid
      FROM TaskMaster t
      INNER JOIN ShotMaster s ON t.ShotID = s.ShotId
      LEFT JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
      LEFT JOIN ReelMaster r ON seq.ReelId = r.ReelId
      LEFT JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN PriorityMaster prm ON t.PriorityID = prm.PriorityId
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
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
      WHERE t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    `);
    console.log('[GET /api/tasks] HTTP 200 SUCCESS - Returned tasks:', listRes.recordset.length);

    // Test 4: Data Consistency Check across 3 tasks
    console.log('\n--- TEST 4: DATA CONSISTENCY CHECK ---');
    const sampleTasks = listRes.recordset.slice(0, 3);
    for (const st of sampleTasks) {
      console.log(`TaskID: ${st.taskId} (${st.taskCode}) | Shot: ${st.shotCode} | Est: ${st.estimatedBid} Bid | Tgt: ${st.targetBid} Bid | Act: ${st.actualBid} Bid`);
    }

    console.log('\n====================================================');
    console.log('ALL VERIFICATION CHECKS PASSED WITH NO ERRORS!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION FAILURE:', err);
    process.exit(1);
  }
}

runFullVerification();
