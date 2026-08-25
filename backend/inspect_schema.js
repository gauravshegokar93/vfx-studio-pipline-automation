const { sql, config } = require('./config/db');

async function inspectSchema() {
    try {
        await sql.connect(config);
        console.log("Connected");
        
        const tables = ['UserMaster', 'RoleMaster', 'DepartmentMaster', 'TeamMaster', 'PermissionMaster', 'RolePermission', 'UserPermission'];
        
        for (const table of tables) {
            const query = `
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${table}'
            `;
            const result = await sql.query(query);
            console.log(`\nTable: ${table}`);
            console.table(result.recordset);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
inspectSchema();
