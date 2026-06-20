# SM rolling FX | API Documentation

This document defines the RESTful contract required for the SQL Server Backend.

## Base URL
`http://[server-ip]:5000/api`

## 1. Authentication
### `POST /auth/login`
- **Body**: `{ username, password }`
- **Returns**: `{ token, user: { id, name, role, departmentId } }`

### `PATCH /auth/credentials/:userId`
- **Auth**: PH, Supervisor, or Lead (Scoped)
- **Body**: `{ username, password, forceReset: boolean }`

## 2. Production Hierarchy
### `GET /projects`
- **Returns**: `Array<Project>`

### `POST /import`
- **Auth**: Production Head
- **Body**: `Multipart/Form-Data (Excel File)`
- **Action**: Parses file and creates Projects, Sequences, Shots, and Tasks.

### `GET /hierarchy/:projectId`
- **Returns**: Nested object containing all Sequences and Shots.

## 3. Task Management
### `GET /tasks/artist/:userId`
- **Returns**: Current active tasks for the workbench.

### `PATCH /tasks/:taskId/status`
- **Body**: `{ status: TaskStatus, progress: number }`

### `POST /tasks/:taskId/timer`
- **Body**: `{ action: 'start' | 'pause', timestamp: string }`
- **Action**: Creates a `TimeLog` entry.

## 4. Quality Control
### `POST /tasks/:taskId/submit`
- **Body**: `{ versionNumber, filePath, comment }`
- **Action**: Creates a `Version` entry.

### `PATCH /versions/:versionId/review`
- **Body**: `{ status: 'Approved' | 'Retake', comment: string }`

## 5. Staff Management
### `GET /users`
- **Auth**: PH, Supervisor, Lead
- **Returns**: Filtered user list based on role hierarchy.

### `POST /users`
- **Auth**: PH or Supervisor
- **Body**: `{ name, email, employeeCode, role, departmentId, leadId }`
