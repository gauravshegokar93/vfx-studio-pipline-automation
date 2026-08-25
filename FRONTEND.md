# FRONTEND.md

Complete frontend documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. Overview

The frontend is a **Next.js 15** application using the **App Router** with **TypeScript** and **Tailwind CSS**. It follows a service-oriented architecture with Zustand for global state management.

**Port**: 9002
**Entry Point**: `src/app/layout.tsx`

---

## 2. Architecture

```
src/app/                    # Pages (App Router)
  ├── layout.tsx            # Root layout with fonts + DatabaseSync
  ├── page.tsx              # Home → redirects to /dashboard
  └── [route]/page.tsx      # Feature pages

src/components/             # Reusable components
  ├── ui/                   # ShadCN primitives (35+)
  ├── layout/               # Sidebar, DatabaseSync
  ├── tasks/                # Task dialogs
  ├── dashboard/            # Stat cards
  └── import-review/        # Edit modals

src/lib/                    # Core logic
  ├── store.ts              # Zustand global state
  ├── types.ts              # TypeScript interfaces
  └── utils.ts              # Utility functions

src/services/               # API abstraction
  ├── apiClient.ts          # Axios instance
  ├── analyticsService.ts   # BI calculations
  ├── importService.ts      # Import API calls
  ├── taskService.ts        # Task queries
  └── userService.ts        # User/leave mocks

src/ai/                     # Genkit AI flows
  ├── genkit.ts             # AI initialization
  └── flows/                # 3 AI flows

src/config/                 # Configuration
  └── api.ts                # API base URL

src/hooks/                  # Custom hooks
  └── use-toast.ts          # Toast notifications
```

---

## 3. Pages

### Dashboard (`/dashboard`)
**Purpose**: Unified landing page that routes based on user role

**File**: `src/app/dashboard/page.tsx`

**Behavior**:
- Production Head → `/dashboard/production-head-view`
- Department Supervisor → `/department-queue`
- Lead → `/lead-dashboard`
- Artist → `/tasks`

---

### Production Head View (`/dashboard/production-head-view`)
**Purpose**: Executive overview with charts and KPIs

**File**: `src/app/dashboard/production-head-view.tsx`

**Features**:
- Studio stats (total projects, shots, artists, revenue)
- Project health cards
- Department performance metrics
- Lead efficiency rankings
- Risk assessment

**Dependencies**:
- `analyticsService.ts` for data
- Recharts for visualizations
- `stat-card.tsx` component

---

### Tasks (`/tasks`)
**Purpose**: Artist workbench

**File**: `src/app/tasks/page.tsx`

**Features**:
- List of assigned tasks
- Progress tracking
- Timer start/stop
- Version submission
- Comment updates

**Dependencies**:
- `useLuminaStore` for task data
- `taskService.ts` for queries

---

### Task Detail (`/tasks/[id]`)
**Purpose**: Detailed task view with audit trail

**File**: `src/app/tasks/[id]/page.tsx`

**Features**:
- Task details
- Version history
- Time logs
- Comments
- Progress updates

---

### Lead Dashboard (`/lead-dashboard`)
**Purpose**: Team management and QC hub

**File**: `src/app/lead-dashboard/page.tsx`

**Features**:
- Team task list
- Artist capacity view
- QC review actions
- Task assignment

---

### Department Queue (`/department-queue`)
**Purpose**: Supervisor delegation and final sign-off

**File**: `src/app/department-queue/page.tsx`

**Features**:
- Department task queue
- Lead assignment
- Final approval workflow
- Department progress tracking

---

### Projects (`/projects`)
**Purpose**: Production hierarchy explorer

**File**: `src/app/projects/page.tsx`

**Features**:
- Project list
- Sequence drill-down
- Shot listing
- Task overview

---

### Import (`/import`)
**Purpose**: Excel bid sheet ingestion

**File**: `src/app/import/page.tsx`

**Features**:
- Excel file upload
- Preview parsed data
- Staging grid
- Commit to database

**Dependencies**:
- `importService.ts`
- `simpleImportService.ts`

---

### Production Import Review (`/production/import-review`)
**Purpose**: Review and approve staged imports

**File**: `src/app/production/import-review/page.tsx`

**Features**:
- Data grid of staged rows
- Edit/delete rows
- Approve conversion
- Search/filter/sort

**Dependencies**:
- `importReviewService.ts`
- `EditRowModal.tsx`

---

### Analytics (`/analytics`)
**Purpose**: Executive BI suite

**File**: `src/app/analytics/page.tsx`

