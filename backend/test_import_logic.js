const fs = require('fs');
const importService = require('./services/importService');

async function test() {
    try {
        const buffer = fs.readFileSync('test-import.xlsx');
        const file = {
            buffer: buffer,
            originalname: 'test-import.xlsx'
        };
        const userId = 1; // Dummy user ID for test
        const result = await importService.processUpload(file, userId);
        console.log("Upload Result:", result);

        // Fetch rows to see validation status
        const rows = await importService.getBatchRows(result.ImportBatchID);
        console.log(`\nTotal rows inserted: ${rows.length}`);
        
        let valid = 0, invalid = 0;
        rows.forEach(r => {
            console.log(`Row ${r.RowNumber}: HeadIn=${r.HeadIn}, TailOut=${r.TailOut}`);
            if (r.ValidationStatus === 'VALID') valid++;
            else {
                invalid++;
                console.log(`  INVALID: ${r.ValidationMessage}`);
            }
        });
        
        console.log(`\nSummary: Valid: ${valid}, Invalid: ${invalid}`);

        // Check if any projects or shots were created (there is no code for this, but let's query to be sure)
        const { sql, config } = require('./config/db');
        const pool = await sql.connect(config);
        const pCount = await pool.request().query("SELECT COUNT(*) as c FROM ProjectMaster");
        const sCount = await pool.request().query("SELECT COUNT(*) as c FROM ShotMaster");
        console.log(`\nProjects in DB: ${pCount.recordset[0].c}, Shots in DB: ${sCount.recordset[0].c}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
