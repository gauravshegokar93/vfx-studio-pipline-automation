const { parseBidSheet } = require('../utils/excelBidSheetParser');
const { sql, config } = require('../config/db');

function normalizeStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizePriority(v) {
  const s = normalizeStr(v);
  if (!s) return 'Medium';
  const t = s.toLowerCase();
  if (t === 'low') return 'Low';
  if (t === 'medium') return 'Medium';
  if (t === 'high') return 'High';
  if (t === 'critical') return 'Critical';
  return 'Medium';
}

function isValidStatus(v) {
  const s = normalizeStr(v);
  if (!s) return true; // allow null -> default in DB
  const allowed = new Set([
    'Not Started',
    'In Progress',
    'Pending Review',
    'Client Review',
    'Retake',
    'Approved',
    'Delivered',
  ]);
  return allowed.has(s);
}

function validateRow(row, seenInFile) {
  const errors = [];
  const warnings = [];

  const sequenceCode = normalizeStr(row.sequenceCode);
  const shotCode = normalizeStr(row.shotCode);
  const type = normalizeStr(row.type);
  const priority = normalizeStr(row.priority);
  const dueDate = row.dueDate;
  const status = normalizeStr(row.shotStatus);
  const deliveryDate = row.deliveryDate;

  if (!shotCode) errors.push({ field: 'Shot Name*', message: 'Shot Name is required' });
  if (!sequenceCode) errors.push({ field: 'EP/Reel*', message: 'EP/Reel is required' });

  // Duplicate prevention within file
  const key = `${sequenceCode || ''}::${shotCode || ''}::${row.sequenceCode || ''}`;
  // Note: actual uniqueness enforced by (ProjectId+ShotCode) requirement, but DB is (SequenceId, ShotCode).
  // We enforce duplicates per sequence+shot in preview.
  if (shotCode && sequenceCode) {
    const dedupeKey = `${sequenceCode}::${shotCode}`;
    if (seenInFile.has(dedupeKey)) {
      errors.push({ field: 'Duplicate Shot', message: `Duplicate shot in file for EP/Reel ${sequenceCode} and Shot ${shotCode}` });
    } else {
      seenInFile.add(dedupeKey);
    }
  }

  // Negative bid hours
  const bids = {
    rotoBid: row.rotoBid,
    paintBid: row.paintBid,
    compBid: row.compBid,
    cgBid: row.cgBid,
  };

  for (const [k, val] of Object.entries(bids)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'number' && val < 0) errors.push({ field: k, message: `${k} cannot be negative` });
  }

  // Dates
  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) errors.push({ field: 'ETA', message: 'Invalid ETA date' });
  if (deliveryDate && Number.isNaN(new Date(deliveryDate).getTime())) errors.push({ field: 'Delivery Date', message: 'Invalid Delivery Date' });

  // Status
  if (!isValidStatus(status)) errors.push({ field: 'Status', message: `Invalid Status: ${status}` });

  // Type (optional, but required by workflow mapping)
  if (!type) warnings.push({ field: 'Type', message: 'Type column is empty; ShotType not persisted in current schema.' });
  if (!priority) warnings.push({ field: 'Complexity*', message: 'Complexity is empty; defaulting priority to Medium.' });

  return { errors, warnings };
}

function buildTaskPlansFromRow(row, sequenceCode, shotCode) {
  const priority = normalizePriority(row.priority);
  const dueDate = row.dueDate || null;

  const tasks = [];

  const add = (pipelineStep, bidHours) => {
    const bid = bidHours === null || bidHours === undefined ? null : bidHours;
    const bidNum = typeof bid === 'number' ? bid : Number(bid);
    if (!Number.isFinite(bidNum) || bidNum <= 0) return;

    tasks.push({
      pipelineStep,
      bidHours: bidNum,
      dueDate,
      priority,
      // unassigned by default
      assignedLeadId: null,
      assignedArtistId: null,
    });
  };

  add('Roto', row.rotoBid);
  add('Paint', row.paintBid);
  add('Comp', row.compBid);
  add('CG', row.cgBid);

  return tasks;
}

