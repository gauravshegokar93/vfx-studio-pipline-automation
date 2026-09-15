const { config, sql } = require('../backend/config/db');

async function inspectAllTasks() {
    try {
        const pool = await sql.connect(config);

        // Get all TaskMaster records
        const tasksRes = await pool.request().query(`
            SELECT 
                t.TaskID,
                t.TaskCode,
                t.TaskName,
                t.ShotID,
                s.ShotCode,
                ws.StageName,
                t.EstimatedHours AS CurrentEstimatedHours,
                r.ImportBatchID,
                r.RotoBid,
                r.PaintBid,
                r.CompBid,
                r.CGBid
            FROM TaskMaster t
            LEFT JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
            LEFT JOIN (
                SELECT DISTINCT ShotName, ClientShotName, RotoBid, PaintBid, CompBid, CGBid, ImportBatchID
                FROM ImportBatchRow
            ) r ON s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
            ORDER BY t.TaskID
        `);

        // Also check TaskAssignment table
        const assignmentsRes = await pool.request().query(`
            SELECT AssignmentID, TaskID, UserID, TargetHours, StatusID
            FROM TaskAssignment
        `);

        console.log("=== ALL TASKMASTER RECORDS ===");
        const taskMap = new Map();
        for (const t of tasksRes.recordset) {
            if (!taskMap.has(t.TaskID)) {
                let sourceBid = null;
                if (t.StageName === 'Roto') sourceBid = t.RotoBid;
                else if (t.StageName === 'Paint') sourceBid = t.PaintBid;
                else if (t.StageName === 'Comp') sourceBid = t.CompBid;
                else if (t.StageName === 'CG') sourceBid = t.CGBid;

                taskMap.set(t.TaskID, {
                    TaskID: t.TaskID,
                    TaskCode: t.TaskCode,
                    TaskName: t.TaskName,
                    ShotCode: t.ShotCode,
                    StageName: t.StageName,
                    CurrentEstimatedHours: Number(t.CurrentEstimatedHours),
                    SourceBid: sourceBid !== null && sourceBid !== undefined ? Number(sourceBid) : null,
                    ExpectedHours: sourceBid !== null && sourceBid !== undefined ? Number(sourceBid) * 8 : null,
                    ImportBatchID: t.ImportBatchID
                });
            }
        }

        const taskList = Array.from(taskMap.values());
        console.table(taskList);

        console.log("\n=== TASK ASSIGNMENTS ===");
        console.table(assignmentsRes.recordset);

        await pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

inspectAllTasks();
