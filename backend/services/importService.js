const { sql, config } = require('../config/db');
const xlsx = require('xlsx');

function normalizeHeader(key) {
    if (!key) return '';
    const clean = key.toString().trim().replace(/\*$/, '').trim().toLowerCase();

    switch (clean) {
        case 'project':
            return 'Project';
        case 'reel':
        case 'ep/reel':
        case 'episode/reel':
        case 'episode':
        case 'reel no':
            return 'Episode';
        case 'shot':
        case 'shot name':
        case 'client shot name':
        case 'shot no.':
            return 'ShotName';
        case 'batch':
            return 'Batch';
        case 'department':
            return 'Department';
        case 'head in':
        case 'headin':
            return 'HeadIn';
        case 'tail out':
        case 'tailout':
            return 'TailOut';
        case 'frame range':
        case 'framerange':
        case 'frame count':
            return 'FrameRange';
        case 'sow':
        case 'scope of work':
        case 'vfx work description':
            return 'SOW';
        case 'notes':
        case 'cut summary':
            return 'Notes';
        case 'vendor':
            return 'Vendor';
        case 'complexity':
            return 'Complexity';
        case 'roto':
        case 'roto bid':
            return 'RotoBid';
        case 'paint':
        case 'paint bid':
            return 'PaintBid';
        case 'comp':
        case 'comp bid':
            return 'CompBid';
        case 'cg':
        case 'cg bid':
            return 'CGBid';
        case 'total':
        case 'total bid':
            return 'TotalBid';
        case 'eta':
            return 'ETA';
        case 'status':
            return 'Status';
        case 'thumbnail':
            return 'ThumbnailPath';
        default:
            return key.trim();
    }
}

function parseDate(value) {
    if (!value) return null;
    if (typeof value === 'number') {
        const parsed = xlsx.SSF.parse_date_code(value);
        if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return value;
}

function runValidations(row) {
    let isValid = true;
    let messages = [];

    // Required Fields Check
    if (!row.Project) {
        isValid = false;
        messages.push('Missing Project.');
    }
    if (!row.ShotName) {
        isValid = false;
        messages.push('Missing Shot.');
    }
    if (!row.Department) {
        isValid = false;
        messages.push('Missing Department.');
    }

    // Frame Range Parsing: ONLY if HeadIn & TailOut are completely missing and FrameRange has a range string
    if ((row.HeadIn === undefined || row.HeadIn === null || row.HeadIn === '') &&
        (row.TailOut === undefined || row.TailOut === null || row.TailOut === '') &&
        row.FrameRange) {
        const parts = row.FrameRange.toString().split('-');
        if (parts.length === 2) {
            const h = parseInt(parts[0].trim(), 10);
            const t = parseInt(parts[1].trim(), 10);
            if (!isNaN(h) && !isNaN(t)) {
                row.HeadIn = h;
                row.TailOut = t;
            }
        }
    }

    if (row.FrameRange !== undefined && row.FrameRange !== null) {
        row.FrameRange = row.FrameRange.toString();
    }

    // Numeric & Negative Validation
    const numericFields = ['RotoBid', 'PaintBid', 'CompBid', 'CGBid', 'TotalBid', 'HeadIn', 'TailOut'];
    numericFields.forEach(field => {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
            const num = Number(row[field]);
            if (isNaN(num)) {
                isValid = false;
                messages.push(`Invalid numeric value for ${field}.`);
            } else if (num < 0) {
                isValid = false;
                messages.push(`Negative hours for ${field}.`);
            } else {
                row[field] = num; // normalize to number
            }
        } else {
            // Default hour fields to 0 if null or empty, except HeadIn/TailOut and TotalBid
            if (['RotoBid', 'PaintBid', 'CompBid', 'CGBid'].includes(field)) {
                row[field] = 0;
            }
        }
    });

    // Total Validation
    const roto = Number(row.RotoBid) || 0;
    const paint = Number(row.PaintBid) || 0;
    const comp = Number(row.CompBid) || 0;
    const cg = Number(row.CGBid) || 0;
    const expectedTotal = roto + paint + comp + cg;

    if (row.TotalBid !== undefined && row.TotalBid !== null && row.TotalBid !== '') {
        if (Number(row.TotalBid) !== expectedTotal) {
            isValid = false;
            messages.push(`Total hours mismatch. Expected ${expectedTotal}, but got ${row.TotalBid}.`);
        }
    } else {
        // If no TotalBid provided in Excel, set it to expected total
        row.TotalBid = expectedTotal;
    }

    return {
        status: isValid ? 'VALID' : 'INVALID',
        message: messages.join(' | ')
    };
}

