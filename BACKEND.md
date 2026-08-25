# BACKEND.md

Complete backend documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. Overview

The backend is an **Express.js 5** REST API server that connects the Next.js frontend to a **Microsoft SQL Server** database. It uses the `mssql` package for raw SQL queries (no ORM).

**Port**: 5000 (configurable via `PORT` env var)
**Entry Point**: `backend/server.js`

---

## 2. Architecture

```
server.js
  ├── Middleware: cors, express.json()
  ├── Routes:
  │   ├── /api/auth → authRoutes.js
  │   ├── /api/users → userRoutes.js
  │   ├── /api/projects → projectRoutes.js
  │   ├── /api/departments → departmentsRoutes.js
  │   ├── /api/artists → artistRoutes.js
  │   ├── /api/clients → clientsRoutes.js
  │   ├── /api/assets → assetsRoutes.js
  │   ├── /api/production → productionRoutes.js
  │   ├── /api/shots → shotsRoutes.js
  │   ├── /api/tasks → tasksRoutes.js
  │   ├── /api/import → importBidSheetRoutes.js
  │   ├── /api/simple-import → simpleImportRoutes.js
  │   ├── /api/import-review → importReviewRoutes.js
  │   ├── /api/attendance → attendanceRoutes.js
  │   ├── /api/leaves → leavesRoutes.js
  │   ├── /api/notifications → notificationsRoutes.js
  │   ├── /api/reports → reportsRoutes.js
  │   ├── /api/settings → settingsRoutes.js
  │   ├── /api/sequences → sequencesRoutes.js
  │   └── /api/assignments → assignmentsRoutes.js
  └── Error handling: console.error + JSON responses
```

---

## 3. Controllers

### authController.js
**Purpose**: Handle authentication (login, refresh, logout)

**Functions**:
- `login(req, res)`: Validates email/password against `Users` table, returns JWT tokens
- `refreshToken(req, res)`: Validates refresh token, issues new access/refresh tokens
- `logout(req, res)`: Marks refresh token as revoked in `UserSessions`

**Dependencies**:
- `bcrypt` for password comparison
- `jsonwebtoken` for token signing
- `../config/db` for SQL connection
- `../middleware/authMiddleware` (not used directly, but related)

**Database Tables**: Users, UserSessions

---

### userController.js
**Purpose**: User management and credential lifecycle

**Functions**:
- `getUsers(req, res)`: Paginated user list with search/filter
- `getMe(req, res)`: Current user profile
- `createUser(req, res)`: Create user + optional credentials in transaction
- `getUserCredentials(req, res)`: List all credentials
- `updateUserCredentials(req, res)`: Update username/password, force first login
- `toggleUserStatus(req, res)`: Activate/deactivate user

**Dependencies**:
- `bcrypt` for password hashing
- `crypto` for UUID generation
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Users, UserCredentials

**Business Logic**:
- Department Supervisor can only see users in their department
- Password reset sets `IsFirstLogin = 1`
- Default password for new credentials: `SMFX123!`

---

### projectController.js
**Purpose**: Project CRUD operations

**Functions**:
- `listProjects(req, res)`: Paginated project list
- `getProject(req, res)`: Single project by ID
- `createProjectHandler(req, res)`: Create project (PH/Supervisor only)
- `updateProjectHandler(req, res)`: Update project (PH/Supervisor only)
- `deleteProjectHandler(req, res)`: Delete project (PH only)

**Dependencies**:
- `../services/projectsService` for DB operations
- `../middleware/authMiddleware`

**Database Tables**: Projects

**Business Logic**:
- Project code must be unique
- Delete fails if FK dependencies exist (returns 409)

---

### artistController.js
**Purpose**: Artist management (separate from Users)

**Functions**:
- `createArtist(req, res)`: Create artist with auto-generated employee code
- `getArtists(req, res)`: Paginated artist list
- `getArtistById(req, res)`: Single artist by ID
- `updateArtist(req, res)`: Update artist
- `toggleArtistActive(req, res)`: Activate/deactivate artist

**Dependencies**:
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Artists (auto-creates `EmployeeCodeCounters` table)

**Business Logic**:
- Employee code format: `ART-000001`
- Only Production Head and Department Supervisor can access
- Department Supervisor restricted to own department
- Shift must be one of: Day, Evening, Night

---

### departmentsController.js
**Purpose**: Department listing

**Functions**:
- `getDepartments(req, res)`: List all departments

**Dependencies**:
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Departments

---

### importBidSheetController.js
**Purpose**: STUB - Legacy bid sheet import

**Functions**:
- `previewBidSheet(req, res)`: Returns `{success: true}`
- `commitBidSheet(req, res)`: Returns `{success: true}`

**Note**: This is a stub. The real import logic is in `simpleImportController.js`.

---

### importReviewController.js
**Purpose**: Manage staging rows and trigger conversion

