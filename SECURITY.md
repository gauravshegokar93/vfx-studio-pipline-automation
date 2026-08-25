# SECURITY.md

Security documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. Authentication

### JWT Implementation

**Access Token**:
- Algorithm: HS256
- Expiry: 2 hours
- Payload: `{ userId, role, departmentId, leadId }`
- Secret: `JWT_SECRET` environment variable

**Refresh Token**:
- Algorithm: HS256
- Expiry: 30 days
- Payload: `{ userId }`
- Secret: `JWT_REFRESH_SECRET` environment variable

**Session Storage**:
- Table: `UserSessions`
- Fields: SessionId, UserId, RefreshToken, ExpiresAt, UserAgent, IPAddress, IsRevoked
- Refresh tokens are stored server-side for revocation capability

### Login Flow
1. User submits email/password
2. Backend queries `Users` table by email
3. Password compared using `bcrypt.compare()`
4. If valid, access + refresh tokens generated
5. Session record created in `UserSessions`
6. Tokens returned to client

### Token Refresh Flow
1. Client sends refresh token to `/auth/refresh`
2. Backend looks up session in `UserSessions`
3. Validates token not expired and not revoked
4. Issues new access + refresh tokens
5. Updates session record

### Logout Flow
1. Client sends refresh token to `/auth/logout`
2. Backend sets `IsRevoked = 1` on session
3. Token can no longer be used for refresh

---

## 2. Authorization

### Role-Based Access Control (RBAC)

**Roles** (hierarchical):
1. **Production Head** - Global access
2. **Department Supervisor** - Department-scoped access
3. **Lead** - Team-scoped access
4. **Artist** - Assigned tasks only

### Middleware Implementation

```javascript
function authMiddleware(allowedRoles = [], handler) {
  // 1. Extract token from Authorization header
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  // 2. Verify token (real or mock)
  if (token === 'mock-jwt-token') {
    // Development mode: look up user by simulated role
    const simulatedRole = req.headers['x-simulated-role'] || 'Production Head';
    const dbUser = await query('SELECT TOP 1 UserId, Role, DepartmentId FROM Users WHERE Role = @Role');
    payload = dbUser ? dbUser[0] : { userId: '00000000-0000-0000-0000-000000000000', role: simulatedRole };
  } else {
    // Production mode: verify JWT
    payload = jwt.verify(token, JWT_SECRET);
  }
  
  // 3. Set req.user
  req.user = { userId, role, departmentId, leadId };
  
  // 4. Check role permission
  if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  // 5. Call handler
  return handler(req, res, next);
}
```

### RBAC Matrix

| Endpoint | Production Head | Dept Supervisor | Lead | Artist |
|----------|----------------|-----------------|------|--------|
| `/api/auth/*` | ✓ | ✓ | ✓ | ✓ |
| `/api/users` | ✓ | ✓ (own dept) | ✓ (own team) | ✓ (self) |
| `/api/users/credentials` | ✓ | ✓ | ✓ | ✓ |
| `/api/projects` | ✓ | ✓ | ✓ | ✓ |
| `/api/projects` (POST/PUT/DELETE) | ✓ | ✓ | ✗ | ✗ |
| `/api/tasks` | ✓ | ✓ | ✓ | ✓ |
| `/api/tasks/:id/assign` | ✓ | ✓ | ✓ | ✓ |
| `/api/artists` | ✓ | ✓ (own dept) | ✗ | ✗ |
| `/api/import-review` | ✓ | ✓ | ✗ | ✗ |
| `/api/simple-import` | ✓ | ✓ | ✓ | ✓ (open) |
| `/api/sequences` | ✓ | ✓ | ✓ | ✓ |
| `/api/shots` | ✓ | ✓ | ✓ | ✓ |
| `/api/departments` | ✓ | ✓ | ✓ | ✓ |

---

## 3. Password Security

### Hashing
- Algorithm: bcrypt
- Rounds: 10
- Storage: `UserCredentials.PasswordHash` (NVARCHAR(MAX))

### Password Policies
- Minimum length: Not enforced (relies on bcrypt)
- Temporary passwords: Stored in `TempPassword` column (clear text for onboarding)
- First login force reset: `IsFirstLogin` flag on Users table
- Password reset: Sets `IsFirstLogin = 1` and generates new temp password

### Default Passwords
- New user credentials: `SMFX123!`
- Password reset: `SMFXReset<random>!`

---

## 4. Input Validation

### Frontend
- React Hook Form + Zod for form validation
- TypeScript strict mode for type safety
- No direct DOM manipulation

### Backend
- Manual validation in controllers
- Parameterized SQL queries (prevents SQL injection)
- File type validation for uploads (xlsx, xls, csv only)
- File size limit: 20MB

### SQL Injection Prevention
```javascript
// SAFE: Parameterized query
const request = pool.request();
request.input('UserId', sql.UniqueIdentifier, userId);
await request.query('SELECT * FROM Users WHERE UserId = @UserId');

// UNSAFE: String concatenation (NOT USED in codebase)
// await request.query(`SELECT * FROM Users WHERE UserId = '${userId}'`);
```

---

