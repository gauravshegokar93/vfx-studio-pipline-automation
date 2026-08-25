const { sql, config } = require('../config/db');
const xlsx = require('xlsx');

const MAPPINGS = {
    // ClientShotName
    'client shot name': 'ClientShotName',
    'client shotname': 'ClientShotName',
    'client_shot_name': 'ClientShotName',
    
    // ShotName
    'shot name*': 'ShotName',
    'shot name': 'ShotName',
    'shot no.': 'ShotName',
    'shot no': 'ShotName',
    'shot_name': 'ShotName',
    'shotno': 'ShotName',
    
    // ShotType
    'type*': 'ShotType',
    'tpye*': 'ShotType',
    'type': 'ShotType',
    'tpye': 'ShotType',
    'shot type': 'ShotType',
    'shottype': 'ShotType',
    
    // Episode
    'ep/reel*': 'Episode',
    'ep/reel': 'Episode',
    'ep_reel': 'Episode',
    'reel no': 'Episode',
    'reel_no': 'Episode',
    'reelno': 'Episode',
    'episode': 'Episode',
    
    // FrameRange
    'frame range': 'FrameRange',
    'framecount': 'FrameRange',
    'frame count': 'FrameRange',
    'frame_range': 'FrameRange',
    'framerange': 'FrameRange',
    
    // CutSummary
    'cut summary': 'CutSummary',
    'cut_summary': 'CutSummary',
    'cutsummary': 'CutSummary',
    'production note': 'CutSummary',
    'production_note': 'CutSummary',
    'productionnote': 'CutSummary',
    
    // VFXWorkDescription
    'vfx work description': 'VFXWorkDescription',
    'vfx_work_description': 'VFXWorkDescription',
    'vfxworkdescription': 'VFXWorkDescription',
    'scope of work': 'VFXWorkDescription',
    'scope_of_work': 'VFXWorkDescription',
    'scopeofwork': 'VFXWorkDescription',
    
    // Complexity
    'complexity*': 'Complexity',
    'complexity': 'Complexity',
    
    // RotoBid
    'roto bid*': 'RotoBid',
    'roto bid': 'RotoBid',
    'roto_bid': 'RotoBid',
    'rotobid': 'RotoBid',
    'roto': 'RotoBid',
    
    // PaintBid
    'paint bid*': 'PaintBid',
    'paint bid': 'PaintBid',
    'paint_bid': 'PaintBid',
    'paintbid': 'PaintBid',
    'paint': 'PaintBid',
    
    // CompBid
    'comp*': 'CompBid',
    'comp bid*': 'CompBid',
    'comp bid': 'CompBid',
    'comp_bid': 'CompBid',
    'comp': 'CompBid',
    
    // CGBid
    'cg*': 'CGBid',
    'cg bid*': 'CGBid',
    'cg bid': 'CGBid',
    'cg_bid': 'CGBid',
    'cg': 'CGBid',
    
    // RetimeRepo
    'retime repo': 'RetimeRepo',
    'retime_repo': 'RetimeRepo',
    'retimerepo': 'RetimeRepo',
    
    // TotalBid
    'total bid': 'TotalBid',
    'total_bid': 'TotalBid',
    'totalbid': 'TotalBid',
    'total': 'TotalBid',
    
    // Artist
    'artist': 'Artist',
    
    // Lead
    'lead': 'Lead',
    
    // StartDate
    'start date': 'StartDate',
    'start_date': 'StartDate',
    'startdate': 'StartDate',
    
    // ETA
    'eta': 'ETA',
    
    // Status
    'status': 'Status',
    'shot status': 'Status',
    'shot_status': 'Status',
    'shotstatus': 'Status',
    
    // ClientETA
    'client eta': 'ClientETA',
    'client_eta': 'ClientETA',
    'clienteta': 'ClientETA',
    
    // DeliveryDate
    'delivery date': 'DeliveryDate',
    'delivery_date': 'DeliveryDate',
    'deliverydate': 'DeliveryDate'
};

