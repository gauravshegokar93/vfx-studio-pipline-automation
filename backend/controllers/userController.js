const authMiddleware = require('../middleware/authMiddleware');
const userService = require('../services/userService');

function secured(handler, allowedRoles = []) {
    return authMiddleware(
        allowedRoles,
        handler
    );
}

// ==========================================
// Get Users
// ==========================================

async function getUsers(req, res) {

    try {

        const result = await userService.getUsers(
            req.query,
            req.user
        );

        return res.json({
            success: true,
            ...result
        });

    } catch (err) {

        console.error('[getUsers]', err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

// ==========================================
// Get User By Id
// ==========================================

async function getUserById(req, res) {

    try {

        const user = await userService.getUserById(req.params.id);

        return res.json({
            success: true,
            user
        });

    } catch (err) {

        console.error('[getUserById]', err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

// ==========================================
// Get Logged User
// ==========================================

async function getMe(req, res) {

    try {

        const user = await userService.getMe(req.user);

        return res.json({
            success: true,
            user
        });

    } catch (err) {

      console.error('[getMe]', err);
  
      return res.status(500).json({
          success: false,
          message: err.message
      });
  
  }

}

// ==========================================
// Create User
// ==========================================

async function createUser(req, res) {

    try {

        const result = await userService.createUser(req.body);

        return res.status(201).json(result);

    } catch (err) {

        console.error('[createUser]', err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });

    }

}

// ==========================================
// Toggle Status
// ==========================================

async function toggleUserStatus(req, res) {

    try {

        const result =
            await userService.toggleUserStatus(
                req.params.id
            );

        return res.json(result);

    } catch (err) {

        console.error('[toggleUserStatus]', err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

// ==========================================
// Get User Permissions
// ==========================================

async function getUserPermissions(req, res) {
    try {
        const permissions = await userService.getUserPermissions(req.params.id);
        return res.json({ success: true, permissions });
    } catch (err) {
        console.error('[getUserPermissions]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

// ==========================================
// Update User Permissions
// ==========================================

async function updateUserPermissions(req, res) {
    try {
        const { overrides } = req.body;
        // overrides = { grant: [id1, id2], deny: [id3, id4] }
        const result = await userService.updateUserPermissions(req.params.id, overrides);
        return res.json(result);
    } catch (err) {
        console.error('[updateUserPermissions]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function resetPassword(req, res) {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Invalid password. Must be at least 6 characters.' });
        }
        await userService.resetPassword(req.user.userId, req.params.id, newPassword);
        return res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('[resetPassword]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {

    getUsers: secured(getUsers, ['users.view']),

    getMe: secured(getMe), // No extra permissions needed, authMiddleware requires just a valid token by default

    getUserById: secured(getUserById, ['users.view']),

    createUser: secured(createUser, ['users.create']),

    toggleUserStatus: secured(toggleUserStatus, ['users.edit']),

    getUserPermissions: secured(getUserPermissions, ['users.permissions']),

    updateUserPermissions: secured(updateUserPermissions, ['users.permissions']),
    
    resetPassword: secured(resetPassword, ['users.edit'])

};