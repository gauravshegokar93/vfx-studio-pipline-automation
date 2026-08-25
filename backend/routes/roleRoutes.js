const express = require('express');
const router = express.Router();
const { getRoles, getRolePermissions, updateRolePermissions } = require('../controllers/roleController');

router.get('/', getRoles);
router.get('/:id/permissions', getRolePermissions);
router.put('/:id/permissions', updateRolePermissions);

module.exports = router;