const SQL_COLUMNS = {
    'ClientShotName': { sqlType: sql.NVarChar(255), dataType: 'string' },
    'ShotName': { sqlType: sql.NVarChar(255), dataType: 'string' },
    'ShotType': { sqlType: sql.NVarChar(100), dataType: 'string' },
    'Episode': { sqlType: sql.NVarChar(100), dataType: 'string' },
    'FrameRange': { sqlType: sql.NVarChar(100), dataType: 'string' },
    'CutSummary': { sqlType: sql.NVarChar(sql.MAX), dataType: 'string' },
    'VFXWorkDescription': { sqlType: sql.NVarChar(sql.MAX), dataType: 'string' },
    'Complexity': { sqlType: sql.NVarChar(50), dataType: 'string' },
    'RotoBid': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'PaintBid': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'CompBid': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'CGBid': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'RetimeRepo': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'TotalBid': { sqlType: sql.Decimal(10, 2), dataType: 'number' },
    'Artist': { sqlType: sql.NVarChar(255), dataType: 'string' },
    'Lead': { sqlType: sql.NVarChar(255), dataType: 'string' },
    'StartDate': { sqlType: sql.Date, dataType: 'date' },
    'ETA': { sqlType: sql.Date, dataType: 'date' },
    'Status': { sqlType: sql.NVarChar(100), dataType: 'string' },
    'ClientETA': { sqlType: sql.Date, dataType: 'date' },
    'DeliveryDate': { sqlType: sql.Date, dataType: 'date' }
};

const IGNORE_COLUMNS = ['sr no', 'sr. no.', 'sr. no', 'srno', 'sr_no'];

function excelDateToJS(excelDate) {
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    return null;
}

function normalize(value, dataType) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (str === '') return null;
    if (dataType === 'number') {
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : null;
    }
    if (dataType === 'date') {
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'number') return excelDateToJS(value);
        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    }
    return str;
}

