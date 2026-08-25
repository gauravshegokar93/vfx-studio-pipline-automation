# DEVELOPER_GUIDE.md

Developer onboarding guide and best practices for SM rolling FX / Lumina VFX Hub.

---

## 1. Getting Started

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm 9+ or yarn/pnpm
- SQL Server 2019+ (local or remote)
- Git
- VS Code (recommended)

### Initial Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd vfx-studio-pipline-automation

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Set up environment variables
# Frontend: Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
echo "GOOGLE_GENAI_API_KEY=your-key" >> .env.local

# Backend: Create .env
cd backend
echo "DB_SERVER=localhost" > .env
echo "DB_DATABASE=SMRollingFX" >> .env
echo "DB_USER=sa" >> .env
echo "DB_PASSWORD=YourPassword" >> .env
echo "JWT_SECRET=dev-secret-change-me" >> .env
echo "JWT_REFRESH_SECRET=dev-refresh-secret-change-me" >> .env
cd ..

# 5. Set up database
# Run docs/db-setup.sql in SSMS
# Run backend/scripts/run-migrations.js

# 6. Start development
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

---

## 2. Project Structure Overview

```
vfx-studio-pipline-automation/
├── backend/                    # Express.js API
│   ├── config/                 # DB config
│   ├── controllers/            # Route handlers
│   ├── middleware/             # Auth, RBAC
│   ├── routes/                 # Route definitions
│   ├── services/               # Business logic
│   ├── utils/                  # Helpers
│   ├── scripts/                # Migrations
│   └── server.js               # Entry point
├── src/                        # Next.js frontend
│   ├── app/                    # Pages (App Router)
│   ├── components/             # React components
│   │   ├── ui/                 # ShadCN (don't modify)
│   │   ├── layout/             # Sidebar, DatabaseSync
│   │   ├── tasks/              # Task dialogs
│   │   └── [feature]/          # Feature components
│   ├── lib/                    # Core (store, types, utils)
│   ├── services/               # API abstraction
│   ├── config/                 # API config
│   ├── hooks/                  # Custom hooks
│   └── ai/                     # Genkit flows
├── docs/                       # Documentation & SQL
└── README.md                   # Project README
```

---

## 3. Common Development Tasks

### Adding a New Page
1. Create `src/app/[route]/page.tsx`
2. Add route to sidebar in `src/components/layout/sidebar.tsx`
3. Add any new services in `src/services/`
4. Add types in `src/lib/types.ts` if needed

### Adding a New API Endpoint
1. Create controller in `backend/controllers/[feature]Controller.js`
2. Create route in `backend/routes/[feature]Routes.js`
3. Mount route in `backend/server.js`
4. Add service method if complex logic needed
5. Add frontend service in `src/services/`

### Adding a New Database Table
1. Update `docs/db-setup.sql`
2. Run migration or update `backend/scripts/run-migrations.js`
3. Add TypeScript types in `src/lib/types.ts`
4. Update `src/lib/store.ts` if needed

### Adding a New AI Flow
1. Create flow in `src/ai/flows/[flow-name].ts`
2. Import in `src/ai/dev.ts`
3. Add UI component to call the flow
4. Test with `npm run genkit:dev`

---

## 4. Debugging

### Frontend Debugging
```typescript
// Use React DevTools
// Check Zustand store in Redux DevTools
// Console logging
console.log('[Component] State:', state);

// Network tab for API calls
// Check for mock-jwt-token in headers
```

### Backend Debugging
```bash
# Console logging
console.error('[module] Error:', err);

# Test DB connection
node backend/test-db.js

# List users
node backend/list-users.js

# Check routes on startup
# Server logs all registered routes on start
```

### Database Debugging
```sql
-- Check tables
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Check users
SELECT UserId, EmployeeCode, Name, Email, Role, IsActive FROM Users;

-- Check tasks
SELECT TaskId, TaskName, Status, Progress FROM Tasks;

-- Check staging
SELECT * FROM BidSheetImport WHERE Converted = 0;
```

---

## 5. Common Mistakes

### Don't
1. **Don't modify `src/components/ui/`**: These are ShadCN primitives
2. **Don't hardcode API URLs**: Use `API_BASE_URL` from config
3. **Don't use `any` type**: Project has TODOs to fix this
4. **Don't commit `.env` files**: They are gitignored
5. **Don't run `simpleImport` without auth in production**: It's currently open
6. **Don't use `database-schema.sql`**: It's broken; use `docs/db-setup.sql`
7. **Don't trust mock data**: Remember `userService` and `notificationService` are mocked