**Functions**:
- `getUnconvertedImports(req, res)`: Get rows where `Converted = 0`
- `updateImportRow(req, res)`: Update staging row fields
- `deleteImportRow(req, res)`: Delete staging row
- `approveImport(req, res)`: Trigger `conversionService.convertImports()`

**Dependencies**:
- `../config/db`
- `../services/conversionService`

**Database Tables**: BidSheetImport

---

### simpleImportController.js
**Purpose**: Excel upload and parsing

**Functions**:
- `simpleImport(req, res)`: Upload Excel, parse, insert into `BidSheetImport`
- `getImportedRows(req, res)`: Get all staged rows

**Dependencies**:
- `xlsx` for Excel parsing
- `../config/db`
- `../utils/upload` for multer

**Database Tables**: BidSheetImport

**Business Logic**:
- Maps Excel headers to SQL columns using `MAPPINGS` dictionary
- Handles Excel date serial numbers
- Runs in a SQL transaction
- Max file size: 20MB

---

### tasksRoutes.js (Controller functions)
**Purpose**: Task operations

**Functions**:
- `listTasks(req, res)`: List tasks with optional shot filter
- `assignTask(req, res)`: Assign lead/artist/supervisor to task
- `updateProgress(req, res)`: Artist updates progress
- `reviewTask(req, res)`: Lead/Supervisor reviews task
- `updateStatus(req, res)`: Direct status update

**Dependencies**:
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Tasks, TaskAssignments

**Business Logic**:
- Assignment deactivates previous assignments
- Progress = 100 triggers 'Pending Review' status
- Lead review: 'Approved' → 'Pending Review', 'Changes Requested' → 'Retake'
- Supervisor review: 'Approved' → 'Approved', 'Changes Requested' → 'Retake'

---

### shotsRoutes.js (Controller functions)
**Purpose**: Shot listing and lookup

**Functions**:
- `listShots(req, res)`: List shots with optional sequence/project filter
- `getShotByCode(req, res)`: Lookup shot by sequence + code

**Dependencies**:
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Shots, Sequences

---

### sequencesRoutes.js (Controller functions)
**Purpose**: Sequence listing and lookup

**Functions**:
- `listSequences(req, res)`: List sequences with optional project filter
- `getSequenceByCode(req, res)`: Lookup sequence by project + code

**Dependencies**:
- `../config/db`
- `../middleware/authMiddleware`

**Database Tables**: Sequences

---

## 4. Services

### conversionService.js
**Purpose**: Convert staging rows to full production hierarchy

**Function**: `convertImports()`

**Process** (single SQL transaction):
1. Fetch all unconverted rows from `BidSheetImport`
2. For each row:
   - Find/create Client
   - Find/create Project (code extracted from ShotName prefix)
   - Find/create Episode
   - Find/create Sequence
   - Find/create Shot
   - Resolve Lead and Artist users by name
   - Create Tasks for each bid step (Roto, Paint, Comp, CG, Retime)
   - Create TaskAssignments if Lead/Artist found
   - Mark row as `Converted = 1`
3. Commit transaction

**Dependencies**:
- `../config/db`
- `bcrypt` for default password hash

**Database Tables**: Clients, Projects, Episodes, Sequences, Shots, Tasks, TaskAssignments, BidSheetImport

**Business Logic**:
- Project code extracted from ShotName prefix (e.g., `MPN_R01_SH0040` → `MPN`)
- Episode name: `EP_` + episode value (or `SEQ_` prefix)
- Sequence code: `SEQ_` + episode value (or existing SEQ_ prefix)
- Default password for auto-created users: `SMFX123!`
- Task status: 'Assigned' if Lead/Artist exists, else 'Not Started'

---

### projectsService.js
**Purpose**: Project data access layer

**Functions**:
- `getProjects({ q, status, page, pageSize })`: Paginated list
- `getProjectById(projectId)`: Single project
- `createProject({ projectCode, projectName, ... })`: Insert project
- `updateProject(projectId, { ... })`: Update project with COALESCE
- `softOrHardDeleteProject(projectId)`: Hard delete (no soft delete in schema)

**Dependencies**:
- `../config/db`

**Database Tables**: Projects

---

### importBidSheetService.js
**Purpose**: Legacy bid sheet preview/commit (not currently used)

**Functions**:
- `previewBidSheet({ fileBuffer, originalName })`: Parse and validate
- `commitBidSheet({ fileBuffer, originalName, requestedBy })`: Full commit

**Dependencies**:
- `../utils/excelBidSheetParser`
- `../config/db`

---

## 5. Middleware

### authMiddleware.js
**Purpose**: JWT verification and RBAC enforcement

**Signature**: `authMiddleware(allowedRoles, handler)` or `authMiddleware(handler)`

**Process**:
1. Extract Bearer token from `Authorization` header
2. If token is `mock-jwt-token`:
   - Read `x-simulated-role` header
   - Query DB for first active user with that role
   - If found, use that user's ID/role/department
   - If not found, use mock UUID with requested role
3. If real token:
   - Verify JWT with `JWT_SECRET`
