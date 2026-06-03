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

### Departments
| Column | Type | Constraints |
| :--- | :--- | :--- |
| DepartmentId | UNIQUEIDENTIFIER | PK |
| DepartmentName | NVARCHAR(100) | Unique, Not Null |

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

### Sequences
| Column | Type | Constraints |
| :--- | :--- | :--- |
| SequenceId | UNIQUEIDENTIFIER | PK |
| ProjectId | UNIQUEIDENTIFIER | FK -> Projects |
| SequenceCode | NVARCHAR(50) | Not Null |

### Shots
| Column | Type | Constraints |
| :--- | :--- | :--- |
| ShotId | UNIQUEIDENTIFIER | PK |
| ProjectId | UNIQUEIDENTIFIER | FK -> Projects |
| SequenceId | UNIQUEIDENTIFIER | FK -> Sequences |
| ShotCode | NVARCHAR(50) | Not Null |
| Priority | NVARCHAR(20) | 'Low', 'Medium', 'High', 'Critical' |
| Status | NVARCHAR(50) | |
| DueDate | DATE | |
| Description | NVARCHAR(MAX) | |

### Tasks
| Column | Type | Constraints |
| :--- | :--- | :--- |
| TaskId | UNIQUEIDENTIFIER | PK |
| ShotId | UNIQUEIDENTIFIER | FK -> Shots |
| PipelineStep | NVARCHAR(50) | 'Paint', 'Comp', etc. |
| SupervisorId | UNIQUEIDENTIFIER | FK -> Users |
| LeadId | UNIQUEIDENTIFIER | FK -> Users |
| ArtistId | UNIQUEIDENTIFIER | FK -> Users |
| BidHours | DECIMAL(10, 2) | Not Null |
| ActualHours | DECIMAL(10, 2) | Computed/Updated via TimeLogs |
| RemainingHours | DECIMAL(10, 2) | |
| Status | NVARCHAR(50) | 'In Progress', 'Approved', etc. |
| StartDate | DATE | |
| DueDate | DATE | |
| Priority | NVARCHAR(20) | |

### TimeLogs
| Column | Type | Constraints |
| :--- | :--- | :--- |
| TimeLogId | UNIQUEIDENTIFIER | PK |
| TaskId | UNIQUEIDENTIFIER | FK -> Tasks |
| ArtistId | UNIQUEIDENTIFIER | FK -> Users |
| StartTime | DATETIME2 | Not Null |
| EndTime | DATETIME2 | |
| TotalMinutes | INT | Calculated on EndTime update |

### Versions
| Column | Type | Constraints |
| :--- | :--- | :--- |
| VersionId | UNIQUEIDENTIFIER | PK |
| TaskId | UNIQUEIDENTIFIER | FK -> Tasks |
| ArtistId | UNIQUEIDENTIFIER | FK -> Users |
| VersionNumber | INT | Not Null |
| FilePath | NVARCHAR(MAX) | |
| ReviewStatus | NVARCHAR(50) | |
| ReviewComments | NVARCHAR(MAX) | |

### Comments
| Column | Type | Constraints |
| :--- | :--- | :--- |
| CommentId | UNIQUEIDENTIFIER | PK |
| TaskId | UNIQUEIDENTIFIER | FK -> Tasks |
| UserId | UNIQUEIDENTIFIER | FK -> Users |
| CommentText | NVARCHAR(MAX) | Not Null |
| CreatedAt | DATETIME2 | Default: GETUTCDATE() |

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
- **Stored Procs**: `usp_` prefix (if used for complex rollups).

## 6. Backend Module Architecture (Sequelize)
```text
src/
├── modules/
│   ├── auth/          # JWT & Refresh token logic
│   ├── users/         # User & Role management
│   ├── import/        # Excel parsing & Transactional upserts
│   ├── projects/      # Project/Sequence/Shot logic
│   ├── tasks/         # Task assignment & State machine
│   ├── timelogs/      # Timer logic & Productivity calc
│   └── review/        # Version control & Feedback
├── database/
│   ├── models/        # Sequelize model definitions
│   └── migrations/    # SQL Schema versioning
└── services/          # Shared business logic
```

## 7. API Endpoint Design (REST)
- `POST /api/auth/login`: Returns Access & Refresh tokens.
- `POST /api/import/bid-sheet`: Process Excel file.
- `GET /api/projects`: List projects.
- `GET /api/tasks/artist/:userId`: Fetch workbench tasks.
- `PATCH /api/tasks/:taskId/status`: Update workflow state.
- `POST /api/timelogs/start`: Initialize a timer session.
- `POST /api/versions`: Submit a new work version.

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

### Task Assignment Flow
1. **Supervisor**: Assigns Task to a Lead.
2. **Lead**: Assigns Task to an Artist.
3. **Update**: Task status moves to 'Assigned'.

### Time Tracking Flow
1. **Start**: Artist clicks 'Start'. Create `TimeLog` with `StartTime`.
2. **Pause/Stop**: Update `TimeLog` with `EndTime`. Calculate `TotalMinutes`.
3. **Rollup**: Update `Task.ActualHours` = `Sum(TimeLogs.TotalMinutes) / 60`.

### Productivity Calculation Flow
- **Formula**: `(BidHours / ActualHours) * 100`.
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
