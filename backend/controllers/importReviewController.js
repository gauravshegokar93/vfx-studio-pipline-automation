const { sql, config } = require('../config/db');
const conversionService = require('../services/conversionService');

async function getUnconvertedImports(req, res) {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT * FROM BidSheetImport 
            WHERE Converted = 0 OR Converted IS NULL
            ORDER BY ImportedAt DESC, RowNumber ASC
        `);
        return res.json({ success: true, items: result.recordset || [] });
    } catch (e) {
        console.error('[getUnconvertedImports] Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function updateImportRow(req, res) {
    const { id } = req.params;
    const updateData = req.body || {};

    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        
        let setClauses = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'Id' && key !== 'Converted' && key !== 'ImportedAt') {
                setClauses.push(`${key} = @${key}`);
                
                // Infer type based on simple rules or let mssql do it
                if (typeof value === 'number') {
                    request.input(key, sql.Decimal(10, 2), value);
                } else if (value instanceof Date) {
                    request.input(key, sql.Date, value);
                } else {
                    request.input(key, sql.NVarChar(sql.MAX), value === '' ? null : value);
                }
            }
        }

        if (setClauses.length === 0) {
            return res.json({ success: true, message: 'No fields to update' });
        }

        request.input('RowId', sql.Int, id);
        
        const updateQuery = `
            UPDATE BidSheetImport 
            SET ${setClauses.join(', ')} 
            WHERE Id = @RowId
        `;
        
        await request.query(updateQuery);

        return res.json({ success: true, message: 'Row updated successfully' });
    } catch (e) {
        console.error('[updateImportRow] Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deleteImportRow(req, res) {
    const { id } = req.params;

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('RowId', sql.Int, id)
            .query('DELETE FROM BidSheetImport WHERE Id = @RowId');
        
        return res.json({ success: true, message: 'Row deleted successfully' });
    } catch (e) {
        console.error('[deleteImportRow] Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function approveImport(req, res) {
    try {
        const result = await conversionService.convertImports();
        return res.json({ success: true, ...result });
    } catch (e) {
        console.error('[approveImport] Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

module.exports = {
    getUnconvertedImports,
    updateImportRow,
    deleteImportRow,
    approveImport
};
