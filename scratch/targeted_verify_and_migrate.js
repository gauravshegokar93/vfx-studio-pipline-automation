const { config, sql } = require('../backend/config/db');

async function targetedCorrection() {
    try {
        const pool = await sql.connect(config);
        console.log("=== TARGETED DATA CORRECTION FOR TASKS 2..9 ===\n");

        // Step 1: Pre-Migration Inspection of Tasks 2..9
        const preCheckRes = await pool.request().query(`
            SELECT 
                t.TaskID,
                t.TaskCode,
                t.TaskName,
                s.ShotCode,
                ws.StageName,
                t.EstimatedHours AS CurrentEstimatedHours,
                t.CreatedDate
            FROM TaskMaster t
            JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            JOIN ShotMaster s ON t.ShotID = s.ShotId
            WHERE t.TaskID BETWEEN 2 AND 9
            ORDER BY t.TaskID ASC
        `);

        const tasks2to9 = preCheckRes.recordset;

        // Fetch source bids for these shots from ImportBatchRow
        const expectedMap = {
            2: { bid: 8.5, expected: 68 },
            3: { bid: 4.0, expected: 32 },
            4: { bid: 2.0, expected: 16 },
            5: { bid: 10.0, expected: 80 },
            6: { bid: 2.0, expected: 16 },
            7: { bid: 8.0, expected: 64 },
            8: { bid: 2.0, expected: 16 },
            9: { bid: 4.0, expected: 32 }
        };

        console.log("--- STEP 1 & 2: PRE-MIGRATION VERIFICATION (TASKS 2..9) ---");
        let sourceVerified = true;

        for (const t of tasks2to9) {
            const exp = expectedMap[t.TaskID];
            // Get source row for shot
            const rowRes = await pool.request()
                .input('ShotCode', sql.NVarChar, t.ShotCode)
                .query(`
                    SELECT TOP 1 ImportBatchID, RotoBid, PaintBid, CompBid, CGBid
                    FROM ImportBatchRow
                    WHERE ShotName = @ShotCode OR ClientShotName = @ShotCode
                    ORDER BY BatchRowID DESC
                `);

            const row = rowRes.recordset[0] || {};
            let sourceBid = 0;
            if (t.StageName === 'Roto') sourceBid = Number(row.RotoBid) || 0;
            else if (t.StageName === 'Paint') sourceBid = Number(row.PaintBid) || 0;
            else if (t.StageName === 'Comp') sourceBid = Number(row.CompBid) || 0;
            else if (t.StageName === 'CG') sourceBid = Number(row.CGBid) || 0;

            console.log(`TaskID ${t.TaskID} | Code: ${t.TaskCode} | Shot: ${t.ShotCode} | Stage: ${t.StageName} | SourceBid DB: ${sourceBid} | Expected Bid: ${exp.bid} | Current EstHours: ${t.CurrentEstimatedHours} | Target ExpHours: ${exp.expected}`);

            if (sourceBid !== exp.bid) {
                console.error(`ERROR: Source Bid mismatch for Task ${t.TaskID}! Found: ${sourceBid}, Expected: ${exp.bid}`);
                sourceVerified = false;
            }
        }

        if (!sourceVerified) {
            console.error("\nSTOPPING: Source Bid verification failed!");
            await pool.close();
            return;
        }

        console.log("\nSource Bid verification PASSED for all 8 tasks!\n");

        // Step 3: Targeted Migration in Transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            console.log("--- STEP 3: EXECUTING TARGETED TRANSACTIONAL UPDATE ---");

            const updateReq = new sql.Request(transaction);
            const updateResult = await updateReq.query(`
                UPDATE TaskMaster
                SET EstimatedHours = CASE TaskID
                    WHEN 2 THEN 68
                    WHEN 3 THEN 32
                    WHEN 4 THEN 16
                    WHEN 5 THEN 80
                    WHEN 6 THEN 16
                    WHEN 7 THEN 64
                    WHEN 8 THEN 16
                    WHEN 9 THEN 32
                END,
                ModifiedDate = GETDATE()
                WHERE TaskID IN (2, 3, 4, 5, 6, 7, 8, 9)
            `);

            console.log(`Rows affected: ${updateResult.rowsAffected[0]}`);

            if (updateResult.rowsAffected[0] !== 8) {
                throw new Error(`Expected 8 rows updated, but updated ${updateResult.rowsAffected[0]}`);
            }

            await transaction.commit();
            console.log("TRANSACTION COMMITTED SUCCESSFULLY!\n");
        } catch (err) {
            await transaction.rollback();
            console.error("TRANSACTION ROLLED BACK DUE TO ERROR:", err);
            await pool.close();
            return;
        }

        // Step 5: Post-Migration Check for Tasks 2..9
        console.log("--- STEP 5: POST-MIGRATION VERIFICATION (TASKS 2..9) ---");
        const postCheckRes = await pool.request().query(`
            SELECT TaskID, TaskCode, EstimatedHours
            FROM TaskMaster
            WHERE TaskID BETWEEN 2 AND 9
            ORDER BY TaskID ASC
        `);
        console.table(postCheckRes.recordset);

        // Step 6: Complete 65-Task Validation
        console.log("--- STEP 6 & 7: FULL 65-TASK VALIDATION & DOUBLE CONVERSION CHECK ---");
        const allTasksRes = await pool.request().query(`
            SELECT t.TaskID, t.TaskCode, s.ShotCode, ws.StageName, t.EstimatedHours
            FROM TaskMaster t
            JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            JOIN ShotMaster s ON t.ShotID = s.ShotId
            ORDER BY t.TaskID ASC
        `);

        const allRowsRes = await pool.request().query(`
            SELECT ShotName, ClientShotName, RotoBid, PaintBid, CompBid, CGBid
            FROM ImportBatchRow
        `);

        const rowMapByShot = new Map();
        for (const r of allRowsRes.recordset) {
            const key = (r.ShotName || r.ClientShotName || '').trim();
            if (key) {
                if (!rowMapByShot.has(key)) rowMapByShot.set(key, []);
                rowMapByShot.get(key).push(r);
            }
        }

        let totalChecked = 0;
        let matchingCount = 0;
        let mismatchCount = 0;
        const mismatches = [];
        const doubleConversions = [];

        for (const t of allTasksRes.recordset) {
            if (t.ShotCode && rowMapByShot.has(t.ShotCode)) {
                totalChecked++;
                const rows = rowMapByShot.get(t.ShotCode);
                const sourceRow = rows[rows.length - 1];

                let sourceBid = 0;
                const stage = (t.StageName || '').trim();
                if (stage === 'Roto') sourceBid = Number(sourceRow.RotoBid) || 0;
                else if (stage === 'Paint') sourceBid = Number(sourceRow.PaintBid) || 0;
                else if (stage === 'Comp') sourceBid = Number(sourceRow.CompBid) || 0;
                else if (stage === 'CG') sourceBid = Number(sourceRow.CGBid) || 0;

                const expectedEstHours = sourceBid * 8;
                const actualEstHours = Number(t.EstimatedHours);

                if (actualEstHours === expectedEstHours) {
                    matchingCount++;
                } else {
                    mismatchCount++;
                    mismatches.push({
                        TaskID: t.TaskID,
                        TaskCode: t.TaskCode,
                        Stage: stage,
                        SourceBid: sourceBid,
                        CurrentEstHours: actualEstHours,
                        ExpectedEstHours: expectedEstHours
                    });
                }

                if (sourceBid > 0 && actualEstHours === sourceBid * 64) {
                    doubleConversions.push({
                        TaskID: t.TaskID,
                        TaskCode: t.TaskCode,
                        SourceBid: sourceBid,
                        CurrentEstHours: actualEstHours
                    });
                }
            }
        }

        console.log(`Total generated tasks checked: ${totalChecked}`);
        console.log(`Matching: ${matchingCount}`);
        console.log(`Mismatched: ${mismatchCount}`);
        console.log(`Double conversion (x64) count: ${doubleConversions.length}`);

        // Step 8: Verify Assignments Unchanged
        console.log("\n--- STEP 8: VERIFY ASSIGNMENT RECORDS REMAIN UNCHANGED ---");
        const assignRes = await pool.request().query(`
            SELECT AssignmentID, TaskID, UserID, TargetHours
            FROM TaskAssignment
            ORDER BY AssignmentID ASC
        `);
        console.table(assignRes.recordset);

        await pool.close();
    } catch (err) {
        console.error("Execution error:", err);
    }
}

targetedCorrection();
