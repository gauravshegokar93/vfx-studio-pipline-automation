# ARCHITECTURE.md

Complete architecture documentation for SM rolling FX / Lumina VFX Hub.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js 15 (App Router)                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │ │
│  │  │   Pages     │  │ Components  │  │        Services           │  │ │
│  │  │ (App Router)│  │ (ShadCN)    │  │ (apiClient, analytics)    │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │ │
│  │  │    AI       │  │    Store    │  │         Hooks             │  │ │
│  │  │  (Genkit)   │  │  (Zustand)  │  │      (useToast)           │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                  │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Express.js 5 Server                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │ │
│  │  │   Routes    │  │Controllers  │  │        Services           │  │ │
│  │  │ (Express)   │→ │ (Handlers)  │→ │ (conversion, import)      │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │ │
│  │  │ Middleware  │  │   Utils     │  │       Scripts             │  │ │
│  │  │ (Auth, RBAC)│  │(Upload,SQL) │  │    (Migrations)           │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ TDS/SQL
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Microsoft SQL Server                            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │ │
│  │  │Projects │ │Sequences│ │  Shots  │ │  Tasks  │ │  Users  │    │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │ │
│  │  │TimeLogs │ │Versions │ │ Leaves  │ │Notifica-│ │BidSheet │    │ │
│  │  │         │ │         │ │         │ │tions    │ │Import   │    │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### Pattern: Service-Oriented Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Pages (App Router)                                     │ │
│  │  - Route-based code splitting                           │ │
│  │  - Server/Client component mix                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Components                                              │ │
│  │  - ShadCN UI primitives                                 │ │
│  │  - Feature-specific components                          │ │
│  │  - Layout components (Sidebar, DatabaseSync)            │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      State Layer                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Zustand Store (useLuminaStore)                          │ │
│  │  - Global state for production data                     │ │
│  │  - Actions for mutations                                │ │
│  │  - Optimistic updates                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  React Hook Form + Zod                                  │ │
│  │  - Form validation                                      │ │
│  │  - Type-safe schemas                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  apiClient (Axios)                                       │ │
│  │  - Base URL configuration                                │ │
│  │  - Request interceptors (mock JWT)                       │ │
│  │  - Response handling                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Feature Services                                        │ │
│  │  - analyticsService.ts (BI calculations)                 │ │
│  │  - importService.ts (Excel upload)                       │ │
│  │  - taskService.ts (Task queries)                         │ │
│  │  - userService.ts (User/leave mocks)                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      External Layer                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Genkit AI Flows                                         │ │
│  │  - automated-shot-task-generation                        │ │
│  │  - intelligent-scheduling-assistant                      │ │
│  │  - review-feedback-summary-flow                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Third-party APIs                                        │ │
│  │  - Google Gemini (via Genkit)                            │ │
│  │  - Picsum Photos (placeholders)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Zustand over Redux**: Lightweight, minimal boilerplate, perfect for medium-sized apps
2. **Service Layer**: Abstracts API calls from components; easy to swap mock for real API
3. **ShadCN UI**: Copy-paste components, full customization, Radix primitives for accessibility
4. **App Router**: Next.js 15 latest routing with React Server Components support
5. **Dark Mode Only**: Consistent with cinematic VFX studio aesthetic

---

## 3. Backend Architecture

### Pattern: Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Express Routes                                          │ │
│  │  - Route definitions                                     │ │
│  │  - HTTP method handling                                  │ │
│  │  - Route-level middleware                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Controllers                                              │ │
│  │  - Request validation                                    │ │
│  │  - Business logic orchestration                          │ │
│  │  - Response formatting                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Middleware                                               │ │
│  │  - authMiddleware (JWT + RBAC)                           │ │
│  │  - requireProductionHead (convenience wrapper)           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Services                                                 │ │
│  │  - conversionService (staging → production)              │ │
│  │  - projectsService (project CRUD)                        │ │
│  │  - importBidSheetService (legacy import)                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Raw SQL (mssql driver)                                   │ │
│  │  - Parameterized queries                                 │ │
│  │  - Connection pooling                                    │ │
│  │  - Transaction management                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Microsoft SQL Server                                     │ │
│  │  - SMRollingFX database                                   │ │
│  │  - 12+ tables                                            │ │
│  │  - UUID primary keys                                     │ │
│  │  - Cascading deletes                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Raw SQL over ORM**: Full control over queries, better performance for complex operations
2. **No Repository Pattern**: Controllers query DB directly (except `projectsService`)
3. **Transaction per Request**: Complex operations use explicit transactions
4. **Mock Token Support**: Development convenience without real auth
5. **Parameterized Queries**: All user input is parameterized to prevent SQL injection

