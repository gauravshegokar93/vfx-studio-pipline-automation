const { config, sql } = require('../backend/config/db');

async function testApiQueries() {
    try {
        const pool = await sql.connect(config);
        
        const res = await pool.request().query(`
            SELECT 
                t.TaskID AS taskId,
                t.TaskCode AS taskCode,
                t.EstimatedHours AS estimatedHours,
                (t.EstimatedHours / 8.0) AS estimatedBid,
                ISNULL(ta.TargetHours, 0) AS targetHours,
                (ISNULL(ta.TargetHours, 0) / 8.0) AS targetBid
            FROM TaskMaster t
            LEFT JOIN TaskAssignment ta ON t.TaskID = ta.TaskID
            WHERE t.TaskID IN (4, 5)
            ORDER BY t.TaskID
        `);

        console.log("=== API CONTRACT VERIFICATION (TASKS 4 & 5) ===");
        console.table(res.recordset);

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

testApiQueries();
