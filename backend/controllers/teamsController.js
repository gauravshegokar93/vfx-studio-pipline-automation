const { sql, config } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

async function getTeams(req, res) {
  try {
    const request = (await sql.connect(config)).request();

    // If departmentId is provided in query, filter by it
    if (req.query.departmentId) {
      request.input('DepartmentId', sql.BigInt, req.query.departmentId);
      const result = await request.query(`
        SELECT TeamId AS id, TeamName AS name, DepartmentId AS departmentId
        FROM TeamMaster
        WHERE DepartmentId = @DepartmentId AND IsActive = 1
        ORDER BY TeamName ASC;
      `);
      return res.json({ success: true, items: result.recordset || [] });
    }

    const result = await request.query(`
      SELECT TeamId AS id, TeamName AS name, DepartmentId AS departmentId
      FROM TeamMaster
      WHERE IsActive = 1
      ORDER BY TeamName ASC;
    `);

    return res.json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[getTeams]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// bind auth to all handlers
const secured = (handler) => authMiddleware(['Production Head', 'Department Supervisor', 'Project Manager', 'Lead', 'Team Lead', 'Artist'], handler);

module.exports = {
  getTeams: secured(getTeams),
};
