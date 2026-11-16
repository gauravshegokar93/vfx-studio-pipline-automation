# Artist Assignment and Lead Department Queue Permissions Documentation

## Problem Summary
1. Users/Leads could not properly remove an assigned artist or reassign a task in Department Queue.
2. The unassign endpoint (`DELETE /api/assignments/:assignmentId`) threw a hard limitation check refusing deletion if time logs existed or claiming historical unassignment was not supported without schema changes.
3. Available bid was not correctly restored when an assignment was removed or adjusted.
4. Team Leads / Leads were either blocked from assignment actions or lacked properly enforced departmental boundaries in backend APIs.
5. In the UI, tasks with single artist legacy strings lacked explicit Unassign and Reassign action buttons.

---

## Root Cause Analysis
1. **Hardcoded Unassign Block in `assignmentsRoutes.js`**:
   The unassignment handler returned `400 Bad Request` with message: *"Safe historical unassignment is not supported without schema changes..."* whenever work logs were present, blocking unassignment entirely.
2. **Missing Lead Roles in Route Guards**:
   `secured()` in `assignmentsRoutes.js` only included `['Super Admin', 'Production Head', 'Project Manager']`, blocking `'Team Lead'` and `'Lead'` from writing assignments.
3. **Missing Department Boundary Enforcement**:
   No backend check verified that a Lead only accessed, assigned, removed, or reassigned tasks belonging to their assigned workflow department.
4. **Foreign Key & Bid Architecture**:
   `TimeLog` foreign keys reference `TaskMaster(TaskID)` and `UserMaster(UserId)` directly, NOT `TaskAssignment(AssignmentID)`. Therefore, removing an active row from `TaskAssignment` does not cascade or delete `TimeLog` records. Audit history belongs in `TaskAssignmentHistory`. Bid availability in `DepartmentQueue` is computed dynamically as `TaskMaster.EstimatedHours - SUM(TaskAssignment.TargetHours)`. Removing an unassigned row immediately restores that artist's unworked target hours to the task's available bid pool.

---

## Changes Implemented

### 1. Backend Authentication (`backend/controllers/authController.js`)
- Included `departmentName: user.DepartmentName` and `departmentId: user.HomeDepartmentId` in the JWT access token payload (`signAccessToken`).

### 2. Assignments Route & Permission Enforcement (`backend/routes/assignmentsRoutes.js`)
- **Role Permission**: Updated `secured()` and `securedReadOnly()` to include `'Team Lead'` and `'Lead'`.
- **Department Boundary Helper (`getLeadDepartment`)**:
  - Resolves Lead's department name and maps it to `WorkflowStageMaster` stage ID (`Roto` -> 1, `Paint` -> 2, `Comp` -> 3, `CG` -> 4).
- **Safe Unassignment (`unassignTask`)**:
  - Validates Lead department permissions (Lead can only unassign tasks in their department; 403 Forbidden otherwise).
  - Queries `TimeLog` for actual hours worked by the artist (preserves work logs).
  - Logs unassignment event to `TaskAssignmentHistory` with `AssignmentType = 'Unassigned'` and detailed remarks preserving actual hours worked and released target bid.
  - Deletes active row from `TaskAssignment`, immediately returning unworked hours (`TargetHours - ActualHours`) back to the task's unallocated bid pool.
  - Updates `TaskMaster.StatusID`: Sets to `NULL` (Unassigned) if no artists remain on the task, or recalculates based on remaining active assignments.
- **Task Assignment (`assignTask`)**:
  - Enforces Lead department boundaries on both the task's workflow stage and the artist's department.
  - Automatically updates `TaskMaster.StatusID = 1` (Assigned) if previously unassigned.
  - Logs `AssignmentType = 'Assign'` to `TaskAssignmentHistory`.
- **Reassign Remaining Bid (`reassignRemainingBid`)**:
  - Enforces Lead department boundaries on task and new artist.
  - Transfers unworked target hours from original artist to new artist.
  - Logs audit records for both unassigning old artist and assigning new artist in `TaskAssignmentHistory`.
- **Adjust Target & Eligible Artists (`adjustTarget`, `getEligibleArtists`)**:
  - Enforced Lead department constraints.

### 3. Department Queue API (`backend/routes/tasksRoutes.js`)
- Added `router.get('/department-queue', secured(getDepartmentQueue))` to support requests with or without `:stageId`.
- In `getDepartmentQueue`:
  - When accessed by a Lead (`Team Lead` / `Lead`), strictly applies `t.WorkflowStageID = @LeadStageId`, preventing cross-department queue leakage.
  - Added `MAX(ta.AssignmentID) as anyAssignmentId` to subqueries and exposed `assignmentId`.

