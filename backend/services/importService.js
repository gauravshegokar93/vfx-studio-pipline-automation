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
    if (!row.Episode) {
        isValid = false;
        messages.push('Missing Reel/Episode.');
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

exports.processUpload = async (file, userId) => {
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
            .input('ImportType', sql.VarChar, 'BidSheet')
            .input('SourceFileName', sql.VarChar, file.originalname)
            .input('TotalRecords', sql.Int, totalRecords)
            .input('SuccessRecords', sql.Int, validCount)
            .input('FailedRecords', sql.Int, invalidCount)
            .input('ImportStatus', sql.VarChar, 'STAGED')
            .input('StartedBy', sql.BigInt, userId)
            .input('StartedOn', sql.DateTime2, new Date())
            .query(`
                INSERT INTO ImportBatch (BatchNo, BatchName, ImportType, SourceFileName, TotalRecords, SuccessRecords, FailedRecords, ImportStatus, StartedBy, StartedOn)
                OUTPUT INSERTED.ImportBatchID
                VALUES (@BatchNo, @BatchName, @ImportType, @SourceFileName, @TotalRecords, @SuccessRecords, @FailedRecords, @ImportStatus, @StartedBy, @StartedOn)
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
                .input('Batch', sql.NVarChar, row.Batch || null)
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
    
    const safeUpdate = (val) => val === undefined ? null : val;
    
    await pool.request()
        .input('RowID', sql.BigInt, rowId)
        .input('ShotName', sql.NVarChar, safeUpdate(updates.ShotName))
        .input('Project', sql.NVarChar, safeUpdate(updates.Project))
        .input('Episode', sql.NVarChar, safeUpdate(updates.Episode))
        .input('Batch', sql.NVarChar, safeUpdate(updates.Batch))
        .input('Department', sql.NVarChar, safeUpdate(updates.Department))
        .input('SOW', sql.NVarChar, safeUpdate(updates.SOW))
        .input('Notes', sql.NVarChar, safeUpdate(updates.Notes))
        .input('Vendor', sql.NVarChar, safeUpdate(updates.Vendor))
        .input('Complexity', sql.NVarChar, safeUpdate(updates.Complexity))
        .input('RotoBid', sql.Decimal, safeUpdate(updates.RotoBid))
        .input('PaintBid', sql.Decimal, safeUpdate(updates.PaintBid))
        .input('CompBid', sql.Decimal, safeUpdate(updates.CompBid))
        .input('CGBid', sql.Decimal, safeUpdate(updates.CGBid))
        .input('TotalBid', sql.Decimal, safeUpdate(updates.TotalBid))
        .input('HeadIn', sql.Int, safeUpdate(updates.HeadIn))
        .input('TailOut', sql.Int, safeUpdate(updates.TailOut))
        .input('FrameRange', sql.NVarChar, safeUpdate(updates.FrameRange))
        .input('ETA', sql.NVarChar, safeUpdate(updates.ETA ? String(updates.ETA) : null))
        .input('Status', sql.NVarChar, safeUpdate(updates.Status))
        .query(`
            UPDATE ImportBatchRow SET 
                ShotName = ISNULL(@ShotName, ShotName),
                Project = ISNULL(@Project, Project),
                Episode = ISNULL(@Episode, Episode),
                Batch = ISNULL(@Batch, Batch),
                Department = ISNULL(@Department, Department),
                SOW = ISNULL(@SOW, SOW),
                Notes = ISNULL(@Notes, Notes),
                Vendor = ISNULL(@Vendor, Vendor),
                Complexity = ISNULL(@Complexity, Complexity),
                RotoBid = ISNULL(@RotoBid, RotoBid),
                PaintBid = ISNULL(@PaintBid, PaintBid),
                CompBid = ISNULL(@CompBid, CompBid),
                CGBid = ISNULL(@CGBid, CGBid),
                TotalBid = ISNULL(@TotalBid, TotalBid),
                HeadIn = ISNULL(@HeadIn, HeadIn),
                TailOut = ISNULL(@TailOut, TailOut),
                FrameRange = ISNULL(@FrameRange, FrameRange),
                ETA = ISNULL(@ETA, ETA),
                Status = ISNULL(@Status, Status)
            WHERE BatchRowID = @RowID
        `);
    return { success: true };
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

