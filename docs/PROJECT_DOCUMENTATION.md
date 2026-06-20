# SM rolling FX | Technical & Business Documentation

## 1. Project Overview
**SM rolling FX** is a high-performance, hierarchical production management platform designed specifically for cinematic VFX workflows. It is architected to transition from a distributed, spreadsheet-based tracking system to a centralized **Single Source of Truth (SSoT)**.

## 2. Business Purpose
- **Efficiency**: Automates the creation of production tasks from client bid sheets.
- **Risk Mitigation**: Real-time tracking of "Bid vs. Actual" hours to prevent budget overruns.
- **Accountability**: Implements a strict chain of command (Supervisor -> Lead -> Artist) for shot approval.
- **Scale**: Enables Production Heads to monitor dozens of global projects through a unified intelligence hub.

## 3. Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19.
- **State Management**: Zustand (Atomic global store with middleware support).
- **Styling**: Tailwind CSS with cinematic dark theme variables.
- **UI Components**: ShadCN (Radix UI primitives).
- **AI Engine**: Google Genkit (Automated task generation & scheduling).
- **Backend (Target)**: SQL Server (SSMS) via Sequelize ORM.
- **Icons**: Lucide React.

## 4. Folder Structure
See `docs/PROJECT_TREE.md` for a full breakdown.

## 5. Frontend Architecture
The application uses a **Service-Oriented Frontend Architecture**:
- **UI Layer**: Functional components utilizing ShadCN for consistency.
- **Store Layer**: Zustand acts as the local cache of the SSoT.
- **Service Layer**: Abstraction logic that handles data transformation. Currently uses `MOCK_DELAY` to simulate database latency.
- **Routing**: Next.js App Router with role-based middleware logic (simulated in sidebar).

## 6. Backend Architecture (Planned)
The system is designed to connect to a **Node.js/Express** or **.NET Core** API.
- **ORM**: Sequelize for SQL Server mapping.
- **Auth**: JWT-based authentication with forced password reset on first login.

## 7. Authentication Flow
1. User logs in with SSoT Username and Temporary Password.
2. System checks `isFirstLogin` flag.
3. If `true`, user is routed to a forced password reset (Planned).
4. RBAC is assigned based on the `Role` string in the user object.

## 8. Database Design
Relational model following the hierarchy: `Project -> Sequence -> Shot -> Task -> TimeLog/Version`.
See `docs/DATABASE_DOCUMENTATION.md` for details.

## 9. All Routes and Screens
- `/dashboard`: Unified landing based on role.
- `/tasks`: Artist Workbench.
- `/tasks/[id]`: Detailed task audit trail.
- `/lead-dashboard`: Team allocation and QC hub.
- `/department-queue`: Supervisor delegation hub.
- `/users`: Staff Directory and Credential Management.
- `/projects`: Production hierarchy explorer.
- `/import`: NTM Bid Sheet ingestion engine.
- `/analytics`: Executive BI suite.
- `/review`: AI-assisted feedback summary and QC queue.
- `/workload`: Capacity analytics.

## 10. All API Endpoints
Specified in `docs/API_DOCUMENTATION.md`.

## 11. State Management Flow
Zustand handles the entire production tree. 
`Interaction -> Store Action -> Update State -> UI Re-render`.
The `bootstrapStudio` action initializes the entire global state from an imported dataset.

## 12. Mock Services Currently Used
- `taskService.ts`: Simulates fetching and updating tasks.
- `importService.ts`: Simulates Excel parsing logic.
- `userService.ts`: Simulates staff profiles.
- `analyticsService.ts`: Calculates metrics on the fly from store data.

## 13. SQL Server Migration Status
- **Schema Design**: 100% Complete (`docs/db-setup.sql`).
- **Entity Types**: 100% Complete (`src/lib/types.ts`).
- **API Contract**: Defined.
- **Backend Bridge**: Pending Implementation.

## 14. Environment Variables Required
- `NEXT_PUBLIC_API_URL`: Path to the SQL Backend.
- `GOOGLE_GENAI_API_KEY`: Required for Genkit AI features.

## 15. Third Party Dependencies
- `zustand`: Global state.
- `recharts`: Productivity visualizations.
- `lucide-react`: Iconography.
- `clsx` & `tailwind-merge`: Dynamic styling.

## 16. Deployment Architecture
- **Frontend**: Vercel or Firebase App Hosting.
- **Backend**: Hosted on-prem or AWS/Azure Windows Server for SQL compatibility.

## 17. Known Issues
- **State Volatility**: Refreshing the browser resets data (to be fixed by API integration).
- **File Storage**: Version thumbnails use `picsum.photos` placeholders.

## 18. Future Improvements
- **Live Render Watching**: Syncing with render farm APIs.
- **Mobile Artist App**: For notifications and leave requests.

## 19. Development Progress: 85%
- Frontend UI: 100%
- State Logic: 100%
- SQL Schema: 100%
- API Bridge: 0%

## 20. How To Run Locally
1. `npm install`
2. `npm run dev`
3. Visit `http://localhost:9002`

## 21. How To Deploy Production
1. Build backend using specs in `docs/API_DOCUMENTATION.md`.
2. Update `src/config/api.ts` with the production URL.
3. Run `npm run build`.

## 22. User Roles and Permissions
- **Production Head**: Global Read/Write.
- **Supervisor**: Departmental Read/Write.
- **Lead**: Team Read/Write.
- **Artist**: Assigned Task Read/Write.

## 23. Data Flow Between Modules
- **Ingestion**: `/import` creates Projects/Shots/Tasks.
- **Allocation**: `/department-queue` assigns Leads. `/lead-dashboard` assigns Artists.
- **Execution**: `/tasks` generates TimeLogs and Versions.
- **Analysis**: `/analytics` aggregates data from all modules.
