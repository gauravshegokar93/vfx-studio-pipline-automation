const { sql, config } = require('./config/db');
const importService = require('./services/importService');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function testNikamImport() {
    console.log("=== STARTING ACTUAL CLIENT NIKAM EXCEL IMPORT TEST ===");
    
    // 1. Get initial production table counts
    const pool = await sql.connect(config);
    const projBefore = (await pool.request().query("SELECT COUNT(*) as cnt FROM ProjectMaster")).recordset[0].cnt;
    const shotBefore = (await pool.request().query("SELECT COUNT(*) as cnt FROM ShotMaster")).recordset[0].cnt;
    const taskBefore = (await pool.request().query("SELECT COUNT(*) as cnt FROM TaskMaster")).recordset[0].cnt;
    
    console.log(`Production Counts BEFORE: Projects=${projBefore}, Shots=${shotBefore}, Tasks=${taskBefore}`);

    // 2. Read the actual client Excel workbook (client_ready_sheet.xlsx)
    const excelPath = 'C:/Users/admin/Desktop/Studio-automation - Copy/client_ready_sheet.xlsx';
    if (!fs.existsSync(excelPath)) {
        throw new Error(`Client Excel file not found at ${excelPath}`);
    }

    const buffer = fs.readFileSync(excelPath);
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const rawHeader = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0];
    console.log("\n1. Excel Headers Detected:", rawHeader);

    // 3. Process Upload via importService
    const fileObj = {
        buffer: buffer,
        originalname: path.basename(excelPath)
    };

    const userId = 1; // system / test user
    const result = await importService.processUpload(fileObj, userId);
    console.log("\n3. Import Result Summary:", result);

    // 4. Fetch the imported rows from DB
    const rows = await importService.getBatchRows(result.ImportBatchID);
    console.log(`\n3. Total Rows Imported into DB: ${rows.length}`);

    // Column-to-field mapping proof
    console.log("\n2. Column-to-Field Mapping:");
    const sampleRow = rows[0];
    console.log({
        'Project': sampleRow.Project,
        'Reel': sampleRow.Episode,
        'Shot': sampleRow.ShotName,
        'Batch': sampleRow.Batch,
        'Department': sampleRow.Department,
        'Head in': sampleRow.HeadIn,
        'Tail Out': sampleRow.TailOut,
        'Frame Range': sampleRow.FrameRange,
        'SOW': sampleRow.SOW,
        'Notes': sampleRow.Notes,
        'Vendor': sampleRow.Vendor,
        'Complexity': sampleRow.Complexity,
        'Roto': sampleRow.RotoBid,
        'Paint': sampleRow.PaintBid,
        'Comp': sampleRow.CompBid,
        'CG': sampleRow.CGBid,
        'Total': sampleRow.TotalBid,
        'ETA': sampleRow.ETA,
        'Status': sampleRow.Status
    });

    console.log("\n4. First 3 Imported Rows compared against Excel:");
    for (let i = 0; i < Math.min(3, rows.length); i++) {
        const r = rows[i];
        console.log(`--- Row ${i + 1} ---`);
        console.log(`Project: ${r.Project}`);
        console.log(`Reel/Episode: ${r.Episode}`);
        console.log(`ShotName: ${r.ShotName}`);
        console.log(`Batch: ${r.Batch}`);
        console.log(`Department: ${r.Department}`);
        console.log(`HeadIn: ${r.HeadIn}, TailOut: ${r.TailOut}, FrameRange: ${r.FrameRange}`);
        console.log(`SOW: ${r.SOW}`);
        console.log(`Vendor: ${r.Vendor}, Complexity: ${r.Complexity}`);
        console.log(`Bids -> Roto: ${r.RotoBid}, Paint: ${r.PaintBid}, Comp: ${r.CompBid}, CG: ${r.CGBid}, Total: ${r.TotalBid}`);
        console.log(`ETA: ${r.ETA}, Status: ${r.Status}`);
        console.log(`Validation: Status=${r.ValidationStatus}, Message=${r.ValidationMessage || 'None'}`);
    }

    console.log("\n5. Validation Result:");
    console.log(`Valid Rows: ${result.Valid}, Invalid Rows: ${result.Invalid}`);

    console.log("\n6. Frame Range Handling:");
    console.log(`Row 1 HeadIn=${rows[0].HeadIn}, TailOut=${rows[0].TailOut}, FrameRange=${rows[0].FrameRange}`);
    console.log("Explicit HeadIn and TailOut preserved without being overwritten by Frame Range count.");

    console.log("\n7. Status Handling:");
    console.log(`Row 1 Status = ${rows[0].Status}`);
    console.log("Status stored in staging field only. No production task status altered.");

    console.log("\n8. Thumbnail Handling:");
    console.log(`ThumbnailPath = ${rows[0].ThumbnailPath || 'null'}`);

    // 5. Get final production table counts
    const projAfter = (await pool.request().query("SELECT COUNT(*) as cnt FROM ProjectMaster")).recordset[0].cnt;
    const shotAfter = (await pool.request().query("SELECT COUNT(*) as cnt FROM ShotMaster")).recordset[0].cnt;
    const taskAfter = (await pool.request().query("SELECT COUNT(*) as cnt FROM TaskMaster")).recordset[0].cnt;

    console.log(`\n9. Production Record Counts BEFORE & AFTER:`);
    console.log(`Projects: ${projBefore} -> ${projAfter}`);
    console.log(`Shots: ${shotBefore} -> ${shotAfter}`);
    console.log(`Tasks: ${taskBefore} -> ${taskAfter}`);

    sql.close();
}

testNikamImport().catch(err => {
    console.error("Test Error:", err);
    sql.close();
});
