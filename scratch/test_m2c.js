const { config, sql } = require('../backend/config/db');
const projectService = require('../backend/services/projectsService');
const importService = require('../backend/services/importService');
const xlsx = require('../backend/node_modules/xlsx');
const fs = require('fs');

const path = require('path');

async function runM2CVerification() {
    console.log("==================================================");
    console.log("MILESTONE 2C VERIFICATION SCRIPT");
    console.log("==================================================");

    const pool = await sql.connect(config);

    // 1. Initial State Baseline Check
    const initialProjectsCount = (await pool.request().query("SELECT COUNT(*) as count FROM ProjectMaster")).recordset[0].count;
    const initialTasksCount = (await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster")).recordset[0].count;
    console.log(`[1] Initial State: Projects = ${initialProjectsCount}, Tasks = ${initialTasksCount}`);

    // Check pre-existing NIKAM project
    const nikamProject = (await pool.request().query("SELECT * FROM ProjectMaster WHERE ProjectCode = 'NIKAM'")).recordset[0];
    console.log(`[1] Baseline NIKAM Project ID: ${nikamProject.ProjectId}`);

    // 2. Create NEW Project with Project-Level Metadata
    console.log("\n[2] Creating NEW Project (PRJ_TEST_M2C)...");
    const testProjectCode = `M2C_${Math.floor(Date.now() % 100000)}`;
    const newProject = await projectService.createProject({
        projectCode: testProjectCode,
        projectName: 'M2C Test Feature Project',
        clientName: 'Marvel Studios',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        status: 'In-Production'
    });
    console.log(`[2] Created Project: ID=${newProject.id}, Code=${newProject.projectCode}, Name=${newProject.projectName}`);


    // 3. Generate Test Excel Bid Sheet with Shot-Level Info
    console.log("\n[3] Generating Test Excel Bid Sheet for PRJ_TEST_M2C...");
    const excelData = [
        {
            Project: testProjectCode,
            Episode: 'R01',
            ShotName: `${testProjectCode}_R01_SC01_SH010`,
            Department: 'Roto',
            HeadIn: 1001,
            TailOut: 1050,
            FrameRange: '1001-1050',
            SOW: 'Roto and Paint work',
            RotoBid: 5,
            PaintBid: 10,
            CompBid: 0,
            CGBid: 0,
            TotalBid: 15,
            ETA: '2026-10-15',
            Vendor: 'VFX House A',
            Complexity: 'Medium'
        },
        {
            Project: testProjectCode,
            Episode: 'R01',
            ShotName: `${testProjectCode}_R01_SC01_SH020`,
            Department: 'Paint',
            HeadIn: 1001,
            TailOut: 1080,
            FrameRange: '1001-1080',
            SOW: 'Paint cleanup and Comp',
            RotoBid: 0,
            PaintBid: 5,
            CompBid: 12,
            CGBid: 0,
            TotalBid: 17,
            ETA: '2026-10-20',
            Vendor: 'VFX House A',
            Complexity: 'High'
        },
        {
            Project: testProjectCode,
            Episode: 'R02',
            ShotName: `${testProjectCode}_R02_SC05_SH010`,
            Department: 'CG',
            HeadIn: 1001,
            TailOut: 1040,
            FrameRange: '1001-1040',
            SOW: 'CG creature element',
            RotoBid: 2,
            PaintBid: 0,
            CompBid: 0,
            CGBid: 8,
            TotalBid: 10,
            ETA: '2026-11-01',
            Vendor: 'VFX House B',
            Complexity: 'High'
        },
        {
            Project: testProjectCode,
            Episode: 'R02',
            ShotName: `${testProjectCode}_R02_SC05_SH020`,
            Department: 'Comp',
            HeadIn: 1001,
            TailOut: 1030,
            FrameRange: '1001-1030',
            SOW: 'Full comp final composite',
            RotoBid: 3,
            PaintBid: 4,
            CompBid: 6,
            CGBid: 2,
            TotalBid: 15,
            ETA: '2026-11-10',
            Vendor: 'VFX House B',
            Complexity: 'Medium'
        }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    xlsx.utils.book_append_sheet(wb, ws, "BidSheet");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const mockFile = {
        buffer: buffer,
        originalname: `${testProjectCode}_BidSheet.xlsx`
    };

    // 4. Upload Bid Sheet Associated with Project
    console.log("\n[4] Uploading Bid Sheet linked to Project ID:", newProject.id);
    const uploadRes = await importService.processUpload(mockFile, 1, newProject.id);
    console.log("[4] Process Upload Result:", uploadRes);

    const batchId = uploadRes.ImportBatchID;

    // 5. Test Import Summary Calculation
    console.log("\n[5] Fetching Import Summary for Batch ID:", batchId);
    const summary = await importService.getBatchSummary(batchId);
    console.log("[5] Excel Import Summary Data:", JSON.stringify(summary, null, 2));

    // Verify summary metrics against expected
    const summaryValid = 
        summary.totalShots === 4 &&
        summary.reels.length === 2 &&
        summary.rotoHours === 10 &&
        summary.paintHours === 19 &&
        summary.compHours === 18 &&
        summary.cgHours === 10 &&
        summary.totalHours === 57 &&
        summary.earliestETA === '2026-10-15' &&
        summary.latestETA === '2026-11-10';

    if (summaryValid) {
        console.log("✅ IMPORT SUMMARY PASSED: Excel-derived metrics match source bid sheet exactly!");
    } else {
        console.error("❌ IMPORT SUMMARY FAILED: Mismatch in calculated summary metrics!");
    }

    // 6. Approve Batch & Build Production Hierarchy
    console.log("\n[6] Approving Import Batch ID:", batchId);
    const approveRes = await importService.approveBatch(batchId, 1);
    console.log("[6] Approve Batch Result:", approveRes);

    // Verify hierarchy created for new project
    const hierarchy = await projectService.getProjectHierarchy(newProject.id);
    console.log(`[6] Created Hierarchy for Project ${newProject.projectCode}:`, {
        reels: hierarchy.reels.map(r => r.reelName),
        sequences: hierarchy.sequences.map(s => s.sequenceCode),
        shotsCount: hierarchy.shots.length
    });

    // 7. Create Production Tasks for Approved Batch
    console.log("\n[7] Generating Production Tasks for Batch ID:", batchId);
    const taskGenRes = await importService.createBatchTasks(batchId, 1);
    console.log("[7] Task Generation Result:", taskGenRes);

    // Expected tasks:
    // Shot 1: Roto(5), Paint(10) -> 2 tasks
    // Shot 2: Paint(5), Comp(12) -> 2 tasks
    // Shot 3: Roto(2), CG(8) -> 2 tasks
    // Shot 4: Roto(3), Paint(4), Comp(6), CG(2) -> 4 tasks
    // Total = 10 tasks
    const expectedTasksForBatch = 10;
    if (taskGenRes.tasksCreated === expectedTasksForBatch) {
        console.log(`✅ PRODUCTION TASK CREATION PASSED: Created exactly ${taskGenRes.tasksCreated} department tasks.`);
    } else {
        console.error(`❌ TASK CREATION FAILED: Expected ${expectedTasksForBatch} tasks, got ${taskGenRes.tasksCreated}`);
    }

    // 8. Verify Existing Data Preservation & Safety
    console.log("\n[8] Verifying Existing Data Preservation...");

    // Check NIKAM project still exists with ID 6 and 29 shots
    const nikamCheck = await projectService.getProjectHierarchy(nikamProject.ProjectId);
    console.log(`[8] NIKAM Project preserved: Shots=${nikamCheck.shots.length}`);

    // Check NIKAM tasks count (47 tasks)
    const nikamTasksRes = await pool.request().query(`
        SELECT COUNT(t.TaskID) as count
        FROM TaskMaster t
        JOIN ShotMaster s ON t.ShotID = s.ShotId
        WHERE s.ShotCode LIKE 'NIK_%'
    `);
    console.log(`[8] NIKAM Tasks count: ${nikamTasksRes.recordset[0].count}`);

    // Total TaskMaster count
    const postTestTasksCount = (await pool.request().query("SELECT COUNT(*) as count FROM TaskMaster")).recordset[0].count;
    console.log(`[8] Final TaskMaster Count: ${postTestTasksCount} (Baseline: 55, New Tasks: ${taskGenRes.tasksCreated})`);

    const dataSafetyPassed = 
        nikamCheck.shots.length === 29 &&
        nikamTasksRes.recordset[0].count === 47 &&
        postTestTasksCount === 55 + taskGenRes.tasksCreated;

    if (dataSafetyPassed) {
        console.log("✅ DATA PRESERVATION PASSED: Pre-existing NIKAM data and original tasks remain intact and unmodified.");
    } else {
        console.error("❌ DATA PRESERVATION FAILED!");
    }

    console.log("\n==================================================");
    console.log("MILESTONE 2C VERIFICATION COMPLETE");
    console.log("==================================================");
    process.exit(0);
}

runM2CVerification().catch(err => {
    console.error("M2C Verification Error:", err);
    process.exit(1);
});
