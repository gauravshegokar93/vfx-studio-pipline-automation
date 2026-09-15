const { config, sql } = require('../backend/config/db');

async function inspectSeedTasks() {
    try {
        const pool = await sql.connect(config);
        
        const tasksRes = await pool.request().query(`
            SELECT t.TaskID, t.TaskCode, s.ShotCode, ws.StageName, t.EstimatedHours
            FROM TaskMaster t
            JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            JOIN ShotMaster s ON t.ShotID = s.ShotId
            WHERE t.TaskID BETWEEN 2 AND 9
        `);

        console.log("=== SEED TASKS 2..9 ===");
        console.table(tasksRes.recordset);

        for (const task of tasksRes.recordset) {
            const rowRes = await pool.request()
                .input('ShotCode', sql.NVarChar, task.ShotCode)
                .query(`
                    SELECT BatchRowID, ImportBatchID, ShotName, ClientShotName, RotoBid, PaintBid, CompBid, CGBid
                    FROM ImportBatchRow
                    WHERE ShotName = @ShotCode OR ClientShotName = @ShotCode
                `);
            console.log(`Matching rows for Task ${task.TaskID} (${task.TaskCode}, Shot: ${task.ShotCode}):`);
            console.table(rowRes.recordset);
        }

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

inspectSeedTasks();
