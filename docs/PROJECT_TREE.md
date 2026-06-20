# SM rolling FX | Project Tree

```text
/
├── docs/                      # Technical Documentation & SQL Scripts
│   ├── PROJECT_DOCUMENTATION.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_DOCUMENTATION.md
│   ├── db-setup.sql           # Master SQL Server Script
│   └── readiness-audit.md
├── src/
│   ├── ai/                    # Genkit AI Flows
│   │   ├── flows/             # Automated Scheduling & Feedback
│   │   └── genkit.ts          # AI Initialization
│   ├── app/                   # Next.js App Router (Routes)
│   │   ├── analytics/         # BI Hub
│   │   ├── dashboard/         # Role-based landing
│   │   ├── import/            # Excel Ingestion
│   │   ├── lead-dashboard/    # Team Management
│   │   ├── projects/          # Hierarchy Browser
│   │   ├── tasks/             # Artist Workbench & Details
│   │   ├── users/             # Staff & Credential Hub
│   │   └── layout.tsx         # Root Layout & Fonts
│   ├── components/            # UI Components
│   │   ├── layout/            # Sidebar & Navigation
│   │   ├── tasks/             # Task Creation Dialogs
│   │   └── ui/                # ShadCN Primitives
│   ├── hooks/                 # Custom React Hooks (Toast, Mobile)
│   ├── lib/                   # Core Logic & Types
│   │   ├── store.ts           # Zustand Global State
│   │   ├── types.ts           # TypeScript Interfaces
│   │   └── utils.ts           # Tailwind Class Merger
│   ├── services/              # API Abstraction Layer
│   │   ├── analyticsService.ts
│   │   ├── importService.ts
│   │   ├── taskService.ts
│   │   └── userService.ts
│   └── config/                # API Endpoints & Globals
│       └── api.ts
├── tailwind.config.ts         # Theme Configuration
└── package.json               # Dependencies
```
