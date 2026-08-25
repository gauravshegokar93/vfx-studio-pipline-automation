# AI_CONTEXT.md

This file provides AI assistants (ChatGPT, Codex, Claude, Gemini, Cursor, Copilot) with comprehensive context to understand and work with the SM rolling FX / Lumina VFX Hub codebase without reading every source file.

---

## 1. Business Understanding

### What is this product?
SM rolling FX (also called Lumina VFX Hub) is an **Enterprise VFX Production Management Platform**. It replaces Excel-based tracking with a centralized **Single Source of Truth (SSoT)** for VFX studios.

### Core Problem Solved
VFX studios track work through fragmented spreadsheets, leading to:
- Bid leakage (estimated vs actual hours)
- Communication gaps between artists, leads, supervisors
- No real-time visibility into project health

### Core Solution
A hierarchical web app that ingests client bid sheets (Excel), auto-generates production hierarchies (Project → Sequence → Shot → Task), and provides role-based dashboards for tracking progress, time, and approvals.

### Industry
Visual Effects (VFX) / Post-Production for film, TV, and streaming.

### Users & Roles (RBAC)
| Role | Level | Access |
|------|-------|--------|
| Production Head | 4 | Global studio read/write, imports, user management |
| Department Supervisor | 3 | Department-scoped read/write, final sign-offs |
| Lead | 2 | Team-scoped read/write, artist allocation, QC |
| Artist | 1 | Assigned tasks only, progress updates, version submission |

### Key Workflows
1. **Ingestion**: Upload Excel bid sheet → parse → staging queue → review/edit → approve → auto-create Projects/Sequences/Shots/Tasks
2. **Allocation**: Supervisor assigns Leads → Lead assigns Artists
3. **Execution**: Artist updates progress, logs time, submits versions
4. **QC**: Lead reviews → Supervisor final sign-off
5. **Analytics**: Real-time Bid vs Actual, capacity, risk metrics

---

## 2. Architecture

### High-Level
```
Frontend (Next.js 15 + TypeScript)
  ├── App Router (pages/)
  ├── ShadCN UI (components/ui/)
  ├── Zustand Store (global state)
  └── Services (API abstraction layer)
        │
        ▼
Backend (Express 5 + Node.js)
  ├── Controllers (business logic)
  ├── Routes (REST endpoints)
  ├── Services (data transformation)
  └── mssql driver (raw SQL to SQL Server)
        │
        ▼
SQL Server (SMRollingFX database)
  ├── Projects, Sequences, Shots, Tasks
  ├── Users, UserCredentials, Departments
  ├── TimeLogs, Versions, Leaves, Notifications
  └── BidSheetImport (staging)
```

### Data Flow
- Frontend uses **Zustand** as local cache/SSoT
- `DatabaseSync` component fetches all data on mount and role change
- Services call backend APIs (or return mock data if not implemented)
- Backend uses **raw SQL** with `mssql` package (no ORM)

### AI Integration
- **Genkit** + **Google Gemini 2.5 Flash**
- 3 flows: automated-shot-task-generation, intelligent-scheduling-assistant, review-feedback-summary-flow
- AI flows are server-side (`'use server'`) and called from client components

---

## 3. Rules

### Business Rules
1. **Hierarchy is strict**: Project → Sequence → Shot → Task. Cannot create a Shot without a Sequence.
2. **Task status lifecycle**: Not Started → Assigned → In Progress → Pending Review → Approved/Retake
3. **Review is two-tier**: Lead QC first, then Supervisor final sign-off
4. **Bid hours are immutable per import**: Import sets initial bid; manual tasks can set custom bids
5. **Capacity threshold**: Artists have ~40h capacity; overload warning triggers above 32h
6. **Import staging**: All Excel imports go to `BidSheetImport` staging table; must be reviewed and approved before conversion
7. **Conversion is transactional**: One staging row can create Project, Sequence, Shot, and multiple Tasks in a single SQL transaction
8. **Mock auth in dev**: Frontend always sends `mock-jwt-token` with `x-simulated-role` header; backend looks up a real user with that role from DB

