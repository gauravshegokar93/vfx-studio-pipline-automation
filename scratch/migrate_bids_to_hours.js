const { config, sql } = require('../backend/config/db');

async function migrateBidsToHours() {
    try {
        const pool = await sql.connect(config);
        console.log("Connected to database for migration.");

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Update generated tasks in TaskMaster from ImportBatchRow source bids
            const updateTasksReq = new sql.Request(transaction);
            const taskUpdateResult = await updateTasksReq.query(`
                UPDATE t
                SET 
                    t.EstimatedHours = (
                        CASE 
                            WHEN ws.StageName = 'Roto' THEN r.RotoBid * 8
                            WHEN ws.StageName = 'Paint' THEN r.PaintBid * 8
                            WHEN ws.StageName = 'Comp' THEN r.CompBid * 8
                            WHEN ws.StageName = 'CG' THEN r.CGBid * 8
                            ELSE t.EstimatedHours * 8
                        END
                    ),
                    t.ModifiedDate = GETDATE()
                FROM TaskMaster t
                JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
                JOIN ShotMaster s ON t.ShotID = s.ShotId
                JOIN (
                    SELECT DISTINCT ShotName, ClientShotName, RotoBid, PaintBid, CompBid, CGBid
                    FROM ImportBatchRow
                ) r ON s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
                WHERE t.TaskID >= 100;
            `);

            console.log(`[Migration] TaskMaster records updated: ${taskUpdateResult.rowsAffected[0]}`);

            // 2. Update existing TaskAssignment TargetHours where TargetHours was stored as Bid (<= 20)
            const updateAssignReq = new sql.Request(transaction);
            const assignUpdateResult = await updateAssignReq.query(`
                UPDATE ta
                SET ta.TargetHours = ta.TargetHours * 8
                FROM TaskAssignment ta
                WHERE ta.TargetHours > 0 AND ta.TargetHours <= 20;
            `);

            console.log(`[Migration] TaskAssignment records updated: ${assignUpdateResult.rowsAffected[0]}`);

            await transaction.commit();
            console.log("[Migration] Migration committed successfully!");

        } catch (err) {
            await transaction.rollback();
            console.error("[Migration] Error during migration, rolled back:", err);
        }

        await pool.close();
    } catch (err) {
        console.error("DB connection error:", err);
    }
}

migrateBidsToHours();
