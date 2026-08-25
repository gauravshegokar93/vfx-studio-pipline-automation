const { sql } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  softOrHardDeleteProject,
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

async function createProjectHandler(req, res) {
  // RBAC: allow Production Head and Department Supervisor
  const { role } = req.user || {};
  if (!['Production Head', 'Department Supervisor'].includes(role)) {
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
  const { role } = req.user || {};
  if (!['Production Head', 'Department Supervisor'].includes(role)) {
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
  const { role } = req.user || {};
  if (role !== 'Production Head') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Project id is required' });

  try {
    const ok = await softOrHardDeleteProject(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    // Foreign key dependencies: should be handled by soft delete / cascade; current schema doesn't.
    return res.status(409).json({ success: false, message: 'Unable to delete project (dependency exists)', error: e.message });
  }
}

module.exports = {
  listProjects: secured(listProjects),
  getProject: secured(getProject),
  createProject: secured(createProjectHandler),
  updateProject: secured(updateProjectHandler),
  deleteProject: secured(deleteProjectHandler),
};