**Features**:
- Revenue forecasting
- Burn rate tracking
- Department utilization
- Performance rankings

**Dependencies**:
- `analyticsService.ts`
- Recharts

---

### Users (`/users`)
**Purpose**: Staff directory and credential management

**File**: `src/app/users/page.tsx`

**Features**:
- User list with search/filter
- Create/edit users
- Credential management
- Status toggle

**Dependencies**:
- `userService.ts`
- `useLuminaStore`

---

### Leaves (`/leaves`)
**Purpose**: Resource availability

**File**: `src/app/leaves/page.tsx`

**Features**:
- Leave request form
- Leave calendar
- Approval workflow

---

### Notifications (`/notifications`)
**Purpose**: Alert center

**File**: `src/app/notifications/page.tsx`

**Features**:
- Notification list
- Mark as read
- Filter by type

---

### Scheduling (`/scheduling`)
**Purpose**: AI smart scheduler

**File**: `src/app/scheduling/page.tsx`

**Features**:
- Unassigned task list
- Artist availability
- AI scheduling suggestions

**Dependencies**:
- Genkit AI flow: `intelligent-scheduling-assistant`

---

### Review (`/review`)
**Purpose**: QC queue and AI feedback summary

**File**: `src/app/review/page.tsx`

**Features**:
- Pending review tasks
- AI feedback summary
- Comment thread

**Dependencies**:
- Genkit AI flow: `review-feedback-summary-flow`

---

### Versions (`/versions`)
**Purpose**: Submission audit trail

**File**: `src/app/versions/page.tsx`

**Features**:
- Version history
- Review status
- Download links

---

### Workload (`/workload`)
**Purpose**: Capacity analytics

**File**: `src/app/workload/page.tsx`

**Features**:
- Artist capacity chart
- Department utilization
- Overload warnings

---

### Daily Tracking (`/daily-tracking`)
**Purpose**: SSoT summary (Excel alternative)

**File**: `src/app/daily-tracking/page.tsx`

**Features**:
- Daily shot progress table
- Status updates
- Export capability

---

### Settings (`/settings`)
**Purpose**: Profile and preferences

**File**: `src/app/settings/page.tsx`

**Features**:
- Profile editing
- Password change
- Theme preferences

---

### Department Progress (`/department-progress`)
**Purpose**: Throughput tracking

**File**: `src/app/department-progress/page.tsx`

**Features**:
- Department cards
- Shot completion rates
- Pipeline status

---

### Production Queue (`/production-queue`)
**Purpose**: Global production queue

**File**: `src/app/production-queue/page.tsx`

**Features**:
- All tasks across projects
- Status filtering
- Bulk actions

---

## 4. Components

### Layout Components

#### Sidebar (`src/components/layout/sidebar.tsx`)
**Purpose**: Role-based navigation

**Features**:
- Dynamic menu items based on role
- Active route highlighting
- User info display
- Logout button

**Dependencies**:
- `useLuminaStore` for current user/role
- Lucide icons
- ShadCN UI components

---

#### DatabaseSync (`src/components/layout/database-sync.tsx`)
**Purpose**: Hydrates Zustand store from SQL Server

**Features**:
- Fetches all data on mount
- Refetches on role change
- Loading states
- Error handling

**Dependencies**:
- `useLuminaStore` for `bootstrapStudio`
- `apiClient` for API calls

---

### Task Components

#### CreateTaskDialog (`src/components/tasks/create-task-dialog.tsx`)
**Purpose**: Manual task creation with capacity check

**Features**:
- Project/shot selection
- Pipeline step selection
- Artist capacity analytics
- Overload warnings
- Lead/reviewer assignment

**Dependencies**:
- `useLuminaStore`
- ShadCN Dialog, Select, Input, Badge, Progress

---

### Import Review Components

#### EditRowModal (`src/components/import-review/EditRowModal.tsx`)
**Purpose**: Edit staging row before approval

**Features**:
- Form for all staging fields
- Save/cancel actions
- Loading states

**Dependencies**:
- `importReviewService`
- ShadCN Dialog, Input, Button

---

### Dashboard Components

#### StatCard (`src/components/dashboard/stat-card.tsx`)
**Purpose**: Display metric with trend

**Features**:
- Icon, label, value
- Trend indicator (positive/negative)
- Hover effects

**Dependencies**:
- Lucide icons
- ShadCN Card

---

### UI Components (`src/components/ui/`)
**Purpose**: ShadCN UI primitives

