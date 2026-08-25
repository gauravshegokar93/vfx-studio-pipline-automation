const express = require('express');
const router = express.Router();

const {
  getTeams,
} = require('../controllers/teamsController');

// RBAC handled inside controller
router.get('/', getTeams);

module.exports = router;
