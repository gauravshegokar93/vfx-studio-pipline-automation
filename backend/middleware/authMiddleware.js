const jwt = require('jsonwebtoken');
const { sql, config } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// NOTE: Every controller calls: authMiddleware(['RoleA', ...], handler)
// So this module must support signature: (allowedRoles, handler) => middleware
function authMiddleware(allowedRoles = [], handler) {
  // Support misuse: if first arg is a function, treat as handler and allowRoles = []
  if (typeof allowedRoles === 'function') {
    handler = allowedRoles;
    allowedRoles = [];
  }

  const middleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Fetch effective permissions from database
    let permissions = [];
    try {
      const pool = await sql.connect(config);
      const permResult = await pool.request()
        .input('RoleId', sql.BigInt, payload.roleId)
        .input('UserId', sql.BigInt, payload.userId)
        .query(`
          SELECT pm.PermissionName
          FROM RolePermission rp
          JOIN PermissionMaster pm ON rp.PermissionId = pm.PermissionId
          WHERE rp.RoleId = @RoleId AND rp.IsActive = 1 AND pm.IsActive = 1
          UNION
          SELECT pm.PermissionName
          FROM UserPermission up
          JOIN PermissionMaster pm ON up.PermissionId = pm.PermissionId
          WHERE up.UserId = @UserId AND up.IsGrant = 1 AND up.IsActive = 1 AND pm.IsActive = 1
          EXCEPT
          SELECT pm.PermissionName
          FROM UserPermission up
          JOIN PermissionMaster pm ON up.PermissionId = pm.PermissionId
          WHERE up.UserId = @UserId AND up.IsGrant = 0 AND up.IsActive = 1 AND pm.IsActive = 1
        `);
      permissions = permResult.recordset.map(r => r.PermissionName);
    } catch (err) {
      console.error('[authMiddleware] Permission fetch error:', err);
    }

    // Normalize payload
    req.user = {
      userId: payload.userId,
      user: payload.userId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      departmentId: payload.departmentId,
      departmentName: payload.departmentName,
      teamId: payload.teamId,
      teamName: payload.teamName,
      permissions: permissions
    };

    if (Array.isArray(allowedRoles) && allowedRoles.length) {
      // Super Admin bypasses all checks
      const isSuperAdmin = req.user.roleName === 'Super Admin' || req.user.roleName === 'Admin';
      
      if (!isSuperAdmin) {
        // If the allowedRoles array contains action permissions (e.g. 'users.view'), check permissions.
        // If it contains Role Names (e.g. 'Production Head'), check roles.
        // We assume anything with a dot is a permission, else it's a role.
        const requiredPermissions = allowedRoles.filter(a => a.includes('.'));
        const requiredRoles = allowedRoles.filter(a => !a.includes('.'));

        let hasRole = requiredRoles.length === 0 || requiredRoles.includes(req.user.roleName);
        let hasPermission = requiredPermissions.length === 0 || requiredPermissions.some(p => permissions.includes(p));

        if (requiredRoles.length > 0 && requiredPermissions.length > 0) {
            if (!hasRole && !hasPermission) {
                console.log(`[authMiddleware] 403: Role or Perm required`);
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        } else if (requiredRoles.length > 0 && !hasRole) {
            console.log(`[authMiddleware] 403: Role required`);
            return res.status(403).json({ success: false, message: 'Forbidden' });
        } else if (requiredPermissions.length > 0 && !hasPermission) {
            console.log(`[authMiddleware] 403: Perm required, has: ${permissions}, needed: ${requiredPermissions}`);
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }
    }

    if (typeof handler === 'function') {
      return handler(req, res, next);
    }

    return next();
  };

  return handler ? middleware : middleware;
}

module.exports = authMiddleware;
