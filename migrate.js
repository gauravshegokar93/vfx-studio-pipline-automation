const { sql, config } = require('./backend/config/db.js');

async function run() {
  try {
    const pool = await sql.connect(config);
    const txn = await pool.transaction();
    await txn.begin();
    try {
      const maxRes = await txn.request().query("SELECT MAX(CAST(DepartmentId AS INT)) as MaxId FROM DepartmentMaster");
      let maxId = maxRes.recordset[0].MaxId || 8;
      
      await txn.request().query(`
        INSERT INTO DepartmentMaster (DepartmentId, DepartmentCode, DepartmentName, DisplayOrder, IsActive) 
        VALUES 
        (${maxId + 1}, 'ROTO', 'Roto', 10, 1), 
        (${maxId + 2}, 'PAINT', 'Paint', 11, 1), 
        (${maxId + 3}, 'COMPNEW', 'Comp', 12, 1), 
        (${maxId + 4}, 'CG', 'CG', 13, 1)
      `);
      
      const r = await txn.request().query("SELECT * FROM DepartmentMaster WHERE DepartmentName IN ('Roto', 'Paint', 'Comp', 'CG')");
      const depts = r.recordset;
      const cgId = depts.find(d => d.DepartmentName === 'CG').DepartmentId;
      const compId = depts.find(d => d.DepartmentName === 'Comp').DepartmentId;
      
      await txn.request().query(`UPDATE UserMaster SET HomeDepartmentId = '${cgId}' WHERE HomeDepartmentId IN ('3','4','5','6','8')`);
      await txn.request().query(`UPDATE TeamMaster SET DepartmentId = '${cgId}' WHERE DepartmentId IN ('3','4','5','6','8')`);
      await txn.request().query(`UPDATE TeamMaster SET DepartmentId = '${compId}' WHERE DepartmentId = '7'`);
      
      await txn.request().query("UPDATE DepartmentMaster SET IsActive = 0 WHERE DepartmentId IN ('1','2','3','4','5','6','7','8')");
      
      await txn.commit();
      console.log('Migration successful');
    } catch(e) {
      await txn.rollback();
      throw e;
    }
    pool.close();
  } catch(e) {
    console.error(e);
  }
}
run();
