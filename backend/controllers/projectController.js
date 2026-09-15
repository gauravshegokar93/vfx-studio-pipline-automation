const { sql } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProjects,
  getProjectById,
  getProjectHierarchy,
  createProject,
  updateProject,
  permanentlyDeleteProject,
} = require('../services/projectsService');

const secured = (handler) => authMiddleware(['Production Head', 'Department Supervisor', 'Lead', 'Artist'], handler);

function requiredString(v, fieldName) {
  if (typeof v !== 'string' || !v.trim()) {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }
}

function parseOptionalDate(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Invalid date format');
    err.status = 400;
    throw err;
  }
  return d;
}

async function listProjects(req, res) {
  const { q, status, page, pageSize } = req.query || {};

  try {
    const data = await getProjects({ q, status, page, pageSize });
    return res.json({ success: true, ...data });
  } catch (e) {
    console.error('[listProjects] Error:', e);
    return res.status(500).json({ success: false, message: 'Failed to list projects', error: e.message });
  }
}

async function getProject(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Project id is required' });

  try {
    const item = await getProjectById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, project: item });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to get project', error: e.message });
  }
}

async function getProjectHierarchyController(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Project id is required' });

  try {
    const data = await getProjectHierarchy(id);
    if (!data) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, ...data });
  } catch (e) {
    console.error('[getProjectHierarchy] Error:', e);
    return res.status(500).json({ success: false, message: 'Failed to get project hierarchy', error: e.message });
  }
}

async function createProjectHandler(req, res) {
  // RBAC: allow Production Head, Department Supervisor, Super Admin, Admin
  const role = req.user?.roleName || req.user?.role;
  if (!['Production Head', 'Department Supervisor', 'Super Admin', 'Admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { projectCode, projectName, clientName, status, startDate, endDate } = req.body || {};

  try {
    requiredString(projectCode, 'projectCode');
    requiredString(projectName, 'projectName');

    const created = await createProject({
      projectCode,
      projectName,
      clientName,
      status,
      startDate: parseOptionalDate(startDate),
      endDate: parseOptionalDate(endDate),
    });

    if (!created) return res.status(500).json({ success: false, message: 'Project not created' });
    return res.status(201).json({ success: true, project: created });
  } catch (e) {
    // Likely unique constraint on ProjectCode
    return res.status(e.status || 400).json({ success: false, message: e.message || 'Failed to create project' });
  }
}

async function updateProjectHandler(req, res) {
  const role = req.user?.roleName || req.user?.role;
  if (!['Production Head', 'Department Supervisor', 'Super Admin', 'Admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Project id is required' });

  const { projectCode, projectName, clientName, status, startDate, endDate } = req.body || {};

  try {
    if (projectCode !== undefined) requiredString(projectCode, 'projectCode');
    if (projectName !== undefined) requiredString(projectName, 'projectName');

    const updated = await updateProject(id, {
      projectCode,
      projectName,
      clientName,
      status,
      startDate: startDate !== undefined ? parseOptionalDate(startDate) : undefined,
      endDate: endDate !== undefined ? parseOptionalDate(endDate) : undefined,
    });

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, project: updated });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message || 'Failed to update project' });
  }
}

async function deleteProjectHandler(req, res) {
  const role = req.user?.roleName || req.user?.role;
  if (!['Super Admin', 'Admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required to permanently delete a project.' });
  }

  const { id } = req.params;
  const pId = parseInt(id, 10);
  if (isNaN(pId) || pId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid project ID. Must be a positive integer.' });
  }

  try {
    const ok = await permanentlyDeleteProject(pId);
    if (!ok) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, message: 'Project and all associated production data permanently deleted.' });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (e.status === 400) {
      return res.status(400).json({ success: false, message: e.message });
    }
    console.error('[deleteProjectHandler] Error:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete project', error: e.message });
  }
}

module.exports = {
  listProjects: secured(listProjects),
  getProject: secured(getProject),
  getProjectHierarchy: secured(getProjectHierarchyController),
  createProject: secured(createProjectHandler),
  updateProject: secured(updateProjectHandler),
  deleteProject: secured(deleteProjectHandler),
};


