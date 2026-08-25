# API_REFERENCE.md

Complete API documentation for the SM rolling FX backend.

**Base URL**: `http://localhost:5000/api`

---

## 1. Authentication

### POST /auth/login
Authenticate user and receive JWT tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "employeeCode": "EMP001",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "Production Head",
    "departmentId": "uuid",
    "leadId": "uuid",
    "isActive": true
  }
}
```

**Errors**:
- `400`: Missing email or password
- `401`: Invalid credentials or inactive user

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "success": true,
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

**Errors**:
- `400`: Missing refreshToken
- `401`: Invalid or expired refresh token

---

### POST /auth/logout
Revoke refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "success": true
}
```

---

## 2. Users

### GET /users
List users with pagination and filtering.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `q` (string): Search by name, email, or employee code
- `departmentId` (uuid): Filter by department
- `role` (string): Filter by role
- `status` (string): 'Active' or 'Inactive'
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "employeeCode": "EMP001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Production Head",
      "departmentId": "uuid",
      "leadId": "uuid",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

**RBAC Notes**:
- Department Supervisor can only query users in their own department
- Cross-department queries by Supervisor return 403

---

### GET /users/me
Get current user profile.

**Auth**: All authenticated users

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "employeeCode": "EMP001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Production Head",
    "departmentId": "uuid",
    "leadId": "uuid",
    "isActive": true
  }
}
```

---

### POST /users
Create a new user.

**Auth**: Production Head, Department Supervisor

**Request Body**:
```json
{
  "name": "Jane Doe",
  "employeeCode": "EMP002",
  "email": "jane@example.com",
  "role": "Artist",
  "departmentId": "uuid",
  "leadId": "uuid",
  "username": "jane.doe",
  "password": "TempPass123!"
}
```

**Response**:
```json
{
  "success": true,
  "userId": "new-uuid"
}
```

**Errors**:
- `400`: Missing required fields
- `403`: Forbidden role
- `409`: Duplicate email or employee code

---

### GET /users/credentials
Get all user credentials.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "jane.doe",
      "tempPassword": "TempPass123!",
      "lastChangedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### PUT /users/:id/credentials
Update user credentials.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Request Body**:
```json
{
  "username": "new.username",
  "password": "NewPass123!"
}
```

**Response**:
```json
{
  "success": true
}
```

**Notes**:
- If password is provided, sets `IsFirstLogin = 1` on the user
- If credential doesn't exist, creates it with default password `SMFX123!`

---

### PUT /users/:id/status
Toggle user active/inactive status.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Response**:
```json
{
  "success": true,
  "isActive": false
}
```

---

## 3. Projects

### GET /projects
List projects with pagination and filtering.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `q` (string): Search by project code, name, or client
- `status` (string): Filter by status
- `page` (number): Page number
- `pageSize` (number): Items per page

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "projectCode": "NTM",
      "projectName": "NTM Production",
      "clientName": "Marvel",
      "status": "In-Production",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "createdAt": null,
      "updatedAt": null
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 50
}
```

---

### GET /projects/:id
Get project by ID.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Response**:
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "projectCode": "NTM",
    "projectName": "NTM Production",
    "clientName": "Marvel",
    "status": "In-Production",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

---

### POST /projects
Create a new project.

**Auth**: Production Head, Department Supervisor

**Request Body**:
```json
{
  "projectCode": "NTM",
  "projectName": "NTM Production",
  "clientName": "Marvel",
  "status": "In-Production",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Response**:
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "projectCode": "NTM",
    "projectName": "NTM Production",
    "clientName": "Marvel",
    "status": "In-Production",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

**Errors**:
- `400`: Missing projectCode or projectName
- `403`: Forbidden role
- `409`: Duplicate project code

---

### PUT /projects/:id
Update a project.

**Auth**: Production Head, Department Supervisor

**Request Body** (all fields optional):
```json
{
  "projectCode": "NTM2",
  "projectName": "NTM Production 2",
  "clientName": "Marvel",
  "status": "Post-Production",
  "startDate": "2024-01-01",
  "endDate": "2025-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "project": { ... }
}
```

---

### DELETE /projects/:id
Delete a project.

**Auth**: Production Head only

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- `403`: Not Production Head
- `409`: Foreign key dependencies exist

---

## 4. Sequences

### GET /sequences
List sequences, optionally filtered by project.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `projectId` (uuid): Filter by project

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "sequenceCode": "EP01"
    }
  ]
}
```

---

### GET /sequences/lookup
Lookup sequence by project and code.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `projectId` (uuid): Required
- `sequenceCode` (string): Required

**Response**:
```json
{
  "success": true,
  "sequence": {
    "id": "uuid",
    "projectId": "uuid",
    "sequenceCode": "EP01"
  }
}
```

---

## 5. Shots

