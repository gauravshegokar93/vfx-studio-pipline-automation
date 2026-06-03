# VFX Production Intelligence Platform - SQL Server Backend Blueprint (v2.0)

This document outlines the high-concurrency, production-grade technical architecture for the Node.js / Sequelize / SQL Server backend.

## 1. Entity Relationship Diagram (ERD)
The hierarchy follows a strict VFX pipeline with auditing and session tracking:
`Projects` > `Sequences` > `Shots` (`ShotStatusHistory`) > `Tasks` (`TaskAssignments`) > (`TimeLogs`, `Versions` (`VersionComments`), `Comments`).
`Users` and `Departments` are cross-cutting, supported by `UserSessions`, `Notifications`, and `Leaves`.

## 2. Database Schema & Table Definitions

### Users & Authentication
**Users**
- `UserId` (PK, UNIQUEIDENTIFIER)
- `EmployeeCode` (UNIQUE, NVARCHAR(50))
- `Name` (NVARCHAR(255))
- `Email` (UNIQUE, NVARCHAR(255))
- `PasswordHash` (NVARCHAR(MAX))
- `Role` (NVARCHAR(50))
- `DepartmentId` (FK -> Departments)
- `LeadId` (FK -> Users)
- `IsActive` (BIT, Default: 1)

**UserSessions**
- `SessionId` (PK, UNIQUEIDENTIFIER)
- `UserId` (FK -> Users)
- `RefreshToken` (NVARCHAR(MAX))
- `ExpiresAt` (DATETIME2)
- `UserAgent` (NVARCHAR(MAX))
- `IPAddress` (NVARCHAR(50))
- `IsRevoked` (BIT, Default: 0)

### Resource Management
**Leaves** (Crucial for AI Scheduling)
- `LeaveId` (PK, UNIQUEIDENTIFIER)
- `UserId` (FK -> Users)
- `StartDate` (DATE)
- `EndDate` (DATE)
- `Type` (NVARCHAR(50)) - 'Vacation', 'Sick', 'Holiday'
- `Status` (NVARCHAR(50)) - 'Pending', 'Approved', 'Rejected'

**Notifications**
- `NotificationId` (PK, UNIQUEIDENTIFIER)
- `UserId` (FK -> Users)
- `Message` (NVARCHAR(MAX))
- `Type` (NVARCHAR(50)) - 'TaskAssignment', 'ReviewRetake', 'DeadlineWarning'
- `IsRead` (BIT, Default: 0)
- `CreatedAt` (DATETIME2)

### Production Hierarchy
**Projects**
- `ProjectId` (PK, UNIQUEIDENTIFIER)
- `ProjectCode` (UNIQUE, NVARCHAR(50))
- `ProjectName` (NVARCHAR(255))
- `ClientName` (NVARCHAR(255))
- `Status` (NVARCHAR(50))
- `StartDate`, `EndDate` (DATE)

**Sequences**
- `SequenceId` (PK, UNIQUEIDENTIFIER)
- `ProjectId` (FK -> Projects)
- `SequenceCode` (NVARCHAR(50))

**Shots**
- `ShotId` (PK, UNIQUEIDENTIFIER)
- `SequenceId` (FK -> Sequences)
- `ShotCode` (NVARCHAR(50))
- `Priority` (NVARCHAR(20))
- `Status` (NVARCHAR(50))
- `DueDate` (DATE)

**ShotStatusHistory** (Audit Trail)
- `HistoryId` (PK, UNIQUEIDENTIFIER)
- `ShotId` (FK -> Shots)
- `StatusFrom`, `StatusTo` (NVARCHAR(50))
- `ChangedById` (FK -> Users)
- `ChangedAt` (DATETIME2)

**Tasks**
- `TaskId` (PK, UNIQUEIDENTIFIER)
- `ShotId` (FK -> Shots)
- `PipelineStep` (NVARCHAR(50))
- `BidHours` (DECIMAL)
- `ActualHours` (DECIMAL)
- `Status` (NVARCHAR(50))

**TaskAssignments** (Tracking Assignment History)
- `AssignmentId` (PK, UNIQUEIDENTIFIER)
- `TaskId` (FK -> Tasks)
- `ArtistId` (FK -> Users)
- `AssignedById` (FK -> Users)
- `AssignedAt` (DATETIME2)
- `IsCurrent` (BIT, Default: 1)

### Feedback & Review
**Versions**
- `VersionId` (PK, UNIQUEIDENTIFIER)
- `TaskId` (FK -> Tasks)
- `ArtistId` (FK -> Users)
- `VersionNumber` (INT)
- `FilePath` (NVARCHAR(MAX))
- `ReviewStatus` (NVARCHAR(50))

**VersionComments** (Specific to a Version submission)
- `VersionCommentId` (PK, UNIQUEIDENTIFIER)
- `VersionId` (FK -> Versions)
- `UserId` (FK -> Users)
- `CommentText` (NVARCHAR(MAX))
- `TimestampInFrames` (INT, Optional)

## 3. Table Relationships & Foreign Keys
- **1:M**: `Users` -> `UserSessions`, `Leaves`, `Notifications`.
- **1:M**: `Shots` -> `ShotStatusHistory`.
- **1:M**: `Tasks` -> `TaskAssignments`.
- **1:M**: `Versions` -> `VersionComments`.

## 4. Index Strategy
- **Covering Index**: `TaskAssignments(ArtistId, IsCurrent)` for "My Workbench" queries.
- **Clustered Index**: All Primary Keys.
- **Non-Clustered**: `UserSessions(RefreshToken)` for quick validation.
- **Filtered Index**: `Notifications(UserId)` where `IsRead = 0`.

## 5. SQL Server Naming Conventions
- **Tables**: PascalCase, Plural (e.g., `ShotStatusHistory`).
- **Columns**: PascalCase, singular (e.g., `IsRevoked`).

## 6. Updated Business Flows

### Production Authentication Flow
1. Login verifies credentials.
2. Create `UserSession` entry with RefreshToken.
3. AccessToken (JWT) contains `UserId` and `Role`.
4. On every request, verify `IsRevoked = 0` in `UserSessions`.

### Intelligent Scheduling Flow
1. Query `UnassignedTasks`.
2. Query `Artists` availability, subtracting dates found in `Leaves` (Status: 'Approved').
3. AI generates suggestions.
4. On "Commit", write entries to `TaskAssignments` and trigger `Notifications`.

### Version Review & Feedback Flow
1. Artist submits `Version`.
2. Supervisor reviews, creates `VersionComments`.
3. If 'Retake', `ShotStatusHistory` is updated.
4. `Notification` sent to Artist immediately.

### Resource Utilization Flow
- Productivity = `(BidHours / SUM(TimeLogs.TotalMinutes/60)) * 100`.
- Display alerts if `ActualHours > BidHours`.