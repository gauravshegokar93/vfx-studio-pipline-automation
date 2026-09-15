const { config, sql } = require('../backend/config/db');

async function inspectSchema() {
    const pool = await sql.connect(config);
    const tables = [
        'TaskMaster',
        'TaskAssignment',
        'TaskAssignmentHistory',
        'UserMaster',
        'RoleMaster',
        'DepartmentMaster',
        'TeamMaster',
        'WorkflowStageMaster',
        'StatusMaster',
        'PriorityMaster',
        'TimeLog',
        'AssetVersion',
        'TaskReview',
        'TaskRework',
        'TaskHistory',
        'TaskComment'
    ];

    for (const tableName of tables) {
        const res = await pool.request().query(`
            SELECT 
                c.name AS column_name, 
                TYPE_NAME(c.user_type_id) AS data_type, 
                c.max_length, 
                c.is_nullable, 
                c.is_identity
            FROM sys.columns c 
            JOIN sys.tables tbl ON c.object_id = tbl.object_id 
            WHERE tbl.name = '${tableName}' 
            ORDER BY c.column_id
        `);

        console.log(`\n========================================`);
        console.log(`TABLE: ${tableName}`);
        console.log(`========================================`);
        console.table(res.recordset);

        // Check foreign keys
        const fkRes = await pool.request().query(`
            SELECT 
                fk.name AS FK_Name,
                tp.name AS ParentTable,
                cp.name AS ParentColumn,
                tr.name AS ReferencedTable,
                cr.name AS ReferencedColumn
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
            INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            WHERE tp.name = '${tableName}'
        `);
        if (fkRes.recordset.length > 0) {
            console.log(`--- Foreign Keys for ${tableName} ---`);
            console.table(fkRes.recordset);
        }
    }

    process.exit(0);
}

inspectSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