### GET /shots
List shots, optionally filtered by sequence or project.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `sequenceId` (uuid): Filter by sequence
- `projectId` (uuid): Filter by project (joins Sequences)

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "sequenceId": "uuid",
      "shotCode": "SH_0010",
      "priority": "High",
      "status": "In Progress",
      "dueDate": "2024-07-15",
      "description": "Laser blast shot"
    }
  ]
}
```

---

### GET /shots/lookup
Lookup shot by sequence and code.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `sequenceId` (uuid): Required
- `shotCode` (string): Required

**Response**:
```json
{
  "success": true,
  "shot": {
    "id": "uuid",
    "sequenceId": "uuid",
    "shotCode": "SH_0010",
    "priority": "High",
    "status": "In Progress",
    "dueDate": "2024-07-15",
    "description": "Laser blast shot"
  }
}
```

---

## 6. Tasks

### GET /tasks
List tasks, optionally filtered by shot.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Query Parameters**:
- `shotId` (uuid): Filter by shot

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "shotId": "uuid",
      "pipelineStep": "Roto",
      "taskName": "Roto Task",
      "supervisorId": "uuid",
      "leadId": "uuid",
      "assignedArtistId": "uuid",
      "bidHours": 10.5,
      "spentHours": 0,
      "remainingHours": 10.5,
      "status": "Not Started",
      "progress": 0,
      "internalEta": "2024-07-15",
      "reviewStatus": "Pending",
      "latestArtistComment": null,
      "latestLeadComment": null,
      "latestSupComment": null,
      "startDate": "2024-07-01",
      "dueDate": "2024-07-15",
      "priority": "High",
      "createdAt": null
    }
  ]
}
```

---

### PUT /tasks/:id/assign
Assign lead and/or artist to a task.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Request Body**:
```json
{
  "artistId": "uuid",
  "leadId": "uuid",
  "supervisorId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Task assigned successfully"
}
```

**Notes**:
- Deactivates previous assignments (sets `IsCurrent = 0`)
- If task was 'Not Started', status becomes 'Assigned' (if only lead) or 'In Progress' (if artist assigned)

---

### PUT /tasks/:id/progress
Artist updates task progress.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Request Body**:
```json
{
  "progress": 50,
  "comment": "Halfway through cleanup",
  "internalEta": "2024-07-10"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Progress updated successfully"
}
```

**Notes**:
- If progress = 100, status becomes 'Pending Review'
- ReviewStatus is reset to 'Pending'

---

### PUT /tasks/:id/review
Lead or Supervisor reviews task.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Request Body**:
```json
{
  "role": "Lead",
  "status": "Changes Requested",
  "comment": "Edge noise needs cleanup"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Review recorded successfully"
}
```

**Notes**:
- Lead review: 'Approved' → 'Pending Review', 'Changes Requested' → 'Retake'
- Supervisor review: 'Approved' → 'Approved', 'Changes Requested' → 'Retake'

---

