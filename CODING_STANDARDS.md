# CODING_STANDARDS.md

Coding standards, naming conventions, and best practices for SM rolling FX / Lumina VFX Hub.

---

## 1. Naming Conventions

### Frontend (TypeScript/React)

| Type | Convention | Example |
|------|-----------|---------|
| React Components | PascalCase | `ProductionHeadDashboard`, `StatCard` |
| Functions/Variables | camelCase | `getStudioStats`, `handleUpload`, `isLoading` |
| Files (pages) | kebab-case | `production-queue/page.tsx` |
| Files (components) | PascalCase or kebab-case | `stat-card.tsx`, `EditRowModal.tsx` |
| Types/Interfaces | PascalCase | `User`, `Task`, `PipelineStep`, `CreateTaskDialogProps` |
| Enums | PascalCase values | `TaskStatus.NotStarted`, `Role.ProductionHead` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MOCK_DELAY` |
| Hooks | camelCase with `use` prefix | `useToast`, `useLuminaStore` |
| CSS Classes | kebab-case | `bg-crimson`, `text-muted-foreground` |

### Backend (JavaScript/Node.js)

| Type | Convention | Example |
|------|-----------|---------|
| Functions | camelCase | `getUsers`, `createArtist`, `convertImports` |
| Variables | camelCase | `request`, `pool`, `transaction` |
| Files | camelCase | `artistController.js`, `simpleImportController.js` |
| Database Tables | PascalCase | `TaskAssignments`, `BidSheetImport` |
| Database Columns | PascalCase in DB, camelCase in code | `ShotId` → `shotId` |
| SQL Aliases | Single letter PascalCase | `u` for Users, `t` for Tasks, `sh` for Shots |

---

## 2. Folder Rules

### Frontend

```
src/
├── app/                    # Next.js App Router (file-based routing)
│   ├── [route]/page.tsx   # Page components
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/                # ShadCN primitives (DO NOT MODIFY)
│   ├── layout/            # App shell components
│   ├── tasks/             # Task-specific components
│   └── [feature]/         # Feature-specific components
├── lib/                   # Core utilities
│   ├── store.ts           # Zustand store
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
├── services/              # API abstraction layer
│   ├── apiClient.ts       # Axios instance
│   └── [feature]Service.ts # Feature services
├── config/                # Configuration
│   └── api.ts             # API URLs
├── hooks/                 # Custom React hooks
│   └── use-toast.ts       # Toast hook
└── ai/                    # Genkit AI flows
    ├── genkit.ts          # AI initialization
    └── flows/             # AI flow definitions
