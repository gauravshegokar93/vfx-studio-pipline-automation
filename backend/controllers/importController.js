const importService = require('../services/importService');

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const userId = req.user.userId;
        const result = await importService.processUpload(req.file, userId);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] uploadExcel Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};

exports.getBatches = async (req, res) => {
    try {
        const result = await importService.getBatches();
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] getBatches Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};

exports.getBatchDetails = async (req, res) => {
    try {
        const { batchId } = req.params;
        const result = await importService.getBatchDetails(batchId);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] getBatchDetails Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};

exports.getBatchRows = async (req, res) => {
    try {
        const { batchId } = req.params;
        const result = await importService.getBatchRows(batchId);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] getBatchRows Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};

exports.updateRow = async (req, res) => {
    try {
        const { rowId } = req.params;
        const updates = req.body;
        const result = await importService.updateRow(rowId, updates);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] updateRow Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};

exports.revalidateBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const result = await importService.revalidateBatch(batchId);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[ImportController] revalidateBatch Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};
