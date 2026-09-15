const { sql, config } = require('../backend/config/db');

async function testFixedQueries() {
  try {
    const pool = await sql.connect(config);

    console.log('\n--- 1. Testing Fixed listTasks query ---');
    try {
      const req1 = pool.request();
      const query1 = `
        SELECT
          t.TaskID AS id,
          t.TaskID AS taskId,
          t.TaskCode AS taskCode,
          t.TaskName AS taskName,
          t.ShotID AS shotId,
          s.ShotCode AS shotCode,
          seq.SequenceCode AS sequenceCode,
          r.ReelName AS reelCode,
          r.ReelName AS reelName,
          pm.ProjectId AS projectId,
          pm.ProjectCode AS projectCode,
          pm.ProjectName AS projectName,
          t.WorkflowStageID AS workflowStageId,
          t.WorkflowStageID AS stageId,
          wsm.StageName AS stageName,
          wsm.StageName AS stage,
          wsm.StageName AS departmentName,
          t.EstimatedHours AS estimatedHours,
          ROUND(t.EstimatedHours / 8.0, 2) AS estimatedBid,
          t.StartDate AS startDate,
          t.DueDate AS dueDate,
          prm.PriorityName AS priority,
          prm.PriorityId AS priorityId,
          ISNULL(st.StatusName, 'Unassigned') AS status,
          t.StatusID AS statusId,
          ta.UserID AS assignedArtistId,
          u.FullName AS assignedArtist,
          ta.AssignedDate AS assignedDate,
          ISNULL(ta.TargetHours, t.EstimatedHours) AS targetHours,
          ROUND(ISNULL(ta.TargetHours, t.EstimatedHours) / 8.0, 2) AS targetBid,
          ISNULL(tl.actualHours, 0) AS actualHours,
          ROUND(ISNULL(tl.actualHours, 0) / 8.0, 2) AS actualBid,
          (ISNULL(tl.actualHours, 0) * 60) AS actualMinutes,
          ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
          (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) AS remainingHours
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
        ORDER BY t.TaskID ASC;
      `;
      const res1 = await req1.query(query1);
      console.log('listTasks SUCCESS, rows:', res1.recordset.length);
    } catch (err1) {
      console.error('listTasks ERROR:', err1.message);
    }

    console.log('\n--- 2. Testing Fixed getDepartmentQueue/all query ---');
    try {
      const req2 = pool.request();
      const query2 = `
        SELECT
          t.TaskID AS taskId,
          t.TaskID AS id,
          t.TaskCode AS taskCode,
          t.TaskName AS taskName,
          s.ShotCode AS shotCode,
          seq.SequenceCode AS sequenceCode,
          r.ReelName AS reelCode,
          r.ReelName AS reelName,
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
          ISNULL(prm.PriorityName, 'Medium') AS priority,
          ISNULL(st.StatusName, 'Unassigned') AS status,
          t.StatusID AS statusId,
          u.FullName AS assignedArtist,
          ta.UserID AS assignedArtistId
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
        ORDER BY t.TaskID ASC;
      `;
      const res2 = await req2.query(query2);
      console.log('getDepartmentQueue SUCCESS, rows:', res2.recordset.length);
    } catch (err2) {
      console.error('getDepartmentQueue ERROR:', err2.message);
    }

    console.log('\n--- 3. Testing Fixed getArtistTasks query for artistId 5 ---');
    try {
      const req3 = pool.request();
      req3.input('ArtistId', sql.BigInt, 5);
      const query3 = `
        SELECT
          t.TaskID AS taskId,
          t.TaskID AS id,
          ta.AssignmentID AS assignmentId,
          t.TaskCode AS taskCode,
          t.TaskName AS taskName,
          s.ShotCode AS shotCode,
          seq.SequenceCode AS sequenceCode,
          r.ReelName AS reelCode,
          r.ReelName AS reelName,
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
          (ISNULL(tl.actualHours, 0) * 60) AS actualMinutes,
          ROUND((ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) / 8.0, 2) AS remainingBid,
          (ISNULL(ta.TargetHours, t.EstimatedHours) - ISNULL(tl.actualHours, 0)) AS remainingHours,
          t.DueDate AS dueDate,
          ISNULL(st.StatusName, 'Assigned') AS status,
          t.StatusID AS statusId,
          ta.AssignedDate AS assignedDate,
          ta.Remarks AS remarks
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
      `;
      const res3 = await req3.query(query3);
      console.log('getArtistTasks SUCCESS, rows:', res3.recordset.length);
    } catch (err3) {
      console.error('getArtistTasks ERROR:', err3.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Connection Error:', err);
    process.exit(1);
  }
}

testFixedQueries();
