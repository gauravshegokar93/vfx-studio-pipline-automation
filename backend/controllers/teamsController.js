const { sql, config } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const userRepository = require('../repositories/userRepository');

// ==========================================
// GET /api/teams  — list teams (with derived lead)
// optional ?departmentId=X to filter
// ==========================================
async function getTeams(req, res) {
  try {
    const { departmentId, includeInactive } = req.query;
    const activeOnly = includeInactive !== 'true';
    const teams = await userRepository.getTeams({ departmentId, activeOnly });
    return res.json({ success: true, items: teams.map(t => ({
      id: t.TeamId,
      teamId: t.TeamId,
      teamCode: t.TeamCode,
      teamName: t.TeamName,
      departmentId: t.DepartmentId,
      departmentName: t.DepartmentName,
      isActive: Boolean(t.IsActive),
      leadId: t.LeadId,
      leadName: t.LeadName,
      memberCount: t.MemberCount
    })) });
  } catch (err) {
    console.error('[getTeams]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// GET /api/teams/:id/members  — team members
// ==========================================
async function getTeamMembers(req, res) {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    const members = await userRepository.getTeamMembers(teamId);
    return res.json({ success: true, items: members.map(u => ({
      id: u.UserId,
      userId: u.UserId,
      employeeCode: u.EmployeeCode,
      fullName: u.FullName,
      email: u.Email,
      roleId: u.RoleId,
      roleName: u.RoleName,
      isActive: Boolean(u.IsActive)
    })) });
  } catch (err) {
    console.error('[getTeamMembers]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// POST /api/teams  — create team
// ==========================================
async function createTeam(req, res) {
  try {
    const { teamName, teamCode, departmentId } = req.body || {};

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'teamName is required' });
    }
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'departmentId is required' });
    }

    // Auto-generate teamCode if not provided
    const code = (teamCode || teamName).trim().toUpperCase().replace(/\s+/g, '-').substring(0, 50);

    const team = await userRepository.createTeam({
      teamCode: code,
      teamName: teamName.trim(),
      departmentId: parseInt(departmentId, 10),
      createdBy: req.user?.userId
    });

    return res.status(201).json({ success: true, team: {
      id: team.TeamId,
      teamId: team.TeamId,
      teamCode: team.TeamCode,
      teamName: team.TeamName,
      departmentId: team.DepartmentId,
      isActive: Boolean(team.IsActive)
    }});
  } catch (err) {
    console.error('[createTeam]', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Team code already exists' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// PATCH /api/teams/:id  — update team
// ==========================================
async function updateTeam(req, res) {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    const { teamName, departmentId, isActive } = req.body || {};
    const updated = await userRepository.updateTeam(teamId, {
      teamName: teamName?.trim(),
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    return res.json({ success: true, team: {
      id: updated.TeamId,
      teamId: updated.TeamId,
      teamCode: updated.TeamCode,
      teamName: updated.TeamName,
      departmentId: updated.DepartmentId,
      isActive: Boolean(updated.IsActive)
    }});
  } catch (err) {
    console.error('[updateTeam]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// PATCH /api/teams/:id/status  — activate/deactivate
// ==========================================
async function setTeamStatus(req, res) {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    const { isActive } = req.body || {};
    const updated = await userRepository.updateTeam(teamId, { isActive: Boolean(isActive) });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    return res.json({ success: true, isActive: Boolean(updated.IsActive) });
  } catch (err) {
    console.error('[setTeamStatus]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// Bind auth — readers include Artist (they need the teams dropdown)
// Writers restricted to Production Head / Project Manager / Super Admin
// ==========================================
const securedRead = (handler) =>
  authMiddleware(['Super Admin', 'Production Head', 'Project Manager', 'Team Lead', 'Artist', 'QC Artist'], handler);

const securedWrite = (handler) =>
  authMiddleware(['Super Admin', 'Production Head', 'Project Manager'], handler);

module.exports = {
  getTeams: securedRead(getTeams),
  getTeamMembers: securedRead(getTeamMembers),
  createTeam: securedWrite(createTeam),
  updateTeam: securedWrite(updateTeam),
  setTeamStatus: securedWrite(setTeamStatus),
};
