const { sql, config } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

async function withDb(callback) {
  const pool = await sql.connect(config);
  try {
    return await callback(pool);
  } finally {
    // mssql pooling handled by library
  }
}

async function getDepartments(req, res) {
  try {
    const request = (await sql.connect(config)).request();
  
    const result = await request.query(`
      SELECT DepartmentId AS id, DepartmentName AS name
      FROM DepartmentMaster
      WHERE DepartmentName IN ('Roto', 'Paint', 'Comp', 'CG')
      ORDER BY CASE 
        WHEN DepartmentName = 'Roto' THEN 1
        WHEN DepartmentName = 'Paint' THEN 2
        WHEN DepartmentName = 'Comp' THEN 3
        WHEN DepartmentName = 'CG' THEN 4
      END ASC;
    `);
  
    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('getDepartments error:', err);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
}

// bind auth to all handlers — everyone who needs to see department dropdowns
const secured = (handler) => authMiddleware(
  ['Super Admin', 'Production Head', 'Project Manager', 'Team Lead', 'Artist', 'QC Artist'],
  handler
);

module.exports = {
  getDepartments: secured(getDepartments),
};
