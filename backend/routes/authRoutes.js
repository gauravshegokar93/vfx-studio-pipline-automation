const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { login, refreshToken, logout, changePassword, resetPassword } = require('../controllers/authController');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', authMiddleware, logout);
router.post('/change-password', authMiddleware, changePassword);
router.post('/reset-password', authMiddleware, resetPassword);

module.exports = router;