### 4. Frontend Department Queue UI (`src/app/department-queue/page.tsx`)
- Updated `ArtistCell`: Added explicit **Reassign** and **Unassign** action buttons for fallback single artist representations.
- Added Lead department auto-detection: When a Lead logs in, their stage tab is automatically selected and locked to their department queue.

---

## Verification & Testing

### Test Suite Execution (`scratch/test_assignment_flow.js`)
1. **Lead Queue Filtering**:
   - Logged in as Roto Team Lead (`UserId: 1074`, Nilesh Borse).
   - Fetched department queue. Verified all returned tasks had `stageId = 1` (Roto). Zero tasks leaked from Paint, Comp, or CG.
2. **Assign Artist A**:
   - Assigned Artist A (Kiran Gajanand Rathod, Roto artist, `UserId: 1051`) with 1.0 Bid (8.0 hours).
   - Response: `200 OK`. `TaskAssignment` record created, `TaskMaster.StatusID` set to `1` (Assigned). Queue remaining bid decreased by 8.0 hours.
3. **Remove Assignment (Unassign Artist A)**:
   - Called `DELETE /api/assignments/:assignmentId`.
   - Response: `200 OK`. `TaskAssignment` record removed.
   - `TaskAssignmentHistory` recorded `AssignmentType = 'Unassigned'` audit record.
   - `TaskMaster.StatusID` cleanly reset to `NULL` (Unassigned).
   - Full bid (16.0 hours / 2.0 bid) restored in Department Queue.
4. **Assign Artist B**:
   - Assigned Artist B (Roshan Eknath Randhe, Roto artist, `UserId: 1052`).
   - Response: `200 OK`. Assignment verified.
5. **Reassign Artist B -> Artist C**:
   - Called `POST /api/assignments/:assignmentId/reassign` with `newUserId: 1053` (Kapil Kumar, Roto artist).
   - Response: `200 OK`. Artist B unassigned, Artist C assigned.
   - Audit trail in `TaskAssignmentHistory` logged for all transitions.
6. **Lead Department Boundary Enforcement**:
   - Roto Lead attempting to assign Paint artist to Roto task -> Blocked with `400 Bad Request`.
   - Roto Lead attempting to assign a Paint task -> Blocked with `403 Forbidden: Leads can only assign tasks within their department (Roto)`.
7. **Task State Restoration & Production Safety**:
   - Test task cleanly restored to its exact initial state (`EstimatedHours = 0`, `StatusID = NULL`).
   - Production database safety maintained: 0 tables dropped/truncated, all production `TimeLog` records preserved.
8. **Production Build**:
   - `npm run build` executed and compiled successfully in 4.6s with 0 errors across all 29 routes.


### 5. Assignment Status Inconsistency Fix (`FMK_R1_000_0065_Paint` and Queue)
- **Root Cause**:
  Task 475 (`FMK_R1_000_0065_Paint`) had been unassigned on 2026-11-03 11:22:06 prior to the unassign bugfix. The old legacy unassign operation removed the row from `TaskAssignment` but left `TaskMaster.StatusID = 1` ('Assigned') in the database. Furthermore, SQL queries in `listTasks`, `getDepartmentQueue`, and `getTaskById` directly read `st.StatusName` without guarding against orphaned task status when 0 active assignments exist.
- **Backend Consistency**:
  In `backend/routes/tasksRoutes.js`, updated status computation in `getDepartmentQueue`, `listTasks`, and `getTaskById`:
  ```sql
  CASE
    WHEN ta_agg.anyUserId IS NULL THEN 'Unassigned'
    ELSE ISNULL(st.StatusName, 'Assigned')
  END AS status,
  CASE
    WHEN ta_agg.anyUserId IS NULL THEN NULL
    ELSE t.StatusID
  END AS statusId,
  ```
- **Frontend Consistency**:
  In `src/app/department-queue/page.tsx`, restructured row evaluation so `hasAnyArtists` is verified before status badges. If `!hasAnyArtists`, the task status badge is guaranteed to display `Unassigned` with muted gray styling, ensuring 100% visual consistency with `ArtistCell`.
- **Database Alignment**:
  Updated Task 475 (`UPDATE TaskMaster SET StatusID = NULL WHERE TaskID = 475 AND StatusID = 1 AND (SELECT COUNT(*) FROM TaskAssignment WHERE TaskID = 475) = 0`).
  Audited all 35 production tasks to confirm that every task with 0 active assignments has `StatusID = NULL`.
