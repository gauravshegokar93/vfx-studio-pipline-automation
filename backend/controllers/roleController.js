const roleService = require('../services/roleService');
const authMiddleware = require('../middleware/authMiddleware');

function secured(handler, permissions = []) {
    return authMiddleware(permissions, handler);
}

async function getRoles(req, res) {
    try {
        const roles = await roleService.getRoles();
        return res.json({ success: true, roles });
    } catch (err) {
        console.error('[getRoles]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function getRolePermissions(req, res) {
    try {
        const permissions = await roleService.getRolePermissions(req.params.id);
        return res.json({ success: true, permissions });
    } catch (err) {
        console.error('[getRolePermissions]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function updateRolePermissions(req, res) {
    try {
        const { permissionIds } = req.body;
        const result = await roleService.updateRolePermissions(req.params.id, permissionIds);
        return res.json(result);
    } catch (err) {
        console.error('[updateRolePermissions]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getRoles: secured(getRoles, ['roles.view']),
    getRolePermissions: secured(getRolePermissions, ['roles.view']),
    updateRolePermissions: secured(updateRolePermissions, ['roles.edit'])
};
