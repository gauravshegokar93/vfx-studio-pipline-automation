# PROJECT_STRUCTURE.md

Complete folder structure and purpose of every directory in the SM rolling FX / Lumina VFX Hub project.

---

## Root Level

```
vfx-studio-pipline-automation/
├── .git/                          # Git repository
├── .idx/                          # Firebase IDX dev environment config
│   ├── dev.nix                    # Nix environment (Node.js 22, Zulu JDK)
│   └── icon.png                   # IDX workspace icon
├── .next/                         # Next.js build output (gitignored)
├── backend/                       # Express.js API server
├── docs/                          # Technical documentation & SQL scripts
├── src/                           # Next.js frontend application
├── .gitignore                     # Git ignore rules
├── .modified                      # Empty marker file
├── apphosting.yaml                # Firebase App Hosting config
├── components.json                # ShadCN UI configuration
├── implementation_plan.md         # Import review workflow plan
├── next.config.ts                 # Next.js configuration
├── package.json                   # Frontend dependencies
├── package-lock.json              # Frontend lock file
├── postcss.config.mjs             # PostCSS config (Tailwind)
├── README.md                      # Project README
├── tailwind.config.ts             # Tailwind CSS theme config
├── TODO.md                        # Development TODOs
├── tsconfig.json                  # TypeScript configuration
└── vfx-studio-pipline-automation.zip  # Project archive
```

---

## Backend Structure

```
backend/
├── .env                           # Environment variables (DB, JWT, etc.)
├── backendfile.zip                # Backend archive
├── config/
│   └── db.js                      # SQL Server connection config (mssql)
├── controllers/
│   ├── artistController.js        # Artist CRUD (Production Head/Supervisor only)
│   ├── authController.js          # Login, refresh token, logout
│   ├── departmentsController.js   # Department listing
│   ├── importBidSheetController.js # STUB - preview/commit bid sheets
│   ├── importReviewController.js  # Staging row CRUD + approve conversion
│   ├── projectController.js       # Project CRUD
│   ├── simpleImportController.js  # Excel upload → BidSheetImport staging
│   └── userController.js          # User CRUD, credentials, status toggle
├── middleware/
│   ├── authMiddleware.js          # JWT verification + RBAC (mock token support)
│   └── requireProductionHead.js   # Convenience wrapper for PH-only routes
├── routes/
│   ├── artistRoutes.js            # /api/artists CRUD
│   ├── assetsRoutes.js            # 501 Not Implemented
│   ├── assignmentsRoutes.js       # 501 Not Implemented
│   ├── attendanceRoutes.js        # 501 Not Implemented
│   ├── authRoutes.js              # /api/auth/login, refresh, logout
│   ├── clientsRoutes.js           # 501 Not Implemented
│   ├── departmentsRoutes.js       # /api/departments
│   ├── importBidSheetRoutes.js    # /api/import/bid-sheet/* (open, no auth)
│   ├── importReviewRoutes.js      # /api/import-review (secured)
│   ├── leavesRoutes.js            # 501 Not Implemented
│   ├── notificationsRoutes.js     # 501 Not Implemented
│   ├── productionRoutes.js        # 501 Not Implemented
│   ├── projectRoutes.js           # /api/projects CRUD
│   ├── reportsRoutes.js           # 501 Not Implemented
│   ├── sequencesRoutes.js         # /api/sequences list/lookup
│   ├── settingsRoutes.js          # 501 Not Implemented
│   ├── shotsRoutes.js             # /api/shots list/lookup
│   ├── simpleImportRoutes.js      # /api/simple-import (open, no auth)
│   ├── tasksRoutes.js             # /api/tasks list/assign/progress/review/status
│   └── userRoutes.js              # /api/users CRUD + credentials
├── scripts/
│   └── run-migrations.js          # Adds Clients, Episodes, Converted columns
├── services/
│   ├── conversionService.js       # BidSheetImport → Projects/Sequences/Shots/Tasks
│   ├── importBidSheetService.js   # Preview/commit bid sheet (legacy)
│   └── projectsService.js         # Project CRUD with pagination
├── utils/
│   ├── excelBidSheetParser.js     # Excel parsing logic (legacy)
│   ├── sqlTransactionHelper.js    # Empty placeholder
│   └── upload.js                  # Multer memory storage config
├── list-users.js                  # Dev script: list all users
├── package.json                   # Backend dependencies
├── package-lock.json              # Backend lock file
├── server.js                      # Express app entry point
├── test-db.js                     # Dev script: test DB connection
└── test-import.xlsx               # Sample bid sheet for testing
```

---

## Frontend Structure