### Technical Rules
1. **No ORM**: Backend uses raw SQL queries with parameterized inputs (`sql.Request`)
2. **UUIDs everywhere**: All primary keys are `UNIQUEIDENTIFIER` (GUIDs)
3. **Cascading deletes**: Project → Sequence → Shot → Task (ON DELETE CASCADE)
4. **Task assignments are versioned**: `TaskAssignments` table has `IsCurrent` flag; new assignment deactivates old one
5. **Frontend path alias**: `@/*` maps to `./src/*`
6. **Dark mode only**: App uses `dark` class on HTML; no light mode toggle implemented
7. **Mock data in services**: Several services return hardcoded mock data with `MOCK_DELAY` (e.g., `userService`, `notificationService`)

---

## 4. Coding Style

### Naming Conventions
- **Frontend**: PascalCase for components, camelCase for functions/variables, kebab-case for file names
- **Backend**: camelCase for functions, PascalCase for SQL table aliases (e.g., `u` for Users, `t` for Tasks)
- **Database**: PascalCase for table names (e.g., `TaskAssignments`), camelCase for columns in code (e.g., `shotId`)
- **Types**: PascalCase interfaces (e.g., `User`, `Task`, `Project`)

### Folder Rules
- `src/app/` - Next.js App Router pages (file-based routing)
- `src/components/` - Reusable React components
- `src/components/ui/` - ShadCN primitives (do not modify unless necessary)
- `src/components/layout/` - App shell (sidebar, database sync)
- `src/components/tasks/` - Task-specific dialogs
- `src/lib/` - Core utilities, types, store
- `src/services/` - API client and service abstractions
- `src/ai/` - Genkit flows
- `backend/controllers/` - Route handlers
- `backend/routes/` - Express routers
- `backend/services/` - Business logic / data transformation
- `backend/utils/` - Helpers (upload, Excel parsing)

### Architecture Patterns
- **Frontend**: Service-oriented; pages call services, services call APIs or store
- **Backend**: Controller → Service → Database pattern (though many controllers query DB directly)
- **State**: Zustand with `setState` for global state; `DatabaseSync` hydrates from API
- **Auth**: JWT with mock token support for development

### Error Handling
- Backend: Try/catch with `console.error` and JSON error responses
- Frontend: Toast notifications via `useToast` hook
- No global error boundaries implemented

### Validation
- Backend: Manual validation in controllers (e.g., `requiredString`, `parseOptionalDate`)
- Frontend: React Hook Form + Zod in dialogs (e.g., `create-task-dialog`)
- No centralized validation middleware

### Formatting
- TypeScript strict mode
- ESLint configured (ignored during builds)
- Prettier not explicitly configured
- Tailwind CSS for all styling (no CSS modules)

---

## 5. Do and Don't

