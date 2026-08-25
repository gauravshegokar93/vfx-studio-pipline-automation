const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { sql, config } = require('../config/db');

function secured(handler) {
  return authMiddleware(['Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);
}

// Minimal SQL-backed endpoints required for import.
// Currently supports lookups for (ProjectId, SequenceCode) and listing sequences.

async function listSequences(req, res) {
  const request = (await sql.connect(config)).request();
  const { projectId } = req.query || {};

  const where = [];
  if (projectId) {
    request.input('ProjectId', sql.UniqueIdentifier, projectId);
    where.push('s.ProjectId = @ProjectId');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT s.SequenceId AS id, s.ProjectId AS projectId, s.SequenceCode AS sequenceCode
    FROM Sequences s
    ${whereSql}
    ORDER BY s.SequenceCode ASC;
  `);

  return res.json({ success: true, items: result.recordset || [] });
}

async function getSequenceByCode(req, res) {
  const { projectId, sequenceCode } = req.query || {};
  if (!projectId || !sequenceCode) {
    return res.status(400).json({ success: false, message: 'projectId and sequenceCode are required' });
  }

  const request = (await sql.connect(config)).request();
  request.input('ProjectId', sql.UniqueIdentifier, projectId);
  request.input('SequenceCode', sql.NVarChar, String(sequenceCode).trim());

  const result = await request.query(`
    SELECT TOP 1 s.SequenceId AS id, s.ProjectId AS projectId, s.SequenceCode AS sequenceCode
    FROM Sequences s
    WHERE s.ProjectId = @ProjectId AND s.SequenceCode = @SequenceCode;
  `);

  const row = result.recordset?.[0] || null;
  return res.json({ success: true, sequence: row });
}

router.get('/', secured(listSequences));
router.get('/lookup', secured(getSequenceByCode));

module.exports = router;

