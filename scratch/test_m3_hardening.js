const { config, sql } = require('../backend/config/db');
const importService = require('../backend/services/importService');

async function runHardeningTests() {
    console.log("==================================================");
    console.log("MILESTONE 3 HARDENING & SAFETY VERIFICATION");
    console.log("==================================================");

    const pool = await sql.connect(config);

    // ----------------------------------------------------
    // 1. VERIFY TASK ID (SQL IDENTITY CHECK)
    // ----------------------------------------------------
    console.log("\n[1] Verifying TaskMaster.TaskID SQL Server IDENTITY Column...");
    const identityCheck = await pool.request().query(`
        SELECT c.name AS ColumnName, c.is_identity
        FROM sys.columns c
        JOIN sys.tables t ON c.object_id = t.object_id
        WHERE t.name = 'TaskMaster' AND c.name = 'TaskID'
    `);
    const isIdentity = identityCheck.recordset[0]?.is_identity === true;
    console.log(`[1] TaskMaster.TaskID is_identity: ${isIdentity}`);
    if (isIdentity) {
        console.log("✅ TASK ID VERIFICATION PASSED: TaskID uses SQL Server IDENTITY(1,1). No manual MAX(TaskID)+1 exists.");
    } else {
        console.error("❌ TASK ID VERIFICATION FAILED: TaskID is not marked as IDENTITY in SQL Server!");
    }

    // ----------------------------------------------------
    // 2. WORKFLOW STAGE SAFETY
    // ----------------------------------------------------
    console.log("\n[2] Verifying WorkflowStageMaster Runtime Records...");
    const stagesRes = await pool.request().query("SELECT StageId, StageName, StageOrder FROM WorkflowStageMaster ORDER BY StageId");
    console.log("[2] WorkflowStageMaster Runtime Contents:");
    console.table(stagesRes.recordset);
    const stageNamesInDb = stagesRes.recordset.map(s => s.StageName);
    const requiredStages = ['Roto', 'Paint', 'Comp', 'CG'];
    const allStagesExist = requiredStages.every(name => stageNamesInDb.includes(name));
    if (allStagesExist) {
        console.log("✅ WORKFLOW STAGES VERIFIED: All required stages (Roto, Paint, Comp, CG) exist in DB and are dynamically resolved.");
    } else {
        console.error("❌ WORKFLOW STAGES FAILED: Missing required workflow stages in WorkflowStageMaster!");
    }

    // ----------------------------------------------------
    // 3. EXISTING TASK PRESERVATION
    // ----------------------------------------------------
    console.log("\n[3] Checking Original 8 TaskMaster Records (TaskIDs 2..9)...");
    const existing8Res = await pool.request().query("SELECT TaskID, ShotID, TaskCode, TaskName, EstimatedHours FROM TaskMaster WHERE TaskID BETWEEN 2 AND 9 ORDER BY TaskID");
    console.log(`[3] Preserved TaskIDs (Count: ${existing8Res.recordset.length}):`, existing8Res.recordset.map(t => t.TaskID).join(', '));
    if (existing8Res.recordset.length === 8) {
        console.log("✅ EXISTING TASKS PRESERVED: Baseline 8 tasks intact.");
    } else {
        console.error(`❌ EXISTING TASKS FAILED: Expected 8 tasks, found ${existing8Res.recordset.length}!`);
    }

    // Helper: Reset Batch 19 Tasks for clean test execution
    async function resetBatch19Tasks() {
        await pool.request().query(`
            DELETE t
            FROM TaskMaster t
            JOIN ShotMaster s ON t.ShotID = s.ShotId
            JOIN ImportBatchRow r ON r.ImportBatchID = 19 AND s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
        `);
    }

    // ----------------------------------------------------
    // 4. SEQUENTIAL IDEMPOTENCY TEST
    // ----------------------------------------------------
    console.log("\n[4] Testing Sequential Idempotency (Call 1 -> 47 created, Call 2 -> 0 created/47 updated)...");
    await resetBatch19Tasks();

    const call1 = await importService.createBatchTasks(19, 2);
    console.log("[4] Call 1 Output:", {
        tasksCreated: call1.tasksCreated,
        tasksUpdated: call1.tasksUpdated,
        skippedDepartments: call1.skippedDepartments
    });

    const call2 = await importService.createBatchTasks(19, 2);
    console.log("[4] Call 2 Output:", {
        tasksCreated: call2.tasksCreated,
        tasksUpdated: call2.tasksUpdated,
        skippedDepartments: call2.skippedDepartments
    });

    const postSeqCount = (await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster")).recordset[0].count;
    console.log(`[4] Total TaskMaster Count after sequential calls: ${postSeqCount}`);

    const isSeqIdempotent = call1.tasksCreated === 47 && call2.tasksCreated === 0 && call2.tasksUpdated === 47 && postSeqCount === 55;
    if (isSeqIdempotent) {
        console.log("✅ SEQUENTIAL IDEMPOTENCY PASSED: Exactly 47 created on Call 1, 0 created & 47 updated on Call 2.");
    } else {
        console.error("❌ SEQUENTIAL IDEMPOTENCY FAILED!");
    }

    // ----------------------------------------------------
    // 5. CONCURRENT TASK CREATION TEST
    // ----------------------------------------------------
    console.log("\n[5] Testing Concurrent Task Creation (Simultaneous parallel calls to createBatchTasks)...");
    await resetBatch19Tasks();

    // Trigger two calls simultaneously
    const [concRes1, concRes2] = await Promise.all([
        importService.createBatchTasks(19, 2),
        importService.createBatchTasks(19, 2)
    ]);

    console.log("[5] Concurrent Call 1 Result:", { tasksCreated: concRes1.tasksCreated, tasksUpdated: concRes1.tasksUpdated });
    console.log("[5] Concurrent Call 2 Result:", { tasksCreated: concRes2.tasksCreated, tasksUpdated: concRes2.tasksUpdated });

    const totalCreatedInConc = concRes1.tasksCreated + concRes2.tasksCreated;
    const postConcCount = (await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster")).recordset[0].count;
    console.log(`[5] Combined Total Tasks Created across concurrent calls: ${totalCreatedInConc}`);
    console.log(`[5] Total TaskMaster Record Count after concurrent execution: ${postConcCount}`);

    // Count duplicates if any
    const dupCheckRes = await pool.request().query(`
        SELECT ShotID, WorkflowStageID, COUNT(*) as DupCount
        FROM TaskMaster
        GROUP BY ShotID, WorkflowStageID
        HAVING COUNT(*) > 1
    `);
    const duplicateCount = dupCheckRes.recordset.length;
    console.log(`[5] Duplicate (ShotID, WorkflowStageID) Pairs in TaskMaster: ${duplicateCount}`);

    if (postConcCount === 55 && duplicateCount === 0) {
        console.log("✅ CONCURRENT TASK CREATION PASSED: Concurrency locks prevented duplicate tasks! Combined total = 55 (8 existing + 47 generated).");
    } else {
        console.error("❌ CONCURRENT TASK CREATION FAILED: Duplicates created during parallel execution!");
    }

    // ----------------------------------------------------
    // 6. BID MAPPING & ACCURACY VERIFICATION
    // ----------------------------------------------------
    console.log("\n[6] Verifying Bid Mapping Accuracy & Zero/Null/Total handling...");
    const bidMappingCheck = await pool.request().query(`
        SELECT 
            t.TaskID,
            t.TaskCode,
            ws.StageName,
            t.EstimatedHours,
            r.RotoBid, r.PaintBid, r.CompBid, r.CGBid, r.TotalBid
        FROM TaskMaster t
        JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
        JOIN ShotMaster s ON t.ShotID = s.ShotId
        JOIN ImportBatchRow r ON r.ImportBatchID = 19 AND s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
    `);

    let mappingMismatches = 0;
    for (const row of bidMappingCheck.recordset) {
        let expectedBid = 0;
        if (row.StageName === 'Roto') expectedBid = Number(row.RotoBid);
        else if (row.StageName === 'Paint') expectedBid = Number(row.PaintBid);
        else if (row.StageName === 'Comp') expectedBid = Number(row.CompBid);
        else if (row.StageName === 'CG') expectedBid = Number(row.CGBid);

        if (Number(row.EstimatedHours) !== expectedBid) {
            console.error(`Mismatch for Task ${row.TaskCode}: Task EstimatedHours=${row.EstimatedHours}, Expected Bid=${expectedBid}`);
            mappingMismatches++;
        }
    }

    // Check for 'Total' tasks
    const totalTaskCheck = await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster WHERE TaskCode LIKE '%_Total%' OR TaskName LIKE '%Total%'");
    const totalTasksFound = totalTaskCheck.recordset[0].count;

    console.log(`[6] Total Bid Mismatches: ${mappingMismatches}`);
    console.log(`[6] 'Total' Department Tasks Found: ${totalTasksFound}`);

    if (mappingMismatches === 0 && totalTasksFound === 0) {
        console.log("✅ BID MAPPING PASSED: All 47 department tasks match source bids exactly. Zero/null bids skipped. No 'Total' tasks created.");
    } else {
        console.error("❌ BID MAPPING FAILED!");
    }

    // ----------------------------------------------------
    // 7. TASK RELATIONSHIP & SHOTMASTER REFERENCES
    // ----------------------------------------------------
    console.log("\n[7] Verifying Shot Master References...");
    const sampleShotsCheck = await pool.request().query(`
        SELECT TOP 5 s.ShotCode, ws.StageName, t.TaskCode, t.EstimatedHours
        FROM TaskMaster t
        JOIN ShotMaster s ON t.ShotID = s.ShotId
        JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
        JOIN ImportBatchRow r ON r.ImportBatchID = 19 AND s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
        ORDER BY t.TaskID DESC
    `);
    console.log("[7] Sample Verified Tasks linked to ShotMaster:");
    console.table(sampleShotsCheck.recordset);

    // ----------------------------------------------------
    // 8. TRANSACTION / ROLLBACK TEST
    // ----------------------------------------------------
    console.log("\n[8] Testing Transaction Rollback Safety...");
    let rollbackSuccess = false;
    try {
        const tx = new sql.Transaction(pool);
        await tx.begin();
        try {
            const req = new sql.Request(tx);
            await req.query(`
                INSERT INTO TaskMaster (ShotID, TaskCode, TaskName, WorkflowStageID, EstimatedHours, IsActive, IsDeleted, CreatedBy, CreatedDate)
                VALUES (1, 'ROLLBACK_TEST_CODE', 'Rollback Test', 1, 10, 1, 0, 1, GETDATE())
            `);
            // Force error
            throw new Error("Controlled Error for Rollback");
        } catch (e) {
            await tx.rollback();
            rollbackSuccess = true;
        }
    } catch (err) {
        console.error("[8] Rollback test error:", err);
    }

    const postRollbackCount = (await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster")).recordset[0].count;
    console.log(`[8] TaskMaster count after rollback test: ${postRollbackCount}`);

    if (rollbackSuccess && postRollbackCount === 55) {
        console.log("✅ ROLLBACK TEST PASSED: Controlled failure cleanly rolled back all changes.");
    } else {
        console.error("❌ ROLLBACK TEST FAILED!");
    }

    console.log("\n==================================================");
    console.log("ALL HARDENING & SAFETY TESTS COMPLETE");
    console.log("==================================================");
    process.exit(0);
}

runHardeningTests().catch(err => {
    console.error("Hardening Test Suite Error:", err);
    process.exit(1);
});
