const { sql, config } = require('../config/db');

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
    where.push('(p.ProjectCode LIKE @Q OR p.ProjectName LIKE @Q OR c.ClientName LIKE @Q)');
  }
  if (status) {
    request.input('Status', sql.NVarChar, String(status).trim());
    where.push('(st.StatusName = @Status OR CAST(p.StatusId AS NVARCHAR) = @Status)');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalResult = await request.query(`
    SELECT COUNT(1) AS total
    FROM ProjectMaster p
    LEFT JOIN ClientMaster c ON p.ClientId = c.ClientId
    LEFT JOIN StatusMaster st ON p.StatusId = st.StatusId
    ${whereSql};
  `);

  const itemsResult = await request.query(`
    SELECT
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      c.ClientName AS clientName,
      COALESCE(st.StatusName, 'In-Production') AS status,
      p.StartDate AS startDate,
      p.EndDate AS endDate,
      COUNT(DISTINCT r.ReelId) AS reelCount,
      COUNT(DISTINCT sm.ShotId) AS shotCount,
      CASE
        WHEN COUNT(DISTINCT sm.ShotId) > 0 THEN 100
        ELSE 0
      END AS progress
    FROM ProjectMaster p
    LEFT JOIN ClientMaster c ON p.ClientId = c.ClientId
    LEFT JOIN StatusMaster st ON p.StatusId = st.StatusId
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    ${whereSql}
    GROUP BY p.ProjectId, p.ProjectCode, p.ProjectName, c.ClientName, st.StatusName, p.StartDate, p.EndDate
    ORDER BY p.ProjectCode ASC
    OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY;
  `);

  return {
    items: itemsResult.recordset || [],
    total: totalResult.recordset?.[0]?.total ?? 0,
    page: pageNum,
    pageSize: size,
  };
}

async function getProjectHierarchy(projectId) {
  const pool = await sql.connect(config);

  // 1. Fetch Project Details
  const projReq = pool.request();
  projReq.input('ProjectId', sql.BigInt, projectId);
  const projRes = await projReq.query(`
    SELECT
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      c.ClientName AS clientName,
      COALESCE(st.StatusName, 'In-Production') AS status,
      p.StartDate AS startDate,
      p.EndDate AS endDate,
      COUNT(DISTINCT r.ReelId) AS reelCount,
      COUNT(DISTINCT sm.ShotId) AS shotCount
    FROM ProjectMaster p
    LEFT JOIN ClientMaster c ON p.ClientId = c.ClientId
    LEFT JOIN StatusMaster st ON p.StatusId = st.StatusId
    LEFT JOIN ReelMaster r ON r.ProjectId = p.ProjectId
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    WHERE p.ProjectId = @ProjectId
    GROUP BY p.ProjectId, p.ProjectCode, p.ProjectName, c.ClientName, st.StatusName, p.StartDate, p.EndDate;
  `);

  const project = projRes.recordset?.[0];
  if (!project) return null;

  // 2. Fetch Reels for Project
  const reelReq = pool.request();
  reelReq.input('ProjectId', sql.BigInt, projectId);
  const reelsRes = await reelReq.query(`
    SELECT
      r.ReelId AS reelId,
      r.ReelName AS reelName,
      COUNT(DISTINCT seq.SequenceId) AS sequenceCount,
      COUNT(DISTINCT sm.ShotId) AS shotCount
    FROM ReelMaster r
    LEFT JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = seq.SequenceId
    WHERE r.ProjectId = @ProjectId
    GROUP BY r.ReelId, r.ReelName
    ORDER BY r.ReelName ASC;
  `);
  const reels = reelsRes.recordset || [];

  // 3. Fetch Sequences for Project
  const seqReq = pool.request();
  seqReq.input('ProjectId', sql.BigInt, projectId);
  const seqsRes = await seqReq.query(`
    SELECT
      sq.SequenceId AS sequenceId,
      sq.ReelId AS reelId,
      sq.SequenceCode AS sequenceCode,
      sq.SequenceName AS sequenceName,
      COUNT(DISTINCT sm.ShotId) AS shotCount
    FROM SequenceMaster sq
    INNER JOIN ReelMaster r ON r.ReelId = sq.ReelId
    LEFT JOIN ShotMaster sm ON sm.SequenceId = sq.SequenceId
    WHERE r.ProjectId = @ProjectId
    GROUP BY sq.SequenceId, sq.ReelId, sq.SequenceCode, sq.SequenceName
    ORDER BY sq.SequenceCode ASC;
  `);
  const sequences = seqsRes.recordset || [];

  // 4. Fetch Shots for Project
  const shotReq = pool.request();
  shotReq.input('ProjectId', sql.BigInt, projectId);
  const shotsRes = await shotReq.query(`
    SELECT
      sh.ShotId AS shotId,
      sh.SequenceId AS sequenceId,
      sq.ReelId AS reelId,
      sh.ShotCode AS shotCode,
      sh.FrameStart AS frameStart,
      sh.FrameEnd AS frameEnd,
      sh.Duration AS duration,
      sh.ThumbnailPath AS thumbnailPath,
      COALESCE(st.StatusName, 'Approved') AS status
    FROM ShotMaster sh
    INNER JOIN SequenceMaster sq ON sq.SequenceId = sh.SequenceId
    INNER JOIN ReelMaster r ON r.ReelId = sq.ReelId
    LEFT JOIN StatusMaster st ON sh.StatusId = st.StatusId
    WHERE r.ProjectId = @ProjectId
    ORDER BY sh.ShotCode ASC;
  `);
  const shots = shotsRes.recordset || [];

  return {
    project,
    reels,
    sequences,
    shots
  };
}

