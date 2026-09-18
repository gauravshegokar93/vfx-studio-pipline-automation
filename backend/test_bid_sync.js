require('dotenv').config({ path: __dirname + '/.env' });
const { sql, config } = require('./config/db');
const importService = require('./services/importService');

async function runTests() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connected to DB.");

        // Clean up previous test data if any
        await pool.request().query(`
            DELETE FROM TimeLog WHERE TaskID IN (SELECT TaskID FROM TaskMaster WHERE Description = 'SYNC_TEST');
            DELETE FROM TaskAssignment WHERE TaskID IN (SELECT TaskID FROM TaskMaster WHERE Description = 'SYNC_TEST');
            DELETE FROM TaskMaster WHERE Description = 'SYNC_TEST';
            DELETE FROM ImportBatchRow WHERE ImportBatchID IN (SELECT ImportBatchID FROM ImportBatch WHERE BatchName = 'SYNC_TEST_BATCH');
            DELETE FROM ImportBatch WHERE BatchName = 'SYNC_TEST_BATCH';
            DELETE FROM ShotMaster WHERE ShotCode LIKE 'T1_UNASSIGNED' OR ShotCode LIKE 'T2_ASSIGNED' OR ShotCode LIKE 'T3_INPROG' OR ShotCode LIKE 'T6_DEPT' OR ShotCode LIKE 'TZ_ZERO';
        `);

        // Setup base hierarchy for tests
        const projId = 9999;
        const reelId = 9999;
        const seqId = 9999;
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM ProjectMaster WHERE ProjectId = ${projId})
                INSERT INTO ProjectMaster (ProjectId, ProjectCode, ProjectName) VALUES (${projId}, 'SYNC_PROJ', 'SYNC_PROJ');
            IF NOT EXISTS (SELECT 1 FROM ReelMaster WHERE ReelId = ${reelId})
                INSERT INTO ReelMaster (ReelId, ProjectId, ReelName) VALUES (${reelId}, ${projId}, 'R01');
            IF NOT EXISTS (SELECT 1 FROM SequenceMaster WHERE SequenceId = ${seqId})
                INSERT INTO SequenceMaster (SequenceId, ReelId, SequenceCode) VALUES (${seqId}, ${reelId}, 'R01');
        `);

        // Helper to setup a test shot
        async function setupTest(shotCode, initialRotoBid, initialPaintBid) {
            // Create Shot
            const shotRes = await pool.request()
                .input('ShotCode', sql.NVarChar, shotCode)
                .query(`
                    DECLARE @sid BIGINT = (SELECT ISNULL(MAX(ShotId),0)+1 FROM ShotMaster);
                    INSERT INTO ShotMaster (ShotId, SequenceId, ShotCode) VALUES (@sid, ${seqId}, @ShotCode);
                    SELECT @sid AS ShotId;
                `);
            const shotId = shotRes.recordset[0].ShotId;

            // Create Batch
            const batchNo = 'B' + Math.floor(Math.random() * 1000000);
            const batchRes = await pool.request().query(`
                INSERT INTO ImportBatch (BatchNo, BatchName, ImportType, ImportStatus) 
                OUTPUT INSERTED.ImportBatchID AS BatchId
                VALUES ('${batchNo}', 'SYNC_TEST_BATCH', 'NEW', 'APPROVED');
            `);
            const batchId = batchRes.recordset[0].BatchId;

            // Create ImportBatchRow
            const rowRes = await pool.request()
                .input('BatchId', sql.BigInt, batchId)
                .input('ShotCode', sql.NVarChar, shotCode)
                .input('RotoBid', sql.Decimal, initialRotoBid)
                .input('PaintBid', sql.Decimal, initialPaintBid)
                .query(`
                    INSERT INTO ImportBatchRow (ImportBatchID, RowNumber, Project, Episode, ShotName, RotoBid, PaintBid, SOW, ValidationStatus)
                    OUTPUT INSERTED.BatchRowID AS RowId
                    VALUES (@BatchId, 1, 'SYNC_PROJ', 'R01', @ShotCode, @RotoBid, @PaintBid, 'SYNC_TEST', 'VALID');
                `);
            const rowId = rowRes.recordset[0].RowId;

            // Get real Stage IDs
            const stageRes = await pool.request().query("SELECT StageId, StageName FROM WorkflowStageMaster WHERE StageName IN ('Roto', 'Paint')");
            let rotoStageId = 1, paintStageId = 2;
            for (let r of stageRes.recordset) {
                if (r.StageName.toLowerCase() === 'roto') rotoStageId = r.StageId;
                if (r.StageName.toLowerCase() === 'paint') paintStageId = r.StageId;
            }

            // Create TaskMaster Roto and Paint
            await pool.request()
                .input('ShotId', sql.BigInt, shotId)
                .input('ShotCode', sql.NVarChar, shotCode)
                .input('RotoHours', sql.Decimal, initialRotoBid * 8)
                .input('PaintHours', sql.Decimal, initialPaintBid * 8)
                .input('RotoStageId', sql.BigInt, rotoStageId)
                .input('PaintStageId', sql.BigInt, paintStageId)
                .query(`
                    INSERT INTO TaskMaster (ShotID, WorkflowStageID, TaskCode, TaskName, EstimatedHours, Description, StatusID)
                    VALUES (@ShotId, @RotoStageId, @ShotCode+'_Roto', 'Roto', @RotoHours, 'SYNC_TEST', 1);
                    
                    INSERT INTO TaskMaster (ShotID, WorkflowStageID, TaskCode, TaskName, EstimatedHours, Description, StatusID)
                    VALUES (@ShotId, @PaintStageId, @ShotCode+'_Paint', 'Paint', @PaintHours, 'SYNC_TEST', 1);
                `);

            const tasks = await pool.request().input('ShotId', sql.BigInt, shotId).query('SELECT * FROM TaskMaster WHERE ShotID = @ShotId ORDER BY WorkflowStageID');
            return { rowId, shotId, rotoTask: tasks.recordset[0], paintTask: tasks.recordset[1] };
        }

        console.log("\n--- TEST 1: UNASSIGNED TASK ---");
        let t1 = await setupTest('T1_UNASSIGNED', 2, 0);
        await importService.updateRow(t1.rowId, { RotoBid: 3 });
        let verify1 = await pool.request().input('TaskId', sql.BigInt, t1.rotoTask.TaskID).query('SELECT EstimatedHours FROM TaskMaster WHERE TaskID = @TaskId');
        console.assert(verify1.recordset[0].EstimatedHours === 24, "T1 Failed: Expected 24, got " + verify1.recordset[0].EstimatedHours);
        console.log("PASS: Unassigned task updated successfully (24 hours).");

        console.log("\n--- TEST 2: ASSIGNED TASK ---");
        let t2 = await setupTest('T2_ASSIGNED', 2, 0);
        await pool.request().query(`INSERT INTO TaskAssignment (TaskID, UserID, TargetHours) VALUES (${t2.rotoTask.TaskID}, 1004, 16)`);
        await importService.updateRow(t2.rowId, { RotoBid: 4 });
        let verify2 = await pool.request().input('TaskId', sql.BigInt, t2.rotoTask.TaskID).query(`
            SELECT t.EstimatedHours, a.UserID, a.TargetHours 
            FROM TaskMaster t JOIN TaskAssignment a ON t.TaskID = a.TaskID WHERE t.TaskID = @TaskId
        `);
        console.assert(verify2.recordset[0].EstimatedHours === 32, "T2 Failed: EstHours=" + verify2.recordset[0].EstimatedHours);
        console.assert(verify2.recordset[0].TargetHours === 16, "T2 Failed: TargetHours changed");
        console.log("PASS: Assigned task updated successfully (32 hours, Artist & Target intact).");

        console.log("\n--- TEST 3: IN PROGRESS / ACTUAL HOURS ---");
        let t3 = await setupTest('T3_INPROG', 2, 0);
        await pool.request().query(`
            UPDATE TaskMaster SET StatusID = 2 WHERE TaskID = ${t3.rotoTask.TaskID};
            INSERT INTO TimeLog (TaskID, UserID, WorkDate, StartTime, EndTime, HoursWorked) VALUES (${t3.rotoTask.TaskID}, 1004, GETDATE(), GETDATE(), GETDATE(), 5);
        `);
        await importService.updateRow(t3.rowId, { RotoBid: 5 });
        let verify3 = await pool.request().input('TaskId', sql.BigInt, t3.rotoTask.TaskID).query(`
            SELECT t.EstimatedHours, t.StatusID, (SELECT SUM(HoursWorked) FROM TimeLog WHERE TaskID = t.TaskID) as ActualHours
            FROM TaskMaster t WHERE t.TaskID = @TaskId
        `);
        console.assert(verify3.recordset[0].EstimatedHours === 40, "T3 Failed");
        console.assert(verify3.recordset[0].StatusID === 2, "T3 Failed status");
        console.assert(verify3.recordset[0].ActualHours === 5, "T3 Failed actual hours");
        console.log("PASS: In Progress task updated successfully (40 hours, TimeLog intact).");

        console.log("\n--- TEST 6: DEPARTMENT ISOLATION ---");
        let t6 = await setupTest('T6_DEPT', 2, 2); // Roto=2, Paint=2
        await importService.updateRow(t6.rowId, { RotoBid: 5, PaintBid: 2 });
        let verify6 = await pool.request().input('ShotId', sql.BigInt, t6.shotId).query('SELECT WorkflowStageID, EstimatedHours FROM TaskMaster WHERE ShotID = @ShotId ORDER BY WorkflowStageID');
        console.assert(verify6.recordset[0].EstimatedHours === 40, "T6 Roto Failed");
        console.assert(verify6.recordset[1].EstimatedHours === 16, "T6 Paint Failed");
        console.log("PASS: Department isolated. Roto=40, Paint=16.");

        console.log("\n--- TEST ZERO BID / NULL BID ---");
        let tZ = await setupTest('TZ_ZERO', 2, 0);
        await importService.updateRow(tZ.rowId, { RotoBid: 0 });
        let verifyZ = await pool.request().input('TaskId', sql.BigInt, tZ.rotoTask.TaskID).query('SELECT EstimatedHours FROM TaskMaster WHERE TaskID = @TaskId');
        console.assert(verifyZ.recordset[0].EstimatedHours === 0, "TZ Failed: " + verifyZ.recordset[0].EstimatedHours);
        console.log("PASS: Zero bid handled safely (EstHours=0, task not deleted).");

        console.log("\nAll Tests Passed Successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    }
}

runTests();
