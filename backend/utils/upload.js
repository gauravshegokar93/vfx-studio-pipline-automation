const multer = require('multer');

// Use memory storage so we can parse the Excel directly.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const name = file.originalname || '';
    const ext = name.split('.').pop()?.toLowerCase();
    const ok = ['xlsx', 'xls', 'csv'].includes(ext);
    console.log('[Backend][Upload] fileFilter:', { originalname: name, ext, ok });
    if (!ok) return cb(new Error('Invalid file type. Upload .xlsx, .xls, or .csv'));
    cb(null, true);
  },
});

module.exports = { upload };