---

## 4. Database Architecture

### Schema Design

```
┌─────────────────────────────────────────────────────────────────┐
│                      SMRollingFX Database                        │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Departments │    │    Users    │    │UserCredentials│       │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘         │
│         │                   │                                    │
│         │    ┌─────────────┴─────────────┐                       │
│         │    │      UserSessions         │                       │
│         │    └──────────────────────────┘                       │
│         │                                                       │
│  ┌──────▼──────────────────────────────────────┐                │
│  │              Projects                        │                │
│  │  ┌─────────────┐    ┌─────────────┐         │                │
│  │  │   Clients   │    │  Episodes   │         │                │
│  │  └─────────────┘    └──────┬──────┘         │                │
│  │                            │                 │                │
│  │  ┌────────────────────────▼──────────┐      │                │
│  │  │           Sequences                │      │                │
│  │  └────────────────────────┬──────────┘      │                │
│  │                            │                 │                │
│  │  ┌────────────────────────▼──────────┐      │                │
│  │  │             Shots                  │      │                │
│  │  └────────────────────────┬──────────┘      │                │
│  │                            │                 │                │
│  │  ┌────────────────────────▼──────────┐      │                │
│  │  │             Tasks                  │      │                │
│  │  │  ┌─────────────┐  ┌─────────────┐ │      │                │
│  │  │  │TaskAssignments│ │  TimeLogs   │ │      │                │
│  │  │  └─────────────┘  └─────────────┘ │      │                │
│  │  │  ┌─────────────┐  ┌─────────────┐ │      │                │
│  │  │  │   Versions  │  │ShotStatus   │ │      │                │
│  │  │  │             │  │  History    │ │      │                │
│  │  │  └─────────────┘  └─────────────┘ │      │                │
│  │  └───────────────────────────────────┘      │                │
│  └──────────────────────────────────────────────┘                │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              BidSheetImport (Staging)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **UUID Primary Keys**: All tables use `UNIQUEIDENTIFIER` with `NEWID()` default
2. **Cascading Deletes**: Project → Sequence → Shot → Task chain
3. **TaskAssignments Versioning**: `IsCurrent` flag tracks active assignment
4. **Staging Table**: `BidSheetImport` holds raw Excel data before conversion
5. **No Soft Deletes**: Hard deletes only (except `IsRevoked` on sessions)

---

## 5. Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Backend   │     │     DB      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  POST /auth/login  │                    │
       │  {email, password} │                    │
       │───────────────────>│                    │
       │                    │  SELECT user       │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  User record       │
       │                    │<───────────────────│
       │                    │                    │
       │                    │  bcrypt.compare()   │
       │                    │                    │
       │                    │  INSERT session    │
       │                    │───────────────────>│
       │                    │                    │
       │  {accessToken,     │                    │
       │   refreshToken,    │                    │
       │   user}            │                    │
       │<───────────────────│                    │
       │                    │                    │
```

### Authorization Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Backend   │     │     DB      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  GET /api/tasks    │                    │
       │  Authorization:    │                    │
       │  Bearer <token>    │                    │
       │───────────────────>│                    │
       │                    │  Verify JWT        │
       │                    │                    │
       │                    │  Extract role      │
       │                    │                    │
       │                    │  Check allowed     │
       │                    │  roles             │
       │                    │                    │
       │                    │  If allowed:       │
       │                    │  Execute query     │
       │                    │───────────────────>│
       │                    │                    │
       │  {success, items}   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

### RBAC Matrix

