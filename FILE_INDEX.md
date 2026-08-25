# FILE_INDEX.md

Searchable index of every important file in the SM rolling FX / Lumina VFX Hub project.

---

## How to Use This Index

- **Path**: Full relative path from project root
- **Purpose**: One-line description of what the file does
- **Keywords**: Searchable terms
- **Owner Module**: Which business module owns this file
- **Dependencies**: Key files this file depends on

---

## Root Configuration

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `package.json` | Frontend dependencies and scripts | dependencies, npm, scripts, nextjs | Configuration | - |
| `tsconfig.json` | TypeScript configuration | typescript, strict, paths, alias | Configuration | - |
| `next.config.ts` | Next.js build configuration | nextjs, build, images, turbopack | Configuration | - |
| `tailwind.config.ts` | Tailwind CSS theme and colors | tailwind, theme, colors, fonts, dark-mode | Configuration | - |
| `postcss.config.mjs` | PostCSS configuration for Tailwind | postcss, tailwind | Configuration | - |
| `components.json` | ShadCN UI configuration | shadcn, ui, components, aliases | Configuration | - |
| `.gitignore` | Git ignore rules | git, ignore, node_modules, .env | Configuration | - |
| `apphosting.yaml` | Firebase App Hosting config | firebase, hosting, previews | Configuration | - |
| `TODO.md` | Development TODOs | todo, typescript, errors | Development | - |
| `implementation_plan.md` | Import review workflow plan | import, review, conversion, implementation | Planning | - |
| `README.md` | Project README | readme, overview, getting-started | Documentation | - |

---

## Backend Configuration

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/package.json` | Backend dependencies and scripts | dependencies, npm, express, mssql | Configuration | - |
| `backend/.env` | Backend environment variables | env, database, jwt, secrets | Configuration | - |
| `backend/server.js` | Express app entry point | express, server, routes, entry | Backend | All routes |
| `backend/config/db.js` | SQL Server connection config | database, mssql, connection, pool | Backend | - |
| `backend/test-db.js` | Dev script: test DB connection | test, database, connection | Backend | `config/db.js` |
| `backend/list-users.js` | Dev script: list all users | test, users, database | Backend | `config/db.js` |
| `backend/test-import.xlsx` | Sample bid sheet for testing | test, import, excel, sample | Backend | - |
| `backend/scripts/run-migrations.js` | Database migration script | migration, database, clients, episodes | Backend | `config/db.js` |
| `backend/utils/sqlTransactionHelper.js` | Placeholder for transaction utilities | placeholder, transaction | Backend | - |

---

## Backend Controllers

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/controllers/authController.js` | Login, refresh token, logout | auth, login, jwt, refresh, logout | Authentication | `config/db.js`, `authMiddleware` |
| `backend/controllers/userController.js` | User CRUD, credentials, status toggle | users, crud, credentials, password, status | User Management | `config/db.js`, `authMiddleware`, `bcrypt` |
| `backend/controllers/projectController.js` | Project CRUD operations | projects, crud, create, update, delete | Project Management | `services/projectsService.js`, `authMiddleware` |
| `backend/controllers/artistController.js` | Artist CRUD, employee code generation | artists, crud, employee-code, shift, active | Artist Management | `config/db.js`, `authMiddleware` |
| `backend/controllers/departmentsController.js` | Department listing | departments, list | User Management | `config/db.js`, `authMiddleware` |
| `backend/controllers/importBidSheetController.js` | STUB: Legacy bid sheet preview/commit | import, bid-sheet, stub | Ingestion | - |
| `backend/controllers/importReviewController.js` | Staging row CRUD + approve conversion | import-review, staging, approve, conversion | Ingestion | `config/db.js`, `services/conversionService.js` |
| `backend/controllers/simpleImportController.js` | Excel upload to staging table | import, excel, upload, staging, xlsx | Ingestion | `config/db.js`, `utils/upload.js`, `utils/excelBidSheetParser.js` |

---

