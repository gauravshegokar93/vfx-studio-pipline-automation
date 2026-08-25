# SM rolling FX | Enterprise VFX Production Hub

**SM rolling FX** (also referred to as **Lumina VFX Hub**) is a high-performance, hierarchical production management platform designed specifically for cinematic VFX workflows. Built to replace fragmented Excel-based tracking, it serves as the **Single Source of Truth (SSoT)** for studio executives, supervisors, leads, and artists.

---

## 🚀 Technical Tech Stack

### Frontend & UI
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Cinematic Dark Theme)
- **UI Components**: ShadCN (Radix UI primitives)
- **Icons**: Lucide React
- **Charts**: Recharts (BI & Productivity Analytics)
- **State Management**: Zustand (Atomic global store)
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod
- **Tables**: @tanstack/react-table

### AI Intelligence (Genkit)
- **Engine**: Genkit for AI-driven automation.
- **Model**: Google Gemini 2.5 Flash (`googleai/gemini-2.5-flash`)
- **Features**:
  - Automated Shot Task Generation.
  - Intelligent Scheduling Assistant (Resource optimization).
  - Feedback Summary Extraction.

### Backend Infrastructure
- **Runtime**: Node.js + Express 5
- **Database**: Microsoft SQL Server (SSMS) via `mssql` driver (raw SQL, no ORM)
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **File Upload**: Multer (memory storage)
- **Excel Parsing**: xlsx (SheetJS)
- **CORS**: cors

---

## 🛠 Functional Architecture (How it Works)

The application follows a strict **Parent-Child Hierarchy**:
`Project -> Sequence -> Shot -> Task -> Version/TimeLog`

### 1. Ingestion Engine
- **NTM Bid Sheet Import**: Production Heads can upload client Excel files.
- **Dynamic Task Creation**: The system parses "Bids" (Roto, Paint, Comp, CG) and automatically generates the production tree with initial due dates and suggested hours.
- **Import Review**: Staging queue allows editing/deleting rows before committing to production.

### 2. Operational Workflows
- **Artist Workbench**: A focused interface for artists to track time, update progress (0-100%), and submit versions.
- **Lead Assignment Center**: Leads allocate shots to artists, monitor team load (capacity vs. bid), and perform technical QC reviews.
- **Supervisor Queue**: Supervisors delegate shots to leads and execute the "Final Sign-off" before delivery.
- **Executive BI Hub**: Real-time revenue forecasting, burn-rate tracking, and risk assessment (Overdue/Critical shots).

### 3. Identity & Security
- **Staff Directory**: Centralized user management for onboarding/offboarding.
- **Credential Lifecycle**: Automated generation of SSoT usernames and temporary passwords with forced reset logic.
- **RBAC**: Production Head > Department Supervisor > Lead > Artist.

---

## 💼 Business Perspective
**Strategic Value**:
- **Risk Mitigation**: Reduces "bid leakage" by comparing estimated hours vs. actual artist logs in real-time.
- **Scalability**: Allows a single Production Head to oversee dozens of projects via standardized "Project Health" metrics.
- **Efficiency**: Automates the mundane task of manual tracking, freeing Leads to focus on artistic quality rather than spreadsheet maintenance.

---

## 👨‍💻 Developer Perspective (Local Setup & DB)

### Prerequisites
- Node.js 18+
- SQL Server (local or remote)
- npm/yarn/pnpm

### Installation
```bash
# Frontend
cd vfx-studio-pipline-automation
npm install
npm run dev

# Backend
cd vfx-studio-pipline-automation/backend
npm install
npm run dev
```

### Environment Variables
See `SECURITY.md` for full list. Key variables:
- `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_GENAI_API_KEY` (for AI features)
- `NEXT_PUBLIC_API_URL` (frontend API base)

### Database Setup
1. Run `docs/db-setup.sql` in SSMS to create the `SMRollingFX` database.
2. Run `backend/scripts/run-migrations.js` to add Clients, Episodes, and Converted columns.
3. Verify tables in SSMS Object Explorer.

### Current Limitations
- **State Volatility**: Data currently resets on browser refresh (Zustand state). Persisting this requires the SQL backend integration.
- **File Storage**: Version thumbnails are placeholders (`picsum.photos`). Real production requires an S3 bucket or local NAS integration.
- **Auth Flow**: The login screen is currently a simulator. Real JWT/OAuth integration is required for production deployment.

---

## 🔮 Future Scope
1. **ShotGrid/Ftrack Integration**: Two-way sync with existing industry trackers.
2. **Render Farm Watcher**: Real-time progress bars for active renders directly on the Artist Workbench.
3. **Mobile Artist App**: Lightweight companion app for viewing comments and requesting leaves.
4. **AI-Driven Predictive Bidding**: Analyzing historical data to suggest more accurate bids for future client sheets.

---

## 📁 Project Structure Summary
- `/src/app`: Routes and Page components (20+ pages).
- `/src/components`: UI primitives and feature-specific dialogs.
- `/src/services`: The API abstraction layer.
- `/src/lib`: Core logic, types, and Zustand store.
- `/src/ai`: Genkit AI flows.
- `/backend`: Express.js API server with SQL Server integration.
- `/docs`: SQL Schema, migrations, and technical documentation.

---

## 📄 Documentation Index
- `README.md` - This file.
- `AI_CONTEXT.md` - AI-friendly project context.
- `PROJECT_STRUCTURE.md` - Complete folder tree with explanations.
- `DATABASE.md` - ER diagrams, tables, columns, relationships.
- `API_REFERENCE.md` - Complete API documentation.
- `BACKEND.md` - Backend architecture and modules.
- `FRONTEND.md` - Frontend architecture and components.
- `MODULES.md` - Business modules and workflows.
- `WORKFLOW.md` - Flowcharts and process documentation.
- `ARCHITECTURE.md` - System architecture diagrams.
- `CODING_STANDARDS.md` - Naming, patterns, and style rules.
- `SECURITY.md` - Authentication, authorization, and secrets.
- `DEPLOYMENT.md` - Build and deployment guide.
- `CHANGELOG.md` - Version history and roadmap.
- `DEVELOPER_GUIDE.md` - Onboarding and best practices.
- `FILE_INDEX.md` - Searchable index of all important files.

---

© 2024 SM rolling FX | Enterprise Production Intelligence.
