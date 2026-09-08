const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const importController = require('../controllers/importController');

// Configure multer for Excel uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel files are allowed.'));
        }
    }
});

// Import endpoints
router.post('/upload', authMiddleware(), upload.single('file'), importController.uploadExcel);
router.get('/batches', authMiddleware(), importController.getBatches);
router.get('/batches/:batchId', authMiddleware(), importController.getBatchDetails);
router.get('/batches/:batchId/rows', authMiddleware(), importController.getBatchRows);
router.put('/rows/:rowId', authMiddleware(), importController.updateRow);
router.post('/batches/:batchId/revalidate', authMiddleware(), importController.revalidateBatch);

console.log("Registering Import Routes...");
module.exports = router;
