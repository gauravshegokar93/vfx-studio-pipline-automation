const { config, sql } = require('../backend/config/db');

async function printFullSchema() {
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

    const schemaInfo = {};

    for (const tableName of tables) {
        const colsRes = await pool.request().query(`
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

        schemaInfo[tableName] = {
            columns: colsRes.recordset,
            foreignKeys: fkRes.recordset
        };
    }

    console.log(JSON.stringify(schemaInfo, null, 2));
    process.exit(0);
}

printFullSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
