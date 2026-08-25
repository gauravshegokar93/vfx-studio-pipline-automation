const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Reports module not implemented yet' });
});

module.exports = router;