**Components**: accordion, alert-dialog, alert, avatar, badge, button, calendar, card, carousel, chart, checkbox, collapsible, dialog, dropdown-menu, form, input, label, menubar, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toast, toaster, tooltip

**Note**: Do not modify unless fixing ShadCN issues.

---

## 5. State Management

### Store (`src/lib/store.ts`)

**Name**: `useLuminaStore`

**State**:
```typescript
interface LuminaState {
  currentUser: User | null;
  currentRole: Role;
  users: User[];
  userCredentials: UserCredential[];
  projects: Project[];
  sequences: Sequence[];
  shots: Shot[];
  tasks: Task[];
  departments: Department[];
}
```

**Actions**:
- `setCurrentUser(user)`: Set current user
- `setRole(role)`: Simulate role change (finds user with that role)
- `addUser(user, credential?)`: Create user via API
- `bulkImportUsers(users)`: Bulk add users to store
- `toggleUserStatus(userId)`: Toggle user active status
- `resetUserPassword(userId)`: Reset password (sets isFirstLogin)
- `updateUserCredentials(userId, username, password?)`: Update credentials
- `addTask(task)`: Add task to store
- `bootstrapStudio(data)`: Hydrate entire store from API
- `updateTaskTimer(taskId, isRunning)`: Toggle timer
- `assignTaskLead(taskId, leadId)`: Assign lead to task
- `assignTaskArtist(taskId, artistId)`: Assign artist to task
- `updateTaskStatus(taskId, status)`: Update task status
- `artistUpdateProgress(taskId, progress, comment, internalEta)`: Artist progress update
- `leadReviewTask(taskId, status, comment)`: Lead QC review
- `supervisorApproveTask(taskId, status, comment)`: Supervisor approval

**Pattern**: All actions call API first, then update local state optimistically.

---

## 6. Services

### apiClient (`src/services/apiClient.ts`)
**Purpose**: Axios instance with interceptors

**Configuration**:
- Base URL: `API_BASE_URL` from config
- Request interceptor: Adds `Authorization: Bearer mock-jwt-token` and `x-simulated-role` header

**Note**: In production, replace mock token with real JWT from login.

---

### analyticsService (`src/services/analyticsService.ts`)
**Purpose**: Calculate BI metrics from store data

**Functions**:
- `getStudioStats()`: Executive overview metrics
- `getProjectHealthData()`: Per-project health
- `getDepartmentMetrics()`: Department efficiency
- `getCapacityData()`: Artist capacity analysis
- `getPerformanceRankings()`: Lead/Artist rankings
- `getLeadPerformance()`: Lead efficiency
- `getDepartmentUtilization()`: Department utilization

**Note**: All calculations are done client-side from Zustand store. In production, these should be SQL View calls.

---

### importService (`src/services/importService.ts`)
**Purpose**: Simple import API calls

**Functions**:
- `simpleImport(file)`: Upload Excel
- `getImportedRows()`: Get staged rows
- `previewBidSheet(file, token)`: Preview bid sheet
- `commitBidSheet(file, token)`: Commit bid sheet

---

### importReviewService (`src/services/importReviewService.ts`)
**Purpose**: Import review API calls

**Functions**:
- `getPendingImports()`: Get unconverted rows
- `updateImportRow(id, data)`: Update staging row
- `deleteImportRow(id)`: Delete staging row
- `approveImports()`: Trigger conversion

---

### taskService (`src/services/taskService.ts`)
**Purpose**: Task queries (mostly from store)

**Functions**:
- `getByArtist(artistId)`: Get tasks for artist
- `getById(id)`: Get task by ID
- `getTimeLogs(taskId)`: Get time logs (returns empty)
- `getVersions(taskId)`: Get versions (returns empty)
- `getDepartmentQueue(deptId)`: Get tasks by department

**Note**: `getTimeLogs` and `getVersions` return empty arrays. These need backend integration.

---

### userService (`src/services/userService.ts`)
**Purpose**: Mock user/leave services

**Functions**:
- `getDepartmentStaff(deptId)`: Mock staff list
- `getProfile(id)`: Mock profile
- `submitLeave(leave)`: Mock leave submission
- `getLeaves()`: Mock leave list

**Note**: All functions return mock data with `MOCK_DELAY`. These need backend integration.

---

### notificationService (`src/services/notificationService.ts`)
**Purpose**: Mock notification service

**Functions**:
- `getForUser(userId)`: Mock notifications
- `markAsRead(id)`: Mock mark as read

**Note**: Returns hardcoded mock data. Needs backend integration.

---

## 7. Types

