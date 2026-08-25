# DATABASE.md

Complete database documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. ER Diagram

```
Departments (1) ──── (M) Users
Users (1) ──── (M) UserCredentials
Users (1) ──── (M) UserSessions
Users (1) ──── (M) Leaves
Users (1) ──── (M) Notifications
Users (1) ──── (M) TaskAssignments (as Artist/Lead/Supervisor)

Projects (1) ──── (M) Sequences
Projects (1) ──── (M) Clients (via ClientId FK)

Sequences (1) ──── (M) Shots
Sequences (M) ──── (1) Episodes
Episodes (1) ──── (M) Sequences

Shots (1) ──── (M) Tasks
Shots (1) ──── (M) ShotStatusHistory

Tasks (1) ──── (M) TaskAssignments
Tasks (1) ──── (M) TimeLogs
Tasks (1) ──── (M) Versions

BidSheetImport (staging table, no FKs)
```

---

## 2. Tables

### Departments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| DepartmentId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| Name | NVARCHAR(100) | No | - | Department name (unique) |

**Indexes**: PK_Departments (clustered on DepartmentId)

---

### Users
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| UserId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| EmployeeCode | NVARCHAR(50) | No | - | Unique studio ID (e.g., ART-000001) |
| Name | NVARCHAR(255) | No | - | Full name |
| Email | NVARCHAR(255) | No | - | Corporate email (unique) |
| PasswordHash | NVARCHAR(MAX) | No | - | Bcrypt hashed password |
| Role | NVARCHAR(50) | No | - | 'Production Head', 'Department Supervisor', 'Lead', 'Artist' |
| DepartmentId | UNIQUEIDENTIFIER | Yes | NULL | FK to Departments |
| LeadId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users (self-referential, reporting manager) |
| IsActive | BIT | No | 1 | Account status |
| IsFirstLogin | BIT | No | 1 | Forces password reset |
| AvatarUrl | NVARCHAR(MAX) | Yes | NULL | Profile picture URL |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation timestamp |
| UpdatedAt | DATETIME2 | No | GETDATE() | Record update timestamp |

**Foreign Keys**:
- `FK_Users_Departments`: DepartmentId → Departments(DepartmentId)

**Indexes**:
- PK_Users (clustered on UserId)
- IX_Users_Email (non-clustered on Email)

---

### UserCredentials
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| CredentialId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| UserId | UNIQUEIDENTIFIER | No | - | FK to Users (unique) |
| Username | NVARCHAR(100) | No | - | SSoT login name (unique) |
| PasswordHash | NVARCHAR(MAX) | Yes | NULL | Hashed password |
| TempPassword | NVARCHAR(MAX) | Yes | NULL | Clear-text temp password for onboarding |
| LastChangedAt | DATETIME | No | GETDATE() | Last credential update |

**Foreign Keys**:
- `FK_UserCredentials_Users`: UserId → Users(UserId) ON DELETE CASCADE

---

### UserSessions
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| SessionId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| UserId | UNIQUEIDENTIFIER | No | - | FK to Users |
| RefreshToken | NVARCHAR(MAX) | No | - | JWT refresh token |
| ExpiresAt | DATETIME2 | No | - | Token expiration |
| UserAgent | NVARCHAR(MAX) | Yes | NULL | Browser user agent |
| IPAddress | NVARCHAR(50) | Yes | NULL | Client IP |
| IsRevoked | BIT | No | 0 | Token revocation flag |
| CreatedAt | DATETIME2 | No | GETDATE() | Session creation |

**Foreign Keys**:
- `FK_UserSessions_Users`: UserId → Users(UserId)

**Indexes**:
- IX_UserSessions_RefreshToken (non-clustered on RefreshToken)

---

### Clients
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| ClientId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ClientName | NVARCHAR(255) | No | - | Client name (unique) |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

---

### Projects
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| ProjectId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ProjectCode | NVARCHAR(50) | No | - | Unique project code (e.g., NTM) |
| ProjectName | NVARCHAR(255) | No | - | Project display name |
| ClientName | NVARCHAR(255) | Yes | NULL | Client name (denormalized) |
| ClientId | UNIQUEIDENTIFIER | Yes | NULL | FK to Clients |
| Status | NVARCHAR(50) | No | 'In-Production' | 'Pre-Production', 'In-Production', 'Post-Production', 'Completed', 'On-Hold' |
| StartDate | DATE | Yes | NULL | Project start |
| EndDate | DATE | Yes | NULL | Project end |
| ThumbnailUrl | NVARCHAR(MAX) | Yes | NULL | Project thumbnail |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

**Foreign Keys**:
- `FK_Projects_Clients`: ClientId → Clients(ClientId)

