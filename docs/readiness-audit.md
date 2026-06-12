# Lumina VFX Hub - System Readiness Audit (v1.0)

## 1. Screen & Route Inventory
| Route | Feature | Primary Access Role | Status |
| :--- | :--- | :--- | :--- |
| `/dashboard` | Unified Routing Hub | All Roles | **Green** |
| `/tasks` | Artist Workbench | Artist, Lead, PH | **Green** |
| `/tasks/[id]` | SSoT Task Detail | Artist, Lead, PH | **Green** |
| `/lead-dashboard` | Team Assignment Center | Lead, PH | **Green** |
| `/department-queue` | Dept Delegation Hub | Supervisor, PH | **Green** |
| `/department-progress` | Throughput Tracking | Supervisor, PH | **Green** |
| `/projects` | Production Hierarchy | Production Head | **Green** |
| `/import` | Bootstrap Ingestion | Production Head | **Green** |
| `/analytics` | Enterprise BI Suite | Lead, Sup, PH | **Green** |
| `/users` | Staff & Identity Hub | Lead, Sup, PH | **Green** |
| `/leaves` | Resource Availability | All Roles | **Green** |
| `/notifications` | Alert Center | All Roles | **Green** |
| `/scheduling` | AI Smart Scheduler | Supervisor, PH | **Green** |
| `/daily-tracking` | SSoT Summary (Excel Alt) | All Roles | **Green** |
| `/review` | QC Queue | Lead, Sup, PH | **Green** |
| `/workload` | Capacity Analytics | Lead, Sup, PH | **Green** |
| `/versions` | Submission Audit Trail | All Roles | **Green** |

## 2. Role Permissions Matrix (Final)
| Role | Access Level | Data Boundary | Actions |
| :--- | :--- | :--- | :--- |
| **Artist** | Operational | Assigned Tasks Only | Update Progress, Submit Versions, Start Timer |
| **Lead** | Tactical | Reporting Team Only | Create Tasks, Assign Artists, QC Review, Team Security |
| **Supervisor** | Operational Mgr | Department Only | Create Leads/Artists, Assign Leads, Final Sign-off |
| **Prod Head** | Executive | Global Studio | Financial Forecasts, Imports, All User/Project Mgmt |

## 3. Database Entity & SQL Mapping
| UI Entity | SQL Table | Logic |
| :--- | :--- | :--- |
| `Project` | `Projects` | Parent entity for all production data. |
| `Sequence` | `Sequences` | EP/Reel grouping logic. |
| `Shot` | `Shots` | Primary delivery unit (SSoT). |
| `Task` | `Tasks` | Pipeline step bid and status tracking. |
| `User` | `Users` | Staff profile and departmental affiliation. |
| `UserCredential` | `UserSessions` | Authentication and security lifecycle. |
| `TimeLog` | `TimeLogs` | Spent hours calculation for Bid vs Actual. |
| `Version` | `Versions` | Render history and QC comment trail. |
| `Leave` | `Leaves` | Capacity reduction logic. |
| `Notification` | `Notifications` | User alerts and assignment triggers. |

## 4. Backend Transition Checklist (Audit Results)
The following items are currently stored in **Temporary Application State (Zustand)** and require API integration:

- [ ] **Auth Sync**: Replace hardcoded `u1-u4` in `store.ts` with a `/api/auth/me` endpoint.
- [ ] **Ingestion Engine**: Move Excel parsing logic from `importService.ts` to a server-side `POST /api/import`.
- [ ] **Timer Persistence**: Time logs are currently local. Connect `updateTaskTimer` to `TimeLogs` table via API.
- [ ] **AI Flow Data**: `intelligentSchedulingAssistant` uses local mock arrays. Connect to real `UnassignedTasks` and `Artists` queries.
- [ ] **Credential Export**: CSV generation is client-side. Recommend moving to server for secure audit logging.
- [ ] **Analytics Aggregation**: BI metrics are calculated in `analyticsService.ts`. These should be replaced by optimized SQL View calls.

## 5. Identification of Mock Systems
- **Services**: All files in `src/services/` use a `MOCK_DELAY`.
- **Data Initialization**: `src/lib/store.ts` contains static user/credential arrays for development.
- **File Uploads**: `import/page.tsx` simulates parsing without hitting a multi-part form endpoint.
- **AI Feedback**: `review/page.tsx` calls Genkit with empty contexts (needs shot history).

**Audit Summary**: The frontend is 100% architecturally aligned with the SQL Server blueprint. Transitioning to a live backend requires replacing the service layer implementations with `axios` calls to the specified API endpoints.