async function getProjectById(projectId) {
  const request = (await sql.connect(config)).request();
  request.input('ProjectId', sql.BigInt, projectId);

  const result = await request.query(`
    SELECT
      p.ProjectId AS id,
      p.ProjectCode AS projectCode,
      p.ProjectName AS projectName,
      c.ClientName AS clientName,
      COALESCE(st.StatusName, 'In-Production') AS status,
      p.StartDate AS startDate,
      p.EndDate AS endDate,
      NULL AS createdAt,
      NULL AS updatedAt
    FROM ProjectMaster p
    LEFT JOIN ClientMaster c ON p.ClientId = c.ClientId
    LEFT JOIN StatusMaster st ON p.StatusId = st.StatusId
    WHERE p.ProjectId = @ProjectId;
  `);

  return result.recordset?.[0] || null;
}

async function createProject({ projectCode, projectName, clientName, status, startDate, endDate }) {
  return withDb(async (pool) => {
    const nextReq = pool.request();
    const nextRes = await nextReq.query(`SELECT ISNULL(MAX(ProjectId), 0) + 1 AS NextId FROM ProjectMaster`);
    const newId = nextRes.recordset[0].NextId;

    const request = pool.request();
    request.input('ProjectId', sql.BigInt, newId);
    request.input('ProjectCode', sql.NVarChar, String(projectCode).trim());
    request.input('ProjectName', sql.NVarChar, String(projectName).trim());
    request.input('StartDate', sql.Date, startDate ? new Date(startDate) : null);
    request.input('EndDate', sql.Date, endDate ? new Date(endDate) : null);

    await request.query(`
      INSERT INTO ProjectMaster(ProjectId, ProjectCode, ProjectName, StartDate, EndDate)
      VALUES(@ProjectId, @ProjectCode, @ProjectName, @StartDate, @EndDate);
    `);

    return getProjectById(newId);
  });
}

async function updateProject(projectId, { projectCode, projectName, clientName, status, startDate, endDate }) {
  return withDb(async (pool) => {
    const request = pool.request();
    request.input('ProjectId', sql.BigInt, projectId);
    request.input('ProjectCode', sql.NVarChar, projectCode ? String(projectCode).trim() : null);
    request.input('ProjectName', sql.NVarChar, projectName ? String(projectName).trim() : null);
    request.input('StartDate', sql.Date, startDate ? new Date(startDate) : null);
    request.input('EndDate', sql.Date, endDate ? new Date(endDate) : null);

    await request.query(`
      UPDATE ProjectMaster
      SET
        ProjectCode = COALESCE(@ProjectCode, ProjectCode),
        ProjectName = COALESCE(@ProjectName, ProjectName),
        StartDate = COALESCE(@StartDate, StartDate),
        EndDate = COALESCE(@EndDate, EndDate)
      WHERE ProjectId = @ProjectId;
    `);

    return getProjectById(projectId);
  });
}

