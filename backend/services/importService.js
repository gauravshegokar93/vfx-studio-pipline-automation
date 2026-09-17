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
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const safeUpdate = (val) => val === undefined ? null : val;
        
        await transaction.request()
            .input('RowID', sql.BigInt, rowId)
            .input('ShotName', sql.NVarChar(255), safeUpdate(updates.ShotName))
            .input('Project', sql.NVarChar(255), safeUpdate(updates.Project))
            .input('Episode', sql.NVarChar(255), safeUpdate(updates.Episode))
            .input('Batch', sql.NVarChar(255), safeUpdate(updates.Batch))
            .input('Department', sql.NVarChar(255), safeUpdate(updates.Department))
            .input('SOW', sql.NVarChar(255), safeUpdate(updates.SOW))
            .input('Notes', sql.NVarChar(255), safeUpdate(updates.Notes))
            .input('Vendor', sql.NVarChar(255), safeUpdate(updates.Vendor))
            .input('Complexity', sql.NVarChar(255), safeUpdate(updates.Complexity))
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

        // 1. Fetch updated row to resolve hierarchy
        const rowRes = await transaction.request()
            .input('RowID', sql.BigInt, rowId)
            .query(`SELECT * FROM ImportBatchRow WHERE BatchRowID = @RowID`);
            
        const row = rowRes.recordset[0];
        const synchronizedTasks = [];
        
        if (row) {
            const projectCodeName = (row.Project || '').trim();
            const reelName = (row.Episode || row.Reel || '').trim();
            const shotCode = (row.ShotName || row.ClientShotName || '').trim();
            
            if (projectCodeName && reelName && shotCode) {
                // 2. Resolve Hierarchy deterministically
                const projRes = await transaction.request()
                    .input('Project', sql.NVarChar(255), projectCodeName)
                    .query(`SELECT ProjectId FROM ProjectMaster WITH (UPDLOCK, HOLDLOCK) WHERE ProjectCode = @Project OR ProjectName = @Project`);
                    
                if (projRes.recordset.length > 0) {
                    const projectId = projRes.recordset[0].ProjectId;
                    
                    const reelRes = await transaction.request()
                        .input('ProjectId', sql.BigInt, projectId)
                        .input('Reel', sql.NVarChar(255), reelName)
                        .query(`SELECT ReelId FROM ReelMaster WITH (UPDLOCK, HOLDLOCK) WHERE ProjectId = @ProjectId AND ReelName = @Reel`);
                        
                    if (reelRes.recordset.length > 0) {
                        const reelId = reelRes.recordset[0].ReelId;
                        
                        const seqRes = await transaction.request()
                            .input('ReelId', sql.BigInt, reelId)
                            .input('Sequence', sql.NVarChar(255), reelName)
                            .query(`SELECT SequenceId FROM SequenceMaster WITH (UPDLOCK, HOLDLOCK) WHERE ReelId = @ReelId AND SequenceCode = @Sequence`);
                            
                        if (seqRes.recordset.length > 0) {
                            const sequenceId = seqRes.recordset[0].SequenceId;
                            
                            const shotRes = await transaction.request()
                                .input('SequenceId', sql.BigInt, sequenceId)
                                .input('ShotCode', sql.NVarChar(255), shotCode)
                                .query(`SELECT ShotId FROM ShotMaster WITH (UPDLOCK, HOLDLOCK) WHERE SequenceId = @SequenceId AND ShotCode = @ShotCode`);
                                
                            if (shotRes.recordset.length > 0) {
                                const shotId = shotRes.recordset[0].ShotId;
                                
                                // 3. Resolve Workflow Stages
                                const stageMap = {};
                                const stagesRes = await transaction.request().query(`SELECT StageId, StageName FROM WorkflowStageMaster`);
                                for (const s of stagesRes.recordset) {
                                    stageMap[s.StageName.trim().toUpperCase()] = Number(s.StageId);
                                }
                                
                                const deptBids = [
                                    { stageId: stageMap['ROTO'], name: 'Roto', bid: row.RotoBid },
                                    { stageId: stageMap['PAINT'], name: 'Paint', bid: row.PaintBid },
                                    { stageId: stageMap['COMP'], name: 'Comp', bid: row.CompBid },
                                    { stageId: stageMap['CG'], name: 'CG', bid: row.CGBid }
                                ];
                                
                                const description = (row.SOW || row.VFXWorkDescription || row.Notes || '').trim();
                                
                                for (const item of deptBids) {
                                    if (!item.stageId) continue;
                                    
                                    const taskRes = await transaction.request()
                                        .input('ShotId', sql.BigInt, shotId)
                                        .input('StageId', sql.BigInt, item.stageId)
                                        .query(`SELECT TaskID FROM TaskMaster WITH (UPDLOCK, HOLDLOCK) WHERE ShotID = @ShotId AND WorkflowStageID = @StageId`);
                                        
                                    if (taskRes.recordset.length > 0) {
                                        const taskId = taskRes.recordset[0].TaskID;
                                        let estimatedHours = 0;
                                        let estimatedBid = 0;
                                        
                                        if (item.bid && Number(item.bid) > 0) {
                                            estimatedBid = Number(item.bid);
                                            estimatedHours = estimatedBid * 8;
                                        }
                                        
                                        await transaction.request()
                                            .input('TaskId', sql.BigInt, taskId)
                                            .input('EstimatedHours', sql.Decimal(10, 2), estimatedHours)
                                            .input('Description', sql.NVarChar, description || null)
                                            .query(`
                                                UPDATE TaskMaster
                                                SET EstimatedHours = @EstimatedHours,
                                                    Description = ISNULL(@Description, Description)
                                                WHERE TaskID = @TaskId
                                            `);
                                            
                                        synchronizedTasks.push({
                                            taskId: taskId,
                                            department: item.name,
                                            estimatedBid: estimatedBid,
                                            estimatedHours: estimatedHours
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();
        return { success: true, updatedRow: true, tasksSynchronized: synchronizedTasks.length > 0, synchronizedTasks };
        
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
                const taskCode = `${shotCode}_${item.name}`;
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