```

**Rules**:
- Pages go in `src/app/[route]/page.tsx`
- Reusable UI components go in `src/components/ui/` (from ShadCN)
- Feature components go in `src/components/[feature]/`
- All business logic for a feature goes in `src/services/[feature]Service.ts`
- Global state goes in `src/lib/store.ts`
- Types go in `src/lib/types.ts`

### Backend

```
backend/
├── config/                # Configuration
│   └── db.js              # Database connection
├── controllers/           # Route handlers
│   └── [feature]Controller.js
├── middleware/            # Express middleware
│   ├── authMiddleware.js
│   └── requireProductionHead.js
├── routes/                # Route definitions
│   └── [feature]Routes.js
├── services/              # Business logic
│   └── [feature]Service.js
├── utils/                 # Helpers
│   ├── upload.js
│   └── excelBidSheetParser.js
├── scripts/               # Migration scripts
│   └── run-migrations.js
├── server.js              # Entry point
└── .env                   # Environment variables
```

**Rules**:
- Controllers handle HTTP concerns (req/res)
- Services handle business logic and data transformation
- Routes define URL patterns and mount controllers
- Middleware handles cross-cutting concerns (auth, logging)

---

## 3. Architecture Patterns

### Frontend Patterns

#### Service Pattern
```typescript
// services/importService.ts
export const importService = {
  simpleImport: async (file: File): Promise<any> => {
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post(`${API_BASE_URL}/simple-import`, form);
    return res.data;
  }
};
```

#### Store Pattern
```typescript
// lib/store.ts
export const useLuminaStore = create<LuminaState>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
}));
```

#### Component Pattern
```typescript
// components/tasks/create-task-dialog.tsx
"use client";
import { useLuminaStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function CreateTaskDialog({ trigger }: CreateTaskDialogProps) {
  const { tasks, addTask } = useLuminaStore();
  // ...
}
```

### Backend Patterns

#### Controller Pattern
```javascript
// controllers/projectController.js
async function listProjects(req, res) {
  try {
    const data = await getProjects({ q, status, page, pageSize });
    return res.json({ success: true, ...data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
module.exports = { listProjects: secured(listProjects) };
```

#### Service Pattern
```javascript
// services/projectsService.js
async function getProjects({ q, status, page = 1, pageSize = 50 } = {}) {
  const request = (await sql.connect(config)).request();
  // Build query with parameters
  const result = await request.query(sql);
  return { items: result.recordset, total, page, pageSize };
}
```

#### Transaction Pattern
```javascript
const pool = await sql.connect(config);
const transaction = new sql.Transaction(pool);
await transaction.begin();
try {
  // Multiple queries
  await transaction.commit();
} catch (e) {
  await transaction.rollback();
  throw e;
}
```

---

## 4. Error Handling

### Frontend
```typescript
try {
  const res = await apiClient.get('/projects');
  const data = res.data.items || [];
} catch (err) {
  console.error('[Component] API Error:', err);
  toast({ variant: 'destructive', title: 'Error', description: err.message });
}
```

### Backend
```javascript
try {
  // operation
  return res.json({ success: true, data });
} catch (err) {
  console.error('[module] Error:', err);
  return res.status(500).json({ success: false, message: err.message });
}
```

### Rules
- Always use try/catch for async operations
- Log errors with module prefix: `[moduleName] Error:`
- Return consistent JSON format: `{ success: false, message: string }`
- Frontend: Show toast notifications for user-facing errors
- Backend: Never expose stack traces in production

---

## 5. Validation

### Frontend
```typescript
// Using Zod schemas
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

// Using React Hook Form
const form = useForm({ resolver: zodResolver(schema) });
```

### Backend
```javascript
function requiredString(v, fieldName) {
  if (typeof v !== 'string' || !v.trim()) {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }
}

function parseOptionalDate(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Invalid date format');
    err.status = 400;
    throw err;
  }
  return d;
}
```

### Rules
- Validate all user input on both frontend and backend
- Use parameterized SQL queries (never string concatenation)
- Return 400 for validation errors
- Return 403 for authorization errors

---

## 6. Logging

### Backend
```javascript
// Error logging
console.error('[moduleName] Error:', err);

// Debug logging
console.log('[moduleName] Debug info:', data);

// SQL logging
console.log('[moduleName] SQL query:', query);
```

### Frontend
```javascript
// API errors
console.error('[Component] API Error:', err);

// Debug
console.log('[Component] State:', state);
```

### Rules
- Prefix all logs with module name: `[moduleName]`
- Use `console.error` for errors, `console.log` for debug
- No sensitive data in logs (passwords, tokens)
- Backend logs go to stdout (captured by PM2/Docker)

---

## 7. Formatting

### TypeScript/JavaScript
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use `const` by default, `let` when reassignment needed
- Use arrow functions for callbacks
- Use template literals for string interpolation

### SQL
- Use uppercase for SQL keywords: `SELECT`, `FROM`, `WHERE`, `INSERT`
- Use PascalCase for table/column names
- Use camelCase for aliases
- Parameterize all user input: `@ParamName`

### CSS/Tailwind
- Use Tailwind utility classes
- Use `cn()` for conditional classes
- Use semantic color names: `bg-crimson`, `text-muted-foreground`

---

## 8. Import Order

### TypeScript/React
```typescript
// 1. React
import React, { useState, useMemo } from 'react';

// 2. Third-party
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// 3. Internal - lib
import { useLuminaStore } from '@/lib/store';
import { Task, PipelineStep } from '@/lib/types';

// 4. Internal - services
import { apiClient } from '@/services/apiClient';

// 5. Internal - components
import { StatCard } from '@/components/dashboard/stat-card';

// 6. Styles (if any)
import './styles.css';
```

### JavaScript/Node.js
```javascript
// 1. Node built-ins
const crypto = require('crypto');
const path = require('path');

// 2. Third-party
const express = require('express');
const sql = require('mssql');

// 3. Internal - config
const { sql, config } = require('../config/db');

// 4. Internal - middleware
const authMiddleware = require('../middleware/authMiddleware');

// 5. Internal - services
const conversionService = require('../services/conversionService');

// 6. Internal - controllers
const { getUsers } = require('../controllers/userController');
```

---

## 9. Commenting

### Rules
- Use JSDoc for public functions
- Use inline comments for complex logic
- Use `// TODO:` for incomplete features
- Use `// FIXME:` for known bugs
- Use `// NOTE:` for important context

### Examples
```typescript
/**
 * Creates a new task and adds it to the store.
 * @param task - The task object to create
 */
function createTask(task: Task): void {
  // Validate required fields
  if (!task.shotId || !task.taskName) {
    throw new Error('Missing required fields');
  }
  
  // FIXME: This generates a non-UUID ID
  const id = `task_${Date.now()}`;
  
  // TODO: Replace with real API call
  addTask({ ...task, id });
}
```

---

## 10. TypeScript Best Practices

1. **Strict Mode**: Enabled in `tsconfig.json`
2. **No `any`**: Avoid `any` type (project has TODOs to fix this)
3. **Explicit Returns**: Use explicit return types for public functions
4. **Interfaces over Types**: Prefer `interface` for object shapes
5. **Enum Alternatives**: Use union types instead of enums
6. **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`)

```typescript
// Good
interface User {
  id: string;
  name: string;
  email?: string;
}

function getUser(id: string): User | null {
  return users.find(u => u.id === id) || null;
}

// Bad
function getUser(id: any): any {
  return users.find(u => u.id === id);
}
```

---

## 11. React Best Practices

1. **Client Components**: Use `"use client"` directive for interactive components
2. **Server Components**: Default to server components when possible
3. **Hooks Order**: Call hooks at the top level, not in conditions
4. **Key Prop**: Use stable keys (IDs, not array indices)
5. **Memoization**: Use `useMemo` and `useCallback` for expensive operations
6. **State Colocation**: Keep state as close to where it's used as possible

```typescript
"use client";
import { useState, useMemo } from 'react';

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState('');
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.status.includes(filter));
  }, [tasks, filter]);
  
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {filteredTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

---

## 12. SQL Best Practices

1. **Parameterized Queries**: Always use parameters, never concatenate
2. **Explicit Columns**: List columns in INSERT/UPDATE, don't use `SELECT *`
3. **Aliases**: Use short aliases for readability
4. **Transactions**: Use transactions for multi-step operations
5. **Error Handling**: Always rollback transactions on error

```javascript
// Good
const request = pool.request();
request.input('UserId', sql.UniqueIdentifier, userId);
request.input('Status', sql.NVarChar, status);
const result = await request.query('UPDATE Users SET Status = @Status WHERE UserId = @UserId');

// Bad
const query = `UPDATE Users SET Status = '${status}' WHERE UserId = '${userId}'`;
await pool.request().query(query);
```

---

## 13. Git Practices

1. **Branch Naming**: `feature/`, `bugfix/`, `hotfix/`, `chore/`
2. **Commit Messages**: Conventional commits format
   - `feat: add task assignment API`
   - `fix: resolve import parsing error`
   - `docs: update API reference`
3. **Pull Requests**: Small, focused changes with description
4. **Code Review**: All changes reviewed before merge

---

## 14. Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user input is validated
- [ ] All SQL queries are parameterized
- [ ] Error handling is consistent
- [ ] Logging is appropriate (no sensitive data)
- [ ] Types are correct (no `any`)
- [ ] Components have proper `"use client"` directive
- [ ] No unnecessary re-renders
- [ ] Accessibility considered (ARIA labels, keyboard nav)
- [ ] Tests added for new functionality
