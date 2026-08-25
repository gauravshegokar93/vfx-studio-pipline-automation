const express = require('express');
const router = express.Router();
const { upload } = require('../utils/upload');
const { simpleImport, getImportedRows } = require('../controllers/simpleImportController');

// Upload Excel -> Save to BidSheetImport table
router.post('/', upload.single('file'), simpleImport);

// Fetch all rows from BidSheetImport ordered by ImportedAt DESC, RowNumber ASC
router.get('/', getImportedRows);

module.exports = router;
