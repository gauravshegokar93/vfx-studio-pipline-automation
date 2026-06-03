# VFX Production Intelligence Platform - SQL Server Backend Blueprint

This document outlines the technical architecture for the Node.js / Sequelize / SQL Server backend.

## 1. Entity Relationship Diagram (ERD)
The hierarchy follows a strict VFX pipeline:
`Projects` > `Sequences` > `Shots` > `Tasks` > (`TimeLogs`, `Versions`, `Comments`).
`Users` and `Departments` are cross-cutting entities.

## 2. Database Schema & Table Definitions

### Users
| Column | Type | Constraints |
| :--- | :--- | :--- |
| UserId | UNIQUEIDENTIFIER | PK, Default: NEWID() |
| EmployeeCode | NVARCHAR(50) | Unique, Not Null |
| Name | NVARCHAR(255) | Not Null |
| Email | NVARCHAR(255) | Unique, Not Null |
| PasswordHash | NVARCHAR(MAX) | Not Null |
| Role | NVARCHAR(50) | 'Production Head', 'Supervisor', 'Lead', 'Artist' |
| DepartmentId | UNIQUEIDENTIFIER | FK -> Departments |
| LeadId | UNIQUEIDENTIFIER | FK -> Users (Self-ref) |
| IsActive | BIT | Default: 1 |
| CreatedAt | DATETIME2 | Default: GETUTCDATE() |

### Projects
| Column | Type | Constraints |
| :--- | :--- | :--- |
| ProjectId | UNIQUEIDENTIFIER | PK |
| ProjectCode | NVARCHAR(50) | Unique, Not Null |
| ProjectName | NVARCHAR(255) | Not Null |
| ClientName | NVARCHAR(255) | Not Null |
| Status | NVARCHAR(50) | 'Pre-Prod', 'In-Prod', 'Completed' |
| StartDate | DATE | |
| EndDate | DATE | |

### Tasks
| Column | Type | Constraints |
| :--- | :--- | :--- |
| TaskId | UNIQUEIDENTIFIER | PK |
| ShotId | UNIQUEIDENTIFIER | FK -> Shots |
| PipelineStep | NVARCHAR(50) | 'Paint', 'Comp', etc. |
| ArtistId | UNIQUEIDENTIFIER | FK -> Users |
| BidHours | DECIMAL(10, 2) | Not Null |
| ActualHours | DECIMAL(10, 2) | Calculated (Sum of TimeLogs) |
| Status | NVARCHAR(50) | 'In Progress', 'Approved', etc. |

## 3. Table Relationships & Foreign Keys
- **One-to-Many**: `Project` -> `Sequences`
- **One-to-Many**: `Sequence` -> `Shots`
- **One-to-Many**: `Shot` -> `Tasks`
- **One-to-Many**: `Task` -> `Versions` / `TimeLogs` / `Comments`
- **Self-Reference**: `Users.LeadId` references `Users.UserId` for team hierarchy.

## 4. Index Strategy
- **Clustered Indexes**: All Primary Keys (`TaskId`, `ShotId`, etc.).
- **Non-Clustered Indexes**:
    - `Shots.ShotCode` + `ProjectId` (Frequent lookups during import).
    - `Tasks.ArtistId` + `Status` (For "My Workbench" performance).
    - `TimeLogs.TaskId` (For rolling up `ActualHours`).
- **Unique Indexes**: `Users.EmployeeCode`, `Projects.ProjectCode`.

## 5. SQL Server Naming Conventions
- **Tables**: Pluralized PascalCase (e.g., `Projects`, `TimeLogs`).
- **Columns**: PascalCase (e.g., `ProjectId`, `TaskStatus`).
- **Foreign Keys**: `FK_SourceTable_TargetTable` (e.g., `FK_Tasks_Shots`).
- **Stored Procs**: `usp_` prefix (if used).

## 6. Backend Module Architecture (Sequelize)
```text
src/
├── modules/
│   ├── auth/          # JWT & Refresh token logic
│   ├── import/        # Excel parsing & Transactional upserts
│   ├── tasks/         # Timer logic & Productivity calc
│   └── reviews/       # Version state machine
├── database/
│   ├── models/        # Sequelize model definitions
│   └── migrations/    # SQL Schema versioning
└── services/          # Shared business logic
```

## 7. API Endpoint Design (REST)
- `POST /api/auth/login`: Returns Access & Refresh tokens.
- `POST /api/import/bid-sheet`: Process Excel file.
- `GET /api/tasks/artist/:userId`: Fetch workbench tasks.
- `PATCH /api/tasks/:taskId/status`: Update workflow state.
- `POST /api/timelogs/start`: Initialize a timer session.

## 8. Business Flows

### Authentication Flow
1. User submits Credentials.
2. Server validates Hash and Role.
3. Generate **AccessToken** (15m) and **RefreshToken** (7d).
4. RefreshToken stored in SQL Server `UserSessions` table for revocation.

### Excel Import Flow
1. **Upload**: Production Head sends `.xlsx`.
2. **Parsing**: Node.js reads stream.
3. **Transaction**:
    - Find or Create `Project`.
    - Find or Create `Sequences`.
    - Create `Shots` and associated `Tasks` based on pipeline mapping.
4. **Summary**: Return JSON with success/fail counts.

### Productivity Calculation Flow
- **Formula**: `(BidHours / SUM(TimeLog.TotalMinutes / 60.0)) * 100`.
- **Trigger**: Calculated on the fly in the API response or stored in a `TaskProductivity` view for faster reporting.

### Version Review Flow
1. Artist submits `Version` (Status: `Pending Review`).
2. Supervisor/Lead sees task in `Review Queue`.
3. Supervisor submits `Comment` + `StatusUpdate` (`Approved` or `Retake`).
4. If `Retake`, task reverts to `In Progress` for Artist.

### Notification Flow
- Event-based trigger (e.g., `TaskStatusChanged`).
- Write entry to `Notifications` table.
- Frontend polls or uses a Socket.io bridge (optional).