## Backend Routes

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/routes/authRoutes.js` | Auth endpoints (login, refresh, logout) | auth, login, refresh, logout | Authentication | `controllers/authController.js` |
| `backend/routes/userRoutes.js` | User endpoints (CRUD, credentials) | users, crud, credentials | User Management | `controllers/userController.js` |
| `backend/routes/projectRoutes.js` | Project CRUD routes | projects, crud | Project Management | `controllers/projectController.js` |
| `backend/routes/artistRoutes.js` | Artist CRUD routes | artists, crud | Artist Management | `controllers/artistController.js` |
| `backend/routes/departmentsRoutes.js` | Department listing route | departments, list | User Management | `controllers/departmentsController.js` |
| `backend/routes/sequencesRoutes.js` | Sequence list/lookup routes | sequences, lookup | Project Management | `config/db.js`, `authMiddleware` |
| `backend/routes/shotsRoutes.js` | Shot list/lookup routes | shots, lookup | Project Management | `config/db.js`, `authMiddleware` |
| `backend/routes/tasksRoutes.js` | Task operations (list, assign, progress, review) | tasks, assign, progress, review | Task Management | `config/db.js`, `authMiddleware` |
| `backend/routes/importBidSheetRoutes.js` | Legacy bid sheet routes (open, no auth) | import, bid-sheet, open | Ingestion | `controllers/importBidSheetController.js`, `utils/upload.js` |
| `backend/routes/simpleImportRoutes.js` | Simple import routes (open, no auth) | import, excel, open | Ingestion | `controllers/simpleImportController.js`, `utils/upload.js` |
| `backend/routes/importReviewRoutes.js` | Import review routes (secured) | import-review, staging, secured | Ingestion | `controllers/importReviewController.js`, `authMiddleware` |
| `backend/routes/clientsRoutes.js` | 501 Not Implemented | clients, placeholder | Project Management | - |
| `backend/routes/assetsRoutes.js` | 501 Not Implemented | assets, placeholder | Assets | - |
| `backend/routes/assignmentsRoutes.js` | 501 Not Implemented | assignments, placeholder | Task Management | - |
| `backend/routes/attendanceRoutes.js` | 501 Not Implemented | attendance, placeholder | Attendance | - |
| `backend/routes/leavesRoutes.js` | 501 Not Implemented | leaves, placeholder | Leave Management | - |
| `backend/routes/notificationsRoutes.js` | 501 Not Implemented | notifications, placeholder | Notifications | - |
| `backend/routes/productionRoutes.js` | 501 Not Implemented | production, placeholder | Production | - |
| `backend/routes/reportsRoutes.js` | 501 Not Implemented | reports, placeholder | Reports | - |
| `backend/routes/settingsRoutes.js` | 501 Not Implemented | settings, placeholder | Settings | - |

---

## Backend Services

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/services/conversionService.js` | Convert staging rows to production hierarchy | conversion, staging, production, transaction | Ingestion | `config/db.js`, `bcrypt` |
| `backend/services/importBidSheetService.js` | Legacy bid sheet preview/commit | import, bid-sheet, preview, commit | Ingestion | `utils/excelBidSheetParser.js`, `config/db.js` |
| `backend/services/projectsService.js` | Project data access layer | projects, crud, pagination | Project Management | `config/db.js` |

---

## Backend Utilities

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/utils/upload.js` | Multer file upload configuration | upload, multer, file, excel | Ingestion | `multer` |
| `backend/utils/excelBidSheetParser.js` | Excel parsing logic (legacy) | excel, parse, xlsx, headers | Ingestion | `xlsx` |
| `backend/utils/sqlTransactionHelper.js` | Placeholder for transaction utilities | placeholder, transaction | Backend | - |

---

## Backend Middleware

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `backend/middleware/authMiddleware.js` | JWT verification + RBAC | auth, jwt, rbac, mock-token, roles | Authentication | `jsonwebtoken`, `config/db.js` |
| `backend/middleware/requireProductionHead.js` | Convenience wrapper for PH-only routes | auth, production-head, wrapper | Authentication | `authMiddleware.js` |

---

## Frontend Configuration

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/config/api.ts` | API base URL and endpoints | api, url, endpoints, config | Configuration | - |
| `src/lib/utils.ts` | Utility functions (cn, class merging) | utils, cn, tailwind, clsx, merge | Core | `clsx`, `tailwind-merge` |
| `src/lib/types.ts` | TypeScript interfaces and types | types, interfaces, user, task, project | Core | - |
| `src/lib/store.ts` | Zustand global state | store, zustand, state, users, tasks, projects | Core | `zustand`, `apiClient` |
| `src/hooks/use-toast.ts` | Toast notification hook | toast, notifications, hook | UI | `@/components/ui/toast` |

---

