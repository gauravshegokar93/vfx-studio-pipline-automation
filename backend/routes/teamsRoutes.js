const express = require('express');
const router = express.Router();

const {
  getTeams,
  getTeamMembers,
  createTeam,
  updateTeam,
  setTeamStatus,
} = require('../controllers/teamsController');

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/:id/members', getTeamMembers);
router.patch('/:id', updateTeam);
router.patch('/:id/status', setTeamStatus);

module.exports = router;
