const express = require('express');

const router = express.Router();

const {
  getDepartments,
} = require('../controllers/departmentsController');

// RBAC handled inside controller
router.get('/', getDepartments);

module.exports = router;