## Frontend Services

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/services/apiClient.ts` | Axios instance with mock JWT interceptor | api, axios, client, jwt, interceptor | Core | `axios`, `config/api`, `lib/store` |
| `src/services/analyticsService.ts` | BI metrics calculations from store | analytics, metrics, studio, project, department | Analytics | `lib/store`, `lib/types` |
| `src/services/importService.ts` | Simple import API calls | import, excel, upload, api | Ingestion | `axios`, `config/api` |
| `src/services/importReviewService.ts` | Import review API calls | import-review, staging, api | Ingestion | `apiClient` |
| `src/services/taskService.ts` | Task queries (mostly from store) | tasks, query, store | Task Management | `lib/store`, `lib/types` |
| `src/services/userService.ts` | Mock user/leave services | users, mock, leave, profile | User Management | `lib/types` |
| `src/services/notificationService.ts` | Mock notification service | notifications, mock | Notifications | `lib/types` |

---

## Frontend AI

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/ai/genkit.ts` | Genkit initialization (Gemini 2.5 Flash) | ai, genkit, gemini, google | AI | `genkit`, `@genkit-ai/google-genai` |
| `src/ai/dev.ts` | Dev entry: imports all flows | ai, dev, flows | AI | All flows |
| `src/ai/flows/automated-shot-task-generation.ts` | Generates pipeline tasks from shot description | ai, tasks, generation, shot | AI | `genkit`, `zod` |
| `src/ai/flows/intelligent-scheduling-assistant.ts` | Optimizes artist assignments | ai, scheduling, artist, optimization | AI | `genkit`, `zod` |
| `src/ai/flows/review-feedback-summary-flow.ts` | Summarizes QC feedback | ai, review, feedback, summary | AI | `genkit`, `zod` |

---

## Frontend Pages

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/app/page.tsx` | Home → redirects to /dashboard | home, redirect | Core | - |
| `src/app/layout.tsx` | Root layout with fonts + DatabaseSync | layout, fonts, database-sync | Core | `DatabaseSync`, `next/font` |
| `src/app/globals.css` | Global styles, Tailwind imports, theme vars | css, tailwind, theme, global | Core | - |
| `src/app/dashboard/page.tsx` | Unified dashboard router (by role) | dashboard, router, role | Dashboard | `useLuminaStore` |
| `src/app/dashboard/production-head-view.tsx` | Executive overview with charts | dashboard, production-head, charts, analytics | Dashboard | `analyticsService`, Recharts |
| `src/app/tasks/page.tsx` | Artist workbench | tasks, artist, workbench | Task Management | `useLuminaStore`, `taskService` |
| `src/app/tasks/[id]/page.tsx` | Task detail with versions/logs | tasks, detail, versions, logs | Task Management | `useLuminaStore` |
| `src/app/lead-dashboard/page.tsx` | Lead team management + QC | lead, dashboard, team, qc | Task Management | `useLuminaStore` |
| `src/app/department-queue/page.tsx` | Supervisor delegation + final sign-off | supervisor, queue, delegation, approval | Task Management | `useLuminaStore` |
| `src/app/projects/page.tsx` | Project hierarchy explorer | projects, hierarchy, explorer | Project Management | `useLuminaStore` |
| `src/app/import/page.tsx` | Excel upload + staging preview grid | import, excel, upload, staging | Ingestion | `importService` |
| `src/app/production/import-review/page.tsx` | Staging queue with edit/delete/approve | import-review, staging, approve, conversion | Ingestion | `importReviewService` |
| `src/app/analytics/page.tsx` | Executive BI suite | analytics, bi, metrics, charts | Analytics | `analyticsService`, Recharts |
| `src/app/users/page.tsx` | Staff directory + credential management | users, staff, credentials, directory | User Management | `userService`, `useLuminaStore` |
| `src/app/leaves/page.tsx` | Leave requests + holiday schedule | leaves, requests, calendar | Leave Management | `userService` |
| `src/app/notifications/page.tsx` | Notification center | notifications, alerts, center | Notifications | `notificationService` |
| `src/app/scheduling/page.tsx` | AI smart scheduler (mock data) | scheduling, ai, artist, assignment | AI | Genkit flows |
| `src/app/review/page.tsx` | QC review queue + AI summary | review, qc, queue, ai | Task Management | Genkit flows |
| `src/app/versions/page.tsx` | Version audit trail | versions, audit, trail | Task Management | `taskService` |
| `src/app/workload/page.tsx` | Capacity analytics | workload, capacity, analytics | Analytics | `analyticsService` |
| `src/app/daily-tracking/page.tsx` | Daily shot progress table | daily, tracking, progress, table | Analytics | `useLuminaStore` |
| `src/app/settings/page.tsx` | Profile & preferences | settings, profile, preferences | User Management | - |
| `src/app/department-progress/page.tsx` | Departmental throughput cards | department, progress, throughput | Analytics | `useLuminaStore` |
| `src/app/production-queue/page.tsx` | Global production queue | production, queue, global | Task Management | `useLuminaStore` |

---

## Frontend Components

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/components/layout/sidebar.tsx` | Role-based navigation sidebar | sidebar, navigation, role, menu | Layout | `useLuminaStore`, Lucide icons |
| `src/components/layout/database-sync.tsx` | Hydrates Zustand from SQL Server | database, sync, hydrate, bootstrap | Layout | `useLuminaStore`, `apiClient` |
| `src/components/tasks/create-task-dialog.tsx` | Manual task creation with capacity check | tasks, create, dialog, capacity, overload | Task Management | `useLuminaStore`, ShadCN Dialog |
| `src/components/import-review/EditRowModal.tsx` | Modal for editing staging rows | import-review, edit, modal, staging | Ingestion | `importReviewService`, ShadCN Dialog |
| `src/components/dashboard/stat-card.tsx` | Stat card with trend indicator | dashboard, stat, card, trend | Dashboard | Lucide icons, ShadCN Card |

