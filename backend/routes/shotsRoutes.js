const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

function secured(handler) {
  return authMiddleware(['Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

async function listShots(req, res) {
  const request = (await sql.connect(config)).request();
  const { sequenceId, projectId } = req.query || {};

  const where = [];

  // If projectId provided, join sequences
  if (sequenceId) {
    request.input('SequenceId', sql.UniqueIdentifier, sequenceId);
    where.push('sh.SequenceId = @SequenceId');
  }

  const fromClause = projectId
    ? `FROM Shots sh INNER JOIN Sequences s ON s.SequenceId = sh.SequenceId`
    : 'FROM Shots sh';

  if (projectId) {
    request.input('ProjectId', sql.UniqueIdentifier, projectId);
    where.push('s.ProjectId = @ProjectId');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT
      sh.ShotId AS id,
      sh.SequenceId AS sequenceId,
      sh.ShotCode AS shotCode,
      sh.Priority AS priority,
      sh.Status AS status,
      sh.DueDate AS dueDate,
      sh.Description AS description
    ${fromClause}
    ${whereSql}
    ORDER BY sh.ShotCode ASC;
  `);

  return res.json({ success: true, items: result.recordset || [] });
}

// Lookup by (sequenceId, shotCode)
async function getShotByCode(req, res) {
  const { sequenceId, shotCode } = req.query || {};
  if (!sequenceId || !shotCode) {
    return res.status(400).json({ success: false, message: 'sequenceId and shotCode are required' });
  }

  const request = (await sql.connect(config)).request();
  request.input('SequenceId', sql.UniqueIdentifier, sequenceId);
  request.input('ShotCode', sql.NVarChar, String(shotCode).trim());

  const result = await request.query(`
    SELECT TOP 1
      sh.ShotId AS id,
      sh.SequenceId AS sequenceId,
      sh.ShotCode AS shotCode,
      sh.Priority AS priority,
      sh.Status AS status,
      sh.DueDate AS dueDate,
      sh.Description AS description
    FROM Shots sh
    WHERE sh.SequenceId = @SequenceId AND sh.ShotCode = @ShotCode;
  `);

  return res.json({ success: true, shot: result.recordset?.[0] || null });
}

router.get('/', secured(listShots));
router.get('/lookup', secured(getShotByCode));

module.exports = router;

