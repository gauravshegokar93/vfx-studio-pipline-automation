const permissionRepository = require('../repositories/permissionRepository');

async function getPermissions() {
    return await permissionRepository.getPermissions();
}

module.exports = {
    getPermissions
};
