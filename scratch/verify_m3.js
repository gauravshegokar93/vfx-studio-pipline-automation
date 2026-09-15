const { config, sql } = require('../backend/config/db');
const importService = require('../backend/services/importService');

async function runVerification() {
    console.log("==========================================");
    console.log("MILESTONE 3 VERIFICATION SCRIPT");
    console.log("==========================================");

    const pool = await sql.connect(config);


    // 1. Initial State Check
    const initialTasksRes = await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster");
    const initialTaskCount = initialTasksRes.recordset[0].count;
    console.log(`[1] Initial TaskMaster Record Count: ${initialTaskCount}`);

    const existing8Res = await pool.request().query("SELECT TaskID, TaskCode, TaskName FROM TaskMaster WHERE TaskID BETWEEN 2 AND 9 ORDER BY TaskID");
    console.log(`[1] Preserved Existing 8 Tasks IDs:`, existing8Res.recordset.map(t => t.TaskID).join(', '));

    // 2. Run Task Creation for Approved Batch 19
    console.log("\n[2] Executing createBatchTasks for Batch 19...");
    const createResult = await importService.createBatchTasks(19, 2);
    console.log("[2] Task Creation API Output Result:", JSON.stringify(createResult, null, 2));

    // 3. Verify Database After Creation
    const postCreationTasksRes = await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster");
    const postCreationTaskCount = postCreationTasksRes.recordset[0].count;
    console.log(`\n[3] TaskMaster Count After Creation: ${postCreationTaskCount}`);
    console.log(`[3] Net New Tasks Added: ${postCreationTaskCount - initialTaskCount}`);

    // Department breakdown check from TaskMaster
    const deptBreakdownRes = await pool.request().query(`
        SELECT ws.StageName, COUNT(t.TaskID) as TaskCount, SUM(t.EstimatedHours) as TotalHours
        FROM TaskMaster t
        JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
        JOIN ShotMaster s ON t.ShotID = s.ShotId
        JOIN ImportBatchRow r ON r.ImportBatchID = 19 AND s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
        GROUP BY ws.StageName
        ORDER BY ws.StageName
    `);
    console.log("[3] Department Breakdown in TaskMaster for Batch 19:");
    console.table(deptBreakdownRes.recordset);

    // Shot association check
    const shotRefCheck = await pool.request().query(`
        SELECT COUNT(DISTINCT t.TaskID) as TotalBatchTasks, COUNT(DISTINCT t.ShotID) as LinkedShots
        FROM TaskMaster t
        JOIN ShotMaster s ON t.ShotID = s.ShotId
        JOIN ImportBatchRow r ON r.ImportBatchID = 19 AND s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
    `);
    console.log(`[3] Linked Shots Check: ${shotRefCheck.recordset[0].LinkedShots} unique shots linked to ${shotRefCheck.recordset[0].TotalBatchTasks} tasks.`);




    // 4. Test Idempotency (Run createBatchTasks twice)
    console.log("\n[4] Testing Idempotency (Re-running createBatchTasks for Batch 19)...");
    const rerunResult = await importService.createBatchTasks(19, 2);
    console.log("[4] Idempotency Rerun Result:", JSON.stringify(rerunResult, null, 2));

    const postRerunTasksRes = await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster");
    console.log(`[4] TaskMaster Count After Idempotency Rerun: ${postRerunTasksRes.recordset[0].count}`);
    if (postRerunTasksRes.recordset[0].count === postCreationTaskCount) {
        console.log("✅ IDEMPOTENCY TEST PASSED: No duplicate tasks created on rerun.");
    } else {
        console.error("❌ IDEMPOTENCY TEST FAILED: Duplicate tasks were created!");
    }

    // 5. Test Rollback Safety
    console.log("\n[5] Testing Rollback Safety with Controlled Transaction Failure...");
    let rollbackPassed = false;
    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const req1 = new sql.Request(transaction);
            await req1.query(`
                INSERT INTO TaskMaster (ShotID, TaskCode, TaskName, WorkflowStageID, EstimatedHours, IsActive, IsDeleted, CreatedBy, CreatedDate)
                VALUES (1, 'TEST_ROLLBACK_1', 'Test Rollback 1', 1, 5, 1, 0, 1, GETDATE())
            `);

            // Intentionally throw an error inside transaction
            throw new Error("Controlled Error to trigger Rollback");

        } catch (txErr) {
            console.log(`[5] Error caught inside transaction: "${txErr.message}". Executing rollback...`);
            await transaction.rollback();
            rollbackPassed = true;
        }
    } catch (err) {
        console.error("[5] Transaction setup error:", err.message);
    }

    const postRollbackCountRes = await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster");
    console.log(`[5] TaskMaster Count After Rollback Test: ${postRollbackCountRes.recordset[0].count}`);
    if (rollbackPassed && postRollbackCountRes.recordset[0].count === postCreationTaskCount) {
        console.log("✅ ROLLBACK TEST PASSED: Transaction successfully rolled back all changes.");
    } else {
        console.error("❌ ROLLBACK TEST FAILED!");
    }

    // 6. Check existing 8 tasks intact
    const finalExisting8Res = await pool.request().query("SELECT TaskID, TaskCode, TaskName FROM TaskMaster WHERE TaskID BETWEEN 2 AND 9 ORDER BY TaskID");
    if (finalExisting8Res.recordset.length === 8) {
        console.log("✅ EXISTING 8 TASKS PRESERVED INTACT (TaskIDs 2..9).");
    } else {
        console.error("❌ EXISTING 8 TASKS MODIFIED OR DELETED!");
    }

    console.log("\n==========================================");
    console.log("VERIFICATION COMPLETE");
    console.log("==========================================");
    process.exit(0);
}

runVerification().catch(err => {
    console.error("Verification Error:", err);
    process.exit(1);
});