### DO
- Use `apiClient` from `@/services/apiClient` for all backend calls
- Use `useLuminaStore` from `@/lib/store` for global state
- Use ShadCN components from `@/components/ui/` for consistency
- Follow the existing dark theme color palette (crimson #E6192E, violet #A632E6)
- Use `cn()` from `@/lib/utils` for conditional class names
- Use Lucide icons for all iconography

### DON'T
- Modify `src/components/ui/` files unless fixing a ShadCN issue
- Hardcode API URLs (use `API_BASE_URL` from `@/config/api`)
- Store sensitive data in frontend code
- Use `any` type in TypeScript (project has TODO items to fix this)
- Commit `.env` files (they are gitignored)
- Run `simpleImport` without auth in production (it's currently open)

---

## 6. Naming Rules

| Type | Convention | Example |
|------|-----------|---------|
| React Components | PascalCase | `ProductionHeadDashboard` |
| Functions/Variables | camelCase | `getStudioStats`, `handleUpload` |
| Files (pages) | kebab-case | `production-queue/page.tsx` |
| Files (components) | PascalCase or kebab-case | `stat-card.tsx`, `EditRowModal.tsx` |
| Database Tables | PascalCase | `TaskAssignments`, `BidSheetImport` |
| Database Columns | PascalCase in DB, camelCase in code | `ShotId` → `shotId` |
| Types/Interfaces | PascalCase | `User`, `Task`, `PipelineStep` |
| Enums | PascalCase values | `TaskStatus.NotStarted` |

---

## 7. Common Patterns

### API Call Pattern (Frontend)
```typescript
import { apiClient } from '@/services/apiClient';
const res = await apiClient.get('/projects');
const data = res.data.items || [];
```

### Store Update Pattern
```typescript
import { useLuminaStore } from '@/lib/store';
const { tasks, addTask } = useLuminaStore();
addTask(newTask);
```

### Backend Query Pattern
```javascript
const request = (await sql.connect(config)).request();
request.input('ParamName', sql.NVarChar, value);
const result = await request.query('SELECT ... WHERE Col = @ParamName');
return res.json({ success: true, items: result.recordset || [] });
```

### Transaction Pattern
```javascript
const pool = await sql.connect(config);
const transaction = new sql.Transaction(pool);
await transaction.begin();
// ... multiple queries ...
await transaction.commit();
```

---

## 8. Frequently Used Files

| File | Purpose |
|------|---------|
| `src/lib/store.ts` | Global Zustand state (users, tasks, projects, shots, sequences) |
| `src/lib/types.ts` | All TypeScript interfaces and type definitions |
| `src/services/apiClient.ts` | Axios instance with mock JWT interceptor |
| `src/config/api.ts` | API base URL configuration |
| `src/components/layout/sidebar.tsx` | Role-based navigation sidebar |
| `src/components/layout/database-sync.tsx` | Hydrates store from SQL Server on mount |
| `backend/server.js` | Express app entry point, mounts all routes |
| `backend/config/db.js` | SQL Server connection config |
| `backend/middleware/authMiddleware.js` | JWT verification + RBAC |
| `backend/services/conversionService.js` | Converts staging rows to production hierarchy |
| `backend/controllers/simpleImportController.js` | Excel upload and parsing |
| `docs/db-setup.sql` | Master SQL Server schema script |

---

## 9. Important Files

### Critical Business Logic
- `backend/services/conversionService.js` - The heart of the ingestion engine; converts bid sheets to production data
- `backend/controllers/tasksRoutes.js` - Task assignment, progress updates, reviews
- `src/lib/store.ts` - All frontend business logic for task lifecycle, user management, assignments

### Critical UI
- `src/app/dashboard/page.tsx` - Role-based dashboard router
- `src/app/tasks/page.tsx` - Artist workbench
- `src/app/lead-dashboard/page.tsx` - Lead team management
- `src/app/department-queue/page.tsx` - Supervisor delegation
- `src/app/production/import-review/page.tsx` - Import staging and approval

### Critical Configuration
- `backend/.env` - Database credentials and JWT secrets (DO NOT COMMIT)
- `src/config/api.ts` - Frontend API base URL
- `tailwind.config.ts` - Theme colors and fonts

---

## 10. Critical Modules

### Ingestion Module
- **Files**: `simpleImportController.js`, `importReviewController.js`, `conversionService.js`, `excelBidSheetParser.js`
- **Purpose**: Parse Excel bid sheets, stage in `BidSheetImport`, allow review/edit, then convert to full production hierarchy
- **Risk**: High - touches multiple tables in a transaction

### Task Lifecycle Module
- **Files**: `tasksRoutes.js`, `store.ts` (task actions), `taskService.ts`
- **Purpose**: Task creation, assignment, progress tracking, review, approval
- **Risk**: Medium - core business logic

### Authentication Module
- **Files**: `authController.js`, `authMiddleware.js`, `userController.js`
- **Purpose**: JWT login/refresh/logout, RBAC enforcement, user CRUD, credential management
- **Risk**: High - security critical

### Analytics Module
- **Files**: `analyticsService.ts`, `analytics/page.tsx`, `production-head-view.tsx`
- **Purpose**: Calculate studio stats, project health, department metrics, performance rankings
- **Risk**: Low - read-only calculations

---

## 11. Safe Modification Rules

### Safe to Modify
- Frontend pages in `src/app/` (add new routes freely)
- Frontend components in `src/components/` (except `ui/` primitives)
- Frontend services in `src/services/` (add new endpoints)
- Backend routes in `backend/routes/` (add new endpoints)
- Backend services in `backend/services/` (add new business logic)

### Modify with Caution
- `src/lib/store.ts` - Changing state shape affects all pages
- `src/lib/types.ts` - Changing types affects entire frontend
- `backend/middleware/authMiddleware.js` - Security critical
- `backend/services/conversionService.js` - Complex transaction logic
- `docs/db-setup.sql` - Database schema changes require migration planning

### Never Edit Blindly
- `src/components/ui/` - ShadCN primitives; changes may break other components
- `backend/.env` - Contains production credentials
- `docs/database-schema.sql` - Has known duplicate/broken blocks; use `docs/db-setup.sql` instead
- Any file containing SQL queries without understanding the schema

---

## 12. Known Issues & Gotchas

1. **`database-schema.sql` is broken**: Contains duplicate `CREATE TABLE Projects` and `BidSheetImport` blocks. Use `docs/db-setup.sql` as the source of truth.
2. **`importBidSheetController.js` is a stub**: Returns `{success: true}` for everything. The real import logic is in `simpleImportController.js`.
3. **`importBidSheetRoutes.js` is open**: No auth middleware (has TODO comment). `simpleImportRoutes.js` also has no auth.
4. **Frontend `apiClient` always sends mock token**: No real login flow wired to the frontend auth state.
5. **`analyticsService` has hardcoded values**: `totalDepartments: 5` and static capacity calculations.
6. **Several pages use hardcoded mock data**: `scheduling/page.tsx`, `workload/page.tsx`, `users/page.tsx` have hardcoded arrays.
7. **`.env` contains real-looking password**: `DB_PASSWORD=StrongPassword@123` - should be rotated in production.
8. **`next.config.ts` ignores build errors**: `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`.

---

## 13. Module Dependency Map

```
Frontend Pages
  ├── src/app/dashboard/page.tsx
  │     └── src/app/dashboard/production-head-view.tsx
  │           └── src/services/analyticsService.ts
  │                 └── src/lib/store.ts
  ├── src/app/tasks/page.tsx
  │     └── src/lib/store.ts
  ├── src/app/lead-dashboard/page.tsx
  │     └── src/lib/store.ts
  ├── src/app/department-queue/page.tsx
  │     └── src/lib/store.ts
  ├── src/app/import/page.tsx
  │     └── src/services/importService.ts
  │           └── src/config/api.ts
  ├── src/app/production/import-review/page.tsx
  │     └── src/services/importReviewService.ts
  │           └── src/services/apiClient.ts
  │                 └── src/lib/store.ts (for mock token/role)
  └── src/app/review/page.tsx
        └── src/ai/flows/review-feedback-summary-flow.ts

Backend Routes
  ├── /api/tasks
  │     └── backend/controllers/tasksRoutes.js
  │           └── backend/middleware/authMiddleware.js
  │           └── backend/config/db.js
  ├── /api/simple-import
  │     └── backend/controllers/simpleImportController.js
  │           └── backend/utils/upload.js
  │           └── backend/utils/excelBidSheetParser.js
  ├── /api/import-review
  │     └── backend/controllers/importReviewController.js
  │           └── backend/services/conversionService.js
  │                 └── backend/config/db.js
  └── /api/auth
        └── backend/controllers/authController.js
              └── backend/middleware/authMiddleware.js
```

---

## 14. Quick Reference

### Start Development
```bash
# Terminal 1: Backend
cd vfx-studio-pipline-automation/backend
npm install
npm run dev

# Terminal 2: Frontend
cd vfx-studio-pipline-automation
npm install
npm run dev
```

### Key URLs
- Frontend: `http://localhost:9002`
- Backend: `http://localhost:5000`
- API Base: `http://localhost:5000/api`

### Database
- Server: `192.168.101.57` (from `.env`)
- Database: `SMRollingFX`
- Schema script: `docs/db-setup.sql`
- Migration script: `backend/scripts/run-migrations.js`

### AI Flows
- `automated-shot-task-generation` - Generates pipeline tasks from shot description
- `intelligent-scheduling-assistant` - Optimizes artist assignments
- `review-feedback-summary-flow` - Summarizes QC feedback
