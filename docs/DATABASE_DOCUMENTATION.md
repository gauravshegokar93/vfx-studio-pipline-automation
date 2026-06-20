# SM rolling FX | Database Documentation

## 1. Entity Relationship Overview
The database uses a **strict hierarchical structure** to maintain the Single Source of Truth (SSoT).

- **Projects** (1:M) **Sequences**
- **Sequences** (1:M) **Shots**
- **Shots** (1:M) **Tasks**
- **Tasks** (1:M) **TimeLogs** & **Versions**
- **Users** (1:M) **TaskAssignments**

## 2. Table Definitions

### `Users`
| Column | Type | Description |
| :--- | :--- | :--- |
| UserId | UUID (PK) | Primary Key |
| EmployeeCode | VARCHAR(20) | Unique Studio ID |
| Name | VARCHAR(100) | Full Name |
| Email | VARCHAR(100) | Corporate Email |
| Role | ENUM | PH, Supervisor, Lead, Artist |
| DepartmentId | UUID (FK) | Reference to Departments |
| LeadId | UUID (FK) | Reporting Manager (Recursive FK) |
| IsActive | BOOLEAN | Account Status |

### `UserCredentials`
| Column | Type | Description |
| :--- | :--- | :--- |
| CredentialId | UUID (PK) | Primary Key |
| UserId | UUID (FK) | Link to Users table |
| Username | VARCHAR(50) | SSoT Login Name |
| PasswordHash | VARCHAR(MAX) | Hashed Secret |
| TempPassword | VARCHAR(50) | Clear-text temporary password for onboarding |
| IsFirstLogin | BOOLEAN | Forces reset on next access |

### `Tasks`
| Column | Type | Description |
| :--- | :--- | :--- |
| TaskId | UUID (PK) | Primary Key |
| ShotId | UUID (FK) | Link to Shots |
| PipelineStep | VARCHAR(20) | Roto, Paint, Comp, etc. |
| BidHours | DECIMAL | Estimated time from client |
| SpentHours | DECIMAL | Aggregated from TimeLogs |
| Status | VARCHAR(20) | In Progress, Approved, etc. |

## 3. Indexing Strategy
- **Clustered**: All `Id` columns.
- **Non-Clustered**:
    - `Tasks(ShotId, PipelineStep)`: Rapid lookup of shot progress.
    - `Users(Email)`: Authentication performance.
    - `TimeLogs(TaskId, ArtistId)`: Productivity aggregation.

## 4. Referential Integrity
- **ON DELETE CASCADE**: Applied to the chain `Project -> Sequence -> Shot -> Task`.
- **ON DELETE SET NULL**: Applied to `TaskAssignments` if a user is offboarded.
