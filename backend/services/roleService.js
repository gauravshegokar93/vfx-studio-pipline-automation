const roleRepository = require('../repositories/roleRepository');

async function getRoles() {
    return await roleRepository.getRoles();
}

async function getRolePermissions(roleId) {
    return await roleRepository.getRolePermissions(roleId);
}

async function updateRolePermissions(roleId, permissionIds) {
    if (!Array.isArray(permissionIds)) {
        throw new Error('permissionIds must be an array');
    }
    await roleRepository.updateRolePermissions(roleId, permissionIds);
    return { success: true };
}

module.exports = {
    getRoles,
    getRolePermissions,
    updateRolePermissions
};