**Indexes**:
- PK_Projects (clustered on ProjectId)
- IX_Projects_ProjectCode (unique, non-clustered)

---

### Episodes
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| EpisodeId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ProjectId | UNIQUEIDENTIFIER | No | - | FK to Projects |
| EpisodeName | NVARCHAR(255) | No | - | Episode/Reel name |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

**Foreign Keys**:
- `FK_Episodes_Projects`: ProjectId → Projects(ProjectId) ON DELETE CASCADE

**Unique Constraints**: UNIQUE(ProjectId, EpisodeName)

---

### Sequences
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| SequenceId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ProjectId | UNIQUEIDENTIFIER | No | - | FK to Projects |
| EpisodeId | UNIQUEIDENTIFIER | Yes | NULL | FK to Episodes |
| SequenceCode | NVARCHAR(50) | No | - | Sequence code (e.g., EP01, R01) |

**Foreign Keys**:
- `FK_Sequences_Projects`: ProjectId → Projects(ProjectId) ON DELETE CASCADE
- `FK_Sequences_Episodes`: EpisodeId → Episodes(EpisodeId)

**Unique Constraints**: UNIQUE(ProjectId, SequenceCode)

---

### Shots
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| ShotId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| SequenceId | UNIQUEIDENTIFIER | No | - | FK to Sequences |
| ShotCode | NVARCHAR(100) | No | - | Shot name (unique within sequence) |
| Status | NVARCHAR(50) | No | 'Not Started' | Production status |
| Priority | NVARCHAR(20) | No | 'Medium' | 'Low', 'Medium', 'High', 'Critical' |
| DueDate | DATE | Yes | NULL | Shot deadline |
| Description | NVARCHAR(MAX) | Yes | NULL | Shot description |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

**Foreign Keys**:
- `FK_Shots_Sequences`: SequenceId → Sequences(SequenceId) ON DELETE CASCADE

**Unique Constraints**: UNIQUE(SequenceId, ShotCode)

**Indexes**:
- PK_Shots (clustered on ShotId)
- IX_Shots_SequenceId (non-clustered on SequenceId)

---

### Tasks
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| TaskId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ShotId | UNIQUEIDENTIFIER | No | - | FK to Shots |
| PipelineStep | NVARCHAR(50) | No | - | 'Roto', 'Paint', 'Comp', 'CG', 'Matchmove', etc. |
| TaskName | NVARCHAR(255) | No | - | Task display name |
| SupervisorId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| LeadId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| ArtistId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| BidHours | DECIMAL(10,2) | No | 0 | Estimated hours from client |
| SpentHours | DECIMAL(10,2) | No | 0 | Actual hours logged |
| RemainingHours | DECIMAL(10,2) | No | 0 | BidHours - SpentHours |
| Status | NVARCHAR(50) | No | 'Not Started' | Task lifecycle status |
| Progress | INT | No | 0 | 0-100 percentage |
| InternalEta | DATE | Yes | NULL | Internal deadline |
| ReviewStatus | NVARCHAR(50) | No | 'Pending' | 'Pending', 'In Review', 'Changes Requested', 'Approved' |
| StartDate | DATE | Yes | NULL | Task start date |
| DueDate | DATE | Yes | NULL | Task deadline |
| Priority | NVARCHAR(20) | Yes | NULL | Task priority |
| LatestArtistComment | NVARCHAR(MAX) | Yes | NULL | Latest artist note |
| LatestLeadComment | NVARCHAR(MAX) | Yes | NULL | Latest lead QC comment |
| LatestSupComment | NVARCHAR(MAX) | Yes | NULL | Latest supervisor comment |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

**Foreign Keys**:
- `FK_Tasks_Shots`: ShotId → Shots(ShotId) ON DELETE CASCADE
- `FK_Tasks_Users_Supervisor`: SupervisorId → Users(UserId)
- `FK_Tasks_Users_Lead`: LeadId → Users(UserId)
- `FK_Tasks_Users_Artist`: ArtistId → Users(UserId)

**Indexes**:
- PK_Tasks (clustered on TaskId)
- IX_Tasks_ShotId (non-clustered on ShotId)
- IX_Tasks_ArtistId (non-clustered on ArtistId)

---

### TaskAssignments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| AssignmentId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| TaskId | UNIQUEIDENTIFIER | No | - | FK to Tasks |
| ArtistId | UNIQUEIDENTIFIER | No | - | FK to Users |
| LeadId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| SupervisorId | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| AssignedAt | DATETIME | No | GETDATE() | Assignment timestamp |
| IsCurrent | BIT | No | 1 | Current assignment flag |