| Endpoint | Production Head | Dept Supervisor | Lead | Artist |
|----------|----------------|-----------------|------|--------|
| /auth/* | ✓ | ✓ | ✓ | ✓ |
| /users | ✓ | ✓ (own dept) | ✓ (own team) | ✓ (self) |
| /projects | ✓ | ✓ | ✓ | ✓ |
| /tasks | ✓ | ✓ | ✓ | ✓ |
| /artists | ✓ | ✓ (own dept) | ✗ | ✗ |
| /import-review | ✓ | ✓ | ✗ | ✗ |
| /simple-import | ✓ | ✓ | ✓ | ✓ (open) |

---

## 6. Data Flow Diagrams

### Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Backend   │     │     DB      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  POST /simple-import                    │
       │  (multipart Excel)                       │
       │───────────────────>│                    │
       │                    │  Parse Excel       │
       │                    │  (xlsx)            │
       │                    │                    │
       │                    │  Map headers       │
       │                    │  to SQL columns    │
       │                    │                    │
       │                    │  BEGIN TRANSACTION │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  INSERT INTO       │
       │                    │  BidSheetImport    │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  COMMIT            │
       │                    │───────────────────>│
       │                    │                    │
       │  {success, rows}    │                    │
       │<───────────────────│                    │
       │                    │                    │
```

### Conversion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Backend   │     │     DB      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  POST /import-review/approve             │
       │───────────────────>│                    │
       │                    │  SELECT * FROM     │
       │                    │  BidSheetImport    │
       │                    │  WHERE Converted=0 │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  Rows returned     │
       │                    │<───────────────────│
       │                    │                    │
       │                    │  BEGIN TRANSACTION │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  For each row:     │
       │                    │  - Find/create     │
       │                    │    Client          │
       │                    │  - Find/create     │
       │                    │    Project         │
       │                    │  - Find/create     │
       │                    │    Episode         │
       │                    │  - Find/create     │
       │                    │    Sequence        │
       │                    │  - Find/create     │
       │                    │    Shot            │
       │                    │  - Create Tasks    │
       │                    │  - Create          │
       │                    │    TaskAssignments │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  UPDATE            │
       │                    │  BidSheetImport    │
       │                    │  SET Converted=1   │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  COMMIT            │
       │                    │───────────────────>│
       │                    │                    │
       │  {success, count}   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

---

## 7. Deployment Architecture

### Development
```
┌─────────────────┐     ┌─────────────────┐
│  Frontend       │     │  Backend        │
│  (Next.js)      │     │  (Express)      │
│  Port: 9002     │     │  Port: 5000     │
│                 │     │                 │
│  npm run dev    │     │  npm run dev    │
│  (Turbopack)    │     │  (nodemon)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │   http://localhost     │
         │   :9002/api           │
         │───────────────────────>│
         │                       │
         │                       ▼
         │               ┌─────────────────┐
         │               │  SQL Server     │
         │               │  192.168.101.57 │
         │               │  SMRollingFX    │
         │               └─────────────────┘
```

### Production (Recommended)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Vercel/Firebase│     │  AWS/Azure      │     │  SQL Server     │
│  (Frontend)     │────>│  (Backend)      │────>│  (On-prem/Cloud)│
│                 │ HTTPS│                 │ HTTPS│                 │
│  Next.js        │     │  Express.js     │     │  SMRollingFX    │
│  Static Export  │     │  PM2 Cluster    │     │  Always On      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=https://api.smrollingfx.com/api
GOOGLE_GENAI_API_KEY=AIzaSy...
```

**Backend** (`.env`):
```
DB_SERVER=192.168.101.57
DB_DATABASE=SMRollingFX
DB_USER=smrolling_user
DB_PASSWORD=<secure-password>
PORT=5000
JWT_SECRET=<secure-secret>
JWT_REFRESH_SECRET=<secure-refresh-secret>
NODE_ENV=production
```

---

## 8. Scalability Considerations

### Current Limitations
1. **Frontend**: All data loaded at once (no pagination on initial load)
2. **Backend**: No connection pooling configuration
3. **Database**: No read replicas, no sharding
4. **AI**: Synchronous calls to Gemini API (no caching)

### Recommended Improvements
1. **Frontend**: Implement virtual scrolling for large lists, lazy load pages
2. **Backend**: Add Redis caching for frequent queries, implement rate limiting
3. **Database**: Add read replicas for analytics queries, optimize indexes
4. **AI**: Cache AI flow results, implement async processing for long-running flows

---

## 9. Monitoring & Observability

### Current State
- Console.error logging in backend
- No structured logging
- No metrics collection
- No health check endpoints

### Recommended Additions
1. **Logging**: Winston or Pino for structured logging
2. **Metrics**: Prometheus + Grafana for API metrics
3. **Tracing**: OpenTelemetry for distributed tracing
4. **Health Checks**: `/health` endpoint for load balancer
5. **Error Tracking**: Sentry for frontend/backend error tracking

---

## 10. Technology Decisions Log

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Frontend Framework | Next.js 15 | App Router, RSC, Turbopack | 2024 |
| UI Library | ShadCN | Radix primitives, customizable | 2024 |
| State Management | Zustand | Lightweight, simple API | 2024 |
| Styling | Tailwind CSS | Utility-first, dark mode support | 2024 |
| Backend | Express.js | Familiar, large ecosystem | 2024 |
| Database | SQL Server | Enterprise-grade, VFX industry standard | 2024 |
| DB Driver | mssql | Official SQL Server driver for Node.js | 2024 |
| Auth | JWT + bcrypt | Stateless, industry standard | 2024 |
| AI | Genkit + Gemini | Google AI, flow-based | 2024 |
| Charts | Recharts | React-native, composable | 2024 |
| Icons | Lucide React | Consistent, tree-shakeable | 2024 |
