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

  if (sequenceId) {
    request.input('SequenceId', sql.BigInt, sequenceId);
    where.push('sh.SequenceId = @SequenceId');
  }

  let fromClause = 'FROM ShotMaster sh';
  if (projectId) {
    request.input('ProjectId', sql.BigInt, projectId);
    fromClause = `FROM ShotMaster sh
      INNER JOIN SequenceMaster sq ON sq.SequenceId = sh.SequenceId
      INNER JOIN ReelMaster r ON r.ReelId = sq.ReelId`;
    where.push('r.ProjectId = @ProjectId');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT
      sh.ShotId AS id,
      sh.SequenceId AS sequenceId,
      sh.ShotCode AS shotCode,
      sh.FrameStart AS frameStart,
      sh.FrameEnd AS frameEnd,
      sh.Duration AS duration,
      sh.ThumbnailPath AS thumbnailPath,
      st.StatusName AS status
    ${fromClause}
    LEFT JOIN StatusMaster st ON sh.StatusId = st.StatusId
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
  request.input('SequenceId', sql.BigInt, sequenceId);
  request.input('ShotCode', sql.NVarChar, String(shotCode).trim());

  const result = await request.query(`
    SELECT TOP 1
      sh.ShotId AS id,
      sh.SequenceId AS sequenceId,
      sh.ShotCode AS shotCode,
      sh.FrameStart AS frameStart,
      sh.FrameEnd AS frameEnd,
      sh.Duration AS duration,
      sh.ThumbnailPath AS thumbnailPath,
      st.StatusName AS status
    FROM ShotMaster sh
    LEFT JOIN StatusMaster st ON sh.StatusId = st.StatusId
    WHERE sh.SequenceId = @SequenceId AND sh.ShotCode = @ShotCode;
  `);

  return res.json({ success: true, shot: result.recordset?.[0] || null });
}

router.get('/', secured(listShots));
router.get('/lookup', secured(getShotByCode));

module.exports = router;


