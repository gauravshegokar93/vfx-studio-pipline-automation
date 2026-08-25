# WORKFLOW.md

Workflow documentation and flowcharts for SM rolling FX / Lumina VFX Hub.

---

## 1. Project Creation Workflow

```
┌─────────────────┐
│ Production Head │
│   Dashboard     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Project │
│  (Manual or     │
│   Import)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Project Code   │
│  Must Be Unique │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Project Active │
│  In Production  │
└─────────────────┘
```

**Steps**:
1. Production Head navigates to Projects page
2. Clicks "Create Project"
3. Enters Project Code, Name, Client, Dates
4. System validates unique Project Code
5. Project created with status 'In-Production'

**Alternative**: Project created automatically during Excel import.

---

## 2. Shot Creation Workflow

```
┌─────────────────┐
│  Excel Upload   │
│  (Bid Sheet)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse Headers  │
│  Map to SQL     │
│  Columns        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Insert into    │
│  BidSheetImport │
│  (Staging)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review/Edit    │
│  Staging Rows   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Approve Import │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Conversion     │
│  Engine         │
│  (Transaction)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Find/Create:                       │
│  1. Client (from ClientShotName)     │
│  2. Project (from ShotName prefix)   │
│  3. Episode (from Episode column)    │
│  4. Sequence (from EP/Reel column)   │
│  5. Shot (from Shot Name column)     │
│  6. Tasks (from bid columns)         │
│  7. TaskAssignments (from Artist/Lead│
│     columns)                         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Mark Rows      │
│  Converted = 1  │
└─────────────────┘
```

**Steps**:
1. Production Head uploads Excel bid sheet
2. System parses and stages in `BidSheetImport`
3. Production Head reviews/edit rows
4. On "Approve", conversion engine runs in single transaction
5. Projects, Sequences, Shots, Tasks created automatically

---

## 3. Task Assignment Workflow

```
┌─────────────────┐
│  Supervisor     │
│  Department     │
│  Queue          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Unassigned│
│  Tasks          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Assign Lead    │
│  to Task        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Status:   │
│  'Assigned'     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Dashboard │
│  (Team View)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Assigns   │
│  Artist        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Status:   │
│  'In Progress'  │
└─────────────────┘
```

**Steps**:
1. Supervisor views department queue
2. Assigns Lead to unassigned tasks
3. Lead views team dashboard
4. Lead assigns Artist to tasks
5. Task status updates automatically

**Business Rules**:
- Assignment deactivates previous assignments
- 'Not Started' → 'Assigned' (lead only) or 'In Progress' (artist assigned)

---

## 4. Artist Workflow

```
┌─────────────────┐
│  Artist         │
│  Workbench      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Assigned  │
│  Tasks          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Start Timer    │
│  (Track Time)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Progress│
│  (0-100%)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Submit Version │
│  (Render Output)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Add Comment    │
│  (Notes for QC) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Status:   │
│  'Pending       │
│   Review'       │
└─────────────────┘
```

**Steps**:
1. Artist views assigned tasks
2. Starts timer for time tracking
3. Updates progress percentage
4. Submits version with file path
5. Adds comment for QC
6. Task moves to 'Pending Review'

**Business Rules**:
- Progress = 100 automatically triggers 'Pending Review'
- ReviewStatus reset to 'Pending' on progress update

---

## 5. Supervisor Workflow

```
┌─────────────────┐
│  Supervisor     │
│  Dashboard      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Department│
│  Queue          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Assign Leads   │
│  to Tasks       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Monitor Team   │
│  Progress       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final Sign-off │
│  (Approve/      │
│   Retake)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Status:   │
│  'Approved' or  │
│  'Retake'       │
└─────────────────┘
```

**Steps**:
1. Supervisor views department queue
2. Assigns leads to unassigned tasks
3. Monitors team progress and capacity
4. Performs final sign-off on reviewed tasks
5. Approves or requests changes

**Business Rules**:
- Supervisor review is final (no further review levels)
- 'Approved' → 'Approved' status
- 'Changes Requested' → 'Retake' status

---

## 6. Approval Workflow

