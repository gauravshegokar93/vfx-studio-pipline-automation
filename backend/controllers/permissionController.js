const permissionService = require('../services/permissionService');
const authMiddleware = require('../middleware/authMiddleware');

function secured(handler, permissions = []) {
    return authMiddleware(permissions, handler);
}

async function getPermissions(req, res) {
    try {
        const permissions = await permissionService.getPermissions();
        return res.json({ success: true, permissions });
    } catch (err) {
        console.error('[getPermissions]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getPermissions: secured(getPermissions, ['permissions.view'])
};
