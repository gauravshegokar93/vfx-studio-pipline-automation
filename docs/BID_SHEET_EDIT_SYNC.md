# Bid Sheet Edit and Department Queue Synchronization

## 1. Overview
This document records the root cause, implementation details, API modifications, database tables, and verification results for Task 1: Bid Sheet Edit and Department Queue Synchronization.

---

## 2. Root Cause Analysis
When editing an existing row in **Import Details** (`PUT /api/import/rows/:rowId`), updated values did not consistently reflect in **Department Queue**, **Department Progress**, **Lead Dashboard**, **Production Head Dashboard**, **Artist Task Details**, or **Analytics**.

### Primary Root Causes:
1. **Broken Multi-Level Hierarchy Lookup in `updateRow`**:
   The original implementation in `backend/services/importService.js` attempted to locate the corresponding shot by strictly traversing:
   `ProjectMaster` &rarr; `ReelMaster` (matching `row.Episode`) &rarr; `SequenceMaster` (matching `row.Episode`) &rarr; `ShotMaster` (matching `SequenceId` and `ShotCode`).
   In the database, only the first reel/sequence was created during batch approval (all shots in `ShotMaster` were associated with `SequenceId = 1`). Whenever any shot belonging to another reel (e.g., `R2`, `R3`, `R4`) was edited, the reel/sequence query returned zero records. This aborted the entire shot/task update block silently, leaving `TaskMaster` untouched.

2. **Incomplete Field Synchronization**:
   - `TaskMaster.EstimatedHours` was updated only for already-existing tasks. If a department bid was previously 0 and updated to > 0, the task was never created.
   - `TaskMaster.DueDate` (from `ETA`) was omitted.
   - `ShotMaster` fields (`ShotCode`, `FrameStart` / `HeadIn`, `FrameEnd` / `TailOut`, `Duration`) were never updated.
   - Dependent calculations (`TotalBid = RotoBid + PaintBid + CompBid + CGBid`, `FrameRange = TailOut - HeadIn + 1`) were not computed on save.

3. **Frontend Omissions & Refresh Lag**:
   - In `src/app/import/page.tsx`, the `Notes` field was missing from table headers, display rows, and edit inputs.
   - Automatic dependent recalculation was missing when entering bid values or frame numbers.
   - `saveEdit` did not refresh batch summaries after saving, leading to stale summary cards.

---

## 3. Files Modified
- [`backend/services/importService.js`](file:///c:/SM_ROLLING_FX_v1.1/vfx-studio-pipline-automation/backend/services/importService.js):
  - Refactored `exports.updateRow`:
    - Resolved shot directly using existing shot's primary key (`ShotMaster.ShotId`).
    - Updated `ShotMaster` (`ShotCode`, `FrameStart`, `FrameEnd`, `Duration`) in-place without duplicates.
    - Synchronized Reel/Sequence relations when `Episode` changes.
    - Dynamically resolved workflow stages and updated `TaskMaster` (`EstimatedHours`, `DueDate`, `Description`, `TaskCode`, `TaskName`).
    - Added task creation for newly non-zero department bids while strictly preserving existing assignments, status, and task history.
    - Implemented dependent recalculations for `TotalBid` and `FrameRange`.
    - Executed validation (`runValidations`) on merged values and updated `ValidationStatus` and `ValidationMessage`.
    - Returned fresh updated record from database (`updatedRow`).
- [`src/app/import/page.tsx`](file:///c:/SM_ROLLING_FX_v1.1/vfx-studio-pipline-automation/src/app/import/page.tsx):
  - Added `Notes` column to TableHeader, Edit row, and Display row.
  - Implemented `handleBidChange` for real-time `TotalBid` auto-calculation.
  - Implemented `handleFrameChange` for real-time `FrameRange` auto-calculation.
  - Enhanced `saveEdit` to refresh both rows and batch summary statistics.

---

## 4. APIs & Endpoints Affected
- `PUT /api/import/rows/:rowId`:
  - Receives partial row updates.
  - Recalculates dependent fields and writes changes transactionally to `ImportBatchRow`, `ShotMaster`, and `TaskMaster`.
  - Returns `{ success: true, updatedRow, shotId, tasksSynchronized, synchronizedTasks }`.
- `GET /api/tasks/department-queue/:stageId`:
  - Receives live database values directly from `TaskMaster` and `ShotMaster`.
- `GET /api/tasks`:
  - Instantly reflects updated `estimatedBid`, `estimatedHours`, `dueDate`, `shotCode`, and `complexity`.

---

## 5. Database Tables Affected
- `ImportBatchRow`: Updates all Excel fields (`Project`, `Episode`, `ShotName`, `Batch`, `Department`, `HeadIn`, `TailOut`, `FrameRange`, `SOW`, `Notes`, `Vendor`, `Complexity`, `RotoBid`, `PaintBid`, `CompBid`, `CGBid`, `TotalBid`, `ETA`, `Status`, `ValidationStatus`, `ValidationMessage`).
- `ShotMaster`: Updated using primary key `ShotId` (`ShotCode`, `FrameStart`, `FrameEnd`, `Duration`, `SequenceId`).
- `TaskMaster`: Updated using primary key `TaskID` (`EstimatedHours`, `DueDate`, `Description`, `TaskCode`, `TaskName`, `ModifiedDate`).
- `ReelMaster` / `SequenceMaster`: Synchronized if reel/episode changes.
- **Untouched / Preserved Tables**:
  - `TaskAssignment` (artist assignments 100% preserved)
  - `TimeLog` (logged hours preserved)
  - `TaskReview` (QC history preserved)
  - `Versions` (version submissions preserved)
  - `StatusMaster` / task status (production progress preserved)

---

## 6. Testing & Verification Results
- **Automated Verification (`scratch/test_sync.js`)**:
  - Tested editing shot `FMK_R1_000_0065` (Row 504).
  - Changed `PaintBid` (2 &rarr; 3.5), `Complexity` ('Medium' &rarr; 'Mid'), `HeadIn` (1001), `TailOut` (1050), `FrameRange` ('50'), `SOW`, `Notes`.
  - Verified `TotalBid` recalculated automatically to 5.
  - Verified `ShotMaster` updated (`FrameEnd: 1050`, `Duration: 50`).
  - Verified `TaskMaster` updated (`EstimatedHours: 28.00`, 3.5 bid * 8).
  - Verified `Department Queue` query output showed updated `estimatedBid: 3.5`, `targetBid: 3.5`, `complexity: 'Mid'`.
  - Verified shot and task counts before and after remained identical (no duplicate records).
  - Verified artist assignments remained intact.
- **Production Build (`npm run build`)**:
  - Compiled successfully with 0 errors across all 29 routes.

---

## 7. Remaining Limitations
- Initial batch import mapping expects standard column header naming conventions (`Project`, `Reel`/`Episode`, `ShotName`, `Roto`, `Paint`, `Comp`, `CG`, etc.).