```
┌─────────────────┐
│  Artist Submits │
│  Version        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Status:   │
│  'Pending       │
│   Review'       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead QC Review │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Decision: │
│  - Approved     │
│  - Changes      │
│    Requested    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  If Approved:   │
│  Status →       │
│  'Pending       │
│   Review'       │
│  (Supervisor)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  If Changes:    │
│  Status →       │
│  'Retake'       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supervisor     │
│  Final Review   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supervisor     │
│  Decision:      │
│  - Approved     │
│  - Changes      │
│    Requested    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final Status:  │
│  'Approved' or  │
│  'Retake'       │
└─────────────────┘
```

**Steps**:
1. Artist submits version → 'Pending Review'
2. Lead reviews:
   - Approved → 'Pending Review' (waiting for supervisor)
   - Changes Requested → 'Retake'
3. Supervisor reviews (only if Lead approved):
   - Approved → 'Approved'
   - Changes Requested → 'Retake'

**Business Rules**:
- Two-tier review: Lead QC then Supervisor sign-off
- Comments stored in `LatestLeadComment` and `LatestSupComment`
- ReviewStatus tracks: Pending, In Review, Changes Requested, Approved

---

## 7. Delivery Workflow

```
┌─────────────────┐
│  Task Approved  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Shot Status:   │
│  'Approved'     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  All Tasks for  │
│  Shot Approved  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Shot Ready for │
│  Delivery       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Delivery Date  │
│  Reached        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Shot Status:   │
│  'Delivered'    │
└─────────────────┘
```

**Steps**:
1. All tasks for a shot are approved
2. Shot marked as ready for delivery
3. Delivery date tracked
4. Shot status updated to 'Delivered'

**Note**: Delivery workflow is partially implemented. Shot status updates are manual.

---

## 8. Import Workflow

```
┌─────────────────┐
│  Upload Excel   │
│  Bid Sheet      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse & Stage  │
│  (BidSheetImport│
│   Table)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review Grid    │
│  (Edit/Delete)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Approve        │
│  Conversion     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Transaction:   │
│  Create         │
│  Projects,      │
│  Sequences,     │
│  Shots, Tasks   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mark Converted │
│  = 1            │
└─────────────────┘
```

**Steps**:
1. Production Head uploads Excel file
2. System parses and inserts into `BidSheetImport`
3. Production Head reviews staging grid
4. Edits/deletes rows as needed
5. Clicks "Approve Import"
6. Conversion engine creates full hierarchy in single transaction
7. Rows marked as converted

---

## 9. Export Workflow

```
┌─────────────────┐
│  Select Data    │
│  (Projects,     │
│   Shots, Tasks) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Generate       │
│  Report         │
│  (Excel/CSV)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Download File  │
└─────────────────┘
```

**Note**: Export functionality is not fully implemented. The `/daily-tracking` page provides a table view that could be exported.

---

## 10. Notification Workflow

```
┌─────────────────┐
│  Trigger Event  │
│  (Assignment,   │
│   Review,       │
│   Deadline)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create         │
│  Notification   │
│  Record         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Sees      │
│  Notification   │
│  in Center      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mark as Read   │
└─────────────────┘
```

**Trigger Events**:
- Task Assignment: New task assigned to user
- Review Retake: Task sent back for changes
- Deadline Warning: Task approaching due date

**Note**: Notification system is mocked. Real implementation would use database triggers or backend events.

---

## 11. Leave Workflow

```
┌─────────────────┐
│  Artist         │
│  Submits Leave  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Leave Request  │
│  Created        │
│  (Status:       │
│   Pending)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead/Supervisor│
│  Reviews        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Decision:      │
│  - Approved     │
│  - Rejected     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Capacity       │
│  Adjusted       │
│  (if Approved)  │
└─────────────────┘
```

**Steps**:
1. Artist submits leave request
2. System creates Leave record with 'Pending' status
3. Lead/Supervisor reviews
4. If approved, artist marked as unavailable
5. Capacity calculations exclude leave days

**Note**: Leave management is mocked. Real implementation would require backend API.

---

## 12. AI Scheduling Workflow

