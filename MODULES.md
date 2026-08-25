# MODULES.md

Business modules documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. Ingestion Module

### Purpose
Convert client Excel bid sheets into the production hierarchy (Projects, Sequences, Shots, Tasks).

### Screens
- `/import` - Excel upload and preview
- `/production/import-review` - Staging queue with edit/approve

### API
- `POST /api/simple-import` - Upload Excel to staging
- `GET /api/simple-import` - Get staged rows
- `GET /api/import-review` - Get unconverted rows
- `PUT /api/import-review/:id` - Edit staging row
- `DELETE /api/import-review/:id` - Delete staging row
- `POST /api/import-review/approve` - Convert to production

### Database Tables
- `BidSheetImport` (staging)
- `Clients`
- `Projects`
- `Episodes`
- `Sequences`
- `Shots`
- `Tasks`
- `TaskAssignments`

### Workflow
1. Production Head uploads Excel file
2. System parses headers and maps to SQL columns
3. Rows inserted into `BidSheetImport` staging table
4. Production Head reviews/edit rows in staging queue
5. On "Approve", `conversionService` runs:
   - Creates/finds Client from `ClientShotName`
   - Creates/finds Project from ShotName prefix
   - Creates/finds Episode from `Episode` column
   - Creates/finds Sequence from `EP/Reel` column
   - Creates/finds Shot from `Shot Name` column
   - Creates Tasks for each bid column (Roto, Paint, Comp, CG, Retime)
   - Creates TaskAssignments if Lead/Artist names match Users
   - Marks rows as `Converted = 1`

### Business Logic
- Project code extracted from ShotName prefix (e.g., `MPN_R01_SH0040` → `MPN`)
- Episode name: `EP_` + episode value
- Sequence code: `SEQ_` + episode value
- Task status: 'Assigned' if Lead/Artist exists, else 'Not Started'
- Default password for auto-created users: `SMFX123!`

### Dependencies
- `backend/controllers/simpleImportController.js`
- `backend/controllers/importReviewController.js`
- `backend/services/conversionService.js`
- `backend/utils/excelBidSheetParser.js`
- `src/app/import/page.tsx`
- `src/app/production/import-review/page.tsx`
- `src/components/import-review/EditRowModal.tsx`

---

## 2. Task Management Module

### Purpose
Manage the full lifecycle of VFX tasks from creation to approval.

### Screens
- `/tasks` - Artist workbench
- `/tasks/[id]` - Task detail with audit trail
- `/lead-dashboard` - Lead team management
- `/department-queue` - Supervisor delegation
- `/production-queue` - Global production queue

### API
- `GET /api/tasks` - List tasks
- `PUT /api/tasks/:id/assign` - Assign lead/artist
- `PUT /api/tasks/:id/progress` - Update progress
- `PUT /api/tasks/:id/review` - Lead/Supervisor review
- `PUT /api/tasks/:id/status` - Direct status update

### Database Tables
- `Tasks`
- `TaskAssignments`
- `TimeLogs`
- `Versions`

### Workflow
1. **Creation**: Tasks created during import or manually via `CreateTaskDialog`
2. **Assignment**: Supervisor assigns Lead → Lead assigns Artist
3. **Execution**: Artist updates progress, logs time, submits versions
4. **Review**: Lead QC → Supervisor final sign-off
5. **Approval**: Task marked 'Approved' or 'Retake'

### Business Logic
- Task status lifecycle: Not Started → Assigned → In Progress → Pending Review → Approved/Retake
- Progress = 100 triggers 'Pending Review'
- Lead review: 'Approved' → 'Pending Review', 'Changes Requested' → 'Retake'
- Supervisor review: 'Approved' → 'Approved', 'Changes Requested' → 'Retake'
- Assignment deactivates previous assignments (IsCurrent = 0)
- Artist capacity: 40h max, overload warning at 32h

### Dependencies
- `backend/controllers/tasksRoutes.js`
- `backend/routes/tasksRoutes.js`
- `src/lib/store.ts` (task actions)
- `src/components/tasks/create-task-dialog.tsx`
- `src/app/tasks/page.tsx`
- `src/app/lead-dashboard/page.tsx`
- `src/app/department-queue/page.tsx`

---

## 3. User Management Module

### Purpose
Manage staff directory, credentials, and role-based access.

### Screens
- `/users` - Staff directory and credential management

### API
- `GET /api/users` - List users
- `GET /api/users/me` - Current user profile
- `POST /api/users` - Create user
- `GET /api/users/credentials` - List credentials
- `PUT /api/users/:id/credentials` - Update credentials
- `PUT /api/users/:id/status` - Toggle active status
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Database Tables
- `Users`
- `UserCredentials`
- `UserSessions`
- `Departments`

### Workflow
1. Production Head/Supervisor creates user
2. System generates employee code (or uses provided)
3. If username/password provided, creates UserCredentials
4. User logs in with email/password
5. System returns JWT access + refresh tokens
6. User can update credentials (forces first login reset)

### Business Logic
- Department Supervisor can only see users in their department
- Password reset sets `IsFirstLogin = 1`
- Default password for new credentials: `SMFX123!`
- Employee code auto-generation for artists: `ART-000001`

### Dependencies
- `backend/controllers/userController.js`
- `backend/controllers/authController.js`
- `backend/controllers/artistController.js`
- `backend/controllers/departmentsController.js`
- `src/app/users/page.tsx`

---

## 4. Project Management Module

### Purpose
Manage production projects and hierarchy.

### Screens
- `/projects` - Project hierarchy explorer

