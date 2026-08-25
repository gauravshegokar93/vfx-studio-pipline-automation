const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const importReviewController = require('../controllers/importReviewController');

function secured(handler) {
  return authMiddleware(['Production Head', 'Department Supervisor'], handler);
}

router.get('/', secured(importReviewController.getUnconvertedImports));
router.put('/:id', secured(importReviewController.updateImportRow));
router.delete('/:id', secured(importReviewController.deleteImportRow));
router.post('/approve', secured(importReviewController.approveImport));

module.exports = router;