async function simpleImport(req, res) {
    let transaction;
    try {
        console.log('[SimpleImport] File received:', req.file?.originalname);
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Excel file required' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        console.log('[SimpleImport] Total Excel rows:', data.length);
        
        if (data.length < 2) {
            return res.status(400).json({ success: false, message: 'Excel file is empty or has no data rows' });
        }
        
        const headers = data[0].map((h) => String(h).trim());
        
        console.log('\n=== Detected Excel Headers ===');
        for (let i = 0; i < headers.length; i++) {
            console.log(`${i} -> ${headers[i]}`);
        }
        console.log('==============================\n');
        
        const colMapping = {};
        for (let i = 0; i < headers.length; i++) {
            const rawHeader = headers[i];
            const normalizedHeader = String(rawHeader).trim().toLowerCase();
            
            if (IGNORE_COLUMNS.includes(normalizedHeader)) {
                continue;
            }
            
            const sqlColumn = MAPPINGS[normalizedHeader];
            if (sqlColumn) {
                const spec = SQL_COLUMNS[sqlColumn];
                colMapping[i] = {
                    sqlColumn,
                    sqlType: spec.sqlType,
                    dataType: spec.dataType,
                    excelHeader: rawHeader
                };
                console.log(`Header "${rawHeader}" mapped to ${sqlColumn}`);
            } else {
                console.warn(`WARNING: Header "${rawHeader}" could not be matched to any database column`);
            }
        }
        
        console.log('[SimpleImport] Final COLUMN_MAP generated by the parser:', JSON.stringify(colMapping, null, 2));
        
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        let rowsInserted = 0;
        
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            const row = data[rowIdx];
            
            // Skip empty rows
            if (!row || row.length === 0 || row.every(cell => String(cell).trim() === '')) continue;
            
            const request = new sql.Request(transaction);
            
            // Explicitly bind the RowNumber Excel index
            const sqlCols = ['RowNumber'];
            const paramNames = ['@RowNumber'];
            request.input('RowNumber', sql.Int, rowIdx);
            
            const mappedObj = {};
            const sqlParams = {};
            const paramLog = [];
            
            for (const [excelIdx, mapped] of Object.entries(colMapping)) {
                const { sqlColumn, sqlType, dataType } = mapped;
                let rawValue = row[parseInt(excelIdx)];
                
                const value = normalize(rawValue, dataType);
                
                const paramName = sqlColumn;
                request.input(paramName, sqlType, value);
                
                sqlCols.push(sqlColumn);
                paramNames.push('@' + paramName);
                
                const sqlTypeName = typeof sqlType === 'function' ? sqlType.name : (sqlType.type ? sqlType.type.name : 'Unknown');
                const jsType = value === null ? 'null' : typeof value;

                mappedObj[sqlColumn] = value;
                sqlParams[sqlColumn] = {
                    type: sqlTypeName,
                    value: value
                };

                paramLog.push({
                    column: sqlColumn,
                    sqlType: sqlTypeName,
                    value: value,
                    jsType: jsType
                });
            }
            
            if (rowIdx <= 5) {
                console.log(`Excel Row\n↓\n${JSON.stringify(row, null, 2)}`);
                console.log(`Mapped Object\n↓\n${JSON.stringify(mappedObj, null, 2)}`);
                console.log(`SQL Parameters\n↓\n${JSON.stringify(sqlParams, null, 2)}`);
            }
            
            if (sqlCols.length <= 1) continue; // Only RowNumber was bound
            
            const insertSQL = 'INSERT INTO BidSheetImport (' + sqlCols.join(', ') + ') VALUES (' + paramNames.join(', ') + ')';
            
            try {
                await request.query(insertSQL);
                rowsInserted++;
            } catch (rowErr) {
                console.error('========== SIMPLE IMPORT ERROR ==========');
                console.error(rowErr);
                console.error(rowErr.stack);
                console.error('[SimpleImport] Row number:', rowIdx);
                console.error('[SimpleImport] SQL query:', insertSQL);
                console.error('[SimpleImport] Parameter list:', JSON.stringify(paramLog, null, 2));
                throw rowErr;
            }
        }
        
        await transaction.commit();
        console.log('[SimpleImport] Rows inserted:', rowsInserted);
        console.log('[SimpleImport] Transaction status: Committed successfully');
        
        const countReq = new sql.Request(pool);
        const countResult = await countReq.query('SELECT COUNT(*) AS ImportedRows FROM dbo.BidSheetImport');
        console.log('[SimpleImport] BidSheetImport total row count:', countResult.recordset[0].ImportedRows);
        
        return res.json({
            success: true,
            importedRows: rowsInserted
        });

    } catch (e) {
        console.error('========== SIMPLE IMPORT ERROR ==========');
        console.error(e);
        console.error(e.stack);

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error('Rollback Error:', rollbackErr);
            }
        }

        return res.status(500).json({ 
            success: false, 
            message: e.message,
            stack: process.env.NODE_ENV !== 'production' ? e.stack : undefined
        });
    }
}

async function getImportedRows(req, res) {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                Id,
                RowNumber,
                ClientShotName,
                ShotName,
                ShotType,
                Episode,
                FrameRange,
                CutSummary,
                VFXWorkDescription,
                Complexity,
                RotoBid,
                PaintBid,
                CompBid,
                CGBid,
                RetimeRepo,
                TotalBid,
                Artist,
                Lead,
                StartDate,
                ETA,
                Status,
                ClientETA,
                DeliveryDate,
                ImportedAt
            FROM BidSheetImport
            ORDER BY ImportedAt DESC, RowNumber ASC
        `);
        return res.json({
            success: true,
            items: result.recordset || []
        });
    } catch (e) {
        console.error('[getImportedRows] Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

module.exports = { 
    simpleImport,
    getImportedRows
};