### API
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/sequences` - List sequences
- `GET /api/sequences/lookup` - Lookup sequence
- `GET /api/shots` - List shots
- `GET /api/shots/lookup` - Lookup shot

### Database Tables
- `Projects`
- `Sequences`
- `Episodes`
- `Shots`
- `Clients`

### Workflow
1. Production Head creates project
2. Import creates sequences and shots automatically
3. Users browse hierarchy via Projects page

### Business Logic
- Project code must be unique
- Only Production Head and Supervisor can create/update projects
- Only Production Head can delete projects
- Delete fails if FK dependencies exist

### Dependencies
- `backend/controllers/projectController.js`
- `backend/services/projectsService.js`
- `src/app/projects/page.tsx`

---

## 5. Analytics Module

### Purpose
Provide real-time business intelligence and productivity metrics.

### Screens
- `/analytics` - Executive BI suite
- `/dashboard` - Role-based dashboard
- `/workload` - Capacity analytics
- `/department-progress` - Department throughput

### API
- No dedicated API endpoints (calculated client-side from store)

### Database Tables
- Read from: `Tasks`, `Shots`, `Projects`, `Users`

### Metrics
- Studio stats: total projects, shots, artists, revenue forecast
- Project health: completion rate, efficiency, burn rate
- Department metrics: utilization, efficiency, pending reviews
- Capacity data: artist assigned hours vs 40h capacity
- Performance rankings: lead/artist efficiency
- Risk assessment: overdue tasks, critical shots

### Business Logic
- Revenue forecast: `totalBid * $150/hour`
- Efficiency: `(bidHours / spentHours) * 100`
- Shot completion: `(approvedShots / totalShots) * 100`
- Risk factor: High if >3 critical shots, Medium if >0

### Dependencies
- `src/services/analyticsService.ts`
- `src/app/analytics/page.tsx`
- `src/app/dashboard/production-head-view.tsx`
- `src/app/workload/page.tsx`
- `src/app/department-progress/page.tsx`

---

## 6. AI Module

### Purpose
Provide AI-driven automation for task generation, scheduling, and feedback.

### Screens
- `/scheduling` - AI smart scheduler
- `/review` - AI feedback summary

### Flows
1. **Automated Shot Task Generation**
   - Input: Shot description
   - Output: List of pipeline tasks with suggested bid hours
   - Use case: Auto-generate tasks from shot description

2. **Intelligent Scheduling Assistant**
   - Input: Unassigned tasks, artist profiles, current date
   - Output: Suggested assignments, bottlenecks, conflicts
   - Use case: Optimize artist allocation

3. **Review Feedback Summary**
   - Input: Versions and comments for a shot
   - Output: Summary, action items, sentiment
   - Use case: Summarize QC feedback

### Dependencies
- `src/ai/genkit.ts` - Genkit initialization
- `src/ai/flows/automated-shot-task-generation.ts`
- `src/ai/flows/intelligent-scheduling-assistant.ts`
- `src/ai/flows/review-feedback-summary-flow.ts`
- `src/app/scheduling/page.tsx`
- `src/app/review/page.tsx`

---

## 7. Leave Management Module

### Purpose
Track artist availability and leave requests.

### Screens
- `/leaves` - Leave requests and calendar

### API
- No dedicated API (mock service)

### Database Tables
- `Leaves`

### Workflow
1. Artist submits leave request
2. Lead/Supervisor approves/rejects
3. System accounts for leave in capacity calculations

### Dependencies
- `src/services/userService.ts` (mock)
- `src/app/leaves/page.tsx`

---

## 8. Notification Module

### Purpose
Alert users of assignments, reviews, and deadlines.

### Screens
- `/notifications` - Notification center

### API
- No dedicated API (mock service)

### Database Tables
- `Notifications`

### Notification Types
- `TaskAssignment`: New task assigned
- `ReviewRetake`: Task sent back for changes
- `DeadlineWarning`: Approaching deadline

### Dependencies
- `src/services/notificationService.ts` (mock)
- `src/app/notifications/page.tsx`

---

## 9. Version Control Module

### Purpose
Track render submissions and QC feedback.

### Screens
- `/versions` - Version audit trail
- `/tasks/[id]` - Task detail with versions

### API
- No dedicated API (mock service)

### Database Tables
- `Versions`

### Workflow
1. Artist submits version
2. Lead reviews and comments
3. Supervisor final sign-off
4. Version history maintained

### Dependencies
- `src/services/taskService.ts` (mock getVersions)
- `src/app/versions/page.tsx`
- `src/app/tasks/[id]/page.tsx`

---

## 10. Settings Module

### Purpose
User profile and preferences.

### Screens
- `/settings` - Profile and preferences

### Features
- Profile editing
- Password change
- Theme preferences (dark mode only)

### Dependencies
- `src/app/settings/page.tsx`

---

## Module Dependency Graph

```
Ingestion Module
  ├── Project Management Module (creates projects)
  ├── Task Management Module (creates tasks)
  └── User Management Module (resolves artists/leads)

Task Management Module
  ├── User Management Module (assigns users)
  ├── Analytics Module (provides metrics)
  └── AI Module (scheduling suggestions)

User Management Module
  └── Authentication (login/logout)

Analytics Module
  ├── Task Management Module (task data)
  ├── Project Management Module (project data)
  └── User Management Module (user data)

AI Module
  ├── Task Management Module (unassigned tasks)
  └── User Management Module (artist profiles)

Leave Management Module
  └── User Management Module (user data)

Notification Module
  ├── Task Management Module (task events)
  └── User Management Module (recipients)

Version Control Module
  ├── Task Management Module (task data)
  └── User Management Module (artist data)
```