async function permanentlyDeleteProject(projectId) {
  const pId = parseInt(projectId, 10);
  if (isNaN(pId) || pId <= 0) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // 1. Lock & Check ProjectMaster existence
    const checkReq = new sql.Request(transaction);
    checkReq.input('ProjectId', sql.BigInt, pId);
    const checkRes = await checkReq.query(`
      SELECT ProjectId, ProjectCode, ProjectName
      FROM ProjectMaster WITH (UPDLOCK, HOLDLOCK)
      WHERE ProjectId = @ProjectId
    `);

    if (!checkRes.recordset || checkRes.recordset.length === 0) {
      await transaction.rollback();
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }

    const execReq = new sql.Request(transaction);
    execReq.input('ProjectId', sql.BigInt, pId);

    const shotSubquery = `
      SELECT sm.ShotId 
      FROM ShotMaster sm
      INNER JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
      INNER JOIN ReelMaster r ON seq.ReelId = r.ReelId
      WHERE r.ProjectId = @ProjectId
    `;

    const seqSubquery = `
      SELECT seq.SequenceId 
      FROM SequenceMaster seq
      INNER JOIN ReelMaster r ON seq.ReelId = r.ReelId
      WHERE r.ProjectId = @ProjectId
    `;

    const taskSubquery = `
      SELECT t.TaskID 
      FROM TaskMaster t
      INNER JOIN ShotMaster sm ON t.ShotID = sm.ShotId
      INNER JOIN SequenceMaster seq ON sm.SequenceId = seq.SequenceId
      INNER JOIN ReelMaster r ON seq.ReelId = r.ReelId
      WHERE r.ProjectId = @ProjectId
    `;

    const assetSubquery = `
      SELECT AssetID FROM AssetMaster 
      WHERE ProjectID = @ProjectId OR ShotID IN (${shotSubquery})
    `;

    const importBatchSubquery = `
      SELECT ImportBatchID FROM ImportBatch WHERE ProjectID = @ProjectId
    `;

    // A. Import Data
    await execReq.query(`DELETE FROM ImportBatchDetail WHERE ImportBatchID IN (${importBatchSubquery});`);
    await execReq.query(`DELETE FROM ImportBatchRow WHERE ImportBatchID IN (${importBatchSubquery});`);
    await execReq.query(`DELETE FROM ImportBatch WHERE ProjectID = @ProjectId;`);

    // B. Asset Data
    await execReq.query(`DELETE FROM AssetAttachment WHERE AssetID IN (${assetSubquery});`);
    await execReq.query(`DELETE FROM AssetTag WHERE AssetID IN (${assetSubquery});`);
    await execReq.query(`DELETE FROM AssetVersion WHERE AssetID IN (${assetSubquery});`);
    await execReq.query(`DELETE FROM AssetMaster WHERE ProjectID = @ProjectId OR ShotID IN (${shotSubquery});`);

    // C. Task Dependent Tables
    await execReq.query(`DELETE FROM TimeLog WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskRework WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskReview WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskAssignmentHistory WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskAssignment WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskComment WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskHistory WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM TaskTransferHistory WHERE TaskID IN (${taskSubquery});`);

    // D. Core Hierarchy
    await execReq.query(`DELETE FROM TaskMaster WHERE TaskID IN (${taskSubquery});`);
    await execReq.query(`DELETE FROM ShotMaster WHERE SequenceId IN (${seqSubquery});`);
    await execReq.query(`DELETE FROM SequenceMaster WHERE ReelId IN (SELECT ReelId FROM ReelMaster WHERE ProjectId = @ProjectId);`);
    await execReq.query(`DELETE FROM ReelMaster WHERE ProjectId = @ProjectId;`);

    // E. Direct Project Direct References
    await execReq.query(`DELETE FROM ExportHistory WHERE ProjectID = @ProjectId;`);
    await execReq.query(`DELETE FROM EpisodeMaster WHERE ProjectId = @ProjectId;`);

    // F. ProjectMaster Row
    await execReq.query(`DELETE FROM ProjectMaster WHERE ProjectId = @ProjectId;`);

    await transaction.commit();
    return true;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error('[permanentlyDeleteProject] Rollback error:', rbErr);
    }
    console.error('[permanentlyDeleteProject] Error:', err);
    throw err;
  }
}

module.exports = {
  getProjects,
  getProjectById,
  getProjectHierarchy,
  createProject,
  updateProject,
  permanentlyDeleteProject,
};