async function previewBidSheet({ fileBuffer, originalName }) {
  const parsed = await parseBidSheet(fileBuffer, originalName);
  const rows = parsed.rows || [];

  const errors = [...(parsed.errors || [])];
  const warnings = [];

  const seenInFile = new Set();

  // Row validations
  const rowValidation = [];
  rows.forEach((r, idx) => {
    const v = validateRow(r, seenInFile);
    if (v.errors.length) {
      errors.push({ rowNumber: r.rowNumber, errors: v.errors });
    }
    if (v.warnings.length) {
      warnings.push({ rowNumber: r.rowNumber, warnings: v.warnings });
    }
    rowValidation.push(v);
  });

  if (errors.length) {
    return {
      success: false,
      summary: {
        projects: [],
        sequences: [],
        shots: [],
        tasks: [],
        warnings: warnings,
        errors: errors,
        stats: {
          projectCount: 0,
          sequenceCount: 0,
          shotCount: 0,
          taskCount: 0,
          rotoCount: 0,
          paintCount: 0,
          compCount: 0,
          cgCount: 0,
        },
      },
    };

  // Build hierarchy preview plans (no DB writes)
  // Project: if ProjectCode exists? Workflow says create if not exists.
  // Current Excel mapping does not include ProjectCode; we treat ProjectCode as 'NTM' and ProjectName from filename.
  const projectCode = 'NTM';
  const projectName = normalizeStr(originalName?.replace(/\.[^/.]+$/, '')) || 'NTM Production';

  const projectPlan = {
    projectCode,
    projectName,
    clientName: normalizeStr(rows[0]?.clientShotName) || null,
    status: 'In-Production',
    startDate: null,
    endDate: null,
  };

  const sequenceMap = new Map(); // sequenceCode -> plan
  const shots = [];
  const tasks = [];

  let rotoCount = 0;
  let paintCount = 0;
  let compCount = 0;
  let cgCount = 0;

  for (const r of rows) {
    const sequenceCode = normalizeStr(r.sequenceCode);
    const shotCode = normalizeStr(r.shotCode);
    if (!sequenceCode || !shotCode) continue;

    if (!sequenceMap.has(sequenceCode)) {
      sequenceMap.set(sequenceCode, { sequenceCode, projectCode });
    }

    const shotPriority = normalizePriority(r.priority);
    const shotStatus = normalizeStr(r.shotStatus) || 'Not Started';

    const shotPlan = {
      sequenceCode,
      shotCode,
      priority: shotPriority,
      status: shotStatus,
      dueDate: r.dueDate || null,
      description: normalizeStr(r.description) || null,
    };
    shots.push(shotPlan);

    const taskPlans = buildTaskPlansFromRow(r, sequenceCode, shotCode);
    for (const t of taskPlans) {
      tasks.push({
        sequenceCode,
        shotCode,
        pipelineStep: t.pipelineStep,
        bidHours: t.bidHours,
        priority: t.priority,
        dueDate: t.dueDate,
        taskName: `${t.pipelineStep} for ${shotCode}`,
      });

      if (t.pipelineStep === 'Roto') rotoCount++;
      if (t.pipelineStep === 'Paint') paintCount++;
      if (t.pipelineStep === 'Comp') compCount++;
      if (t.pipelineStep === 'CG') cgCount++;
    }
  }

  // duplicates list is currently only within-file; DB duplicate detection happens in commit.
  const sequences = Array.from(sequenceMap.values()).map((s) => ({ projectCode, sequenceCode: s.sequenceCode }));

  return {
    success: true,
    summary: {
      projects: [projectPlan],
      sequences,
      shots,
      tasks,
      warnings: warnings,
      errors: [],
      stats: {
        projectCount: 1,
        sequenceCount: sequences.length,
        shotCount: shots.length,
        taskCount: tasks.length,
        rotoCount,
        paintCount,
        compCount,
        cgCount,
      },
    },
  };

async function commitBidSheet({ fileBuffer, originalName, requestedBy }) {
  // Re-parse and re-validate; fail fast.
  const parsed = await parseBidSheet(fileBuffer, originalName);
  const rows = parsed.rows || [];

  const seenInFile = new Set();
  const validationErrors = [];
  rows.forEach((r) => {
    const v = validateRow(r, seenInFile);
    if (v.errors.length) {
      validationErrors.push({ rowNumber: r.rowNumber, errors: v.errors });
    }
  });
  if (validationErrors.length || (parsed.errors || []).length) {
    return {
      canCommit: false,
      errors: [...(parsed.errors || []), ...validationErrors],
      warnings: [],
      imported: null,
    };
  }

  const requestUserId = requestedBy;
  const projectCode = 'NTM';
  const projectName = normalizeStr(originalName?.replace(/\.[^/.]+$/, '')) || 'NTM Production';

  // Transaction
  const pool = await sql.connect(config);

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const tRequest = new sql.Request(transaction);

    // Find or create Project
    tRequest.input('ProjectCode', sql.NVarChar, projectCode);
    const projResult = await tRequest.query(`
      SELECT TOP 1 ProjectId AS id FROM Projects WHERE ProjectCode = @ProjectCode;
    `);

    let projectId = projResult.recordset?.[0]?.id || null;

    if (!projectId) {
      tRequest.input('ProjectName', sql.NVarChar, projectName);
      tRequest.input('ClientName', sql.NVarChar, normalizeStr(rows[0]?.clientShotName) || null);
      tRequest.input('Status', sql.NVarChar, 'In-Production');
      tRequest.input('StartDate', sql.Date, null);
      tRequest.input('EndDate', sql.Date, null);

      const ins = await tRequest.query(`
        INSERT INTO Projects(ProjectCode, ProjectName, ClientName, Status, StartDate, EndDate)
        OUTPUT inserted.ProjectId AS id
        VALUES(@ProjectCode, @ProjectName, @ClientName, @Status, @StartDate, @EndDate);
      `);
      projectId = ins.recordset?.[0]?.id;
    }

    // Create / find Sequences and map to IDs
    const sequenceMap = new Map(); // sequenceCode -> sequenceId
    for (const r of rows) {
      const sequenceCode = normalizeStr(r.sequenceCode);
      if (!sequenceCode) continue;
      if (sequenceMap.has(sequenceCode)) continue;

      const lookupReq = new sql.Request(transaction);
      lookupReq.input('ProjectId', sql.UniqueIdentifier, projectId);
      lookupReq.input('SequenceCode', sql.NVarChar, sequenceCode);

      const seqRes = await lookupReq.query(`
        SELECT TOP 1 SequenceId AS id FROM Sequences WHERE ProjectId=@ProjectId AND SequenceCode=@SequenceCode;
      `);

      let sequenceId = seqRes.recordset?.[0]?.id || null;
      if (!sequenceId) {
        const createReq = new sql.Request(transaction);
        createReq.input('ProjectId', sql.UniqueIdentifier, projectId);
        createReq.input('SequenceCode', sql.NVarChar, sequenceCode);
        const ins = await createReq.query(`
          INSERT INTO Sequences(ProjectId, SequenceCode)
          OUTPUT inserted.SequenceId AS id
          VALUES(@ProjectId, @SequenceCode);
        `);
        sequenceId = ins.recordset?.[0]?.id;
      }

      sequenceMap.set(sequenceCode, sequenceId);
    }

    // Create / update Shots and map to IDs
    const shotIdMap = new Map(); // sequenceCode::shotCode -> shotId

    // Enforce uniqueness: Workflow says Unique Key = ProjectId + ShotCode. DB unique is (SequenceId, ShotCode).
    // We'll implement: if shot exists in this specific SequenceId+ShotCode, update. Otherwise insert new.
    // Additionally, prevent duplicates across sequences for the same shotCode by checking any shot in project.

    let duplicateShots = [];

    for (const r of rows) {
      const sequenceCode = normalizeStr(r.sequenceCode);
      const shotCode = normalizeStr(r.shotCode);
      if (!sequenceCode || !shotCode) continue;

      const sequenceId = sequenceMap.get(sequenceCode);

      // Check if any existing shot for this project has same ShotCode
      const checkReq = new sql.Request(transaction);
      checkReq.input('ProjectId', sql.UniqueIdentifier, projectId);
      checkReq.input('ShotCode', sql.NVarChar, shotCode);

      const projectShotRes = await checkReq.query(`
        SELECT TOP 1 sh.ShotId AS id
        FROM Shots sh
        INNER JOIN Sequences s ON s.SequenceId = sh.SequenceId
        WHERE s.ProjectId=@ProjectId AND sh.ShotCode=@ShotCode;
      `);

      if (projectShotRes.recordset?.length) {
        duplicateShots.push({ shotCode });
      }

      const key = `${sequenceCode}::${shotCode}`;
      if (shotIdMap.has(key)) continue;

      const lookupReq = new sql.Request(transaction);
      lookupReq.input('SequenceId', sql.UniqueIdentifier, sequenceId);
      lookupReq.input('ShotCode', sql.NVarChar, shotCode);

      const existing = await lookupReq.query(`
        SELECT TOP 1 sh.ShotId AS id
        FROM Shots sh
        WHERE sh.SequenceId=@SequenceId AND sh.ShotCode=@ShotCode;
      `);

      const shotPriority = normalizePriority(r.priority);
      const shotStatus = normalizeStr(r.shotStatus) || 'Not Started';
      const dueDate = r.dueDate || null;
      const description = normalizeStr(r.description) || null;

      if (existing.recordset?.[0]?.id) {
        const updateReq = new sql.Request(transaction);
        updateReq.input('ShotId', sql.UniqueIdentifier, existing.recordset[0].id);
        updateReq.input('Priority', sql.NVarChar, shotPriority);
        updateReq.input('Status', sql.NVarChar, shotStatus);
        updateReq.input('DueDate', sql.Date, dueDate);
        updateReq.input('Description', sql.NVarChar, description);

        await updateReq.query(`
          UPDATE Shots
          SET Priority=@Priority,
              Status=@Status,
              DueDate=@DueDate,
              Description=@Description
          WHERE ShotId=@ShotId;
        `);

        shotIdMap.set(key, existing.recordset[0].id);
      } else {
        const createReq = new sql.Request(transaction);
        createReq.input('SequenceId', sql.UniqueIdentifier, sequenceId);
        createReq.input('ShotCode', sql.NVarChar, shotCode);
        createReq.input('Priority', sql.NVarChar, shotPriority);
        createReq.input('Status', sql.NVarChar, shotStatus);
        createReq.input('DueDate', sql.Date, dueDate);
        createReq.input('Description', sql.NVarChar, description);

        const ins = await createReq.query(`
          INSERT INTO Shots(SequenceId, ShotCode, Priority, Status, DueDate, Description)
          OUTPUT inserted.ShotId AS id
          VALUES(@SequenceId, @ShotCode, @Priority, @Status, @DueDate, @Description);
        `);
        shotIdMap.set(key, ins.recordset?.[0]?.id);
      }
    }

    // Create tasks for each row/bid step where bidHours > 0.
    // Tasks remain UNASSIGNED => LeadId/ArtistId NULL.

    let tasksCreated = 0;

    for (const r of rows) {
      const sequenceCode = normalizeStr(r.sequenceCode);
      const shotCode = normalizeStr(r.shotCode);
      if (!sequenceCode || !shotCode) continue;
      const shotId = shotIdMap.get(`${sequenceCode}::${shotCode}`);
      if (!shotId) continue;

      const priority = normalizePriority(r.priority);

      const dueDate = r.dueDate || null;

      const addTask = async (pipelineStep, bidHours) => {
        const bid = typeof bidHours === 'number' ? bidHours : Number(bidHours);
        if (!Number.isFinite(bid) || bid <= 0) return;

        const taskName = `${pipelineStep} for ${shotCode}`;

        // Avoid duplicates: if a task already exists for (ShotId, PipelineStep, BidHours) we update hours; otherwise insert.
        // The schema has no unique constraint; we use ShotId+PipelineStep as logical uniqueness.
        const lookupReq = new sql.Request(transaction);
        lookupReq.input('ShotId', sql.UniqueIdentifier, shotId);
        lookupReq.input('PipelineStep', sql.NVarChar, pipelineStep);

        const existing = await lookupReq.query(`
          SELECT TOP 1 TaskId AS id
          FROM Tasks
          WHERE ShotId=@ShotId AND PipelineStep=@PipelineStep;
        `);

        if (existing.recordset?.[0]?.id) {
          const updateReq = new sql.Request(transaction);
          updateReq.input('TaskId', sql.UniqueIdentifier, existing.recordset[0].id);
          updateReq.input('BidHours', sql.Decimal(10,2), bid);
          updateReq.input('DueDate', sql.Date, dueDate);
          updateReq.input('Priority', sql.NVarChar, priority);
          updateReq.input('TaskName', sql.NVarChar, taskName);

          await updateReq.query(`
            UPDATE Tasks
            SET
              TaskName = @TaskName,
              BidHours = @BidHours,
              RemainingHours = @BidHours,
              DueDate = @DueDate,
              Priority = @Priority,
              Status = 'Not Started',
              LeadId = NULL,
              ArtistId = NULL
            WHERE TaskId=@TaskId;
          `);
        } else {
          const createReq = new sql.Request(transaction);
          createReq.input('ShotId', sql.UniqueIdentifier, shotId);
          createReq.input('PipelineStep', sql.NVarChar, pipelineStep);
          createReq.input('TaskName', sql.NVarChar, taskName);
          createReq.input('BidHours', sql.Decimal(10,2), bid);
          createReq.input('RemainingHours', sql.Decimal(10,2), bid);
          createReq.input('DueDate', sql.Date, dueDate);
          createReq.input('Priority', sql.NVarChar, priority);

          // UNASSIGNED: SupervisorId/LeadId/ArtistId NULL.
          // Schema allows nulls for these FK columns.

          await createReq.query(`
            INSERT INTO Tasks(ShotId, PipelineStep, TaskName, BidHours, ActualHours, RemainingHours, Status, DueDate, Priority, LeadId, ArtistId)
            OUTPUT inserted.TaskId AS id
            VALUES(
              @ShotId,
              @PipelineStep,
              @TaskName,
              @BidHours,
              0,
              @RemainingHours,
              'Not Started',
              @DueDate,
              @Priority,
              NULL,
              NULL
            );
          `);
          tasksCreated++;
        }
      };

      await addTask('Roto', r.rotoBid);
      await addTask('Paint', r.paintBid);
      await addTask('Comp', r.compBid);
      await addTask('CG', r.cgBid);
    }

    await transaction.commit();

    return {
      canCommit: true,
      imported: {
        projectCode,
        projectId,
        sequenceCount: sequenceMap.size,
        shotCount: shotIdMap.size,
        tasksCreated,
      },
      duplicates: duplicateShots,
    };
  } catch (e) {
    await transaction.rollback();
    return {
      canCommit: false,
      errors: [{ message: e?.message || 'Commit failed', details: e?.details || undefined }],
      imported: null,
    };
  } finally {
    // pool kept by mssql
  }
}

module.exports = {
  previewBidSheet,
  commitBidSheet,
};

