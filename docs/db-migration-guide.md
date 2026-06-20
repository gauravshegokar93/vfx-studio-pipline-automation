# SM rolling FX - SSMS Migration Guide

This guide outlines the steps to connect your exported frontend to a real SQL Server (SSMS) database.

## Phase 1: Database Setup
1. **Open SSMS**: Connect to your SQL Server instance.
2. **Execute Script**: Open and run the `docs/db-setup.sql` file provided. This will create the `SMRollingFX` database and all required tables with correct Foreign Key relationships.
3. **Verify**: Ensure the tables (Users, Projects, Tasks, etc.) appear in the Object Explorer.

## Phase 2: Backend API Layer
The frontend is currently using a "Service Layer" (in `src/services/`) that simulates API calls using local state. To connect to SSMS, you need a Backend API (Node.js/Express, .NET Core, or Python/FastAPI).

### Recommended Tech Stack:
- **Runtime**: Node.js
- **ORM**: Sequelize (Ideal for SQL Server mapping)
- **Library**: `tedious` (The standard driver for SQL Server)

### Implementation Steps:
1. **Create Backend Project**: Initialize a new project folder separate from the frontend.
2. **Define Models**: Use Sequelize to map models to the tables in `db-setup.sql`.
3. **Endpoints**: Create REST endpoints matching the routes in `src/config/api.ts`.
   - `POST /api/auth/login`
   - `GET /api/projects`
   - `POST /api/tasks/:id/update`
   - etc.

## Phase 3: Frontend Connection
1. **Update API URL**: Modify `src/config/api.ts` to point to your live backend address.
   ```typescript
   export const API_BASE_URL = "http://your-server-ip:5000/api";
   ```
2. **Replace Mock Services**: Update the files in `src/services/` (e.g., `taskService.ts`) to use `axios` to fetch data from your new API instead of reading from the Zustand store.

## Phase 4: Authentication Sync
Ensure your backend implementation handles password hashing (e.g., using `bcrypt`). The frontend expects a JWT token and a user object to be returned upon successful login.