```
┌─────────────────┐
│  Supervisor     │
│  Opens Scheduler│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  System Shows   │
│  Unassigned     │
│  Tasks +        │
│  Artist Profiles│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Analyzes:   │
│  - Task bid     │
│    hours        │
│  - Due dates    │
│  - Artist       │
│    skills       │
│  - Current      │
│    workload     │
│  - Vacation     │
│    days         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Suggests:   │
│  - Optimal      │
│    assignments  │
│  - Start/End    │
│    dates        │
│  - Bottlenecks  │
│  - Conflicts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supervisor     │
│  Reviews &      │
│  Approves       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tasks Assigned │
│  Automatically  │
└─────────────────┘
```

**Steps**:
1. Supervisor opens scheduling page
2. System displays unassigned tasks and artist profiles
3. AI flow `intelligent-scheduling-assistant` analyzes data
4. AI returns suggested assignments with rationale
5. Supervisor reviews and approves
6. Tasks assigned automatically

**AI Input**:
- Unassigned tasks (id, name, pipelineStep, bidHours, dueDate, requiredSkills)
- Artists (id, name, departmentId, skillSets, availableHoursPerDay, currentAssignedTasks, vacationDays)
- Current date

**AI Output**:
- Suggested assignments (taskId, artistId, startDate, endDate, rationale)
- Potential bottlenecks
- Scheduling conflicts
- Overall summary

---

## 13. AI Feedback Summary Workflow

```
┌─────────────────┐
│  Lead/Supervisor│
│  Opens Review   │
│  Queue          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Select Shot    │
│  with Multiple  │
│  Versions       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Analyzes:   │
│  - All versions │
│  - Review       │
│    statuses     │
│  - Comments     │
│  - Sentiment    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Generates:  │
│  - Concise      │
│    summary      │
│  - Action items │
│  - Overall      │
│    sentiment    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supervisor     │
│  Reviews AI     │
│  Summary        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Makes Final    │
│  Decision       │
└─────────────────┘
```

**Steps**:
1. Lead/Supervisor opens review queue
2. Selects shot with multiple versions
3. AI flow `review-feedback-summary` analyzes all versions and comments
4. AI returns summary, action items, and sentiment
5. Supervisor reviews AI summary
6. Makes final approval decision

**AI Input**:
- Shot ID
- Versions (versionNumber, reviewStatus, reviewComment)
- Comments (author, timestamp, text)

**AI Output**:
- Summary string
- Action items array
- Overall sentiment (Positive/Neutral/Negative)

---

## 14. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │      Services           │  │
│  │ (App Router)│  │ (ShadCN)    │  │ (apiClient, analytics)  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Zustand Store                         │   │
│  │  (users, projects, shots, tasks, sequences)              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DatabaseSync Component                       │   │
│  │  (Hydrates store from SQL Server on mount/role change)    │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Routes     │  │Controllers  │  │      Services           │  │
│  │ (Express)   │→ │ (Handlers)  │→ │ (conversion, import)    │  │
│  └─────────────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│                         │                      │                │
│                         ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    authMiddleware                         │   │
│  │  (JWT verification, RBAC, mock token support)             │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    mssql Driver                            │   │
│  │  (Raw SQL queries to SQL Server)                          │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ TDS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQL Server (SMRollingFX)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Projects │ │Sequences│ │  Shots  │ │  Tasks  │ │  Users  │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │TimeLogs │ │Versions │ │ Leaves  │ │Notifica-│ │BidSheet │  │
│  │         │ │         │ │         │ │tions    │ │Import   │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. State Synchronization Flow

```
┌─────────────────┐
│  User Opens     │
│  App            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DatabaseSync   │
│  Component      │
│  Mounts         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Determine Role │
│  (from URL or   │
│   default)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fetch All Data │
│  (Projects,     │
│   Sequences,    │
│   Shots, Tasks, │
│   Users)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  bootstrapStudio│
│  (Hydrate       │
│   Zustand)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Renders     │
│  with Data      │
└─────────────────┘
```

**Note**: Currently, `DatabaseSync` fetches all data at once. In production, this should be paginated and lazy-loaded.
