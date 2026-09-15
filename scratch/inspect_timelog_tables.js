const { config, sql } = require('../backend/config/db');

async function inspectTimeLogTables() {
    try {
        const pool = await sql.connect(config);
        
        const tablesRes = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        console.log("=== ALL TABLES IN MSSQL DATABASE ===");
        console.table(tablesRes.recordset);

        // Check columns of any table containing 'Log' or 'Time' or 'Work'
        const logTables = tablesRes.recordset.filter(t => 
            t.TABLE_NAME.toLowerCase().includes('log') || 
            t.TABLE_NAME.toLowerCase().includes('time') || 
            t.TABLE_NAME.toLowerCase().includes('work') ||
            t.TABLE_NAME.toLowerCase().includes('track')
        );

        console.log("=== LOG/TIME/WORK TABLES ===");
        for (const t of logTables) {
            const colsRes = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${t.TABLE_NAME}'
            `);
            console.log(`\nColumns for table '${t.TABLE_NAME}':`);
            console.table(colsRes.recordset);
        }

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

inspectTimeLogTables();