**Foreign Keys**:
- `FK_TaskAssignments_Tasks`: TaskId → Tasks(TaskId) ON DELETE CASCADE
- `FK_TaskAssignments_Users_Artist`: ArtistId → Users(UserId)
- `FK_TaskAssignments_Users_Lead`: LeadId → Users(UserId)
- `FK_TaskAssignments_Users_Supervisor`: SupervisorId → Users(UserId)

**Note**: When a new assignment is created, previous assignments for the same task are set to `IsCurrent = 0`.

---

### TimeLogs
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| LogId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| TaskId | UNIQUEIDENTIFIER | No | - | FK to Tasks |
| ArtistId | UNIQUEIDENTIFIER | No | - | FK to Users |
| StartTime | DATETIME2 | No | - | Timer start |
| EndTime | DATETIME2 | Yes | NULL | Timer end |
| TotalMinutes | INT | No | 0 | Calculated duration |
| CreatedAt | DATETIME2 | No | GETDATE() | Record creation |

**Foreign Keys**:
- `FK_TimeLogs_Tasks`: TaskId → Tasks(TaskId) ON DELETE CASCADE
- `FK_TimeLogs_Users`: ArtistId → Users(UserId)

---

### Versions
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| VersionId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| TaskId | UNIQUEIDENTIFIER | No | - | FK to Tasks |
| ArtistId | UNIQUEIDENTIFIER | No | - | FK to Users |
| VersionNumber | INT | No | - | Sequential version number |
| FilePath | NVARCHAR(MAX) | Yes | NULL | Render output path |
| ReviewStatus | NVARCHAR(50) | No | 'Pending Review' | QC status |
| ReviewComment | NVARCHAR(MAX) | Yes | NULL | QC feedback |
| CreatedAt | DATETIME2 | No | GETDATE() | Submission timestamp |

**Foreign Keys**:
- `FK_Versions_Tasks`: TaskId → Tasks(TaskId) ON DELETE CASCADE
- `FK_Versions_Users`: ArtistId → Users(UserId)

---

### Leaves
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| LeaveId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| UserId | UNIQUEIDENTIFIER | No | - | FK to Users |
| StartDate | DATE | No | - | Leave start |
| EndDate | DATE | No | - | Leave end |
| Type | NVARCHAR(50) | Yes | NULL | 'Vacation', 'Sick', 'Holiday' |
| Status | NVARCHAR(50) | No | 'Pending' | 'Pending', 'Approved', 'Rejected' |
| CreatedAt | DATETIME2 | No | GETDATE() | Request timestamp |

**Foreign Keys**:
- `FK_Leaves_Users`: UserId → Users(UserId) ON DELETE CASCADE

---

### Notifications
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| NotificationId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| UserId | UNIQUEIDENTIFIER | No | - | FK to Users |
| Message | NVARCHAR(MAX) | No | - | Notification text |
| Type | NVARCHAR(50) | Yes | NULL | 'TaskAssignment', 'ReviewRetake', 'DeadlineWarning' |
| IsRead | BIT | No | 0 | Read status |
| CreatedAt | DATETIME2 | No | GETDATE() | Creation timestamp |

**Foreign Keys**:
- `FK_Notifications_Users`: UserId → Users(UserId) ON DELETE CASCADE

**Indexes**:
- IX_Notifications_UserId_IsRead (non-clustered on UserId, IsRead)

---

### ShotStatusHistory
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| HistoryId | UNIQUEIDENTIFIER | No | NEWID() | Primary Key |
| ShotId | UNIQUEIDENTIFIER | No | - | FK to Shots |
| StatusFrom | NVARCHAR(50) | Yes | NULL | Previous status |
| StatusTo | NVARCHAR(50) | Yes | NULL | New status |
| ChangedById | UNIQUEIDENTIFIER | Yes | NULL | FK to Users |
| ChangedAt | DATETIME2 | No | GETDATE() | Change timestamp |

**Foreign Keys**:
- `FK_ShotStatusHistory_Shots`: ShotId → Shots(ShotId) ON DELETE CASCADE
- `FK_ShotStatusHistory_Users`: ChangedById → Users(UserId)

---

