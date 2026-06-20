# SM rolling FX | Enterprise VFX Production Hub

**SM rolling FX** is a high-performance, hierarchical production management platform designed specifically for cinematic VFX workflows. Built to replace fragmented Excel-based tracking, it serves as the **Single Source of Truth (SSoT)** for studio executives, supervisors, leads, and artists.

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

### AI Intelligence (Genkit)
- **Engine**: Genkit for AI-driven automation.
- **Features**: 
  - Automated Shot Task Generation.
  - Intelligent Scheduling Assistant (Resource optimization).
  - Feedback Summary Extraction.

### Backend Infrastructure (Planned / Migration-Ready)
- **Database**: SQL Server (SSMS) via Sequelize ORM.
- **Security**: Hierarchical Role-Based Access Control (RBAC).

---

## 🛠 Functional Architecture (How it Works)

The application follows a strict **Parent-Child Hierarchy**:
`Project -> Sequence -> Shot -> Task -> Version/TimeLog`

### 1. Ingestion Engine
- **NTM Bid Sheet Import**: Production Heads can upload client Excel files.
- **Dynamic Task Creation**: The system parses "Bids" (Roto, Paint, Comp, CG) and automatically generates the production tree with initial due dates and suggested hours.

### 2. Operational Workflows
- **Artist Workbench**: A focused interface for artists to track time, update progress (0-100%), and submit versions.
- **Lead Assignment Center**: Leads allocate shots to artists, monitor team load (capacity vs. bid), and perform technical QC reviews.
- **Supervisor Queue**: Supervisors delegate shots to leads and execute the "Final Sign-off" before delivery.
- **Executive BI Hub**: Real-time revenue forecasting, burn-rate tracking, and risk assessment (Overdue/Critical shots).

### 3. Identity & Security
- **Staff Directory**: Centralized user management for onboarding/offboarding.
- **Credential Lifecycle**: Automated generation of SSoT usernames and temporary passwords with forced reset logic.

---

## 💼 Business Perspective
**Strategic Value**:
- **Risk Mitigation**: Reduces "bid leakage" by comparing estimated hours vs. actual artist logs in real-time.
- **Scalability**: Allows a single Production Head to oversee dozens of projects via standardized "Project Health" metrics.
- **Efficiency**: Automates the mundane task of manual tracking, freeing Leads to focus on artistic quality rather than spreadsheet maintenance.

---

## 👨‍💻 Developer Perspective (Local Setup & DB)

### Connecting to Local SQL Server (SSMS)
Currently, the application uses a **Service Layer** with a `MOCK_DELAY` to simulate database latency. To connect to your local DB:

1. **Schema Setup**: Run the script located in `docs/db-setup.sql` in your SSMS instance.
2. **API Bridge**: Build a lightweight Node/Express or .NET Core API using the Sequelize models defined in the `docs` folder.
3. **Service Swap**: 
   - Open `src/services/`.
   - Replace the Zustand store reads with `axios.get(API_BASE_URL + '/endpoint')`.
   - Update `src/config/api.ts` with your local server IP.

### Current Limitations ("Lagging")
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
- `/src/app`: Routes and Page components.
- `/src/components`: UI primitives and feature-specific dialogs.
- `/src/services`: The API abstraction layer (Target for SQL integration).
- `/src/lib/store.ts`: Global application state and business logic.
- `/docs`: SQL Schema and Migration instructions.

---
© 2024 SM rolling FX | Enterprise Production Intelligence.