## 5. Data Protection

### Sensitive Data
- Passwords: Hashed with bcrypt, never returned in API responses
- Refresh tokens: Stored server-side, can be revoked
- JWT secrets: Environment variables only
- Database credentials: Environment variables only

### Data in Transit
- Development: HTTP (no TLS)
- Production: Should use HTTPS (not currently enforced)

### Data at Rest
- SQL Server: Windows authentication or SQL authentication
- Passwords: bcrypt hashed
- No encryption at rest implemented

---

## 6. Current Security Gaps

### Critical
1. **Open Import Endpoints**: `/api/import` and `/api/simple-import` have no authentication
2. **Hardcoded JWT Fallback**: `JWT_SECRET` defaults to `dev-secret-change-me`
3. **No Rate Limiting**: API is vulnerable to brute force attacks
4. **No HTTPS Enforcement**: Development uses HTTP

### Medium
5. **No Request Logging**: No audit trail for API calls
6. **No Input Sanitization Beyond SQL**: XSS potential in frontend
7. **No CSRF Protection**: No CSRF tokens implemented
8. **Mock Token in Production Code**: `mock-jwt-token` logic exists in auth middleware

### Low
9. **No Security Headers**: Missing CSP, X-Frame-Options, etc.
10. **No Password Complexity**: No minimum length or complexity requirements
11. **No Account Lockout**: No brute force protection
12. **No 2FA**: No two-factor authentication

---

## 7. Security Recommendations

### Immediate (Before Production)
1. **Enable Auth on Import Routes**: Add `authMiddleware` to `/api/import` and `/api/simple-import`
2. **Remove Mock Token Logic**: Remove `mock-jwt-token` branch from `authMiddleware`
3. **Set Strong JWT Secrets**: Use cryptographically random secrets (32+ characters)
4. **Enable HTTPS**: Use reverse proxy (Nginx) or cloud load balancer
5. **Add Rate Limiting**: Use `express-rate-limit` middleware

### Short Term
6. **Add Security Headers**: Use `helmet` middleware
7. **Implement CSRF Protection**: Use `csurf` or similar
8. **Add Request Logging**: Log all API requests with user ID, IP, timestamp
9. **Password Complexity**: Enforce minimum 8 characters, mixed case, numbers
10. **Account Lockout**: Lock account after 5 failed login attempts

### Long Term
11. **Add 2FA**: TOTP or SMS-based two-factor authentication
12. **Implement OAuth**: Allow SSO with Google/Microsoft
13. **Add Audit Logging**: Track all data changes with user, timestamp, old/new values
14. **Encryption at Rest**: Encrypt sensitive columns in database
15. **Regular Security Scans**: Use Snyk, OWASP ZAP for vulnerability scanning

---

## 8. Environment Variables

### Frontend (`NEXT_PUBLIC_*` prefix required)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
GOOGLE_GENAI_API_KEY=AIzaSy...
```

### Backend
```
DB_SERVER=192.168.101.57
DB_DATABASE=SMRollingFX
DB_USER=smrolling_user
DB_PASSWORD=StrongPassword@123
PORT=5000
JWT_SECRET=mysecretkey
JWT_REFRESH_SECRET=myrefreshsecret
NODE_ENV=development
```

### Security Notes
- Never commit `.env` files to version control
- Use different secrets for development, staging, production
- Rotate secrets regularly
- Use secret management service in production (AWS Secrets Manager, Azure Key Vault)

---

## 9. Dependency Security

### Current Dependencies
- `bcrypt`: ^6.0.0 (password hashing)
- `jsonwebtoken`: ^9.0.3 (JWT)
- `mssql`: ^12.5.5 (SQL Server)
- `express`: ^5.2.1 (web framework)
- `cors`: ^2.8.6 (CORS headers)
- `multer`: ^2.2.0 (file uploads)
- `xlsx`: ^0.18.5 (Excel parsing)

### Recommendations
- Run `npm audit` regularly
- Use `npm audit fix` for known vulnerabilities
- Keep dependencies updated
- Use `patch-package` for critical patches

---

## 10. Incident Response

### Security Incident Checklist
1. **Identify**: Determine scope and severity
2. **Contain**: Isolate affected systems
3. **Assess**: Evaluate data exposure
4. **Remediate**: Fix vulnerability
5. **Notify**: Inform affected users if data breached
6. **Review**: Post-incident analysis

### Common Incidents
- **Data Breach**: Rotate all secrets, audit access logs, notify users
- **SQL Injection**: Patch query, audit database for tampering
- **XSS Attack**: Sanitize inputs, implement CSP headers
- **Brute Force**: Enable rate limiting, lock accounts, notify users

---

## 11. Compliance

### Data Protection
- User data stored in SQL Server
- Passwords hashed with bcrypt
- No explicit GDPR/CCPA compliance features implemented

### Audit Trail
- `UserSessions` table tracks login sessions
- `ShotStatusHistory` table tracks shot status changes
- No comprehensive audit log for all data changes

### Recommendations
- Implement comprehensive audit logging
- Add data retention policies
- Implement right-to-deletion (GDPR)
- Regular security audits
