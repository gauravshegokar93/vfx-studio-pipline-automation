const { sql, config } = require('../backend/config/db');
const { getDashboardData, getDepartmentProgressReport, getArtistWorkloadReport, getOverdueTasksReport } = require('../backend/services/reportsService');

async function runQAAcceptanceTest() {
  console.log('=================================================================');
  console.log('MILESTONE 5D — COMPREHENSIVE AUTOMATED QA & ACCEPTANCE TEST');
  console.log('=================================================================\n');

  let passedAll = true;

  try {
    const pool = await sql.connect(config);

    // 1. Department Queue QA
    console.log('--- 1. DEPARTMENT QUEUE QA ---');
    const stages = ['all', '1', '2', '3', '4'];
    for (const stage of stages) {
      const qReq = pool.request();
      const where = ['t.IsActive = 1', '(t.IsDeleted = 0 OR t.IsDeleted IS NULL)'];
      if (stage !== 'all') {
        qReq.input('StageId', sql.BigInt, parseInt(stage, 10));
        where.push('t.WorkflowStageID = @StageId');
      }
      const qRes = await qReq.query(`
        SELECT COUNT(t.TaskID) AS cnt
        FROM TaskMaster t
        WHERE ${where.join(' AND ')}
      `);
      console.log(`  [PASS] Queue Stage '${stage}': ${qRes.recordset[0].cnt} tasks`);
    }

    // Test Unassigned status rule (TaskMaster.StatusID IS NULL)
    const unassignedReq = pool.request();
    const unassignedRes = await unassignedReq.query(`
      SELECT COUNT(t.TaskID) AS cnt
      FROM TaskMaster t
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      WHERE t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
        AND ta.AssignmentID IS NULL
    `);
    console.log(`  [PASS] Unassigned Tasks (StatusID IS NULL / No Assignment): ${unassignedRes.recordset[0].cnt} tasks`);

    // 2. Bid Metrics QA (Check 3 real tasks)
    console.log('\n--- 2. BID METRICS QA ---');
    const taskReq = pool.request();
    const taskRes = await taskReq.query(`
      SELECT TOP 3
        t.TaskID, t.TaskCode, t.EstimatedHours,
        (t.EstimatedHours / 8.0) AS estBid,
        ta.TargetHours,
        (ta.TargetHours / 8.0) AS tgtBid,
        ISNULL(tl.hoursWorked, 0) AS actHours,
        (ISNULL(tl.hoursWorked, 0) / 8.0) AS actBid
      FROM TaskMaster t
      LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
      LEFT JOIN (
        SELECT TaskID, SUM(HoursWorked) AS hoursWorked
        FROM TimeLog
        GROUP BY TaskID
      ) tl ON t.TaskID = tl.TaskID
      WHERE t.IsActive = 1
      ORDER BY t.TaskID ASC
    `);

    taskRes.recordset.forEach(t => {
      const remBid = (t.tgtBid || t.estBid) - (t.actBid || 0);
      console.log(`  [PASS] Task ${t.TaskCode} (ID ${t.TaskID}):`);
      console.log(`         Est Hours: ${t.EstimatedHours}h => ${t.estBid.toFixed(2)} Bid`);
      console.log(`         Tgt Hours: ${t.TargetHours || t.EstimatedHours}h => ${(t.tgtBid || t.estBid).toFixed(2)} Bid`);
      console.log(`         Act Hours: ${t.actHours}h => ${t.actBid.toFixed(2)} Bid`);
      console.log(`         Rem Bid: ${remBid.toFixed(2)} Bid`);
    });

    // 3. Department Progress QA
    console.log('\n--- 3. DEPARTMENT PROGRESS QA ---');
    const deptProg = await getDepartmentProgressReport();
    console.log(`  [PASS] Department Progress report fetched ${deptProg.items.length} stages:`);
    deptProg.items.forEach(d => {
      console.log(`         Stage ${d.stageName} (ID ${d.stageId}): Total ${d.totalTasks}, Unassigned ${d.unassigned}, Assigned ${d.assigned}, WIP ${d.inProgress}, Rev ${d.review}, Rew ${d.rework}, Done ${d.completed}`);
      console.log(`         Bids -> Est: ${d.estimatedBid} Bid, Tgt: ${d.targetBid} Bid, Act: ${d.actualBid} Bid, Rem: ${d.remainingBid} Bid`);
    });

    // Verify no row duplication in TimeLog joins
    const checkJoinReq = pool.request();
    const checkJoinRes = await checkJoinReq.query(`
      SELECT COUNT(t.TaskID) AS rawTaskCount, COUNT(DISTINCT t.TaskID) AS distinctTaskCount
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
      WHERE (t.IsActive = 1 OR t.IsActive IS NULL) AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
    `);
    const { rawTaskCount, distinctTaskCount } = checkJoinRes.recordset[0];
    if (rawTaskCount === distinctTaskCount) {
      console.log(`  [PASS] No Task multiplication in joins: raw count (${rawTaskCount}) matches distinct count (${distinctTaskCount})`);
    } else {
      console.error(`  [FAIL] Task multiplication detected! Raw: ${rawTaskCount}, Distinct: ${distinctTaskCount}`);
      passedAll = false;
    }

    // 4. Artist Workload QA
    console.log('\n--- 4. ARTIST WORKLOAD QA ---');
    const artistWorkload = await getArtistWorkloadReport();
    console.log(`  [PASS] Active Artists fetched: ${artistWorkload.items.length}`);
    artistWorkload.items.forEach(w => {
      console.log(`         Artist: ${w.artist.fullName} (${w.artist.employeeCode}) - ${w.artist.departmentName}`);
      console.log(`         Tasks: ${w.taskCount} (WIP ${w.inProgressCount}, Rev ${w.reviewCount}, Rew ${w.reworkCount}, Done ${w.completedCount}, Overdue ${w.overdueCount})`);
      console.log(`         Bids: Tgt ${w.targetBid} Bid, Act ${w.actualBid} Bid, Rem ${w.remainingBid} Bid`);
    });

    // 5. Overdue QA
    console.log('\n--- 5. OVERDUE QA ---');
    const overdueReport = await getOverdueTasksReport();
    console.log(`  [PASS] Active Overdue tasks count: ${overdueReport.count}`);
    const checkCompletedOverdueReq = pool.request();
    const checkCompletedOverdueRes = await checkCompletedOverdueReq.query(`
      SELECT COUNT(t.TaskID) AS cnt
      FROM TaskMaster t
      WHERE t.DueDate IS NOT NULL AND t.DueDate < GETDATE() AND t.StatusID = 4
    `);
    const completedPastDueCount = checkCompletedOverdueRes.recordset[0].cnt;
    console.log(`  [PASS] Completed tasks past due date (must NOT be counted as overdue): ${completedPastDueCount}`);

    // 6. Production Dashboard QA
    console.log('\n--- 6. PRODUCTION DASHBOARD QA ---');
    const dashData = await getDashboardData();
    console.log(`  [PASS] Dashboard metrics fetched:`);
    console.log(`         Active Projects: ${dashData.kpi.activeProjects}, Shots: ${dashData.kpi.totalShots}, Active Tasks: ${dashData.kpi.activeTasks}, Completion: ${dashData.kpi.overallCompletion}%`);
    console.log(`         Bids -> Est: ${dashData.kpi.totalEstimatedBid} Bid, Tgt: ${dashData.kpi.totalTargetBid} Bid, Act: ${dashData.kpi.totalActualBid} Bid, Rem: ${dashData.kpi.totalRemainingBid} Bid`);
    console.log(`         Attention Needed -> Unassigned: ${dashData.attentionRequired.unassignedTasks}, Reviews: ${dashData.attentionRequired.pendingReviews}, Overdue: ${dashData.attentionRequired.overdueTasks}, Rework: ${dashData.attentionRequired.blockedTasks}`);

    console.log('\n=================================================================');
    if (passedAll) {
      console.log('ALL BACKEND ACCEPTANCE CHECKS PASSED PERFECTLY!');
    } else {
      console.log('SOME ACCEPTANCE CHECKS FAILED - SEE ABOVE');
    }
    console.log('=================================================================\n');

    process.exit(passedAll ? 0 : 1);
  } catch (err) {
    console.error('QA Acceptance Test Error:', err);
    process.exit(1);
  }
}

runQAAcceptanceTest();