**File**: `src/lib/types.ts`

**Key Types**:
- `Role`: 'Production Head' | 'Department Supervisor' | 'Lead' | 'Artist'
- `PipelineStep`: 'Ingest' | 'Prep' | 'Roto' | 'Paint' | 'Matchmove' | 'CG' | 'Comp' | 'QC' | 'Delivery'
- `TaskStatus`: 'Not Started' | 'Assigned' | 'In Progress' | 'Pending Review' | 'Client Review' | 'Retake' | 'Approved' | 'Delivered'
- `ReviewStatus`: 'Pending' | 'In Review' | 'Changes Requested' | 'Approved'
- `LeaveStatus`: 'Pending' | 'Approved' | 'Rejected'
- `Priority`: 'Low' | 'Medium' | 'High' | 'Critical'
- `User`, `UserCredential`, `Department`, `Project`, `Sequence`, `Shot`, `Task`, `TimeLog`, `Version`, `Leave`, `Notification`, `ShotStatusHistory`

---

## 8. Configuration

### api.ts (`src/config/api.ts`)
**Purpose**: API configuration

**Exports**:
- `API_BASE_URL`: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"`
- `ENDPOINTS`: Object with endpoint constants

---

## 9. Hooks

### useToast (`src/hooks/use-toast.ts`)
**Purpose**: Toast notification system

**Features**:
- Add/update/dismiss/remove toasts
- Auto-dismiss after timeout
- Limit to 1 toast at a time

**Usage**:
```typescript
const { toast } = useToast();
toast({ title: 'Success', description: 'Task created' });
```

---

## 10. Theme

### Colors
- **Primary**: Crimson (#E6192E) - `bg-crimson`
- **Accent**: Violet (#A632E6) - used sparingly
- **Background**: Deep charcoal (#141212)
- **Sidebar**: Darker shade with border
- **Text**: White primary, muted-foreground secondary

### Fonts
- **Headlines**: Poppins (Google Fonts)
- **Body**: Inter (Google Fonts)
- **Code**: Monospace

### Dark Mode
- App is dark-mode only
- `dark` class on HTML element
- No light mode toggle

---

## 11. Routing

### App Router Structure
```
src/app/
├── layout.tsx              # Root layout
├── page.tsx                # Home
├── dashboard/
│   ├── page.tsx            # Dashboard router
│   └── production-head-view.tsx
├── tasks/
│   ├── page.tsx            # Artist workbench
│   └── [id]/page.tsx       # Task detail
├── lead-dashboard/page.tsx
├── department-queue/page.tsx
├── projects/page.tsx
├── import/page.tsx
├── production/import-review/page.tsx
├── analytics/page.tsx
├── users/page.tsx
├── leaves/page.tsx
├── notifications/page.tsx
├── scheduling/page.tsx
├── review/page.tsx
├── versions/page.tsx
├── workload/page.tsx
├── daily-tracking/page.tsx
├── settings/page.tsx
├── department-progress/page.tsx
└── production-queue/page.tsx
```

---

## 12. Build Configuration

### next.config.ts
- `typescript.ignoreBuildErrors: true`
- `eslint.ignoreDuringBuilds: true`
- Remote images: placehold.co, images.unsplash.com, picsum.photos

### tsconfig.json
- Target: ES2017
- Module: ESNext
- Module Resolution: Bundler
- Path alias: `@/*` → `./src/*`
- Strict mode enabled

---

## 13. Dependencies

### Key Frontend Dependencies
- `next`: 15.5.9
- `react`: 19.2.1
- `typescript`: 5
- `tailwindcss`: 3.4.1
- `zustand`: 5.0.0
- `axios`: 1.7.9
- `recharts`: 2.15.1
- `lucide-react`: 0.475.0
- `@radix-ui/*`: Various UI primitives
- `@tanstack/react-table`: 8.21.3
- `genkit`: 1.28.0
- `@genkit-ai/google-genai`: 1.28.0
- `react-hook-form`: 7.54.2
- `zod`: 3.24.2

---

## 14. Known Issues

1. **State volatility**: Data resets on refresh (Zustand not persisted)
2. **Mock services**: `userService`, `notificationService` return hardcoded data
3. **TypeScript errors**: Several `any` types in import page
4. **Build errors ignored**: `next.config.ts` ignores TS/ESLint errors
5. **No error boundaries**: React errors crash the app
6. **No loading skeletons**: Some pages show no loading state
7. **Hardcoded mock data**: `scheduling`, `workload`, `users` pages have hardcoded arrays