### PUT /tasks/:id/status
Update task status directly.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Request Body**:
```json
{
  "status": "In Progress"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

## 7. Artists

### GET /artists
List artists with filtering.

**Auth**: Production Head, Department Supervisor

**Query Parameters**:
- `q` (string): Search by name, email, or employee code
- `departmentId` (uuid): Filter by department
- `status` (string): 'Active' or 'Inactive'
- `shift` (string): 'Day', 'Evening', 'Night'
- `page` (number): Page number
- `pageSize` (number): Items per page

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "employeeCode": "ART-000001",
      "fullName": "Alex Rivera",
      "email": "alex@lumina.vfx",
      "departmentId": "uuid",
      "shift": "Day",
      "status": "Active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

**RBAC Notes**:
- Department Supervisor can only query artists in their own department

---

### GET /artists/:id
Get artist by ID.

**Auth**: Production Head, Department Supervisor

**Response**:
```json
{
  "success": true,
  "artist": {
    "id": "uuid",
    "employeeCode": "ART-000001",
    "fullName": "Alex Rivera",
    "email": "alex@lumina.vfx",
    "departmentId": "uuid",
    "shift": "Day",
    "status": "Active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST /artists
Create a new artist.

**Auth**: Production Head, Department Supervisor

**Request Body**:
```json
{
  "fullName": "Alex Rivera",
  "email": "alex@lumina.vfx",
  "departmentId": "uuid",
  "shift": "Day"
}
```

**Response**:
```json
{
  "success": true,
  "artist": {
    "id": "uuid",
    "employeeCode": "ART-000001",
    "fullName": "Alex Rivera",
    "email": "alex@lumina.vfx",
    "departmentId": "uuid",
    "shift": "Day",
    "isActive": true
  }
}
```

**Notes**:
- Employee code is auto-generated (ART-000001, ART-000002, etc.)
- Shift must be one of: Day, Evening, Night

---

### PUT /artists/:id
Update an artist.

**Auth**: Production Head, Department Supervisor

**Request Body**:
```json
{
  "fullName": "Alex Rivera",
  "email": "alex@lumina.vfx",
  "departmentId": "uuid",
  "shift": "Evening"
}
```

**Response**:
```json
{
  "success": true,
  "artist": { ... }
}
```

---

### PATCH /artists/:id/toggle
Toggle artist active/inactive status.

**Auth**: Production Head, Department Supervisor

**Response**:
```json
{
  "success": true,
  "artist": {
    "id": "uuid",
    "employeeCode": "ART-000001",
    "fullName": "Alex Rivera",
    "status": "Inactive"
  }
}
```

---

## 8. Departments

### GET /departments
List all departments.

**Auth**: Production Head, Department Supervisor, Lead, Artist

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "name": "Comp"
    },
    {
      "id": "uuid",
      "name": "Roto"
    }
  ]
}
```

---

## 9. Import (Bid Sheet)

### POST /import/bid-sheet/preview
Preview Excel bid sheet without committing.

**Auth**: None (open for development)

**Request**: Multipart form data with `file` field (xlsx, xls, csv)

**Response**:
```json
{
  "success": true,
  "summary": {
    "projects": [...],
    "sequences": [...],
    "shots": [...],
    "tasks": [...],
    "warnings": [],
    "errors": [],
    "stats": {
      "projectCount": 1,
      "sequenceCount": 5,
      "shotCount": 25,
      "taskCount": 100
    }
  }
}
```

---

### POST /import/bid-sheet/import
Commit Excel bid sheet to database.

**Auth**: None (open for development)

**Request**: Multipart form data with `file` field

**Response**:
```json
{
  "success": true,
  "imported": {
    "projectCode": "NTM",
    "projectId": "uuid",
    "sequenceCount": 5,
    "shotCount": 25,
    "tasksCreated": 100
  },
  "duplicates": []
}
```

---

## 10. Simple Import

### POST /simple-import
Upload Excel file to staging table.

**Auth**: None (open for development)

**Request**: Multipart form data with `file` field

**Response**:
```json
{
  "success": true,
  "importedRows": 25
}
```

---

### GET /simple-import
Get all staged import rows.

**Auth**: None (open for development)

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "rowNumber": 2,
      "clientShotName": "Marvel",
      "shotName": "MVL_101_0010",
      "shotType": "VFX",
      "episode": "EP01",
      "frameRange": "100-250",
      "cutSummary": "Fast panning shot",
      "vfxWorkDescription": "Add laser blast effects",
      "complexity": "High",
      "rotoBid": 10.5,
      "paintBid": 15,
      "compBid": 25,
      "cgBid": 5,
      "retimeRepo": 0,
      "totalBid": 55.5,
      "artist": "Sarah Connor",
      "lead": "John Connor",
      "startDate": "2026-07-01",
      "eta": "2026-07-15",
      "status": "In Progress",
      "clientEta": "2026-07-20",
      "deliveryDate": "2026-07-30",
      "importedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 11. Import Review

### GET /import-review
Get unconverted staging rows.

**Auth**: Production Head, Department Supervisor

**Response**:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "clientShotName": "Marvel",
      "shotName": "MVL_101_0010",
      "shotType": "VFX",
      "episode": "EP01",
      "complexity": "High",
      "totalBid": 55.5,
      "artist": "Sarah Connor",
      "lead": "John Connor",
      "status": "In Progress",
      "eta": "2026-07-15",
      "rotoBid": 10.5,
      "paintBid": 15,
      "compBid": 25,
      "cgBid": 5,
      "retimeRepo": 0
    }
  ]
}
```

---

### PUT /import-review/:id
Update a staging row.

**Auth**: Production Head, Department Supervisor

**Request Body** (any subset of fields):
```json
{
  "shotName": "MVL_101_0010",
  "complexity": "Critical",
  "totalBid": 60
}
```

**Response**:
```json
{
  "success": true,
  "message": "Row updated successfully"
}
```

---

### DELETE /import-review/:id
Delete a staging row.

**Auth**: Production Head, Department Supervisor

**Response**:
```json
{
  "success": true,
  "message": "Row deleted successfully"
}
```

---

### POST /import-review/approve
Convert staging rows to production hierarchy.

**Auth**: Production Head, Department Supervisor

**Response**:
```json
{
  "success": true,
  "convertedRows": 25,
  "message": "Conversion successful"
}
```

**Notes**:
- Runs in a single SQL transaction
- Creates/finds Client, Project, Episode, Sequence, Shot, Tasks, TaskAssignments
- Marks rows as `Converted = 1`

---

## 12. Unimplemented Routes

The following routes return `501 Not Implemented`:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/assets` | GET | Assets module |
| `/api/assignments` | GET | Assignments module |
| `/api/attendance` | GET | Attendance module |
| `/api/clients` | GET | Clients module |
| `/api/leaves` | GET | Leaves module |
| `/api/notifications` | GET | Notifications module |
| `/api/production` | GET | Production module |
| `/api/reports` | GET | Reports module |
| `/api/settings` | GET | Settings module |

---

## 13. Authentication Headers

### Development (Mock Token)
```
Authorization: Bearer mock-jwt-token
x-simulated-role: Production Head
```

### Production (Real JWT)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 14. Error Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

---

## 15. Success Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": { ... }
}
```

Or for list endpoints:
```json
{
  "success": true,
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```
