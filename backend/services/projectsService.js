const { sql, config } = require('../config/db');

function normalizeStatus(status) {
  if (!status) return 'In-Production';
  const s = String(status).trim();
  return s;
}

async function withDb(callback) {
  const pool = await sql.connect(config);
  try {
    return await callback(pool);
  } finally {
    // mssql pooling handled by library
  }
}

async function getProjects({ q, status, page = 1, pageSize = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 50));
  const offset = (pageNum - 1) * size;

  const request = (await sql.connect(config)).request();

  const where = [];
  if (q) {
    request.input('Q', sql.NVarChar, `%${String(q)}%`);
    where.push('(p.ProjectCode LIKE @Q OR p.ProjectName LIKE @Q OR p.ClientName LIKE @Q)');
  }
  if (status) {
    request.input('Status', sql.NVarChar, normalizeStatus(status));
    where.push('p.Status = @Status');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalResult = await request.query(`
    SELECT COUNT(1) AS total
    FROM Projects p
    ${whereSql};
  `);

  const itemsResult = await request.query(`
    SELECT
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      p.ClientName AS clientName,
      p.Status AS status,
      p.StartDate AS startDate,
      p.EndDate AS endDate,
      NULL AS createdAt,
      NULL AS updatedAt
    FROM Projects p
    ${whereSql}
    ORDER BY p.ProjectCode ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
  `.replace('@Offset', String(offset)).replace('@PageSize', String(size)));

  return {
    items: itemsResult.recordset || [],
    total: totalResult.recordset?.[0]?.total ?? 0,
    page: pageNum,
    pageSize: size,
  };
}

async function getProjectById(projectId) {
  const request = (await sql.connect(config)).request();
  request.input('ProjectId', sql.UniqueIdentifier, projectId);

  const result = await request.query(`
    SELECT
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      p.ClientName AS clientName,
      p.Status AS status,
      p.StartDate AS startDate,
      p.EndDate AS endDate,
      NULL AS createdAt,
      NULL AS updatedAt
    FROM Projects p
    WHERE p.ProjectId = @ProjectId;
  `);

  return result.recordset?.[0] || null;
}

async function createProject({ projectCode, projectName, clientName, status, startDate, endDate }) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('ProjectCode', sql.NVarChar, String(projectCode).trim());
    request.input('ProjectName', sql.NVarChar, String(projectName).trim());
    request.input('ClientName', sql.NVarChar, clientName ? String(clientName).trim() : null);
    request.input('Status', sql.NVarChar, normalizeStatus(status));
    request.input('StartDate', sql.Date, startDate ? new Date(startDate) : null);
    request.input('EndDate', sql.Date, endDate ? new Date(endDate) : null);

    const result = await request.query(`
      INSERT INTO Projects(ProjectCode, ProjectName, ClientName, Status, StartDate, EndDate)
      OUTPUT inserted.ProjectId AS id,
             inserted.ProjectCode AS projectCode,
             inserted.ProjectName AS projectName,
             inserted.ClientName AS clientName,
             inserted.Status AS status,
             inserted.StartDate AS startDate,
             inserted.EndDate AS endDate,
             NULL AS createdAt,
             NULL AS updatedAt
      VALUES(@ProjectCode, @ProjectName, @ClientName, @Status, @StartDate, @EndDate);
    `);

    return result.recordset?.[0];
  });
}

async function updateProject(projectId, { projectCode, projectName, clientName, status, startDate, endDate }) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('ProjectId', sql.UniqueIdentifier, projectId);
    request.input('ProjectCode', sql.NVarChar, projectCode ? String(projectCode).trim() : null);
    request.input('ProjectName', sql.NVarChar, projectName ? String(projectName).trim() : null);
    request.input('ClientName', sql.NVarChar, clientName ? String(clientName).trim() : null);
    request.input('Status', sql.NVarChar, status ? normalizeStatus(status) : null);
    request.input('StartDate', sql.Date, startDate ? new Date(startDate) : null);
    request.input('EndDate', sql.Date, endDate ? new Date(endDate) : null);

    const result = await request.query(`
      UPDATE Projects
      SET
        ProjectCode = COALESCE(@ProjectCode, ProjectCode),
        ProjectName = COALESCE(@ProjectName, ProjectName),
        ClientName = COALESCE(@ClientName, ClientName),
        Status = COALESCE(@Status, Status),
        StartDate = COALESCE(@StartDate, StartDate),
        EndDate = COALESCE(@EndDate, EndDate)
      OUTPUT inserted.ProjectId AS id,
             inserted.ProjectCode AS projectCode,
             inserted.ProjectName AS projectName,
             inserted.ClientName AS clientName,
             inserted.Status AS status,
             inserted.StartDate AS startDate,
             inserted.EndDate AS endDate,
             NULL AS createdAt,
             NULL AS updatedAt
      WHERE ProjectId = @ProjectId;
    `);

    return result.recordset?.[0] || null;
  });
}

async function softOrHardDeleteProject(projectId) {
  // If project has FK dependencies, this will fail unless schema supports soft delete.
  // Current schema doesn't include IsDeleted; implement hard delete for now.
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('ProjectId', sql.UniqueIdentifier, projectId);

    const result = await request.query(`
      DELETE FROM Projects
      OUTPUT DELETED.ProjectId AS id
      WHERE ProjectId = @ProjectId;
    `);

    return (result.recordset?.[0]?.id) ? true : false;
  });
}

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  softOrHardDeleteProject,
};