### BidSheetImport (Staging)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| Id | INT | No | IDENTITY(1,1) | Primary Key |
| RowNumber | INT | Yes | NULL | Excel row number |
| ClientShotName | NVARCHAR(255) | Yes | NULL | Client shot name |
| ShotName | NVARCHAR(255) | Yes | NULL | Shot name |
| ShotType | NVARCHAR(100) | Yes | NULL | Shot type |
| Episode | NVARCHAR(100) | Yes | NULL | Episode/Reel |
| FrameRange | NVARCHAR(100) | Yes | NULL | Frame range |
| CutSummary | NVARCHAR(MAX) | Yes | NULL | Cut summary |
| VFXWorkDescription | NVARCHAR(MAX) | Yes | NULL | VFX scope |
| Complexity | NVARCHAR(50) | Yes | NULL | Complexity level |
| RotoBid | DECIMAL(10,2) | Yes | NULL | Roto bid hours |
| PaintBid | DECIMAL(10,2) | Yes | NULL | Paint bid hours |
| CompBid | DECIMAL(10,2) | Yes | NULL | Comp bid hours |
| CGBid | DECIMAL(10,2) | Yes | NULL | CG bid hours |
| RetimeRepo | DECIMAL(10,2) | Yes | NULL | Retime/Repo bid hours |
| TotalBid | DECIMAL(10,2) | Yes | NULL | Total bid hours |
| Artist | NVARCHAR(255) | Yes | NULL | Assigned artist name |
| Lead | NVARCHAR(255) | Yes | NULL | Assigned lead name |
| StartDate | DATE | Yes | NULL | Start date |
| ETA | DATE | Yes | NULL | Estimated delivery |
| Status | NVARCHAR(100) | Yes | NULL | Shot status |
| ClientETA | DATE | Yes | NULL | Client ETA |
| DeliveryDate | DATE | Yes | NULL | Delivery date |
| ImportedAt | DATETIME2 | No | GETDATE() | Import timestamp |
| Converted | BIT | No | 0 | Conversion flag |

**Note**: This table has no foreign keys. It's a staging area for Excel imports.

---

### EmployeeCodeCounters (Auto-generated)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| CounterName | NVARCHAR(100) | No | - | Primary Key (e.g., 'ART') |
| CurrentValue | BIGINT | No | 0 | Current counter value |

**Purpose**: Auto-generates employee codes like `ART-000001`.

---

## 3. Relationships Summary

| Parent Table | Child Table | Relationship | Delete Behavior |
|-------------|-------------|--------------|-----------------|
| Departments | Users | 1:M | RESTRICT |
| Users | UserCredentials | 1:M | CASCADE |
| Users | UserSessions | 1:M | RESTRICT |
| Users | Leaves | 1:M | CASCADE |
| Users | Notifications | 1:M | CASCADE |
| Users | TaskAssignments | 1:M | RESTRICT |
| Projects | Sequences | 1:M | CASCADE |
| Projects | Clients | 1:1 (via ClientId) | RESTRICT |
| Episodes | Sequences | 1:M | RESTRICT |
| Sequences | Shots | 1:M | CASCADE |
| Shots | Tasks | 1:M | CASCADE |
| Shots | ShotStatusHistory | 1:M | CASCADE |
| Tasks | TaskAssignments | 1:M | CASCADE |
| Tasks | TimeLogs | 1:M | CASCADE |
| Tasks | Versions | 1:M | CASCADE |

---

## 4. Seed Data

### Departments
```sql
INSERT INTO Departments (DepartmentId, Name) VALUES
(NEWID(), 'Comp'),
(NEWID(), 'Roto'),
(NEWID(), 'Paint'),
(NEWID(), 'CG'),
(NEWID(), 'Matchmove');
```

### Default Users (from docs)
No explicit seed data in SQL scripts, but the system expects:
- Production Head
- Department Supervisors (one per department)
- Leads
- Artists

---

## 5. Migrations

### Run Migrations
```bash
cd backend
node scripts/run-migrations.js
```

### Migration Script Adds
1. `Clients` table (if not exists)
2. `ClientId` column to `Projects` (if not exists)
3. `Episodes` table (if not exists)
4. `EpisodeId` column to `Sequences` (if not exists)
5. `Converted` column to `BidSheetImport` (if not exists)

---

## 6. Views

No database views are currently defined. Analytics are calculated in the frontend (`analyticsService.ts`) or backend (`conversionService.js`).

---

## 7. Stored Procedures

No stored procedures are currently defined. All queries are executed as inline SQL via the `mssql` driver.

---

## 8. Functions

No custom database functions are currently defined.

---

## 9. Triggers

No triggers are currently defined.

---

## 10. Important Notes

1. **`database-schema.sql` is broken**: Contains duplicate `CREATE TABLE Projects` and `BidSheetImport` blocks. Use `docs/db-setup.sql` as the source of truth.
2. **`BidSheetImport` has two versions**: The original had 20 generic `Column1-Column20` columns. The current version has named columns matching Excel headers.
3. **`Tasks` table has both `LeadId`/`ArtistId` columns AND `TaskAssignments` table**: The direct columns are used by the legacy import flow; `TaskAssignments` is used by the new assignment flow.
4. **UUIDs are generated by SQL Server**: `DEFAULT NEWID()` on most primary keys.
5. **`EmployeeCodeCounters` is auto-created**: The `artistController.js` creates this table on first use if it doesn't exist.