4. Set `req.user` with normalized shape
5. Check role against `allowedRoles` array
6. Call handler or return 403

**Dependencies**:
- `jsonwebtoken`
- `../config/db`

**Database Tables**: Users

**Special Features**:
- Supports mock token for development without real auth
- Normalizes payload to consistent `req.user` shape

---

### requireProductionHead.js
**Purpose**: Convenience wrapper for Production Head-only routes

**Implementation**: `authMiddleware(['Production Head'], (req, res, next) => next())`

---

## 6. Utilities

### upload.js
**Purpose**: Multer configuration for file uploads

**Configuration**:
- Storage: Memory storage
- Max file size: 20MB
- Allowed extensions: xlsx, xls, csv

---

### excelBidSheetParser.js
**Purpose**: Parse Excel bid sheets (legacy)

**Functions**:
- `parseBidSheet(fileBuffer, originalName)`: Read workbook, map headers, validate
- `parseDateValue(v)`: Handle Excel serial dates
- `toNumberOrNull(v)`: Safe number parsing

**Dependencies**:
- `xlsx` (SheetJS)

---

### sqlTransactionHelper.js
**Purpose**: Placeholder for future transaction utilities

**Status**: Empty, not used

---

## 7. Configuration

### db.js
**Purpose**: SQL Server connection configuration

**Configuration**:
```javascript
{
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: { trustServerCertificate: true }
}
```

**Note**: Uses `dotenv` with explicit path to `../.env`.

---

## 8. Security

### Authentication
- JWT access tokens (2h expiry)
- JWT refresh tokens (30d expiry)
- bcrypt for password hashing (10 rounds)
- Session storage in `UserSessions` table

### Authorization
- Role-based access control via `authMiddleware`
- Department-level scoping for Supervisors
- All secured routes pass through `authMiddleware`

### Current Gaps
- Import routes (`/api/import`, `/api/simple-import`) are open (no auth)
- No rate limiting
- No request size limits beyond multer
- No HTTPS enforcement
- JWT secret is hardcoded fallback: `dev-secret-change-me`

---

## 9. Error Handling

### Pattern
```javascript
try {
  // operation
  return res.json({ success: true, data });
} catch (err) {
  console.error('[module] Error:', err);
  return res.status(500).json({ success: false, message: err.message });
}
```

### HTTP Status Codes Used
- `200`: Success
- `400`: Bad request (validation)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (duplicate, FK dependency)
- `500`: Internal server error
- `501`: Not implemented

---

## 10. Logging

- All errors logged via `console.error` with module prefix
- SQL queries logged in development (e.g., `[assignTask] SQL error`)
- Route registration logged on server start
- No structured logging or log levels

---

## 11. Database Connection

- Uses `mssql` package with connection pooling
- Connection config from `backend/config/db.js`
- Environment variables from `backend/.env`
- No connection retry logic
- Pool managed by `mssql` library (not explicitly closed)

---

## 12. Scripts

### run-migrations.js
**Purpose**: Run database migrations

**Migrations**:
1. Create `Clients` table
2. Add `ClientId` to `Projects`
3. Create `Episodes` table
4. Add `EpisodeId` to `Sequences`
5. Add `Converted` to `BidSheetImport`

**Usage**: `node scripts/run-migrations.js`

---

### list-users.js
**Purpose**: Dev script to list all users

**Usage**: `node list-users.js`

---

### test-db.js
**Purpose**: Dev script to test DB connection

**Usage**: `node test-db.js`

---

## 13. Dependencies

### Production
- `bcrypt`: Password hashing
- `cors`: CORS headers
- `dotenv`: Environment variables
- `express`: Web framework
- `jsonwebtoken`: JWT tokens
- `mssql`: SQL Server driver
- `multer`: File uploads
- `xlsx`: Excel parsing

### Development
- `nodemon`: Auto-restart on changes

---

## 14. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_SERVER` | Yes | - | SQL Server hostname/IP |
| `DB_DATABASE` | Yes | - | Database name |
| `DB_USER` | Yes | - | Database username |
| `DB_PASSWORD` | Yes | - | Database password |
| `PORT` | No | 5000 | Server port |
| `JWT_SECRET` | No | `dev-secret-change-me` | JWT signing secret |
| `JWT_REFRESH_SECRET` | No | `dev-refresh-secret-change-me` | Refresh token signing secret |
| `NODE_ENV` | No | development | Environment mode |

---

## 15. Known Issues

1. **No input sanitization beyond parameterized queries**: SQL injection is prevented by parameterized queries, but no additional validation.
2. **No request rate limiting**: API is vulnerable to brute force.
3. **Open import endpoints**: `/api/import` and `/api/simple-import` have no auth.
4. **Hardcoded fallback secrets**: JWT secrets have dev fallbacks.
5. **No request logging**: No access logs for audit trail.
6. **No health check endpoint**: Only root `/` returns a message.
7. **`importBidSheetController.js` is a stub**: Real logic is in `simpleImportController.js`.
