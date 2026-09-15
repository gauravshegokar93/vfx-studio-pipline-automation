const { config, sql } = require('../backend/config/db');

async function runReadOnlyVerification() {
    try {
        const pool = await sql.connect(config);
        console.log("=== READ-ONLY VERIFICATION SCRIPT STARTED ===\n");

        // 1. DATABASE COUNTS
        const taskMasterCountRes = await pool.request().query("SELECT COUNT(*) AS cnt FROM TaskMaster");
        const taskAssignCountRes = await pool.request().query("SELECT COUNT(*) AS cnt FROM TaskAssignment");
        const taskAssignHistCountRes = await pool.request().query("SELECT COUNT(*) AS cnt FROM TaskAssignmentHistory");
        const importBatchRowCountRes = await pool.request().query("SELECT COUNT(*) AS cnt FROM ImportBatchRow");

        const counts = {
            TaskMaster: taskMasterCountRes.recordset[0].cnt,
            TaskAssignment: taskAssignCountRes.recordset[0].cnt,
            TaskAssignmentHistory: taskAssignHistCountRes.recordset[0].cnt,
            ImportBatchRow: importBatchRowCountRes.recordset[0].cnt
        };

        console.log("A. DATABASE COUNTS:");
        console.log(JSON.stringify(counts, null, 2));

        // 2. VERIFY TASKMASTER & DOUBLE CONVERSION & AMBIGUITY
        const tasksRes = await pool.request().query(`
            SELECT 
                t.TaskID,
                t.TaskCode,
                t.TaskName,
                t.ShotID,
                s.ShotCode,
                ws.StageName,
                t.EstimatedHours,
                t.WorkflowStageID
            FROM TaskMaster t
            LEFT JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            LEFT JOIN ShotMaster s ON t.ShotID = s.ShotId
            ORDER BY t.TaskID ASC
        `);

        const allTasks = tasksRes.recordset;

        // Fetch all ImportBatchRow data to link with tasks via ShotCode
        const rowsRes = await pool.request().query(`
            SELECT BatchRowID, ImportBatchID, ShotName, ClientShotName, RotoBid, PaintBid, CompBid, CGBid, TotalBid
            FROM ImportBatchRow
        `);
        const allRows = rowsRes.recordset;

        // Group ImportBatchRow by normalized shot name
        const rowMapByShot = new Map();
        for (const row of allRows) {
            const shotKey = (row.ShotName || row.ClientShotName || '').trim();
            if (shotKey) {
                if (!rowMapByShot.has(shotKey)) {
                    rowMapByShot.set(shotKey, []);
                }
                rowMapByShot.get(shotKey).push(row);
            }
        }

        let totalGeneratedTasks = 0;
        let matchingTasks = 0;
        let mismatchedTasks = 0;
        const mismatchesList = [];
        const doubleConversionList = [];
        const ambiguousTasksList = [];

        for (const task of allTasks) {
            // Task generated from ImportBatchRow if its ShotCode matches an ImportBatchRow
            if (task.ShotCode && rowMapByShot.has(task.ShotCode)) {
                totalGeneratedTasks++;
                const matchingRows = rowMapByShot.get(task.ShotCode);

                if (matchingRows.length > 1) {
                    // Check if bids differ across rows for this shot
                    const distinctRoto = new Set(matchingRows.map(r => Number(r.RotoBid) || 0));
                    const distinctPaint = new Set(matchingRows.map(r => Number(r.PaintBid) || 0));
                    const distinctComp = new Set(matchingRows.map(r => Number(r.CompBid) || 0));
                    const distinctCG = new Set(matchingRows.map(r => Number(r.CGBid) || 0));

                    if (distinctRoto.size > 1 || distinctPaint.size > 1 || distinctComp.size > 1 || distinctCG.size > 1) {
                        ambiguousTasksList.push({
                            taskId: task.TaskID,
                            taskCode: task.TaskCode,
                            shotCode: task.ShotCode,
                            matchedBatchCount: matchingRows.length
                        });
                    }
                }

                // Primary matching row
                const sourceRow = matchingRows[matchingRows.length - 1]; // Latest batch row
                let sourceBid = 0;
                const stage = (task.StageName || '').trim();

                if (stage === 'Roto') sourceBid = Number(sourceRow.RotoBid) || 0;
                else if (stage === 'Paint') sourceBid = Number(sourceRow.PaintBid) || 0;
                else if (stage === 'Comp') sourceBid = Number(sourceRow.CompBid) || 0;
                else if (stage === 'CG') sourceBid = Number(sourceRow.CGBid) || 0;

                const expectedHours = sourceBid * 8;
                const actualEstHours = Number(task.EstimatedHours);

                if (actualEstHours === expectedHours) {
                    matchingTasks++;
                } else {
                    mismatchedTasks++;
                    mismatchesList.push({
                        TaskID: task.TaskID,
                        TaskCode: task.TaskCode,
                        Stage: stage,
                        SourceBid: sourceBid,
                        CurrentEstimatedHours: actualEstHours,
                        ExpectedEstimatedHours: expectedHours
                    });
                }

                // Check for double conversion (e.g. sourceBid * 64)
                if (sourceBid > 0 && actualEstHours === sourceBid * 64) {
                    doubleConversionList.push({
                        TaskID: task.TaskID,
                        TaskCode: task.TaskCode,
                        SourceBid: sourceBid,
                        CurrentEstimatedHours: actualEstHours
                    });
                }
            }
        }

        console.log("\nB. TASKMASTER BID -> HOURS CHECK:");
        console.log(`Total generated tasks checked: ${totalGeneratedTasks}`);
        console.log(`Matching: ${matchingTasks}`);
        console.log(`Mismatched: ${mismatchedTasks}`);
        console.log(`Ambiguous match tasks: ${ambiguousTasksList.length}`);

        console.log("\nC. MISMATCH DETAILS:");
        console.log(JSON.stringify(mismatchesList, null, 2));

        console.log("\nE. DOUBLE-CONVERSION CHECK:");
        console.log(JSON.stringify(doubleConversionList, null, 2));

        // 3. TASKMASTER SUMMARY BY DEPARTMENT
        const deptSummaryRes = await pool.request().query(`
            SELECT 
                ws.StageName,
                COUNT(t.TaskID) as TaskCount,
                SUM(t.EstimatedHours) as TotalEstimatedHours
            FROM TaskMaster t
            JOIN WorkflowStageMaster ws ON t.WorkflowStageID = ws.StageId
            WHERE t.ShotID IN (
                SELECT s.ShotId FROM ShotMaster s JOIN ImportBatchRow r ON s.ShotCode = COALESCE(r.ShotName, r.ClientShotName)
            )
            GROUP BY ws.StageName
        `);

        console.log("\nSUMMARY BY DEPARTMENT (Generated Tasks):");
        const deptBreakdown = deptSummaryRes.recordset.map(row => ({
            StageName: row.StageName,
            TaskCount: row.TaskCount,
            TotalExpectedHours: Number(row.TotalEstimatedHours),
            TotalBid: Number(row.TotalEstimatedHours) / 8
        }));
        console.table(deptBreakdown);

        // 4. VERIFY TASKASSIGNMENT
        const assignRes = await pool.request().query(`
            SELECT 
                ta.AssignmentID,
                ta.TaskID,
                t.TaskCode,
                ta.UserID,
                ta.TargetHours,
                t.EstimatedHours,
                ta.StatusID,
                u.FullName AS ArtistName,
                u.IsActive AS UserIsActive
            FROM TaskAssignment ta
            LEFT JOIN TaskMaster t ON ta.TaskID = t.TaskID
            LEFT JOIN UserMaster u ON ta.UserID = u.UserId
        `);

        const assignments = assignRes.recordset;
        const assignReport = assignments.map(a => ({
            AssignmentID: a.AssignmentID,
            TaskID: a.TaskID,
            TaskCode: a.TaskCode,
            UserID: a.UserID,
            TargetHours: Number(a.TargetHours),
            TargetBid: Number(a.TargetHours) / 8
        }));

        console.log("\nD. TASKASSIGNMENT CHECK:");
        console.table(assignReport);

        // Check for duplicate active assignments
        const activeAssignsRes = await pool.request().query(`
            SELECT TaskID, COUNT(*) as activeCount
            FROM TaskAssignment
            GROUP BY TaskID
            HAVING COUNT(*) > 1
        `);

        const duplicateAssignments = activeAssignsRes.recordset;
        console.log(`Duplicate active assignments: ${duplicateAssignments.length}`);

        // 5. DATA INTEGRITY CHECK
        const tasksMissingStage = allTasks.filter(t => !t.WorkflowStageID || !t.StageName);
        const tasksMissingShot = allTasks.filter(t => !t.ShotID || !t.ShotCode);
        const tasksInvalidHours = allTasks.filter(t => t.EstimatedHours === null || t.EstimatedHours === undefined || Number(t.EstimatedHours) < 0);
        const assignMissingTask = assignments.filter(a => !a.TaskCode);
        const assignInactiveUser = assignments.filter(a => a.UserIsActive === false || a.UserIsActive === null);

        console.log("\nI. DATA INTEGRITY CHECK:");
        console.log(`Tasks missing WorkflowStage: ${tasksMissingStage.length}`);
        console.log(`Tasks missing ShotMaster: ${tasksMissingShot.length}`);
        console.log(`Tasks with invalid/negative EstimatedHours: ${tasksInvalidHours.length}`);
        console.log(`Assignments referencing missing task: ${assignMissingTask.length}`);
        console.log(`Assignments referencing inactive/missing user: ${assignInactiveUser.length}`);

        await pool.close();
    } catch (err) {
        console.error("Read-only verification error:", err);
    }
}

runReadOnlyVerification();
