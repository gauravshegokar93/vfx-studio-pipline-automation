const authMiddleware = require('./authMiddleware');

// Wrap existing authMiddleware signature
module.exports = authMiddleware(['Production Head'], (req, res, next) => next());

