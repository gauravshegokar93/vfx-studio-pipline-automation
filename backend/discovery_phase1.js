/**
 * PHASE 1 DISCOVERY SCRIPT
 * Queries live DB for real schema of organization tables.
 * Read-only. No changes.
 */
const { sql, config } = require('./config/db');

async function run() {
  try {
    await sql.connect(config);
    console.log('Connected to DB:', config.server);

    // ---- 1. Core tables columns ----
    const coreTables = [
      'UserMaster', 'RoleMaster', 'DepartmentMaster', 'TeamMaster',
      'TaskMaster', 'TaskAssignment', 'TaskAssignmentHistory',
      'WorkflowStageMaster', 'StatusMaster', 'PriorityMaster',
      'PermissionMaster', 'RolePermission', 'UserPermission'
    ];

    for (const t of coreTables) {
      const r = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${t}'
        ORDER BY ORDINAL_POSITION
      `);
      if (r.recordset.length > 0) {
        console.log('\n========== TABLE:', t, '==========');
        r.recordset.forEach(c => console.log(' ', c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT || ''));
      } else {
        console.log('\n[TABLE NOT FOUND]:', t);
      }
    }

    // ---- 2. All tables in DB ----
    const allTables = await sql.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('\n========== ALL TABLES IN DB ==========');
    allTables.recordset.forEach(t => console.log(' ', t.TABLE_NAME));

    // ---- 3. Foreign Keys ----
    const fkeys = await sql.query(`
      SELECT 
        fk.name AS ForeignKeyName,
        tp.name AS ParentTable,
        cp.name AS ParentColumn,
        tr.name AS ReferencedTable,
        cr.name AS ReferencedColumn
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
      JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
      JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
      ORDER BY tp.name, fk.name
    `);
    console.log('\n========== FOREIGN KEYS ==========');
    fkeys.recordset.forEach(fk => console.log(' ', fk.ParentTable, '.', fk.ParentColumn, '->', fk.ReferencedTable, '.', fk.ReferencedColumn, '|', fk.ForeignKeyName));

    // ---- 4. RoleMaster data ----
    const roles = await sql.query('SELECT * FROM RoleMaster ORDER BY RoleId');
    console.log('\n========== ROLES ==========');
    roles.recordset.forEach(r => console.log(' ', JSON.stringify(r)));

    // ---- 5. DepartmentMaster data ----
    const depts = await sql.query('SELECT * FROM DepartmentMaster ORDER BY DepartmentId');
    console.log('\n========== DEPARTMENTS ==========');
    depts.recordset.forEach(d => console.log(' ', JSON.stringify(d)));

    // ---- 6. TeamMaster data ----
    const teams = await sql.query('SELECT * FROM TeamMaster ORDER BY TeamId').catch(() => ({ recordset: [] }));
    console.log('\n========== TEAMS ==========');
    teams.recordset.forEach(t => console.log(' ', JSON.stringify(t)));

    // ---- 7. Sample UserMaster ----
    const users = await sql.query(`
      SELECT TOP 30
        um.UserId, um.EmployeeCode, um.FullName,
        um.RoleId, rm.RoleName,
        um.HomeDepartmentId, dm.DepartmentName,
        um.HomeTeamId,
        um.ReportingManagerId,
        um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      ORDER BY um.UserId
    `);
    console.log('\n========== USERS (top 30) ==========');
    users.recordset.forEach(u => console.log(' ', JSON.stringify(u)));

    // ---- 8. WorkflowStageMaster ----
    const stages = await sql.query('SELECT * FROM WorkflowStageMaster ORDER BY StageId').catch(() => ({ recordset: [] }));
    console.log('\n========== WorkflowStageMaster ==========');
    stages.recordset.forEach(s => console.log(' ', JSON.stringify(s)));

    // ---- 9. Artists table check ----
    const artistsCheck = await sql.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Artists'`);
    console.log('\n========== Artists table exists?', artistsCheck.recordset.length > 0 ? 'YES' : 'NO');

    // ---- 10. DB Sequences ----
    const seqs = await sql.query(`SELECT name, start_value, increment, current_value FROM sys.sequences`).catch(() => ({ recordset: [] }));
    console.log('\n========== DB Sequences ==========');
    seqs.recordset.forEach(s => console.log(' ', JSON.stringify(s)));

    console.log('\n\nDISCOVERY COMPLETE.');
  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
  } finally {
    await sql.close();
  }
}

run();
