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

    // Department Supervisor / Project Manager restriction — can only see their own dept
    if (currentUser.roleName === 'Project Manager') {
        value.departmentId = currentUser.departmentId;
    }

    if (query && query.status) {
        const s = String(query.status).trim().toLowerCase();
        if (s === 'active' || s === '1' || s === 'true') {
            value.status = 1;
        } else if (s === 'inactive' || s === '0' || s === 'false') {
            value.status = 0;
        } else {
            delete value.status;
        }
    }

    // Pass additional org filters
    if (query && query.teamId) value.teamId = query.teamId;
    if (query && query.roleId) value.roleId = query.roleId;
    if (query && query.reportingManagerId) value.reportingManagerId = query.reportingManagerId;

    const items = await userRepository.getUsers(value);

    const mappedItems = items.map(user => ({
        id: user.UserId,
        userId: user.UserId,
        employeeCode: user.EmployeeCode,
        name: user.FullName,
        fullName: user.FullName,
        email: user.Email,
        mobile: user.Mobile,
        roleId: user.RoleId,
        role: user.RoleName,
        roleName: user.RoleName,
        departmentId: user.HomeDepartmentId,
        departmentName: user.DepartmentName,
        teamId: user.HomeTeamId,
        teamName: user.TeamName,
        reportingManagerId: user.ReportingManagerId,
        reportingManagerName: user.ReportingManagerName,
        joiningDate: user.JoiningDate,
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
        mobile: data.Mobile,
        roleId: data.RoleId,
        roleName: data.RoleName,
        departmentId: data.HomeDepartmentId,
        departmentName: data.DepartmentName,
        teamId: data.HomeTeamId,
        teamName: data.TeamName,
        reportingManagerId: data.ReportingManagerId,
        reportingManagerName: data.ReportingManagerName,
        joiningDate: data.JoiningDate,
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
        const err = new Error(`Invalid role: '${value.role}'. Valid roles are: Super Admin, Production Head, Project Manager, Team Lead, Artist, QC Artist.`);
        err.statusCode = 400;
        throw err;
    }
    const roleId = roleRecord.RoleId;
    const roleName = value.role;

    // Org-awareness validation
    // Artist and QC Artist MUST have a department
    if ((roleName === 'Artist' || roleName === 'QC Artist') && !value.departmentId) {
        const err = new Error('Department is required for Artist / QC Artist role.');
        err.statusCode = 400;
        throw err;
    }

    // Reporting lead self-reference check
    // (Can't check against the new user yet since they don't have an ID,
    //  but we validate it exists and is an appropriate role)
    if (value.leadId) {
        const leadUser = await userRepository.getUserById(value.leadId);
        if (!leadUser) {
            const err = new Error('Reporting Lead not found.');
            err.statusCode = 400;
            throw err;
        }
        if (!leadUser.IsActive) {
            const err = new Error('Reporting Lead is inactive.');
            err.statusCode = 400;
            throw err;
        }
        // Valid reporting lead roles: Production Head(2), Project Manager(3), Team Lead(4)
        if (![2, 3, 4].includes(Number(leadUser.RoleId))) {
            const err = new Error(`User '${leadUser.FullName}' cannot be a Reporting Lead (invalid role: ${leadUser.RoleName}).`);
            err.statusCode = 400;
            throw err;
        }
    }

    // Team-Department consistency: if both dept and team are provided,
    // verify the team belongs to the selected department.
    if (value.departmentId && value.teamId) {
        const teamCheck = await userRepository.validateTeamDepartment(value.teamId, value.departmentId);
        if (!teamCheck.valid) {
            const err = new Error(teamCheck.reason);
            err.statusCode = 400;
            throw err;
        }
    }

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
// Toggle / Set User Status
// ==========================================

async function toggleUserStatus(userId, requestedIsActive, currentUser) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    const currentIsActive = Boolean(user.IsActive);
    const targetIsActive = requestedIsActive !== undefined && requestedIsActive !== null
        ? Boolean(requestedIsActive)
        : !currentIsActive;

    // Self protection check (Part 4)
    if (currentUser && String(currentUser.userId) === String(userId) && !targetIsActive) {
        const err = new Error('You cannot deactivate your own account.');
        err.statusCode = 400;
        throw err;
    }

    // Super Admin protection check (Part 5)
    const isSuperAdmin = String(user.RoleId) === '1' || user.RoleName === 'Super Admin';
    if (isSuperAdmin && currentIsActive && !targetIsActive) {
        const activeSuperAdmins = await userRepository.countActiveSuperAdmins();
        if (activeSuperAdmins <= 1) {
            const err = new Error('At least one active Super Admin must remain.');
            err.statusCode = 400;
            throw err;
        }
    }

    await userRepository.setUserStatus(userId, targetIsActive, currentUser?.userId);

    return {
        success: true,
        isActive: targetIsActive,
        message: `User status updated to ${targetIsActive ? 'Active' : 'Inactive'}.`
    };
}

// ==========================================
// Delete User Permanently (Safe Delete)
// ==========================================

async function deleteUser(userId, currentUser) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    // Self deletion check (Part 4 / 15)
    if (currentUser && String(currentUser.userId) === String(userId)) {
        const err = new Error('You cannot delete your own account.');
        err.statusCode = 400;
        throw err;
    }

    // Super Admin check (Part 5)
    const isSuperAdmin = String(user.RoleId) === '1' || user.RoleName === 'Super Admin';
    if (isSuperAdmin && Boolean(user.IsActive)) {
        const activeSuperAdmins = await userRepository.countActiveSuperAdmins();
        if (activeSuperAdmins <= 1) {
            const err = new Error('At least one active Super Admin must remain.');
            err.statusCode = 400;
            throw err;
        }
    }

    // Reporting Manager check (Part 12)
    const subordinatesCount = await userRepository.countSubordinates(userId);
    if (subordinatesCount > 0) {
        const err = new Error('User cannot be deleted because other users report to this user.');
        err.statusCode = 409;
        throw err;
    }

    // Production History / Dependency check (Part 9, 10, 11)
    const dependentCount = await userRepository.countUserDependentRecords(userId);
    if (dependentCount > 0) {
        const err = new Error('User cannot be permanently deleted because production/history records are associated with this user. Deactivate the user instead.');
        err.statusCode = 409;
        throw err;
    }

    // Case A: Safe deletion when zero dependent records exist
    await userRepository.deleteUserPermanently(userId);

    return {
        success: true,
        message: 'User deleted successfully.'
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
// Update User (org-aware)
// ==========================================

async function updateUser(userId, data, currentUser) {

    const user = await userRepository.getUserById(userId);
    if (!user) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    // Resolve role if provided
    let roleId = undefined;
    if (data.role) {
        const roleRecord = await userRepository.getRoleByName(data.role);
        if (!roleRecord) {
            const err = new Error(`Invalid role: '${data.role}'`);
            err.statusCode = 400;
            throw err;
        }
        roleId = roleRecord.RoleId;
    }

    // Parse org IDs safely
    const departmentId = data.departmentId ? parseInt(data.departmentId, 10) : undefined;
    const teamId = data.teamId ? parseInt(data.teamId, 10) : (data.teamId === null ? null : undefined);
    const reportingManagerId = data.leadId ? parseInt(data.leadId, 10) : (data.leadId === null ? null : undefined);

    // Validate reporting manager if provided
    if (reportingManagerId) {
        if (String(reportingManagerId) === String(userId)) {
            const err = new Error('A user cannot report to themselves.');
            err.statusCode = 400;
            throw err;
        }
        const leadUser = await userRepository.getUserById(reportingManagerId);
        if (!leadUser) {
            const err = new Error('Reporting Lead not found.');
            err.statusCode = 400;
            throw err;
        }
        if (!leadUser.IsActive) {
            const err = new Error('Reporting Lead is inactive.');
            err.statusCode = 400;
            throw err;
        }
        if (![2, 3, 4].includes(Number(leadUser.RoleId))) {
            const err = new Error(`User '${leadUser.FullName}' cannot be a Reporting Lead (invalid role).`);
            err.statusCode = 400;
            throw err;
        }
    }

    // Team-Department consistency: if both dept and team are changing,
    // verify the team belongs to the selected department.
    const effectiveDeptId = departmentId !== undefined ? departmentId : user.HomeDepartmentId;
    const effectiveTeamId = teamId !== undefined ? teamId : user.HomeTeamId;

    if (effectiveDeptId && effectiveTeamId) {
        const teamCheck = await userRepository.validateTeamDepartment(effectiveTeamId, effectiveDeptId);
        if (!teamCheck.valid) {
            const err = new Error(teamCheck.reason);
            err.statusCode = 400;
            throw err;
        }
    }

    const transaction = await userRepository.beginTransaction();
    try {
        await userRepository.updateUser(transaction, userId, {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            roleId,
            departmentId: data.departmentId !== undefined ? (departmentId || null) : undefined,
            teamId: data.teamId !== undefined ? (isNaN(teamId) ? null : teamId) : undefined,
            reportingManagerId: data.leadId !== undefined ? (reportingManagerId || null) : undefined,
            joiningDate: data.joiningDate,
            modifiedBy: currentUser?.userId
        });
        await userRepository.commitTransaction(transaction);
        const updated = await userRepository.getUserById(userId);
        return {
            success: true,
            message: 'User updated successfully.',
            user: {
                id: updated.UserId,
                userId: updated.UserId,
                employeeCode: updated.EmployeeCode,
                fullName: updated.FullName,
                email: updated.Email,
                mobile: updated.Mobile,
                roleId: updated.RoleId,
                roleName: updated.RoleName,
                departmentId: updated.HomeDepartmentId,
                departmentName: updated.DepartmentName,
                teamId: updated.HomeTeamId,
                teamName: updated.TeamName,
                reportingManagerId: updated.ReportingManagerId,
                reportingManagerName: updated.ReportingManagerName,
                joiningDate: updated.JoiningDate,
                isActive: Boolean(updated.IsActive)
            }
        };
    } catch (err) {
        await userRepository.rollbackTransaction(transaction);
        throw err;
    }
}

// ==========================================
// Get Reporting Leads
// ==========================================

async function getReportingLeads(query) {
    const { departmentId, teamId, role } = query || {};
    const leads = await userRepository.getReportingLeads({ departmentId, teamId, role });
    return leads.map(u => ({
        id: u.UserId,
        userId: u.UserId,
        employeeCode: u.EmployeeCode,
        fullName: u.FullName,
        roleId: u.RoleId,
        roleName: u.RoleName,
        departmentId: u.HomeDepartmentId,
        departmentName: u.DepartmentName,
        teamId: u.HomeTeamId,
        teamName: u.TeamName
    }));
}

// ==========================================
// Get Org Hierarchy
// ==========================================

async function getOrgHierarchy() {
    const { departments, teams, users } = await userRepository.getOrgHierarchy();

    const mapUser = u => ({
        userId: u.UserId,
        employeeCode: u.EmployeeCode,
        fullName: u.FullName,
        roleId: u.RoleId,
        roleName: u.RoleName,
        roleLevel: u.RoleLevel,
        reportingManagerId: u.ReportingManagerId,
        reportingManagerName: u.ReportingManagerName
    });

    const systemAdministration = users
        .filter(u => u.RoleName === 'Super Admin')
        .map(mapUser);

    const projectManagement = users
        .filter(u => u.RoleName === 'Project Manager')
        .map(mapUser);

    // Production Head (assuming one or more, but just listing them at the top)
    const productionHeads = users
        .filter(u => u.RoleName === 'Production Head')
        .map(mapUser);

    const hierarchy = departments.map(dept => {
        const deptTeams = teams
            .filter(t => String(t.DepartmentId) === String(dept.DepartmentId))
            .map(team => {
                const teamMembers = users
                    .filter(u => String(u.HomeTeamId) === String(team.TeamId) && u.RoleName !== 'Project Manager' && u.RoleName !== 'Super Admin' && u.RoleName !== 'Production Head')
                    .map(mapUser);

                const leadCount = Number(team.LeadCount) || 0;
                return {
                    teamId: team.TeamId,
                    teamName: team.TeamName,
                    teamCode: team.TeamCode,
                    leadNames: team.LeadNames || null,
                    leadIds: team.LeadIds || null,
                    leadCount,
                    hasMultipleLeads: leadCount > 1,
                    members: teamMembers
                };
            });

        const deptUsersNoTeam = users
            .filter(u => String(u.HomeDepartmentId) === String(dept.DepartmentId) && !u.HomeTeamId && u.RoleName !== 'Project Manager' && u.RoleName !== 'Super Admin' && u.RoleName !== 'Production Head')
            .map(mapUser);

        return {
            departmentId: dept.DepartmentId,
            departmentName: dept.DepartmentName,
            departmentCode: dept.DepartmentCode,
            teams: deptTeams,
            unassignedUsers: deptUsersNoTeam
        };
    });

    return { 
        systemAdministration,
        projectManagement,
        productionHeads,
        hierarchy 
    };
}

// ==========================================

module.exports = {

    getUsers,

    getMe,

    getUserById,

    createUser,

    updateUser,

    toggleUserStatus,

    deleteUser,

    changePassword,

    resetPassword,
    
    getUserPermissions,
    
    updateUserPermissions,

    getReportingLeads,

    getOrgHierarchy

};