---

## Frontend UI Components (ShadCN)

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `src/components/ui/accordion.tsx` | Accordion component | ui, accordion | UI | Radix UI |
| `src/components/ui/alert-dialog.tsx` | Alert dialog component | ui, alert-dialog | UI | Radix UI |
| `src/components/ui/alert.tsx` | Alert component | ui, alert | UI | Radix UI |
| `src/components/ui/avatar.tsx` | Avatar component | ui, avatar | UI | Radix UI |
| `src/components/ui/badge.tsx` | Badge component | ui, badge | UI | Radix UI |
| `src/components/ui/button.tsx` | Button component | ui, button | UI | Radix UI |
| `src/components/ui/calendar.tsx` | Calendar component | ui, calendar | UI | Radix UI |
| `src/components/ui/card.tsx` | Card component | ui, card | UI | Radix UI |
| `src/components/ui/carousel.tsx` | Carousel component | ui, carousel | UI | Radix UI |
| `src/components/ui/chart.tsx` | Chart component (Recharts wrapper) | ui, chart, recharts | UI | Recharts |
| `src/components/ui/checkbox.tsx` | Checkbox component | ui, checkbox | UI | Radix UI |
| `src/components/ui/collapsible.tsx` | Collapsible component | ui, collapsible | UI | Radix UI |
| `src/components/ui/dialog.tsx` | Dialog component | ui, dialog | UI | Radix UI |
| `src/components/ui/dropdown-menu.tsx` | Dropdown menu component | ui, dropdown, menu | UI | Radix UI |
| `src/components/ui/form.tsx` | Form component (React Hook Form) | ui, form, hookform | UI | React Hook Form |
| `src/components/ui/input.tsx` | Input component | ui, input | UI | Radix UI |
| `src/components/ui/label.tsx` | Label component | ui, label | UI | Radix UI |
| `src/components/ui/menubar.tsx` | Menubar component | ui, menubar | UI | Radix UI |
| `src/components/ui/popover.tsx` | Popover component | ui, popover | UI | Radix UI |
| `src/components/ui/progress.tsx` | Progress component | ui, progress | UI | Radix UI |
| `src/components/ui/radio-group.tsx` | Radio group component | ui, radio, group | UI | Radix UI |
| `src/components/ui/scroll-area.tsx` | Scroll area component | ui, scroll, area | UI | Radix UI |
| `src/components/ui/select.tsx` | Select component | ui, select | UI | Radix UI |
| `src/components/ui/separator.tsx` | Separator component | ui, separator | UI | Radix UI |
| `src/components/ui/sheet.tsx` | Sheet component (slide-over) | ui, sheet | UI | Radix UI |
| `src/components/ui/sidebar.tsx` | Sidebar component | ui, sidebar | UI | Radix UI |
| `src/components/ui/skeleton.tsx` | Skeleton loading component | ui, skeleton, loading | UI | Radix UI |
| `src/components/ui/slider.tsx` | Slider component | ui, slider | UI | Radix UI |
| `src/components/ui/switch.tsx` | Switch component | ui, switch | UI | Radix UI |
| `src/components/ui/table.tsx` | Table component | ui, table | UI | Radix UI |
| `src/components/ui/tabs.tsx` | Tabs component | ui, tabs | UI | Radix UI |
| `src/components/ui/textarea.tsx` | Textarea component | ui, textarea | UI | Radix UI |
| `src/components/ui/toast.tsx` | Toast component | ui, toast | UI | Radix UI |
| `src/components/ui/toaster.tsx` | Toaster component | ui, toaster | UI | Radix UI |
| `src/components/ui/tooltip.tsx` | Tooltip component | ui, tooltip | UI | Radix UI |

