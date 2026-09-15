const express = require('express');
const router = express.Router();

const {
  getUsers,
  getMe,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
  resetPassword,
  getReportingLeads,
  getOrgHierarchy
} = require('../controllers/userController');

router.get('/me', getMe);
// Special routes MUST come before /:id to avoid param conflicts
router.get('/reporting-leads', getReportingLeads);
router.get('/hierarchy', getOrgHierarchy);
router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.put('/:id/status', toggleUserStatus);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);
router.get('/:id/permissions', getUserPermissions);
router.put('/:id/permissions', updateUserPermissions);
router.post('/:id/reset-password', resetPassword);

module.exports = router;

