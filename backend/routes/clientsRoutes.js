const express = require('express');

const router = express.Router();

// Placeholder until clients module is implemented in Phase 2.
// Keeping route file prevents 404s for frontend integration wiring.
router.get('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Clients module not implemented yet' });
});

module.exports = router;

