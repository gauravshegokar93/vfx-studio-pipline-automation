const express = require('express');
const router = express.Router();
const { getPermissions } = require('../controllers/permissionController');

router.get('/', getPermissions);

module.exports = router;
