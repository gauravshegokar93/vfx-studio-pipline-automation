const authRepository = require('../repositories/authRepository');

// ==========================================
// Logout
// ==========================================

async function logout(userId, refreshToken) {

    if (refreshToken) {
        await authRepository.invalidateRefreshToken(userId, refreshToken);
    } else {
        await authRepository.invalidateAllSessions(userId);
    }

    return {
        success: true,
        message: 'Logout successful.'
    };

}

// ==========================================
// Exports
// ==========================================

module.exports = {
    logout
};
