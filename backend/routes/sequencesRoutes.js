const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

function secured(handler) {
  return authMiddleware(['Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

async function listSequences(req, res) {
  const request = (await sql.connect(config)).request();
  const { projectId } = req.query || {};

  const where = [];
  let fromClause = 'FROM SequenceMaster sq INNER JOIN ReelMaster r ON r.ReelId = sq.ReelId';
  if (projectId) {
    request.input('ProjectId', sql.BigInt, projectId);
    where.push('r.ProjectId = @ProjectId');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT sq.SequenceId AS id, r.ProjectId AS projectId, sq.ReelId AS reelId, sq.SequenceCode AS sequenceCode, sq.SequenceName AS sequenceName
    ${fromClause}
    ${whereSql}
    ORDER BY sq.SequenceCode ASC;
  `);

  return res.json({ success: true, items: result.recordset || [] });
}

async function getSequenceByCode(req, res) {
  const { projectId, sequenceCode } = req.query || {};
  if (!projectId || !sequenceCode) {
    return res.status(400).json({ success: false, message: 'projectId and sequenceCode are required' });
  }

  const request = (await sql.connect(config)).request();
  request.input('ProjectId', sql.BigInt, projectId);
  request.input('SequenceCode', sql.NVarChar, String(sequenceCode).trim());

  const result = await request.query(`
    SELECT TOP 1 sq.SequenceId AS id, r.ProjectId AS projectId, sq.ReelId AS reelId, sq.SequenceCode AS sequenceCode, sq.SequenceName AS sequenceName
    FROM SequenceMaster sq
    INNER JOIN ReelMaster r ON r.ReelId = sq.ReelId
    WHERE r.ProjectId = @ProjectId AND (sq.SequenceCode = @SequenceCode OR sq.SequenceName = @SequenceCode);
  `);

  const row = result.recordset?.[0] || null;
  return res.json({ success: true, sequence: row });
}

router.get('/', secured(listSequences));
router.get('/lookup', secured(getSequenceByCode));

module.exports = router;


