const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware([], (req, res, next) => next())); // General auth for all leave routes

router.get('/', leaveController.getLeaves);
router.post('/', leaveController.submitLeave);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