### Do
1. **Do use `apiClient` for all API calls**: It handles auth headers
2. **Do use `useLuminaStore` for global state**: Don't create local copies
3. **Do use `cn()` for conditional classes**: It handles Tailwind merging
4. **Do parameterize SQL queries**: Never concatenate user input
5. **Do wrap multi-step DB operations in transactions**: Use `sql.Transaction`
6. **Do log errors with module prefix**: `[moduleName] Error:`
7. **Do check role permissions**: Use `authMiddleware` correctly

---

## 6. Best Practices

### Frontend
- Keep components small and focused
- Use TypeScript strictly (no `any`)
- Colocate state with components that use it
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Implement loading and error states for all async operations

### Backend
- Use parameterized queries for all SQL
- Wrap multi-step operations in transactions
- Return consistent JSON format: `{ success: true/false, data/items, message }`
- Use appropriate HTTP status codes
- Log errors with context
- Don't expose stack traces in production

### Database
- Use UUIDs for all primary keys
- Use `ON DELETE CASCADE` for hierarchical data
- Add indexes for frequently queried columns
- Use transactions for data consistency
- Don't store sensitive data in plain text

---

## 7. Testing

### Frontend
```bash
# Run lint
npm run lint

# Type check
npm run typecheck

# Build check
npm run build
```

### Backend
```bash
# Test DB connection
node backend/test-db.js

# List users
node backend/list-users.js

# Run migrations
node backend/scripts/run-migrations.js
```

### Manual Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Open http://localhost:9002
4. Test role switching in sidebar
5. Test import flow with `backend/test-import.xlsx`

---

## 8. Git Workflow

### Branch Naming
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Production fixes
- `chore/` - Maintenance
- `docs/` - Documentation

### Commit Messages
```
feat: add task assignment API
fix: resolve import parsing error
docs: update API reference
chore: update dependencies
```

### Pull Request Process
1. Create feature branch
2. Make changes
3. Test locally
4. Push branch
5. Create PR with description
6. Request review
7. Merge after approval

---

## 9. Useful Commands

```bash
# Frontend
npm run dev          # Start dev server (port 9002)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler
npm run genkit:dev   # Start Genkit dev server

# Backend
npm run dev          # Start with nodemon
node test-db.js      # Test DB connection
node list-users.js   # List all users
node scripts/run-migrations.js  # Run migrations

# Git
git status
git add .
git commit -m "message"
git push
git pull
git checkout -b feature/name
git merge feature/name
```

---

## 10. Troubleshooting

### Port Already in Use
```bash
# Find process on port 5000
netstat -ano | findstr :5000
# Kill process
taskkill /PID <pid> /F
```

### Database Connection Failed
```bash
# Check SQL Server is running
# Check firewall allows port 1433
# Verify credentials in .env
# Test with backend/test-db.js
```

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Import Fails
```bash
# Check file format (.xlsx, .xls, .csv)
# Check file size (<20MB)
# Check headers match expected format
# Check backend logs for SQL errors
```

---

## 11. Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [ShadCN UI](https://ui.shadcn.com)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Genkit](https://firebase.google.com/docs/genkit)
- [mssql](https://www.npmjs.com/package/mssql)
- [Express.js](https://expressjs.com/)

### Internal Docs
- `README.md` - Project overview
- `AI_CONTEXT.md` - AI-friendly context
- `PROJECT_STRUCTURE.md` - Folder structure
- `DATABASE.md` - Database documentation
- `API_REFERENCE.md` - API documentation
- `BACKEND.md` - Backend architecture
- `FRONTEND.md` - Frontend architecture
- `WORKFLOW.md` - Workflow diagrams
- `ARCHITECTURE.md` - System architecture
- `CODING_STANDARDS.md` - Coding standards
- `SECURITY.md` - Security guidelines
- `DEPLOYMENT.md` - Deployment guide

---

## 12. Getting Help

### Internal
- Check existing documentation in `docs/`
- Review `implementation_plan.md` for current work
- Check `TODO.md` for pending tasks
- Review `readiness-audit.md` for system status

### External
- Next.js Discord
- ShadCN GitHub Discussions
- Stack Overflow (tag: next.js, express, sql-server)

---

## 13. Contributing

1. Read `CODING_STANDARDS.md`
2. Follow the git workflow
3. Write clear commit messages
4. Update documentation for new features
5. Test thoroughly before submitting PR
6. Request review from team members

---

## 14. Onboarding Checklist

- [ ] Clone repository
- [ ] Install Node.js 20+
- [ ] Install SQL Server
- [ ] Run `docs/db-setup.sql`
- [ ] Run `backend/scripts/run-migrations.js`
- [ ] Configure `.env` files
- [ ] Start backend and verify connection
- [ ] Start frontend and verify UI
- [ ] Test login flow
- [ ] Test import flow with sample Excel
- [ ] Review `AI_CONTEXT.md`
- [ ] Review `CODING_STANDARDS.md`
- [ ] Join team communication channels