```
src/
├── ai/                            # Genkit AI flows
│   ├── dev.ts                     # Dev entry: imports all flows
│   ├── flows/
│   │   ├── automated-shot-task-generation.ts      # Generates tasks from shot description
│   │   ├── intelligent-scheduling-assistant.ts    # Optimizes artist assignments
│   │   └── review-feedback-summary-flow.ts        # Summarizes QC feedback
│   └── genkit.ts                  # Genkit initialization (Gemini 2.5 Flash)
├── app/                           # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css                # Global styles, Tailwind imports, theme vars
│   ├── layout.tsx                 # Root layout (fonts, DatabaseSync wrapper)
│   ├── page.tsx                   # Home → redirects to /dashboard
│   ├── analytics/
│   │   └── page.tsx               # Executive BI hub (role-filtered tabs)
│   ├── daily-tracking/
│   │   └── page.tsx               # Daily shot progress table
│   ├── dashboard/
│   │   ├── page.tsx               # Unified dashboard router (by role)
│   │   └── production-head-view.tsx # Executive overview with charts
│   ├── department-progress/
│   │   └── page.tsx               # Departmental throughput cards
│   ├── department-queue/
│   │   └── page.tsx               # Supervisor delegation + final sign-off
│   ├── import/
│   │   └── page.tsx               # Excel upload + staging preview grid
│   ├── lead-dashboard/
│   │   └── page.tsx               # Lead team management + QC
│   ├── leaves/
│   │   └── page.tsx               # Leave requests + holiday schedule
│   ├── lib/
│   │   └── placeholder-images.json # Placeholder image URLs
│   ├── notifications/
│   │   └── page.tsx               # Notification center
│   ├── production/
│   │   └── import-review/
│   │       └── page.tsx           # Staging queue with edit/delete/approve
│   ├── production-queue/
│   │   └── page.tsx               # Global production queue
│   ├── projects/
│   │   └── page.tsx               # Project hierarchy explorer
│   ├── review/
│   │   └── page.tsx               # QC review queue + AI summary
│   ├── scheduling/
│   │   └── page.tsx               # AI smart scheduler (mock data)
│   ├── settings/
│   │   └── page.tsx               # Profile & preferences
│   ├── tasks/
│   │   ├── page.tsx               # Artist workbench
│   │   └── [id]/
│   │       └── page.tsx           # Task detail with versions/logs
│   ├── users/
│   │   └── page.tsx               # Staff directory + credential management
│   ├── versions/
│   │   └── page.tsx               # Version audit trail
│   └── workload/
│       └── page.tsx               # Capacity analytics
├── components/                    # Reusable React components
│   ├── dashboard/
│   │   └── stat-card.tsx          # Stat card with trend indicator
│   ├── import-review/
│   │   └── EditRowModal.tsx       # Modal for editing staging rows
│   ├── layout/
│   │   ├── database-sync.tsx      # Hydrates Zustand from SQL Server
│   │   └── sidebar.tsx            # Role-based navigation sidebar
│   ├── tasks/
│   │   └── create-task-dialog.tsx # Manual task creation with capacity check
│   └── ui/                        # ShadCN UI primitives (35+ components)
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── tooltip.tsx
├── config/
│   └── api.ts                     # API_BASE_URL and ENDPOINTS constants
├── hooks/
│   └── use-toast.ts               # Toast notification hook
├── lib/
│   ├── store.ts                   # Zustand global state (LuminaStore)
│   ├── types.ts                   # TypeScript interfaces (User, Task, Project, etc.)
│   └── utils.ts                   # Utility functions (cn, etc.)
└── services/
    ├── analyticsService.ts        # Studio stats, project health, rankings
    ├── apiClient.ts               # Axios instance with mock JWT interceptor
    ├── importReviewService.ts     # Import review API calls
    ├── importService.ts           # Simple import API calls
    ├── notificationService.ts     # Mock notification service
    ├── taskService.ts             # Task queries (mostly from store)
    └── userService.ts             # Mock user/leave services
```

---

## Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `backend/` | Express.js REST API server with SQL Server integration |
| `backend/config/` | Database connection configuration |
| `backend/controllers/` | Route handlers with business logic |
| `backend/middleware/` | Auth, RBAC, validation middleware |
| `backend/routes/` | Express route definitions |
| `backend/scripts/` | Database migration scripts |
| `backend/services/` | Data transformation and complex business logic |
| `backend/utils/` | File upload, Excel parsing helpers |
| `docs/` | SQL schemas, API docs, project documentation |
| `src/` | Next.js frontend application |
| `src/ai/` | Genkit AI flows and configuration |
| `src/app/` | Next.js App Router pages (file-based routing) |
| `src/components/` | Reusable React components |
| `src/components/ui/` | ShadCN UI primitives (do not modify) |
| `src/config/` | Frontend configuration (API URLs) |
| `src/hooks/` | Custom React hooks |
| `src/lib/` | Core utilities, types, and global state |
| `src/services/` | API client and service abstractions |

---

## File Count Summary

| Category | Count |
|----------|-------|
| Backend Controllers | 7 |
| Backend Routes | 16 |
| Backend Services | 3 |
| Backend Utils | 3 |
| Frontend Pages | 20+ |
| Frontend Components | 40+ |
| UI Primitives | 35 |
| AI Flows | 3 |
| Documentation Files | 10+ |