---

## Documentation Files

| Path | Purpose | Keywords | Owner Module | Dependencies |
|------|---------|----------|--------------|--------------|
| `docs/db-setup.sql` | Master SQL Server schema script | sql, schema, database, setup | Database | - |
| `docs/database-schema.sql` | SQL schema (BROKEN - has duplicates) | sql, schema, database, broken | Database | - |
| `docs/API_DOCUMENTATION.md` | API documentation | api, documentation, endpoints | Documentation | - |
| `docs/DATABASE_DOCUMENTATION.md` | Database documentation | database, documentation, er | Documentation | - |
| `docs/PROJECT_DOCUMENTATION.md` | Technical & business documentation | documentation, technical, business | Documentation | - |
| `docs/PROJECT_TREE.md` | Project tree structure | documentation, structure, tree | Documentation | - |
| `docs/blueprint.md` | App blueprint and style guidelines | blueprint, style, guidelines | Planning | - |
| `docs/sql-server-blueprint.md` | SQL Server backend blueprint | sql, blueprint, backend | Planning | - |
| `docs/db-migration-guide.md` | SSMS migration guide | migration, database, ssms | Documentation | - |
| `docs/readiness-audit.md` | System readiness audit | audit, readiness, status | Planning | - |

---

## Index by Keyword

### Authentication
- `backend/controllers/authController.js`
- `backend/middleware/authMiddleware.js`
- `backend/middleware/requireProductionHead.js`
- `backend/routes/authRoutes.js`
- `src/services/apiClient.ts`

### Database
- `backend/config/db.js`
- `backend/scripts/run-migrations.js`
- `backend/test-db.js`
- `backend/list-users.js`
- `docs/db-setup.sql`
- `docs/database-schema.sql`
- `docs/DATABASE_DOCUMENTATION.md`

### Import/Export
- `backend/controllers/importBidSheetController.js`
- `backend/controllers/importReviewController.js`
- `backend/controllers/simpleImportController.js`
- `backend/routes/importBidSheetRoutes.js`
- `backend/routes/simpleImportRoutes.js`
- `backend/routes/importReviewRoutes.js`
- `backend/services/conversionService.js`
- `backend/services/importBidSheetService.js`
- `backend/utils/excelBidSheetParser.js`
- `backend/utils/upload.js`
- `src/app/import/page.tsx`
- `src/app/production/import-review/page.tsx`
- `src/components/import-review/EditRowModal.tsx`
- `src/services/importService.ts`
- `src/services/importReviewService.ts`

### Tasks
- `backend/controllers/tasksRoutes.js` (controller functions)
- `backend/routes/tasksRoutes.js`
- `src/app/tasks/page.tsx`
- `src/app/tasks/[id]/page.tsx`
- `src/components/tasks/create-task-dialog.tsx`
- `src/lib/store.ts` (task actions)
- `src/services/taskService.ts`

### Users
- `backend/controllers/userController.js`
- `backend/controllers/artistController.js`
- `backend/controllers/departmentsController.js`
- `backend/routes/userRoutes.js`
- `backend/routes/artistRoutes.js`
- `backend/routes/departmentsRoutes.js`
- `src/app/users/page.tsx`
- `src/lib/store.ts` (user actions)
- `src/services/userService.ts`

### Projects
- `backend/controllers/projectController.js`
- `backend/routes/projectRoutes.js`
- `backend/services/projectsService.js`
- `src/app/projects/page.tsx`
- `src/lib/store.ts` (project actions)

### AI
- `src/ai/genkit.ts`
- `src/ai/dev.ts`
- `src/ai/flows/automated-shot-task-generation.ts`
- `src/ai/flows/intelligent-scheduling-assistant.ts`
- `src/ai/flows/review-feedback-summary-flow.ts`
- `src/app/scheduling/page.tsx`
- `src/app/review/page.tsx`

