const express = require('express');
const router = express.Router();

const { upload } = require('../utils/upload');
const { previewBidSheet, commitBidSheet } = require('../controllers/importBidSheetController');

// TODO: Re-enable JWT and Production Head authorization before production release.
// Current state: Open for development without authentication.
// After auth is implemented later:
//   - POST /api/import/bid-sheet/import should require Production Head role
//   - POST /api/import/bid-sheet/preview may remain public or be protected based on final security requirements

router.post('/bid-sheet/preview', upload.single('file'), previewBidSheet);
router.post('/bid-sheet/import', upload.single('file'), commitBidSheet);

module.exports = router;