exports.processUpload = async (file, userId, projectId = null) => {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json(sheet);
    if (!rawData || rawData.length === 0) {
        throw new Error("Uploaded Excel file is empty.");
    }

    const rowsToInsert = [];
    let validCount = 0;
    let invalidCount = 0;

    const shotSet = new Set();

    rawData.forEach((rawRow, index) => {
        const row = { RowNumber: index + 2 };
        for (const key of Object.keys(rawRow)) {
            const mappedKey = normalizeHeader(key);
            row[mappedKey] = rawRow[key];
        }

        // Fallbacks if not already mapped
        if (!row.ShotName && row.Shot) row.ShotName = row.Shot;
        if (!row.Episode && row.Reel) row.Episode = row.Reel;

        row.StartDate = parseDate(row.StartDate);
        row.ETA = parseDate(row.ETA);
        row.ClientETA = parseDate(row.ClientETA);
        row.DeliveryDate = parseDate(row.DeliveryDate);

        // Ensure SOW and Notes fallback
        if (!row.VFXWorkDescription && row.SOW) {
            row.VFXWorkDescription = row.SOW;
        }

        const validation = runValidations(row);

        // Duplicate detection: Project + Episode + ShotName
        const duplicateKey = `${row.Project || ''}_${row.Episode || ''}_${row.ShotName || ''}`;
        if (duplicateKey !== '__') {
            if (shotSet.has(duplicateKey)) {
                validation.status = 'INVALID';
                validation.message += (validation.message ? ' | ' : '') + `Duplicate Shot in Project/Reel.`;
            } else {
                shotSet.add(duplicateKey);
            }
        }

        row.ValidationStatus = validation.status;
        row.ValidationMessage = validation.message;

        if (row.ValidationStatus === 'VALID') validCount++;
        else invalidCount++;

        rowsToInsert.push(row);
    });

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const batchNo = `IMP-${Date.now()}`;
        const batchName = file.originalname;
        const totalRecords = rowsToInsert.length;

        const batchResult = await transaction.request()
            .input('BatchNo', sql.VarChar, batchNo)
            .input('BatchName', sql.VarChar, batchName)
            .input('ProjectID', sql.BigInt, projectId ? parseInt(projectId, 10) : null)
            .input('ImportType', sql.VarChar, 'BidSheet')
            .input('SourceFileName', sql.VarChar, file.originalname)
            .input('TotalRecords', sql.Int, totalRecords)
            .input('SuccessRecords', sql.Int, validCount)
            .input('FailedRecords', sql.Int, invalidCount)
            .input('ImportStatus', sql.VarChar, 'STAGED')
            .input('StartedBy', sql.BigInt, userId)
            .input('StartedOn', sql.DateTime2, new Date())
            .query(`
                INSERT INTO ImportBatch (BatchNo, BatchName, ProjectID, ImportType, SourceFileName, TotalRecords, SuccessRecords, FailedRecords, ImportStatus, StartedBy, StartedOn)
                OUTPUT INSERTED.ImportBatchID
                VALUES (@BatchNo, @BatchName, @ProjectID, @ImportType, @SourceFileName, @TotalRecords, @SuccessRecords, @FailedRecords, @ImportStatus, @StartedBy, @StartedOn)
            `);

        const importBatchId = batchResult.recordset[0].ImportBatchID;


        for (const row of rowsToInsert) {
            await transaction.request()
                .input('ImportBatchID', sql.BigInt, importBatchId)
                .input('RowNumber', sql.Int, row.RowNumber)
                .input('ClientShotName', sql.NVarChar, row.ClientShotName || row.ShotName || null)
                .input('ShotName', sql.NVarChar, row.ShotName || null)
                .input('ShotType', sql.NVarChar, row.ShotType || null)
                .input('Episode', sql.NVarChar, row.Episode || null)
                .input('FrameRange', sql.NVarChar, row.FrameRange || null)
                .input('HeadIn', sql.Int, row.HeadIn !== undefined && row.HeadIn !== null ? row.HeadIn : null)
                .input('TailOut', sql.Int, row.TailOut !== undefined && row.TailOut !== null ? row.TailOut : null)
                .input('CutSummary', sql.NVarChar, row.CutSummary || row.Notes || null)
                .input('VFXWorkDescription', sql.NVarChar, row.VFXWorkDescription || row.SOW || null)
                .input('Complexity', sql.NVarChar, row.Complexity || null)
                .input('RotoBid', sql.Decimal, row.RotoBid !== undefined ? row.RotoBid : null)
                .input('PaintBid', sql.Decimal, row.PaintBid !== undefined ? row.PaintBid : null)
                .input('CompBid', sql.Decimal, row.CompBid !== undefined ? row.CompBid : null)
                .input('CGBid', sql.Decimal, row.CGBid !== undefined ? row.CGBid : null)
                .input('TotalBid', sql.Decimal, row.TotalBid !== undefined ? row.TotalBid : null)
                .input('Project', sql.NVarChar, row.Project || null)
                .input('Batch', sql.NVarChar, row.Batch !== undefined && row.Batch !== null ? String(row.Batch) : null)
                .input('Department', sql.NVarChar, row.Department || null)
                .input('SOW', sql.NVarChar, row.SOW || null)
                .input('Notes', sql.NVarChar, row.Notes || null)
                .input('Vendor', sql.NVarChar, row.Vendor || null)
                .input('ETA', sql.NVarChar, row.ETA ? String(row.ETA) : null)
                .input('Status', sql.NVarChar, row.Status || null)
                .input('ThumbnailPath', sql.NVarChar, row.ThumbnailPath || null)
                .input('ValidationStatus', sql.NVarChar, row.ValidationStatus)
                .input('ValidationMessage', sql.NVarChar, row.ValidationMessage)
                .input('CreatedDate', sql.DateTime2, new Date())
                .query(`
                    INSERT INTO ImportBatchRow (
                        ImportBatchID, RowNumber, ClientShotName, ShotName, ShotType, Episode,
                        FrameRange, HeadIn, TailOut, CutSummary, VFXWorkDescription, Complexity,
                        RotoBid, PaintBid, CompBid, CGBid, TotalBid, Project, Batch, Department,
                        SOW, Notes, Vendor, ETA, Status, ThumbnailPath, ValidationStatus, ValidationMessage, CreatedDate
                    ) VALUES (
                        @ImportBatchID, @RowNumber, @ClientShotName, @ShotName, @ShotType, @Episode,
                        @FrameRange, @HeadIn, @TailOut, @CutSummary, @VFXWorkDescription, @Complexity,
                        @RotoBid, @PaintBid, @CompBid, @CGBid, @TotalBid, @Project, @Batch, @Department,
                        @SOW, @Notes, @Vendor, @ETA, @Status, @ThumbnailPath, @ValidationStatus, @ValidationMessage, @CreatedDate
                    )
                `);
        }

        await transaction.commit();

        return {
            ImportBatchID: importBatchId,
            TotalRecords: totalRecords,
            Valid: validCount,
            Invalid: invalidCount,
            Status: 'STAGED'
        };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

exports.getBatches = async () => {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT ImportBatchID, BatchNo, BatchName, ImportType, TotalRecords, SuccessRecords, FailedRecords, ImportStatus, StartedOn
        FROM ImportBatch
        ORDER BY StartedOn DESC
    `);
    return result.recordset;
};

exports.getBatchDetails = async (batchId) => {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('BatchID', sql.BigInt, batchId)
        .query(`
            SELECT * FROM ImportBatch WHERE ImportBatchID = @BatchID
        `);
    return result.recordset[0];
};

exports.getBatchRows = async (batchId) => {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input('BatchID', sql.BigInt, batchId)
        .query(`
            SELECT * FROM ImportBatchRow WHERE ImportBatchID = @BatchID ORDER BY RowNumber ASC
        `);
    return result.recordset;
};

exports.updateRow = async (rowId, updates) => {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // 1. Fetch current row
        const currentReq = new sql.Request(transaction);
        currentReq.input('RowID', sql.BigInt, rowId);
        const currentRowRes = await currentReq.query(`
            SELECT * FROM ImportBatchRow WITH (UPDLOCK, HOLDLOCK) WHERE BatchRowID = @RowID
        `);
        if (!currentRowRes.recordset || currentRowRes.recordset.length === 0) {
            throw new Error(`ImportBatchRow with ID ${rowId} not found.`);
        }
        const currentRow = currentRowRes.recordset[0];

        // 2. Compute merged values and recalculate dependent fields
        const safeVal = (newVal, oldVal) => (newVal !== undefined ? newVal : oldVal);

        const project = safeVal(updates.Project, currentRow.Project);
        const episode = safeVal(updates.Episode, currentRow.Episode);
        const shotName = safeVal(updates.ShotName, currentRow.ShotName);
        const clientShotName = safeVal(updates.ClientShotName, currentRow.ClientShotName || shotName);
        const batch = safeVal(updates.Batch, currentRow.Batch);
        const department = safeVal(updates.Department, currentRow.Department);
        const sow = safeVal(updates.SOW, currentRow.SOW);
        const notes = safeVal(updates.Notes, currentRow.Notes);
        const vendor = safeVal(updates.Vendor, currentRow.Vendor);
        const complexity = safeVal(updates.Complexity, currentRow.Complexity);
        const status = safeVal(updates.Status, currentRow.Status);
        const eta = safeVal(updates.ETA, currentRow.ETA);

        // Numeric Bids
        const rotoBid = updates.RotoBid !== undefined ? (Number(updates.RotoBid) || 0) : (Number(currentRow.RotoBid) || 0);
        const paintBid = updates.PaintBid !== undefined ? (Number(updates.PaintBid) || 0) : (Number(currentRow.PaintBid) || 0);
        const compBid = updates.CompBid !== undefined ? (Number(updates.CompBid) || 0) : (Number(currentRow.CompBid) || 0);
        const cgBid = updates.CGBid !== undefined ? (Number(updates.CGBid) || 0) : (Number(currentRow.CGBid) || 0);

        // Dependent calculation: TotalBid = RotoBid + PaintBid + CompBid + CGBid
        const calculatedTotalBid = rotoBid + paintBid + compBid + cgBid;
        const totalBid = calculatedTotalBid;

        // HeadIn, TailOut, FrameRange
        let headIn = updates.HeadIn !== undefined ? (updates.HeadIn !== null && updates.HeadIn !== '' ? parseInt(updates.HeadIn, 10) : null) : currentRow.HeadIn;
        let tailOut = updates.TailOut !== undefined ? (updates.TailOut !== null && updates.TailOut !== '' ? parseInt(updates.TailOut, 10) : null) : currentRow.TailOut;
        let frameRange = updates.FrameRange !== undefined ? updates.FrameRange : currentRow.FrameRange;

        // Dependent calculation: FrameRange from HeadIn and TailOut
        if (headIn !== null && tailOut !== null && !isNaN(headIn) && !isNaN(tailOut)) {
            const calculatedDuration = tailOut - headIn + 1;
            if (updates.FrameRange === undefined || updates.FrameRange === null || updates.FrameRange === '') {
                frameRange = String(calculatedDuration);
            }
        }

        // Run existing validation rules on merged data
        const mergedRowForValidation = {
            Project: project,
            Episode: episode,
            ShotName: shotName,
            ClientShotName: clientShotName,
            Department: department,
            HeadIn: headIn,
            TailOut: tailOut,
            FrameRange: frameRange,
            RotoBid: rotoBid,
            PaintBid: paintBid,
            CompBid: compBid,
            CGBid: cgBid,
            TotalBid: totalBid
        };
        const validation = runValidations(mergedRowForValidation);
        if (validation.status !== 'VALID') {
            throw new Error(`Row validation failed: ${validation.message || 'Invalid row data'}`);
        }

        // 3. Resolve Project and detect cross-project conflicts (Check 1)
        const batchReq = new sql.Request(transaction);
        batchReq.input('BatchID', sql.BigInt, currentRow.ImportBatchID);
        const batchRes = await batchReq.query(`
            SELECT ImportBatchID, ProjectID FROM ImportBatch WHERE ImportBatchID = @BatchID
        `);
        const batchProjectId = batchRes.recordset?.[0]?.ProjectID || null;

        let resolvedProjectId = null;
        let resolvedProjectCode = null;

        let editedProj = null;
        if (project && String(project).trim() !== '') {
            const epReq = new sql.Request(transaction);
            epReq.input('ProjectVal', sql.NVarChar(255), String(project).trim());
            const epRes = await epReq.query(`
                SELECT ProjectId, ProjectCode, ProjectName
                FROM ProjectMaster
                WHERE ProjectCode = @ProjectVal OR ProjectName = @ProjectVal OR CAST(ProjectId AS NVARCHAR(50)) = @ProjectVal
            `);
            if (epRes.recordset && epRes.recordset.length > 0) {
                editedProj = epRes.recordset[0];
            }
        }

        if (batchProjectId) {
            const bpReq = new sql.Request(transaction);
            bpReq.input('BatchProjectId', sql.BigInt, batchProjectId);
            const bpRes = await bpReq.query(`
                SELECT ProjectId, ProjectCode, ProjectName FROM ProjectMaster WHERE ProjectId = @BatchProjectId
            `);
            const batchProj = bpRes.recordset?.[0];

            if (editedProj && String(editedProj.ProjectId) !== String(batchProjectId)) {
                throw new Error(
                    `Project conflict: ImportBatch ${currentRow.ImportBatchID} belongs to Project "${batchProj?.ProjectCode}" (ID: ${batchProjectId}), ` +
                    `but edited row specifies Project "${project}" (ID: ${editedProj.ProjectId}). Cross-project reassignment is prohibited.`
                );
            }
            resolvedProjectId = batchProjectId;
            resolvedProjectCode = batchProj?.ProjectCode;
        } else if (editedProj) {
            resolvedProjectId = editedProj.ProjectId;
            resolvedProjectCode = editedProj.ProjectCode;
        } else {
            throw new Error(`Cannot resolve Project for row ${rowId}. Project "${project}" does not exist in ProjectMaster.`);
        }

        // 4. Update ImportBatchRow in SQL Server
        const updateRowReq = new sql.Request(transaction);
        updateRowReq.input('RowID', sql.BigInt, rowId);
        updateRowReq.input('Project', sql.NVarChar(255), project || null);
        updateRowReq.input('Episode', sql.NVarChar(255), episode || null);
        updateRowReq.input('ShotName', sql.NVarChar(255), shotName || null);
        updateRowReq.input('ClientShotName', sql.NVarChar(255), clientShotName || null);
        updateRowReq.input('Batch', sql.NVarChar(255), batch !== undefined && batch !== null ? String(batch) : null);
        updateRowReq.input('Department', sql.NVarChar(255), department || null);
        updateRowReq.input('HeadIn', sql.Int, headIn);
        updateRowReq.input('TailOut', sql.Int, tailOut);
        updateRowReq.input('FrameRange', sql.NVarChar(100), frameRange ? String(frameRange) : null);
        updateRowReq.input('SOW', sql.NVarChar, sow || null);
        updateRowReq.input('Notes', sql.NVarChar, notes || null);
        updateRowReq.input('Vendor', sql.NVarChar(255), vendor || null);
        updateRowReq.input('Complexity', sql.NVarChar(50), complexity || null);
        updateRowReq.input('RotoBid', sql.Decimal(10, 2), rotoBid);
        updateRowReq.input('PaintBid', sql.Decimal(10, 2), paintBid);
        updateRowReq.input('CompBid', sql.Decimal(10, 2), compBid);
        updateRowReq.input('CGBid', sql.Decimal(10, 2), cgBid);
        updateRowReq.input('TotalBid', sql.Decimal(10, 2), totalBid);
        updateRowReq.input('ETA', sql.Date, eta ? new Date(eta) : null);
        updateRowReq.input('Status', sql.NVarChar(100), status || null);
        updateRowReq.input('ValidationStatus', sql.NVarChar(50), validation.status);
        updateRowReq.input('ValidationMessage', sql.NVarChar, validation.message || null);

        await updateRowReq.query(`
            UPDATE ImportBatchRow SET
                Project = @Project,
                Episode = @Episode,
                ShotName = @ShotName,
                ClientShotName = @ClientShotName,
                Batch = @Batch,
                Department = @Department,
                HeadIn = @HeadIn,
                TailOut = @TailOut,
                FrameRange = @FrameRange,
                SOW = @SOW,
                Notes = @Notes,
                Vendor = @Vendor,
                Complexity = @Complexity,
                RotoBid = @RotoBid,
                PaintBid = @PaintBid,
                CompBid = @CompBid,
                CGBid = @CGBid,
                TotalBid = @TotalBid,
                ETA = @ETA,
                Status = @Status,
                ValidationStatus = @ValidationStatus,
                ValidationMessage = @ValidationMessage
            WHERE BatchRowID = @RowID
        `);

        // 5. Resolve existing shot strictly via Project -> Reel -> Sequence -> Shot Hierarchy (Checks 1, 2)
        const oldShotCode = (currentRow.ShotName || currentRow.ClientShotName || '').trim();
        const newShotCode = (shotName || clientShotName || oldShotCode).trim();
        const duration = (headIn !== null && tailOut !== null && !isNaN(headIn) && !isNaN(tailOut)) ? (tailOut - headIn + 1) : null;
        const description = (sow || notes || '').trim();
        const dueDate = eta ? new Date(eta) : null;

        const shotReq = new sql.Request(transaction);
        shotReq.input('ProjectId', sql.BigInt, resolvedProjectId);
        shotReq.input('OldShotCode', sql.NVarChar(255), oldShotCode);
        shotReq.input('NewShotCode', sql.NVarChar(255), newShotCode);
        const shotRes = await shotReq.query(`
            SELECT s.ShotId, s.SequenceId, s.ShotCode, s.FrameStart, s.FrameEnd, s.Duration,
                   seq.SequenceCode, r.ReelId, r.ReelName, pm.ProjectId
            FROM ShotMaster s WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN SequenceMaster seq ON s.SequenceId = seq.SequenceId
            INNER JOIN ReelMaster r ON seq.ReelId = r.ReelId
            INNER JOIN ProjectMaster pm ON r.ProjectId = pm.ProjectId
            WHERE pm.ProjectId = @ProjectId
              AND (s.ShotCode = @OldShotCode OR s.ShotCode = @NewShotCode)
        `);

        let shotId = null;
        let sequenceId = null;

        if (shotRes.recordset && shotRes.recordset.length > 0) {
            if (shotRes.recordset.length > 1) {
                throw new Error(
                    `Ambiguous shot match: Found ${shotRes.recordset.length} matching shots for "${newShotCode}" ` +
                    `in Project "${resolvedProjectCode}". Duplicate shots detected; update halted.`
                );
            }

            shotId = shotRes.recordset[0].ShotId;
            sequenceId = shotRes.recordset[0].SequenceId;

            // In-place update of ShotMaster
            const updateShotReq = new sql.Request(transaction);
            updateShotReq.input('ShotId', sql.BigInt, shotId);
            updateShotReq.input('ShotCode', sql.NVarChar(100), newShotCode);
            updateShotReq.input('FrameStart', sql.Int, headIn);
            updateShotReq.input('FrameEnd', sql.Int, tailOut);
            updateShotReq.input('Duration', sql.Int, duration);
            await updateShotReq.query(`
                UPDATE ShotMaster
                SET ShotCode = @ShotCode,
                    FrameStart = COALESCE(@FrameStart, FrameStart),
                    FrameEnd = COALESCE(@FrameEnd, FrameEnd),
                    Duration = COALESCE(@Duration, Duration)
                WHERE ShotId = @ShotId
            `);
        }

        // 6. Reel change validation — NO auto-creation of ReelMaster or SequenceMaster (Check 7)
        if (shotId && sequenceId && episode) {
            const seqCheckReq = new sql.Request(transaction);
            seqCheckReq.input('SequenceId', sql.BigInt, sequenceId);
            const seqCheckRes = await seqCheckReq.query(`
                SELECT seq.SequenceId, seq.SequenceCode, r.ReelId, r.ReelName, r.ProjectId
                FROM SequenceMaster seq
                JOIN ReelMaster r ON seq.ReelId = r.ReelId
                WHERE seq.SequenceId = @SequenceId
            `);

            if (seqCheckRes.recordset && seqCheckRes.recordset.length > 0) {
                const currentSeq = seqCheckRes.recordset[0];
                const reelName = episode.trim();

                if (currentSeq.ReelName !== reelName) {
                    const findReelReq = new sql.Request(transaction);
                    findReelReq.input('ProjectId', sql.BigInt, resolvedProjectId);
                    findReelReq.input('ReelName', sql.NVarChar(100), reelName);
                    const findReelRes = await findReelReq.query(`
                        SELECT r.ReelId, seq.SequenceId
                        FROM ReelMaster r
                        JOIN SequenceMaster seq ON seq.ReelId = r.ReelId
                        WHERE r.ProjectId = @ProjectId AND r.ReelName = @ReelName
                    `);

                    if (findReelRes.recordset && findReelRes.recordset.length > 0 && findReelRes.recordset[0].SequenceId) {
                        const updateShotSeqReq = new sql.Request(transaction);
                        updateShotSeqReq.input('ShotId', sql.BigInt, shotId);
                        updateShotSeqReq.input('SequenceId', sql.BigInt, findReelRes.recordset[0].SequenceId);
                        await updateShotSeqReq.query(`
                            UPDATE ShotMaster
                            SET SequenceId = @SequenceId
                            WHERE ShotId = @ShotId
                        `);
                    } else {
                        throw new Error(
                            `Target Reel/Sequence "${reelName}" does not exist in Project "${resolvedProjectCode}". ` +
                            `Automatic creation of Reel/Sequence records without explicit approval is not permitted.`
                        );
                    }
                }
            }
        }

        // 7. Synchronize TaskMaster with strict safety gates and NO auto-creation (Checks 2, 3, 6, 8)
        const synchronizedTasks = [];
        const warnings = [];
        if (shotId) {
            // Read-only query to WorkflowStageMaster — NO AUTO-CREATION (Check 7)
            const stageMap = {};
            const stagesRes = await transaction.request().query(`SELECT StageId, StageName FROM WorkflowStageMaster`);
            for (const s of stagesRes.recordset) {
                stageMap[s.StageName.trim().toUpperCase()] = Number(s.StageId);
            }

            const deptBids = [
                { stageId: stageMap['ROTO'], name: 'Roto', bid: rotoBid },
                { stageId: stageMap['PAINT'], name: 'Paint', bid: paintBid },
                { stageId: stageMap['COMP'], name: 'Comp', bid: compBid },
                { stageId: stageMap['CG'], name: 'CG', bid: cgBid }
            ];

            for (const item of deptBids) {
                if (!item.stageId) continue;

                const estimatedBid = item.bid;
                const newEstimatedHours = estimatedBid * 8;

                // Query existing tasks and detect multiple active records (Check 3)
                const taskCheckReq = new sql.Request(transaction);
                taskCheckReq.input('ShotId', sql.BigInt, shotId);
                taskCheckReq.input('StageId', sql.BigInt, item.stageId);
                const taskCheckRes = await taskCheckReq.query(`
                    SELECT
                        t.TaskID, t.TaskCode, t.TaskName, t.EstimatedHours, t.StatusID,
                        COALESCE((SELECT COUNT(*) FROM TaskAssignment WHERE TaskID = t.TaskID), 0) AS assignmentCount,
                        COALESCE((SELECT SUM(TargetHours) FROM TaskAssignment WHERE TaskID = t.TaskID), 0) AS totalAssignedTargetHours,
                        COALESCE((SELECT SUM(CASE WHEN StatusID != 4 THEN TargetHours ELSE 0 END) FROM TaskAssignment WHERE TaskID = t.TaskID), 0) AS activeAssignedTargetHours,
                        COALESCE((SELECT COUNT(*) FROM TimeLog WHERE TaskID = t.TaskID), 0) AS timeLogCount,
                        COALESCE((SELECT SUM(HoursWorked) FROM TimeLog WHERE TaskID = t.TaskID), 0) AS totalLoggedHours
                    FROM TaskMaster t WITH (UPDLOCK, HOLDLOCK)
                    WHERE t.ShotID = @ShotId
                      AND t.WorkflowStageID = @StageId
                      AND t.IsActive = 1
                      AND (t.IsDeleted = 0 OR t.IsDeleted IS NULL)
                `);

                if (taskCheckRes.recordset && taskCheckRes.recordset.length > 1) {
                    throw new Error(
                        `Integrity violation: Found ${taskCheckRes.recordset.length} active TaskMaster records for ShotID ${shotId} ` +
                        `and Stage "${item.name}". Multiple active tasks detected; update halted.`
                    );
                }

                let taskId;
                let taskCode = `${newShotCode}_${item.name}`;
                if (taskCode.length > 30) {
                    const suffix = `_${item.name}`;
                    taskCode = `${newShotCode.substring(0, 30 - suffix.length)}${suffix}`;
                }
                const taskName = `${newShotCode} - ${item.name}`;

                if (taskCheckRes.recordset && taskCheckRes.recordset.length === 1) {
                    const existingTask = taskCheckRes.recordset[0];
                    taskId = existingTask.TaskID;
                    const currentEstHours = Number(existingTask.EstimatedHours) || 0;

                    if (newEstimatedHours !== currentEstHours) {
                        // Estimate protection gates (Checks 6, 8)
                        if (existingTask.StatusID === 4) {
                            throw new Error(
                                `Cannot modify EstimatedHours on Task "${existingTask.TaskCode}": Task is already Completed.`
                            );
                        }

                        if (existingTask.timeLogCount > 0 && newEstimatedHours < Number(existingTask.totalLoggedHours)) {
                            throw new Error(
                                `Cannot reduce EstimatedHours (${newEstimatedHours}h) on Task "${existingTask.TaskCode}": ` +
                                `Task has ${existingTask.totalLoggedHours}h of logged production time.`
                            );
                        }

                        if (existingTask.assignmentCount > 0 && newEstimatedHours < Number(existingTask.activeAssignedTargetHours)) {
                            throw new Error(
                                `Cannot reduce EstimatedHours (${newEstimatedHours}h) on Task "${existingTask.TaskCode}": ` +
                                `Task has ${existingTask.activeAssignedTargetHours}h actively assigned to artists.`
                            );
                        }
                    }

                    // Update TaskMaster without modifying StatusID (Check 6)
                    const updateTaskReq = new sql.Request(transaction);
                    updateTaskReq.input('TaskId', sql.BigInt, taskId);
                    updateTaskReq.input('EstimatedHours', sql.Decimal(10, 2), newEstimatedHours);
                    updateTaskReq.input('DueDate', sql.Date, dueDate);
                    updateTaskReq.input('Description', sql.NVarChar, description || null);
                    updateTaskReq.input('TaskCode', sql.VarChar(30), taskCode);
                    updateTaskReq.input('TaskName', sql.VarChar(200), taskName);
                    await updateTaskReq.query(`
                        UPDATE TaskMaster
                        SET EstimatedHours = @EstimatedHours,
                            DueDate = COALESCE(@DueDate, DueDate),
                            Description = COALESCE(@Description, Description),
                            TaskCode = @TaskCode,
                            TaskName = @TaskName,
                            ModifiedDate = GETDATE()
                        WHERE TaskID = @TaskId
                    `);
                    synchronizedTasks.push({ taskId, department: item.name, action: 'updated', estimatedBid, estimatedHours: newEstimatedHours });
                } else if (estimatedBid > 0) {
                    // Additional Restriction: Do NOT automatically INSERT new TaskMaster records.
                    // Skip task creation and record a clear warning that manual approval is required.
                    warnings.push(
                        `Department task "${item.name}" does not exist for shot "${newShotCode}". Automatic task creation skipped; manual batch approval is required.`
                    );
                }
            }
        }

        // 8. Fetch the updated row from database to return fresh state
        const freshRowRes = await transaction.request()
            .input('RowID', sql.BigInt, rowId)
            .query(`SELECT * FROM ImportBatchRow WHERE BatchRowID = @RowID`);
        const savedRow = freshRowRes.recordset[0];

        await transaction.commit();

        return {
            success: true,
            updatedRow: savedRow,
            shotId: shotId,
            tasksSynchronized: synchronizedTasks.length > 0,
            synchronizedTasks,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

exports.revalidateBatch = async (batchId) => {
    const pool = await sql.connect(config);
    const rowsResult = await pool.request()
        .input('BatchID', sql.BigInt, batchId)
        .query(`SELECT * FROM ImportBatchRow WHERE ImportBatchID = @BatchID`);

    const rows = rowsResult.recordset;
    let validCount = 0;
    let invalidCount = 0;

    const shotSet = new Set();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        for (const row of rows) {
            const validation = runValidations(row);

            const duplicateKey = `${row.Project || ''}_${row.Episode || ''}_${row.ShotName || ''}`;
            if (duplicateKey !== '__') {
                if (shotSet.has(duplicateKey)) {
                    validation.status = 'INVALID';
                    validation.message += (validation.message ? ' | ' : '') + `Duplicate Shot in Project/Reel.`;
                } else {
                    shotSet.add(duplicateKey);
                }
            }

            if (validation.status === 'VALID') validCount++;
            else invalidCount++;

            await transaction.request()
                .input('RowID', sql.BigInt, row.BatchRowID)
                .input('Status', sql.NVarChar, validation.status)
                .input('Msg', sql.NVarChar, validation.message)
                .input('HeadIn', sql.Int, row.HeadIn !== undefined ? row.HeadIn : null)
                .input('TailOut', sql.Int, row.TailOut !== undefined ? row.TailOut : null)
                .input('RotoBid', sql.Decimal, row.RotoBid !== undefined ? row.RotoBid : null)
                .input('PaintBid', sql.Decimal, row.PaintBid !== undefined ? row.PaintBid : null)
                .input('CompBid', sql.Decimal, row.CompBid !== undefined ? row.CompBid : null)
                .input('CGBid', sql.Decimal, row.CGBid !== undefined ? row.CGBid : null)
                .input('TotalBid', sql.Decimal, row.TotalBid !== undefined ? row.TotalBid : null)
                .query(`
                    UPDATE ImportBatchRow
                    SET ValidationStatus = @Status,
                        ValidationMessage = @Msg,
                        HeadIn = ISNULL(HeadIn, @HeadIn),
                        TailOut = ISNULL(TailOut, @TailOut),
                        RotoBid = @RotoBid,
                        PaintBid = @PaintBid,
                        CompBid = @CompBid,
                        CGBid = @CGBid,
                        TotalBid = @TotalBid
                    WHERE BatchRowID = @RowID
                `);
        }

        await transaction.request()
            .input('BatchID', sql.BigInt, batchId)
            .input('Valid', sql.Int, validCount)
            .input('Invalid', sql.Int, invalidCount)
            .query(`
                UPDATE ImportBatch
                SET SuccessRecords = @Valid, FailedRecords = @Invalid
                WHERE ImportBatchID = @BatchID
            `);

        await transaction.commit();

        return {
            valid: validCount,
            invalid: invalidCount
        };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

async function getNextIdWithLock(transaction, tableName, idColumnName) {
    const req = new sql.Request(transaction);
    const result = await req.query(`
        SELECT ISNULL(MAX(${idColumnName}), 0) + 1 AS NextId
        FROM ${tableName} WITH (UPDLOCK, HOLDLOCK)
    `);
    return result.recordset[0].NextId;
}

exports.approveBatch = async (batchId, userId) => {
    const pool = await sql.connect(config);

    // 1. Pre-validation: Fetch batch details
    const batchReq = pool.request();
    batchReq.input('BatchID', sql.BigInt, batchId);
    const batchRes = await batchReq.query(`
        SELECT ImportBatchID, BatchNo, BatchName, ImportStatus, TotalRecords, SuccessRecords, FailedRecords
        FROM ImportBatch
        WHERE ImportBatchID = @BatchID
    `);

    if (!batchRes.recordset || batchRes.recordset.length === 0) {
        throw new Error(`ImportBatch with ID ${batchId} not found.`);
    }

    const batch = batchRes.recordset[0];

    // Idempotency check: Cannot approve an already approved batch
    if (batch.ImportStatus === 'APPROVED') {
        throw new Error(`ImportBatch ${batch.BatchNo} is already APPROVED.`);
    }

    if (batch.ImportStatus !== 'STAGED') {
        throw new Error(`ImportBatch ${batch.BatchNo} cannot be approved because current status is '${batch.ImportStatus}'. Expected 'STAGED'.`);
    }

    // 2. Pre-validation: Fetch and validate all rows
    const rowsReq = pool.request();
    rowsReq.input('BatchID', sql.BigInt, batchId);
    const rowsRes = await rowsReq.query(`
        SELECT *
        FROM ImportBatchRow
        WHERE ImportBatchID = @BatchID
        ORDER BY RowNumber ASC
    `);

    const allRows = rowsRes.recordset || [];
    if (allRows.length === 0) {
        throw new Error(`ImportBatch ${batch.BatchNo} contains no row data.`);
    }

    const invalidRows = allRows.filter(r => r.ValidationStatus !== 'VALID');
    if (invalidRows.length > 0) {
        throw new Error(`Cannot approve batch ${batch.BatchNo}: Batch contains ${invalidRows.length} invalid record(s). Fix validation errors before approving.`);
    }

    // Validate hierarchy fields on all rows
    for (const row of allRows) {
        const shotCode = (row.ShotName || row.ClientShotName || '').trim();
        const project = (row.Project || 'NIKAM').trim();
        const reel = (row.Episode || 'R01').trim();
        if (!shotCode || !project || !reel) {
            throw new Error(`Row ${row.RowNumber} is missing required hierarchy fields (Project, Reel/Episode, or ShotName).`);
        }
    }

    // 3. Transactional Execution
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const projectCodeName = (allRows[0].Project || 'NIKAM').trim();
        const reelName = (allRows[0].Episode || allRows[0].Reel || 'R01').trim();
        const seqCodeName = reelName; // For NIKAM client Excel, Reel = Sequence = R01

        // 3.1 Resolve/Create ProjectMaster with UPDLOCK
        let projectId;
        const projReq = new sql.Request(transaction);
        projReq.input('ProjectCode', sql.NVarChar, projectCodeName);
        const projRes = await projReq.query(`
            SELECT ProjectId FROM ProjectMaster WITH (UPDLOCK, HOLDLOCK)
            WHERE ProjectCode = @ProjectCode OR ProjectName = @ProjectCode
        `);

        if (projRes.recordset && projRes.recordset.length > 0) {
            projectId = projRes.recordset[0].ProjectId;
        } else {
            projectId = await getNextIdWithLock(transaction, 'ProjectMaster', 'ProjectId');
            const insertProjReq = new sql.Request(transaction);
            insertProjReq.input('ProjectId', sql.BigInt, projectId);
            insertProjReq.input('ProjectCode', sql.NVarChar, projectCodeName);
            insertProjReq.input('ProjectName', sql.NVarChar, projectCodeName);
            await insertProjReq.query(`
                INSERT INTO ProjectMaster (ProjectId, ProjectCode, ProjectName)
                VALUES (@ProjectId, @ProjectCode, @ProjectName)
            `);
        }

        // 3.2 Resolve/Create ReelMaster with UPDLOCK
        let reelId;
        const reelReq = new sql.Request(transaction);
        reelReq.input('ProjectId', sql.BigInt, projectId);
        reelReq.input('ReelName', sql.NVarChar, reelName);
        const reelRes = await reelReq.query(`
            SELECT ReelId FROM ReelMaster WITH (UPDLOCK, HOLDLOCK)
            WHERE ProjectId = @ProjectId AND ReelName = @ReelName
        `);

        if (reelRes.recordset && reelRes.recordset.length > 0) {
            reelId = reelRes.recordset[0].ReelId;
        } else {
            reelId = await getNextIdWithLock(transaction, 'ReelMaster', 'ReelId');
            const insertReelReq = new sql.Request(transaction);
            insertReelReq.input('ReelId', sql.BigInt, reelId);
            insertReelReq.input('ProjectId', sql.BigInt, projectId);
            insertReelReq.input('ReelName', sql.NVarChar, reelName);
            await insertReelReq.query(`
                INSERT INTO ReelMaster (ReelId, ProjectId, ReelName)
                VALUES (@ReelId, @ProjectId, @ReelName)
            `);
        }

        // 3.3 Resolve/Create SequenceMaster with UPDLOCK
        let sequenceId;
        const seqReq = new sql.Request(transaction);
        seqReq.input('ReelId', sql.BigInt, reelId);
        seqReq.input('SeqCode', sql.NVarChar, seqCodeName);
        const seqRes = await seqReq.query(`
            SELECT SequenceId FROM SequenceMaster WITH (UPDLOCK, HOLDLOCK)
            WHERE ReelId = @ReelId AND (SequenceCode = @SeqCode OR SequenceName = @SeqCode)
        `);

        if (seqRes.recordset && seqRes.recordset.length > 0) {
            sequenceId = seqRes.recordset[0].SequenceId;
        } else {
            sequenceId = await getNextIdWithLock(transaction, 'SequenceMaster', 'SequenceId');
            const insertSeqReq = new sql.Request(transaction);
            insertSeqReq.input('SequenceId', sql.BigInt, sequenceId);
            insertSeqReq.input('ReelId', sql.BigInt, reelId);
            insertSeqReq.input('SeqCode', sql.NVarChar, seqCodeName);
            await insertSeqReq.query(`
                INSERT INTO SequenceMaster (SequenceId, ReelId, SequenceCode, SequenceName)
                VALUES (@SequenceId, @ReelId, @SeqCode, @SeqCode)
            `);
        }

        // 3.4 Resolve/Create/Update ShotMaster records
        let shotsCreated = 0;
        let shotsUpdated = 0;

        for (const row of allRows) {
            const shotCode = (row.ShotName || row.ClientShotName).trim();
            const frameStart = (row.HeadIn !== null && row.HeadIn !== undefined && row.HeadIn !== '') ? parseInt(row.HeadIn, 10) : null;
            const frameEnd = (row.TailOut !== null && row.TailOut !== undefined && row.TailOut !== '') ? parseInt(row.TailOut, 10) : null;
            const duration = (frameStart !== null && frameEnd !== null && !isNaN(frameStart) && !isNaN(frameEnd)) ? (frameEnd - frameStart + 1) : null;
            const thumbnailPath = row.ThumbnailPath || null;

            const shotCheckReq = new sql.Request(transaction);
            shotCheckReq.input('SequenceId', sql.BigInt, sequenceId);
            shotCheckReq.input('ShotCode', sql.NVarChar, shotCode);
            const shotCheckRes = await shotCheckReq.query(`
                SELECT ShotId FROM ShotMaster WITH (UPDLOCK, HOLDLOCK)
                WHERE SequenceId = @SequenceId AND ShotCode = @ShotCode
            `);

            if (shotCheckRes.recordset && shotCheckRes.recordset.length > 0) {
                const existingShotId = shotCheckRes.recordset[0].ShotId;
                const updateShotReq = new sql.Request(transaction);
                updateShotReq.input('ShotId', sql.BigInt, existingShotId);
                updateShotReq.input('FrameStart', sql.Int, frameStart);
                updateShotReq.input('FrameEnd', sql.Int, frameEnd);
                updateShotReq.input('Duration', sql.Int, duration);
                updateShotReq.input('ThumbnailPath', sql.NVarChar, thumbnailPath);
                await updateShotReq.query(`
                    UPDATE ShotMaster
                    SET FrameStart = COALESCE(@FrameStart, FrameStart),
                        FrameEnd = COALESCE(@FrameEnd, FrameEnd),
                        Duration = COALESCE(@Duration, Duration),
                        ThumbnailPath = COALESCE(@ThumbnailPath, ThumbnailPath)
                    WHERE ShotId = @ShotId
                `);
                shotsUpdated++;
            } else {
                const shotId = await getNextIdWithLock(transaction, 'ShotMaster', 'ShotId');
                const insertShotReq = new sql.Request(transaction);
                insertShotReq.input('ShotId', sql.BigInt, shotId);
                insertShotReq.input('SequenceId', sql.BigInt, sequenceId);
                insertShotReq.input('ShotCode', sql.NVarChar, shotCode);
                insertShotReq.input('FrameStart', sql.Int, frameStart);
                insertShotReq.input('FrameEnd', sql.Int, frameEnd);
                insertShotReq.input('Duration', sql.Int, duration);
                insertShotReq.input('ThumbnailPath', sql.NVarChar, thumbnailPath);
                await insertShotReq.query(`
                    INSERT INTO ShotMaster (ShotId, SequenceId, ShotCode, FrameStart, FrameEnd, Duration, ThumbnailPath)
                    VALUES (@ShotId, @SequenceId, @ShotCode, @FrameStart, @FrameEnd, @Duration, @ThumbnailPath)
                `);
                shotsCreated++;
            }
        }

        // 3.5 Update ImportBatch status to APPROVED
        const updateBatchReq = new sql.Request(transaction);
        updateBatchReq.input('BatchID', sql.BigInt, batchId);
        updateBatchReq.input('ProjectID', sql.BigInt, projectId);
        await updateBatchReq.query(`
            UPDATE ImportBatch
            SET ImportStatus = 'APPROVED',
                ProjectID = @ProjectID,
                ModifiedDate = GETDATE()
            WHERE ImportBatchID = @BatchID
        `);

        await transaction.commit();

        return {
            success: true,
            message: 'Batch approved successfully',
            importBatchId: batchId,
            projectId: projectId,
            reelId: reelId,
            sequenceId: sequenceId,
            totalApprovedRows: allRows.length,
            shotsCreated: shotsCreated,
            shotsUpdated: shotsUpdated
        };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

exports.createBatchTasks = async (batchId, userId) => {
    const pool = await sql.connect(config);

    // 1. Fetch Batch
    const batchReq = pool.request();
    batchReq.input('BatchID', sql.BigInt, batchId);
    const batchRes = await batchReq.query(`
        SELECT ImportBatchID, BatchNo, BatchName, ImportStatus, TotalRecords
        FROM ImportBatch
        WHERE ImportBatchID = @BatchID
    `);

    if (!batchRes.recordset || batchRes.recordset.length === 0) {
        throw new Error(`ImportBatch with ID ${batchId} not found.`);
    }

    const batch = batchRes.recordset[0];
    if (batch.ImportStatus !== 'APPROVED') {
        throw new Error(`ImportBatch ${batch.BatchNo} must be APPROVED before generating tasks. Current status: '${batch.ImportStatus}'.`);
    }

    // 2. Fetch rows
    const rowsReq = pool.request();
    rowsReq.input('BatchID', sql.BigInt, batchId);
    const rowsRes = await rowsReq.query(`
        SELECT *
        FROM ImportBatchRow
        WHERE ImportBatchID = @BatchID
        ORDER BY RowNumber ASC
    `);

    const rows = rowsRes.recordset || [];
    if (rows.length === 0) {
        throw new Error(`ImportBatch ${batch.BatchNo} contains no rows.`);
    }

    // 3. Resolve Workflow Stages dynamically from WorkflowStageMaster
    const stageNames = ['Roto', 'Paint', 'Comp', 'CG'];
    const stageMap = {};

    const existingStagesRes = await pool.request().query(`SELECT StageId, StageName FROM WorkflowStageMaster`);
    for (const r of existingStagesRes.recordset) {
        stageMap[r.StageName.trim().toUpperCase()] = Number(r.StageId);
    }

    for (const name of stageNames) {
        if (!stageMap[name.toUpperCase()]) {
            const insRes = await pool.request()
                .input('Name', sql.NVarChar, name)
                .query(`
                    INSERT INTO WorkflowStageMaster (StageName)
                    OUTPUT INSERTED.StageId
                    VALUES (@Name)
                `);
            stageMap[name.toUpperCase()] = Number(insRes.recordset[0].StageId);
        }
    }

    // 4. Transactional Task Creation
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let tasksCreated = 0;
        let tasksUpdated = 0;
        let skippedDepartments = 0;

        const deptCounts = {
            Roto: 0,
            Paint: 0,
            Comp: 0,
            CG: 0
        };

        for (const row of rows) {
            const shotCode = (row.ShotName || row.ClientShotName || '').trim();
            if (!shotCode) continue;

            // Resolve ShotID from ShotMaster
            const shotReq = new sql.Request(transaction);
            shotReq.input('ShotCode', sql.NVarChar, shotCode);
            const shotRes = await shotReq.query(`
                SELECT TOP 1 ShotId FROM ShotMaster WITH (UPDLOCK, HOLDLOCK)
                WHERE ShotCode = @ShotCode
            `);

            if (!shotRes.recordset || shotRes.recordset.length === 0) {
                console.warn(`[createBatchTasks] ShotCode '${shotCode}' not found in ShotMaster. Skipping.`);
                continue;
            }

            const shotId = shotRes.recordset[0].ShotId;
            const description = (row.SOW || row.VFXWorkDescription || row.Notes || '').trim();
            const dueDate = row.ETA ? new Date(row.ETA) : null;

            // Department bids array mapped dynamically to WorkflowStageIDs
            const deptBids = [
                { stageId: stageMap['ROTO'], name: 'Roto', bid: Number(row.RotoBid) || 0 },
                { stageId: stageMap['PAINT'], name: 'Paint', bid: Number(row.PaintBid) || 0 },
                { stageId: stageMap['COMP'], name: 'Comp', bid: Number(row.CompBid) || 0 },
                { stageId: stageMap['CG'], name: 'CG', bid: Number(row.CGBid) || 0 },
            ];


            for (const item of deptBids) {
                if (item.bid <= 0) {
                    skippedDepartments++;
                    continue;
                }

                deptCounts[item.name]++;
                let taskCode = `${shotCode}_${item.name}`;
                if (taskCode.length > 30) {
                    const suffix = `_${item.name}`;
                    taskCode = `${shotCode.substring(0, 30 - suffix.length)}${suffix}`;
                }
                const taskName = `${shotCode} - ${item.name}`;

                // Check if task exists for (ShotID, WorkflowStageID)
                const taskCheckReq = new sql.Request(transaction);
                taskCheckReq.input('ShotID', sql.BigInt, shotId);
                taskCheckReq.input('StageID', sql.BigInt, item.stageId);
                const taskCheckRes = await taskCheckReq.query(`
                    SELECT TaskID FROM TaskMaster WITH (UPDLOCK, HOLDLOCK)
                    WHERE ShotID = @ShotID AND WorkflowStageID = @StageID
                `);

                const estimatedHours = item.bid * 8;

                if (taskCheckRes.recordset && taskCheckRes.recordset.length > 0) {
                    // Idempotent Update
                    const existingTaskId = taskCheckRes.recordset[0].TaskID;
                    const updateTaskReq = new sql.Request(transaction);
                    updateTaskReq.input('TaskID', sql.BigInt, existingTaskId);
                    updateTaskReq.input('EstimatedHours', sql.Decimal(10, 2), estimatedHours);
                    updateTaskReq.input('Description', sql.NVarChar, description || null);
                    updateTaskReq.input('DueDate', sql.Date, dueDate);
                    updateTaskReq.input('ModifiedBy', sql.BigInt, userId || null);

                    await updateTaskReq.query(`
                        UPDATE TaskMaster
                        SET EstimatedHours = @EstimatedHours,
                            Description = COALESCE(@Description, Description),
                            DueDate = COALESCE(@DueDate, DueDate),
                            ModifiedBy = @ModifiedBy,
                            ModifiedDate = GETDATE()
                        WHERE TaskID = @TaskID
                    `);
                    tasksUpdated++;
                } else {
                    // Insert New Task (TaskID is IDENTITY column)
                    const insertTaskReq = new sql.Request(transaction);
                    insertTaskReq.input('ShotID', sql.BigInt, shotId);
                    insertTaskReq.input('TaskCode', sql.VarChar(100), taskCode);
                    insertTaskReq.input('TaskName', sql.VarChar(200), taskName);
                    insertTaskReq.input('WorkflowStageID', sql.BigInt, item.stageId);
                    insertTaskReq.input('EstimatedHours', sql.Decimal(10, 2), estimatedHours);
                    insertTaskReq.input('DueDate', sql.Date, dueDate);
                    insertTaskReq.input('Description', sql.VarChar(1000), description || null);
                    insertTaskReq.input('CreatedBy', sql.BigInt, userId || null);

                    await insertTaskReq.query(`
                        INSERT INTO TaskMaster (
                            ShotID, TaskCode, TaskName, WorkflowStageID,
                            EstimatedHours, DueDate, Description, IsActive, IsDeleted, CreatedBy, CreatedDate
                        ) VALUES (
                            @ShotID, @TaskCode, @TaskName, @WorkflowStageID,
                            @EstimatedHours, @DueDate, @Description, 1, 0, @CreatedBy, GETDATE()
                        )
                    `);
                    tasksCreated++;
                }

            }
        }

        await transaction.commit();

        return {
            success: true,
            message: 'Production tasks generated successfully',
            importBatchId: batchId,
            totalShots: rows.length,
            tasksToCreate: tasksCreated + tasksUpdated,
            tasksCreated: tasksCreated,
            tasksUpdated: tasksUpdated,
            skippedDepartments: skippedDepartments,
            departmentBreakdown: deptCounts
        };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

exports.getBatchSummary = async (batchId) => {
    const pool = await sql.connect(config);

    const batchRes = await pool.request()
        .input('BatchID', sql.BigInt, batchId)
        .query(`SELECT * FROM ImportBatch WHERE ImportBatchID = @BatchID`);
    if (!batchRes.recordset || batchRes.recordset.length === 0) {
        throw new Error(`ImportBatch ${batchId} not found.`);
    }
    const batch = batchRes.recordset[0];

    const rowsRes = await pool.request()
        .input('BatchID', sql.BigInt, batchId)
        .query(`SELECT * FROM ImportBatchRow WHERE ImportBatchID = @BatchID`);
    const rows = rowsRes.recordset || [];

    const projectName = (rows[0]?.Project || batch.BatchName || '').trim();
    const reelsSet = new Set();
    const shotsSet = new Set();

    let rotoHours = 0;
    let paintHours = 0;
    let compHours = 0;
    let cgHours = 0;
    let totalHours = 0;

    let minEta = null;
    let maxEta = null;

    rows.forEach(r => {
        const reel = (r.Episode || r.Batch || '').trim();
        if (reel) reelsSet.add(reel);

        const shot = (r.ShotName || r.ClientShotName || '').trim();
        if (shot) shotsSet.add(shot);

        const roto = Number(r.RotoBid) || 0;
        const paint = Number(r.PaintBid) || 0;
        const comp = Number(r.CompBid) || 0;
        const cg = Number(r.CGBid) || 0;
        const total = Number(r.TotalBid) || (roto + paint + comp + cg);

        rotoHours += roto;
        paintHours += paint;
        compHours += comp;
        cgHours += cg;
        totalHours += total;

        if (r.ETA) {
            const d = new Date(r.ETA);
            if (!isNaN(d.getTime())) {
                const dateStr = d.toISOString().slice(0, 10);
                if (!minEta || dateStr < minEta) minEta = dateStr;
                if (!maxEta || dateStr > maxEta) maxEta = dateStr;
            }
        }
    });


    return {
        importBatchId: Number(batchId),
        batchNo: batch.BatchNo,
        batchName: batch.BatchName,
        importStatus: batch.ImportStatus,
        projectId: batch.ProjectID ? Number(batch.ProjectID) : null,
        projectName: projectName,
        reels: Array.from(reelsSet),
        totalShots: shotsSet.size || rows.length,
        rotoHours: Math.round(rotoHours * 100) / 100,
        paintHours: Math.round(paintHours * 100) / 100,
        compHours: Math.round(compHours * 100) / 100,
        cgHours: Math.round(cgHours * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        earliestETA: minEta,
        latestETA: maxEta
    };
};