### Analytics
- `src/services/analyticsService.ts`
- `src/app/analytics/page.tsx`
- `src/app/dashboard/production-head-view.tsx`
- `src/app/workload/page.tsx`
- `src/app/department-progress/page.tsx`
- `src/components/dashboard/stat-card.tsx`

### State Management
- `src/lib/store.ts`
- `src/lib/types.ts`
- `src/services/apiClient.ts`

### UI Components
- `src/components/layout/sidebar.tsx`
- `src/components/layout/database-sync.tsx`
- `src/components/ui/*.tsx` (35+ components)

---

## Index by Module

### Authentication Module
- `backend/controllers/authController.js`
- `backend/middleware/authMiddleware.js`
- `backend/middleware/requireProductionHead.js`
- `backend/routes/authRoutes.js`
- `src/services/apiClient.ts`

### User Management Module
- `backend/controllers/userController.js`
- `backend/controllers/artistController.js`
- `backend/controllers/departmentsController.js`
- `backend/routes/userRoutes.js`
- `backend/routes/artistRoutes.js`
- `backend/routes/departmentsRoutes.js`
- `src/app/users/page.tsx`
- `src/services/userService.ts`

### Project Management Module
- `backend/controllers/projectController.js`
- `backend/routes/projectRoutes.js`
- `backend/services/projectsService.js`
- `src/app/projects/page.tsx`

### Task Management Module
- `backend/controllers/tasksRoutes.js` (controller functions)
- `backend/routes/tasksRoutes.js`
- `src/app/tasks/page.tsx`
- `src/app/tasks/[id]/page.tsx`
- `src/app/lead-dashboard/page.tsx`
- `src/app/department-queue/page.tsx`
- `src/app/production-queue/page.tsx`
- `src/app/review/page.tsx`
- `src/components/tasks/create-task-dialog.tsx`
- `src/services/taskService.ts`

### Ingestion Module
- `backend/controllers/importBidSheetController.js`
- `backend/controllers/importReviewController.js`
- `backend/controllers/simpleImportController.js`
- `backend/routes/importBidSheetRoutes.js`
- `backend/routes/simpleImportRoutes.js`
- `backend/routes/importReviewRoutes.js`
- `backend/services/conversionService.js`
- `backend/services/importBidSheetService.js`
- `backend/utils/excelBidSheetParser.js`
- `backend/utils/upload.js`
- `src/app/import/page.tsx`
- `src/app/production/import-review/page.tsx`
- `src/components/import-review/EditRowModal.tsx`
- `src/services/importService.ts`
- `src/services/importReviewService.ts`

### Analytics Module
- `src/services/analyticsService.ts`
- `src/app/analytics/page.tsx`
- `src/app/dashboard/production-head-view.tsx`
- `src/app/workload/page.tsx`
- `src/app/department-progress/page.tsx`
- `src/app/daily-tracking/page.tsx`
- `src/components/dashboard/stat-card.tsx`

### AI Module
- `src/ai/genkit.ts`
- `src/ai/dev.ts`
- `src/ai/flows/automated-shot-task-generation.ts`
- `src/ai/flows/intelligent-scheduling-assistant.ts`
- `src/ai/flows/review-feedback-summary-flow.ts`
- `src/app/scheduling/page.tsx`
- `src/app/review/page.tsx`

### Leave Management Module
- `src/app/leaves/page.tsx`
- `src/services/userService.ts`

### Notification Module
- `src/app/notifications/page.tsx`
- `src/services/notificationService.ts`

### Version Control Module
- `src/app/versions/page.tsx`
- `src/app/tasks/[id]/page.tsx`
- `src/services/taskService.ts`

### Settings Module
- `src/app/settings/page.tsx`

---

## File Count Summary

| Category | Count |
|----------|-------|
| Backend Controllers | 7 |
| Backend Routes | 16 |
| Backend Services | 3 |
| Backend Utils | 3 |
| Backend Middleware | 2 |
| Backend Config | 2 |
| Backend Scripts | 3 |
| Frontend Pages | 20+ |
| Frontend Components | 40+ |
| Frontend UI Primitives | 35 |
| Frontend Services | 7 |
| Frontend AI Flows | 3 |
| Frontend Config | 4 |
| Frontend Hooks | 1 |
| Documentation Files | 10+ |
| **Total** | **~150+** |
