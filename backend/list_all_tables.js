const { sql, config } = require('./config/db');
const fs = require('fs');

async function inspectSchema() {
    try {
        await sql.connect(config);
        const query = `
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `;
        const result = await sql.query(query);
        const tables = {};
        for (const row of result.recordset) {
            if (!tables[row.TABLE_NAME]) tables[row.TABLE_NAME] = [];
            tables[row.TABLE_NAME].push(row);
        }
        fs.writeFileSync('tables_schema.json', JSON.stringify(tables, null, 2));
        console.log("Schema written to tables_schema.json");
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
inspectSchema();
