# Lumina VFX Hub - SQL Server Backend Readiness Blueprint (v3.0)

This document serves as the final technical implementation plan for the SQL Server backend, specifically aligned with the NTM Production Bid Sheet format and automated studio workflow.

## 1. Entity Relationship Validation (Hierarchical Flow)
The data flow follows a strict parent-child relationship to maintain the "Single Source of Truth":
**Projects** (1) ➔ **Sequences** (M) ➔ **Shots** (M) ➔ **Tasks** (M) ➔ **TimeLogs** (M) & **Versions** (M)

## 2. NTM Excel to SQL Server Mapping
| Excel Column Name | Database Table | Database Column | Logic / Transformation |
| :--- | :--- | :--- | :--- |
| **Shot Name*** | `Shots` | `ShotCode` | Unique identifier within sequence |
| **EP/Reel*** | `Sequences` | `SequenceCode` | Grouping key for shots |
| **Complexity*** | `Shots` | `Priority` | Enum: Low, Medium, High, Critical |
| **Roto Bid*** | `Tasks` | `BidHours` | Create Task where `PipelineStep = 'Roto'` |
| **Paint Bid*** | `Tasks` | `BidHours` | Create Task where `PipelineStep = 'Paint'` |
| **Comp*** | `Tasks` | `BidHours` | Create Task where `PipelineStep = 'Comp'` |
| **CG*** | `Tasks` | `BidHours` | Create Task where `PipelineStep = 'CG'` |
| **ETA** | `Shots` / `Tasks` | `DueDate` | Date format: YYYY-MM-DD |
| **Status** | `Shots` | `Status` | Initial production state |

## 3. Database Table Definitions (Finalized)
### Core Production
- **Projects**: `ProjectId`, `ProjectCode`, `ProjectName`, `ClientName`, `Status`, `StartDate`, `EndDate`
- **Sequences**: `SequenceId`, `ProjectId` (FK), `SequenceCode`
- **Shots**: `ShotId`, `SequenceId` (FK), `ShotCode`, `Priority`, `Status`, `DueDate`, `Description`
- **Tasks**: `TaskId`, `ShotId` (FK), `PipelineStep`, `TaskName`, `BidHours`, `SpentHours`, `RemainingHours`, `Status`, `DueDate`
- **TaskAssignments**: `AssignmentId`, `TaskId` (FK), `ArtistId` (FK), `AssignedById` (FK), `AssignedAt`, `IsCurrent`

### Tracking & Review
- **TimeLogs**: `LogId`, `TaskId` (FK), `ArtistId` (FK), `StartTime`, `EndTime`, `TotalMinutes`
- **Versions**: `VersionId`, `TaskId` (FK), `ArtistId` (FK), `VersionNumber`, `FilePath`, `ReviewStatus`, `ReviewComment`
- **ShotStatusHistory**: `HistoryId`, `ShotId` (FK), `StatusFrom`, `StatusTo`, `ChangedById` (FK), `ChangedAt`

### Resource & Admin
- **Users**: `UserId`, `EmployeeCode`, `Name`, `Email`, `Role`, `DepartmentId` (FK), `LeadId` (FK)
- **Departments**: `DepartmentId`, `Name`
- **Leaves**: `LeaveId`, `UserId` (FK), `StartDate`, `EndDate`, `Type`, `Status`
- **Notifications**: `NotificationId`, `UserId` (FK), `Message`, `Type`, `IsRead`, `CreatedAt`
- **UserSessions**: `SessionId`, `UserId` (FK), `RefreshToken`, `ExpiresAt`, `IsRevoked`

## 4. Foreign Key Relationships
1. `Sequences.ProjectId` ➔ `Projects.ProjectId` (ON DELETE CASCADE)
2. `Shots.SequenceId` ➔ `Sequences.SequenceId` (ON DELETE CASCADE)
3. `Tasks.ShotId` ➔ `Shots.ShotId` (ON DELETE CASCADE)
4. `TimeLogs.TaskId` ➔ `Tasks.TaskId` (ON DELETE CASCADE)
5. `Versions.TaskId` ➔ `Tasks.TaskId` (ON DELETE CASCADE)
6. `TaskAssignments.ArtistId` ➔ `Users.UserId`
7. `Users.DepartmentId` ➔ `Departments.DepartmentId`

## 5. Performance Index Strategy
- **Clustered Indexes**: All Primary Keys (UUIDs).
- **Non-Clustered Indexes**:
  - `Tasks(ShotId, PipelineStep)`: For fast lookup of pipeline status per shot.
  - `Shots(SequenceId)`: For fast sequence drill-down.
  - `TaskAssignments(ArtistId, IsCurrent)`: For "My Workbench" queries.
  - `TimeLogs(TaskId, EndTime)`: For calculating `SpentHours` aggregations.
  - `Users(Email)`: For authentication performance.

## 6. API Endpoint Design
### Ingestion
- `POST /api/import`: Processes NTM Excel binary, returns preview, and commits to SSoT.

### Production
- `GET /api/projects`: List all live projects.
- `GET /api/hierarchy/:projectId`: Returns nested Sequences and Shots.
- `GET /api/tasks/artist/:userId`: Returns current workbench tasks.
- `POST /api/tasks/:taskId/timer`: Start/Pause task (writes to `TimeLogs`).
- `POST /api/tasks/:taskId/submit`: Upload version (writes to `Versions`).

### Review & Management
- `GET /api/review-queue`: Returns tasks with status 'Pending Review'.
- `PATCH /api/versions/:versionId`: Approve/Retake version feedback.
- `GET /api/analytics/productivity`: Aggregates Bid vs Actual ratios.

## 7. Sequelize Model Structure (Associations)
- **Project** `hasMany` **Sequence**.
- **Sequence** `hasMany` **Shot**.
- **Shot** `hasMany` **Task**.
- **Task** `hasMany` **TimeLog** and `hasMany` **Version**.
- **Task** `belongsTo` **Shot**.
- **Artist** (User) `hasMany` **TaskAssignment**.
- **User** `hasMany` **Leave**.
- **Notification** `belongsTo` **User**.