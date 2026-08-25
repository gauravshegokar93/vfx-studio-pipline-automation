const express = require('express');
const router = express.Router();

const {
  getUsers,
  getMe,
  getUserById,
  createUser,
  toggleUserStatus,
  getUserPermissions,
  updateUserPermissions,
  resetPassword
} = require('../controllers/userController');

router.get('/me', getMe);
router.get('/:id', getUserById);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/status', toggleUserStatus);
router.get('/:id/permissions', getUserPermissions);
router.put('/:id/permissions', updateUserPermissions);
router.post('/:id/reset-password', resetPassword);

module.exports = router;

