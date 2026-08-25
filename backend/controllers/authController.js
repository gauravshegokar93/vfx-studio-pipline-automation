const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sql, config } = require('../config/db');
const userService = require('../services/userService');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

async function withDb(callback) {
  const pool = await sql.connect(config);
  try {
    return await callback(pool);
  } finally {
    // pooling handled by mssql
  }
}

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.UserId,
      roleId: user.RoleId,
      roleName: user.RoleName,
      departmentId: user.HomeDepartmentId,
      teamId: user.HomeTeamId,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.UserId,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

async function login(req, res) {
  console.log("===== LOGIN API HIT =====");
  console.log(req.body);
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();

  return withDb(async (pool) => {
    const request = pool.request();
    request.input('Email', sql.NVarChar(255), emailNorm);

    const result = await request.query(`
      SELECT TOP 1
        um.UserId,
        um.EmployeeCode,
        um.FullName,
        um.Email,
        um.PasswordHash,
        um.RoleId,
        rm.RoleName,
        um.HomeDepartmentId,
        dm.DepartmentName,
        um.HomeTeamId,
        tm.TeamName,
        um.IsActive
      FROM UserMaster um
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE um.Email = @Email;
    `);

    const user = result.recordset[0];
    console.log(user);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!Boolean(user.IsActive)) {
      return res.status(403).json({
          success: false,
          message: "User is inactive"
      });
  }
    console.log("Entered Password:", password);
    console.log("DB Hash:", user.PasswordHash);
    console.log("Password Length:", password.length);
console.log("Password JSON:", JSON.stringify(password));
console.log("Hash Length:", user.PasswordHash.length);
console.log("Hash from DB:", JSON.stringify(user.PasswordHash));
console.log("Hash Length:", user.PasswordHash.length);
    const ok = await bcrypt.compare(String(password), user.PasswordHash);

    console.log("Password Match:", ok);
    console.log("Password Match:", ok);

if (!ok) {
    return res.status(401).json({
        success: false,
        message: "Invalid credentials"
    });
}

// Active check password नंतर
if (!Boolean(user.IsActive)) {
    return res.status(403).json({
        success: false,
        message: "User is inactive"
    });
}

    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // आता Active check

    const permissions = await userService.getUserPermissions(user.UserId);


    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store session
    await pool.request()
      .input('UserId', sql.BigInt, user.UserId)
      .input('RefreshToken', sql.NVarChar(4000), refreshToken)
      .input('ExpiresAt', sql.DateTime2, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      .input('UserAgent', sql.NVarChar(500), req.headers['user-agent'] || '')
      .input('IPAddress', sql.NVarChar(100), req.ip || '')
      .query(`
        INSERT INTO UserSessions(UserId, RefreshToken, ExpiresAt, UserAgent, IPAddress)
        VALUES(@UserId, @RefreshToken, @ExpiresAt, @UserAgent, @IPAddress);
      `);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.UserId,
        employeeCode: user.EmployeeCode,
        fullName: user.FullName,
        email: user.Email,
        roleId: user.RoleId,
        roleName: user.RoleName,
        departmentId: user.HomeDepartmentId,
        departmentName: user.DepartmentName,
        teamId: user.HomeTeamId,
        teamName: user.TeamName,
        isActive: Boolean(user.IsActive),
        permissions: permissions
      },
    });
  });
}

async function refreshToken(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken is required' });

  const payload = jwt.verify(String(refreshToken), JWT_REFRESH_SECRET);

  return withDb(async (pool) => {
    const request = pool.request();
    request.input('RefreshToken', sql.NVarChar(4000), String(refreshToken));

    const result = await request.query(`
      SELECT TOP 1
        s.SessionId,
        s.UserId,
        s.ExpiresAt,
        s.IsRevoked,
        um.EmployeeCode,
        um.FullName,
        um.Email,
        um.RoleId,
        rm.RoleName,
        um.HomeDepartmentId,
        dm.DepartmentName,
        um.HomeTeamId,
        tm.TeamName,
        um.IsActive
      FROM UserSessions s
      INNER JOIN UserMaster um ON um.UserId = s.UserId
      LEFT JOIN RoleMaster rm ON rm.RoleId = um.RoleId
      LEFT JOIN DepartmentMaster dm ON dm.DepartmentId = um.HomeDepartmentId
      LEFT JOIN TeamMaster tm ON tm.TeamId = um.HomeTeamId
      WHERE s.RefreshToken = @RefreshToken AND s.IsRevoked = 0;
    `);

    const session = result.recordset[0];
    if (!session) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    if (new Date(session.ExpiresAt).getTime() < Date.now()) {
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }
    if (session.IsActive === 0) return res.status(403).json({ success: false, message: 'User is inactive' });

    const user = {
      UserId: session.UserId,
      RoleId: session.RoleId,
      RoleName: session.RoleName,
      HomeDepartmentId: session.HomeDepartmentId,
      HomeTeamId: session.HomeTeamId,
      EmployeeCode: session.EmployeeCode,
      FullName: session.FullName,
      Email: session.Email,
      isActive: Boolean(session.IsActive)
    };

    const permissions = await userService.getUserPermissions(session.UserId);

    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await pool.request()
      .input('RefreshToken', sql.NVarChar(4000), String(refreshToken))
      .input('NewRefreshToken', sql.NVarChar(4000), newRefreshToken)
      .query(`
        UPDATE UserSessions
        SET RefreshToken = @NewRefreshToken,
            ExpiresAt = DATEADD(day, 30, GETDATE())
        WHERE RefreshToken = @RefreshToken;
      `);

    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.UserId,
        employeeCode: session.EmployeeCode,
        fullName: session.FullName,
        email: session.Email,
        roleId: session.RoleId,
        roleName: session.RoleName,
        departmentId: session.HomeDepartmentId,
        departmentName: session.DepartmentName,
        teamId: session.HomeTeamId,
        teamName: session.TeamName,
        isActive: Boolean(session.IsActive),
        permissions: permissions
      },
    });
  });
}

async function logout(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { refreshToken } = req.body || {};

    const result = await authService.logout(userId, refreshToken);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Unexpected error' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Current password, new password, and confirm password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const result = await userService.changePassword(userId, currentPassword, newPassword);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Change password error:', err);
    const status = err.message === 'User not found.' ? 404 :
                   err.message === 'User account is inactive.' ? 403 :
                   err.message === 'Current password is incorrect.' ? 403 : 400;
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { userId, newPassword, confirmPassword } = req.body || {};

    if (!userId || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'userId, new password, and confirm password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    // Authorization: Only Production Head or Admin may reset another user's password
    const allowedRoles = ['Production Head', 'Admin'];
    if (!allowedRoles.includes(req.user?.roleName)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await userService.resetPassword(req.user.userId, userId, newPassword);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Reset password error:', err);
    const status = err.message === 'User not found.' ? 404 :
                   err.message === 'User account is inactive.' ? 403 : 400;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = {
  login,
  refreshToken,
  logout,
  changePassword,
  resetPassword,
};
