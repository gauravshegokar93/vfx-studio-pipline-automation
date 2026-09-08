const { sql, config } = require('./config/db');

async function cleanup() {
    let pool;
    try {
        pool = await sql.connect(config);

        console.log("=== CLEANUP SCRIPT ===");

        // 13. Pre-cleanup Counts
        const getCounts = async () => {
            const p = await pool.request().query("SELECT COUNT(*) as c FROM ProjectMaster");
            const s = await pool.request().query("SELECT COUNT(*) as c FROM ShotMaster");
            const t = await pool.request().query("SELECT COUNT(*) as c FROM TaskMaster");
            return { p: p.recordset[0].c, s: s.recordset[0].c, t: t.recordset[0].c };
        };
        const beforeCounts = await getCounts();

        // Delete test rows (I used Project='Edge' for my edge cases)
        const deleteResult = await pool.request().query(`
            DELETE FROM ImportBatchRow 
            WHERE Project = 'Edge' AND Episode = 'E01'
        `);
        console.log(`Deleted ${deleteResult.rowsAffected[0]} artificial test rows.`);

        // Post-cleanup Counts
        const afterCounts = await getCounts();
        
        console.log("\n--- Verification ---");
        console.log(`ProjectMaster count: Before=${beforeCounts.p}, After=${afterCounts.p}`);
        console.log(`ShotMaster count: Before=${beforeCounts.s}, After=${afterCounts.s}`);
        console.log(`TaskMaster count: Before=${beforeCounts.t}, After=${afterCounts.t}`);

        if (beforeCounts.p === afterCounts.p && beforeCounts.s === afterCounts.s && beforeCounts.t === afterCounts.t) {
            console.log("PASS: Production counts are unchanged.");
        } else {
            console.log("FAIL: Production counts changed!");
        }

    } catch (err) {
        console.error(err);
    } finally {
        if (pool) await sql.close();
    }
}

cleanup();
