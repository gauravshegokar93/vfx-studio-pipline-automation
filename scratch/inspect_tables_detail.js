const { config, sql } = require('../backend/config/db');

async function printConciseSchema() {
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
        const colsRes = await pool.request().query(`
            SELECT c.name, TYPE_NAME(c.user_type_id) as type, c.is_nullable, c.is_identity
            FROM sys.columns c JOIN sys.tables tbl ON c.object_id = tbl.object_id 
            WHERE tbl.name = '${tableName}' ORDER BY c.column_id
        `);

        const fkRes = await pool.request().query(`
            SELECT fk.name, cp.name AS ParentCol, tr.name AS RefTable, cr.name AS RefCol
            FROM sys.foreign_keys fk
            JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
            JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            WHERE tp.name = '${tableName}'
        `);

        console.log(`\n=== ${tableName} ===`);
        console.log("COLUMNS:", colsRes.recordset.map(c => `${c.name} (${c.type}${c.is_identity ? ' IDENTITY' : ''}${c.is_nullable ? ' NULL' : ' NOT NULL'})`).join(', '));
        if (fkRes.recordset.length > 0) {
            console.log("FOREIGN KEYS:", fkRes.recordset.map(f => `${f.ParentCol} -> ${f.RefTable}.${f.RefCol}`).join(', '));
        }
    }

    process.exit(0);
}

printConciseSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
