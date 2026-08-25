# Production Import Review Workflow

This implementation plan covers the end-to-end development of the Production Import Review workflow (Phase 2). This phase bridges the gap between raw data import and actual production scheduling.

## User Review Required

> [!WARNING]
> This phase requires several new backend endpoints, a new frontend page with complex state management, and an intricate data conversion engine that touches multiple database tables simultaneously. Please review the plan below.

## Open Questions

> [!IMPORTANT]
> 1. **Clients and Episodes Tables**: The current database schema (`docs/db-setup.sql`) does not have dedicated `Clients` or `Episodes` tables. `ClientName` is just a string column on `Projects`, and `Sequences` link directly to `Projects`. Should I create new `Clients` and `Episodes` tables and migrate the foreign keys, or simply populate string columns on existing tables?
> 2. **Project Code Generation**: The `Projects` table requires a unique `ProjectCode`. The import data only has `Client Shot Name`, `ShotName`, and `Episode`. Should I extract the `ProjectCode` and `ProjectName` from the prefix of the `ShotName` (e.g., if `ShotName` is `MPN_R01_SH0040`, use `MPN` as the `ProjectCode`)?
> 3. **Data Grid Library**: Should I build a fully custom React data grid with search/filter/sort, or would you prefer I use a robust library like `@tanstack/react-table` for the UI?

## Proposed Changes

---

### Database Schema Updates

#### [MODIFY] `docs/database-schema.sql` (and running ALTER scripts)
- Add a `Converted` `BIT DEFAULT 0` column to the `BidSheetImport` table to track which rows have been successfully processed.
- (Pending answer to open questions) Create `Clients` and `Episodes` tables and add corresponding foreign keys to `Projects` and `Sequences`.

---

### Backend API - Import Review Routes

#### [NEW] `backend/routes/importReviewRoutes.js`
Create new REST routes for managing the imported data:
- `GET /api/import-review` - Fetch all non-converted `BidSheetImport` rows.
- `PUT /api/import-review/:id` - Edit a specific row before approval.
- `DELETE /api/import-review/:id` - Delete a specific row.
- `POST /api/import-review/approve` - Trigger the Production Conversion Engine.

#### [NEW] `backend/controllers/importReviewController.js`
- Implement the CRUD controllers for the imported rows.
- Implement the `approveImport` controller containing the Production Conversion Engine transaction.

#### [MODIFY] `backend/server.js`
- Mount the new `/api/import-review` route.

---

### Production Conversion Engine

#### [NEW] `backend/services/conversionService.js`
This module will handle the transactional conversion logic when "Approve Import" is clicked:
1. Wrap everything in a single SQL Transaction.
2. For each row in `BidSheetImport` where `Converted = 0`:
   - Create/find `Client`.
   - Create/find `Project`.
   - Create/find `Episode` (Reel).
   - Create/find `Sequence`.
   - Create/find `Shot`.
   - Create tasks dynamically based on Bid Values (`RotoBid > 0` -> Roto Task, etc.).
   - Mark the row as `Converted = 1`.
3. Commit transaction.

---

### Frontend UI - Import Review Page

#### [NEW] `src/app/production/import-review/page.tsx`
- Build a new page featuring a professional, interactive Data Grid.
- Display required columns: `Client Shot Name`, `Shot Name`, `Type`, `Episode`, `Complexity`, `Total Bid`, `Artist`, `Lead`, `Status`, `ETA`.
- Include client-side and server-side state for Search, Filtering, and Sorting.
- Include action buttons for "Edit" and "Delete" per row.
- Place a primary "Approve Import" button that triggers the conversion process.

#### [NEW] `src/components/import-review/EditRowModal.tsx`
- A modal form allowing producers to tweak bid values, names, and estimates before converting to production data.

#### [NEW] `src/services/importReviewService.ts`
- Create the Axios integration methods to interact with the new `/api/import-review` endpoints.

## Verification Plan

### Automated Tests
- No automated test scripts strictly defined, but the API endpoints will be tested via isolated backend calls.

### Manual Verification
1. Navigate to `Production -> Import Review`.
2. Verify that the 25 previously imported rows are visible.
3. Test Search, Sort, Filter, Edit, and Delete on the grid.
4. Click "Approve Import".
5. Verify success message and ensure the grid empties (since rows are marked converted).
6. Verify in SSMS that Projects, Sequences, Shots, and Tasks have been correctly seeded with proper foreign keys.
7. Navigate to Artist/Lead/Production Dashboards and ensure the new work is visually represented.
