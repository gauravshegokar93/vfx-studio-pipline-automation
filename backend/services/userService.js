const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userRepository = require('../repositories/userRepository');

const {
    createUserSchema,
    searchUserSchema
} = require('../validations/userValidation');


// ==========================================
// Get Users
// ==========================================

async function getUsers(query, currentUser) {

    const { error, value } = searchUserSchema.validate(query);

    if (error) {
        throw new Error(error.details[0].message);
    }

    // Department Supervisor restriction
    if (currentUser.roleName === 'Department Supervisor') {
        value.departmentId = currentUser.departmentId;
    }
    const items = await userRepository.getUsers(value);

    const mappedItems = items.map(user => ({
        id: user.UserId,
        userId: user.UserId,
        employeeCode: user.EmployeeCode,
        name: user.FullName,
        fullName: user.FullName,
        email: user.Email,
        roleId: user.RoleId,
        role: user.RoleName,
        roleName: user.RoleName,
        departmentId: user.HomeDepartmentId,
        departmentName: user.DepartmentName,
        teamId: user.HomeTeamId,
        teamName: user.TeamName,
        isActive: Boolean(user.IsActive)
    }));

    return {
        items: mappedItems
    };

}


// ==========================================
// Get Logged User
// ==========================================

async function getMe(user) {

    if (!user) {

        throw new Error('Unauthorized');

    }

    const data = await userRepository.getUserById(
        user.userId || user.UserId
    );

    if (!data) {

        throw new Error('User not found');

    }

    data.permissions = user.permissions || [];
    
    return {
        id: data.UserId,
        userId: data.UserId,
        employeeCode: data.EmployeeCode,
        fullName: data.FullName,
        email: data.Email,
        roleId: data.RoleId,
        roleName: data.RoleName,
        departmentId: data.HomeDepartmentId,
        departmentName: data.DepartmentName,
        teamId: data.HomeTeamId,
        teamName: data.TeamName,
        isActive: Boolean(data.IsActive),
        permissions: data.permissions
    };
}

// ==========================================
// Get User By Id
// ==========================================

async function getUserById(userId) {

    const data = await userRepository.getUserById(userId);

    if (!data) {
        throw new Error('User not found');
    }

    return data;

}

// ==========================================
// Create User
// ==========================================

async function createUser(data) {

    const { error, value } = createUserSchema.validate(data);

    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    // Duplicate Employee Code
    const employee = await userRepository.getUserByEmployeeCode(
        value.employeeCode
    );

    if (employee) {
        const err = new Error('Employee Code already exists.');
        err.statusCode = 400;
        throw err;
    }

    // Duplicate Email
    const email = await userRepository.getUserByEmail(
        value.email
    );

    if (email) {
        const err = new Error('Email already exists.');
        err.statusCode = 400;
        throw err;
    }

    // Resolve RoleId from RoleMaster
    const roleRecord = await userRepository.getRoleByName(value.role);
    if (!roleRecord) {
        const err = new Error('Invalid role');
        err.statusCode = 400;
        throw err;
    }
    const roleId = roleRecord.RoleId;

    value.departmentId = value.departmentId || null;
    value.teamId = value.teamId || null;
    value.leadId = value.leadId || null;

    const transaction =
        await userRepository.beginTransaction();

    try {

        const userId = await userRepository.getNextUserId();

        let passwordHash = null;
        if (value.password) {
            passwordHash = await bcrypt.hash(value.password, 10);
        }

        // Insert User into UserMaster
        await userRepository.createUser(
            transaction,
            {
                userId,
                employeeCode: value.employeeCode,
                name: value.name,
                email: value.email,
                roleId: roleId,
                departmentId: value.departmentId,
                teamId: value.teamId,
                leadId: value.leadId,
                passwordHash: passwordHash,
                isActive: 1
            }
        );

        await userRepository.commitTransaction(
            transaction
        );

        return {

            success: true,

            message: 'User created successfully.',

            userId

        };

    }
    catch (err) {

        await userRepository.rollbackTransaction(
            transaction
        );

        throw err;

    }

}

// ==========================================
// Toggle User Status
// ==========================================

async function toggleUserStatus(userId) {

    const status =
        await userRepository.toggleUserStatus(
            userId
        );

    if (status === null) {

        throw new Error('User not found.');

    }

    return {

        success: true,

        isActive: status

    };

}

// ==========================================
// Change Password
// ==========================================

async function changePassword(userId, currentPassword, newPassword) {

    if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required.');
    }

    if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
    }

    const user = await userRepository.getPasswordHashByUserId(userId);

    if (!user) {
        throw new Error('User not found.');
    }

    if (!user.IsActive) {
        throw new Error('User account is inactive.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);

    if (!isMatch) {
        throw new Error('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await userRepository.updatePasswordHash(userId, passwordHash);

    return {
        success: true,
        message: 'Password changed successfully.'
    };

}

// ==========================================
// Reset Password
// ==========================================

async function resetPassword(requesterId, targetUserId, newPassword) {

    if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
    }

    const user = await userRepository.getUserById(targetUserId);

    if (!user) {
        throw new Error('User not found.');
    }

    if (!user.IsActive) {
        throw new Error('User account is inactive.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await userRepository.updatePasswordHash(targetUserId, passwordHash);

    return {
        success: true,
        message: 'Password reset successfully.'
    };

}

// ==========================================
// User Permissions
// ==========================================

async function getUserPermissions(userId) {
    return await userRepository.getUserPermissions(userId);
}

async function updateUserPermissions(userId, overrides) {
    if (!overrides || !Array.isArray(overrides.grant) || !Array.isArray(overrides.deny)) {
        throw new Error('overrides must contain grant and deny arrays');
    }
    await userRepository.updateUserPermissions(userId, overrides.grant, overrides.deny);
    return { success: true };
}

// ==========================================

module.exports = {

    getUsers,

    getMe,

    getUserById,

    createUser,

    toggleUserStatus,

    changePassword,

    resetPassword,
    
    getUserPermissions,
    
    updateUserPermissions

};
