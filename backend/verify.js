const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sql, config } = require('./config/db');
const reportsService = require('./services/reportsService');

async function run() {
  try {
    const pool = await sql.connect(config);
    
    console.log('Fetching Artist Workload Report...');
    const workloadRes = await reportsService.getArtistWorkloadReport({});
    console.log("Workload res keys:", Object.keys(workloadRes));
    let wData = workloadRes.items || workloadRes.data || [];
    if (!Array.isArray(wData)) wData = wData.tableData || wData.data || [];

    console.log('Fetching Analytics Report...');
    const analyticsRes = await reportsService.getAnalyticsReport({});
    const analyticsData = analyticsRes.artistWorkload.tableData;

    const artists = wData.slice(0, 3);
    const results = [];

    for (const wArtist of artists) {
      const artistId = wArtist.artist ? (wArtist.artist.userId || wArtist.artist.id) : wArtist.artistId;
      const artistName = wArtist.artist ? wArtist.artist.fullName : wArtist.artistName;
      
      console.log(`Fetching tasks for artist ${artistName} (${artistId})...`);
      
      const req = pool.request();
      req.input('ArtistId', sql.BigInt, artistId);
      
      const tasksQuery = `
      WITH ActiveAssignments AS (
        SELECT TaskID, UserID, TargetHours, AssignedDate, Remarks, AssignmentID,
               ROW_NUMBER() OVER(PARTITION BY TaskID ORDER BY AssignmentID DESC) as rn
        FROM TaskAssignment
      ),
      TimeLogStats AS (
        SELECT TaskID, SUM(
          CASE 
            WHEN EndTime IS NOT NULL THEN HoursWorked
            ELSE DATEDIFF(SECOND, StartTime, GETDATE()) / 3600.0
          END
        ) AS actualHours
        FROM TimeLog
        GROUP BY TaskID
      )
      SELECT
        t.TaskID AS taskId,
        t.StatusID AS statusId,
        t.DueDate AS dueDate,
        t.EstimatedHours AS estimatedHours,
        ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
        ISNULL(ta.TargetHours, 0) AS targetHours,
        ROUND(ISNULL(ta.TargetHours, 0) / 8.0, 2) AS targetBid,
        ISNULL(tl.actualHours, 0) AS actualHours,
        ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
        (CASE WHEN ISNULL(ta.TargetHours, 0) > ISNULL(tl.actualHours, 0) THEN ISNULL(ta.TargetHours, 0) - ISNULL(tl.actualHours, 0) ELSE 0 END) AS remainingHours,
        ROUND((CASE WHEN ISNULL(ta.TargetHours, 0) > ISNULL(tl.actualHours, 0) THEN ISNULL(ta.TargetHours, 0) - ISNULL(tl.actualHours, 0) ELSE 0 END) / 8.0, 2) AS remainingBid,
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
      LEFT JOIN WorkflowStageMaster wsm ON t.WorkflowStageID = wsm.StageId
      LEFT JOIN StatusMaster st ON t.StatusID = st.StatusId
      LEFT JOIN TimeLogStats tl ON t.TaskID = tl.TaskID
      WHERE ta.UserID = @ArtistId AND t.IsActive = 1 AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
      ORDER BY ta.AssignedDate DESC;
      `;
      
      const tasksRes = await req.query(tasksQuery);
      const tasksData = tasksRes.recordset;
      
      // Find artist in analytics data
      const aArtist = analyticsData.find(a => String(a.artistId) === String(artistId));
      
      // Calculate My Tasks metrics
      let t_activeTaskCount = 0;
      let t_estimatedHours = 0;
      let t_targetHours = 0;
      let t_actualHours = 0;
      let t_inProgress = 0;
      let t_review = 0;
      let t_rework = 0;
      let t_completed = 0;
      let t_overdue = 0;
      let t_complexities = [];

      for (const t of tasksData) {
        const statusId = parseInt(t.statusId, 10);
        if (statusId !== 4) t_activeTaskCount++;
        t_estimatedHours += t.estimatedHours || 0;
        t_targetHours += t.targetHours || 0;
        t_actualHours += t.actualHours || 0;
        
        if (statusId === 2) t_inProgress++;
        if (statusId === 3) t_review++;
        if (statusId === 4) t_completed++;
        if (statusId === 5) t_rework++;
        if (statusId !== 4 && new Date(t.dueDate) < new Date()) t_overdue++;
        
        if (statusId !== 4 && t.complexity && t.complexity !== 'Unknown') {
          t_complexities.push(t.complexity);
        }
      }
      
      const t_targetBid = Number((t_targetHours / 8.0).toFixed(2));
      const t_actualBid = Number((t_actualHours / 8.0).toFixed(2));
      const t_remainingBid = Number((Math.max(0, t_targetHours - t_actualHours) / 8.0).toFixed(2));
      const t_complexityStr = [...new Set(t_complexities)].sort().join(',');

      let a_complexities = [];
      if (aArtist && aArtist.taskComplexities) {
        a_complexities = [...new Set(aArtist.taskComplexities.split(',').filter(c => c !== 'Unknown'))].sort();
      }
      const a_complexityStr = a_complexities.join(',');

      let w_complexities = [];
      if (wArtist.taskComplexities) {
        w_complexities = [...new Set(wArtist.taskComplexities.split(',').filter(c => c !== 'Unknown'))].sort();
      }
      const w_complexityStr = w_complexities.join(',');

      // Debug raw string for Gaurav shegokar
      if (artistName.includes('Gaurav shegokar')) {
        console.log('--- DEBUG GAURAV SHEGOKAR ---');
        console.log('Workload taskComplexities:', wArtist.taskComplexities);
        console.log('My Tasks complexities:', t_complexities);
        console.log('My Tasks Data:', tasksData);
      }

      const addMetric = (metric, tVal, wVal, aVal) => {
        const tf = typeof tVal === 'number' ? Number(tVal).toFixed(2) : tVal;
        const wf = typeof wVal === 'number' ? Number(wVal).toFixed(2) : wVal;
        const af = typeof aVal === 'number' ? Number(aVal).toFixed(2) : aVal;
        
        const match = (tf === wf && wf === af) ? 'PASS' : 'FAIL';
        results.push(`${artistName} | ${metric} | ${tf} | ${wf} | ${af} | ${match}`);
      };

      const wCount = wArtist.activeTaskCount !== undefined ? wArtist.activeTaskCount : wArtist.taskCount;
      const wTarget = wArtist.targetBid;
      const wActual = wArtist.actualBid;
      const wRem = wArtist.remainingBid;

      addMetric('Task Count', t_activeTaskCount, wCount, aArtist ? aArtist.activeTasks : 0);
      addMetric('Target Bid', t_targetBid, wTarget, aArtist ? aArtist.targetBid : 0);
      addMetric('Actual Bid', t_actualBid, wActual, aArtist ? aArtist.actualBid : 0);
      addMetric('Remaining Bid', t_remainingBid, wRem, aArtist ? aArtist.remainingBid : 0);
      addMetric('In Progress', t_inProgress, wArtist.inProgressCount || 0, aArtist ? aArtist.inProgress : 0);
      addMetric('Review (Current)', t_review, wArtist.reviewCount || 0, aArtist ? aArtist.review : 0);
      addMetric('Rework (Current)', t_rework, wArtist.reworkCount || 0, aArtist ? aArtist.rework : 0);
      addMetric('Completed', t_completed, wArtist.completedCount || 0, aArtist ? aArtist.completed : 0);
      addMetric('Complexity', t_complexityStr, w_complexityStr, a_complexityStr);
    }

    console.log('\\nArtist | Metric | My Tasks | Artist Workload | Analytics | Match');
    console.log('---|---|---|---|---|---');
    results.forEach(r => console.log(r));

    // Reassignment check
    const reassignmentReq = pool.request();
    const reassignmentRes = await reassignmentReq.query(`
      SELECT TaskID, COUNT(*) as AssignmentCount
      FROM TaskAssignment
      GROUP BY TaskID
      HAVING COUNT(*) > 1
    `);
    if (reassignmentRes.recordset.length === 0) {
      console.log('\\n"No real reassignment scenario exists in current data, so artist-level historical attribution could not be empirically verified."');
    } else {
      console.log('\\nFound reassignment on TaskID:', reassignmentRes.recordset[0].TaskID);
      const taskId = reassignmentRes.recordset[0].TaskID;
      
      const tlRes = await pool.request().query(`
        SELECT UserID, SUM(HoursWorked) as ActualHours 
        FROM TimeLog 
        WHERE TaskID = ${taskId} 
        GROUP BY UserID
      `);
      console.log('TimeLog breakdown by UserID for TaskID', taskId, ':', tlRes.recordset);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
