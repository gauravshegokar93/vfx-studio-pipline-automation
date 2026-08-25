# DEPLOYMENT.md

Build and deployment guide for SM rolling FX / Lumina VFX Hub.

---

## 1. Prerequisites

### System Requirements
- **Node.js**: 18+ (20+ recommended)
- **npm**: 9+ or yarn/pnpm
- **SQL Server**: 2019+ (local or remote)
- **Memory**: 4GB+ RAM
- **Disk**: 2GB+ free space

### Accounts & Services
- SQL Server instance with credentials
- Google AI API key (for Genkit features)
- Vercel/Firebase account (for frontend hosting)
- AWS/Azure account (for backend hosting)

---

## 2. Local Development

### Frontend Setup
```bash
# Clone repository
git clone <repository-url>
cd vfx-studio-pipline-automation

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your API URL and Google AI key

# Run development server
npm run dev
# Opens at http://localhost:9002
```

### Backend Setup
```bash
# Navigate to backend
cd vfx-studio-pipline-automation/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials

# Run development server
npm run dev
# Opens at http://localhost:5000
```

### Database Setup
```bash
# 1. Open SSMS and connect to SQL Server
# 2. Run the schema script
# File: docs/db-setup.sql

# 3. Run migrations
cd backend
node scripts/run-migrations.js

# 4. Verify tables created
# Check SSMS Object Explorer for SMRollingFX database
```

---

## 3. Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
GOOGLE_GENAI_API_KEY=AIzaSy...
```

### Backend (`.env`)
```env
# Database
DB_SERVER=192.168.101.57
DB_DATABASE=SMRollingFX
DB_USER=smrolling_user
DB_PASSWORD=StrongPassword@123

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here-min-32-chars
```

### Production Values
```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.smrollingfx.com/api
GOOGLE_GENAI_API_KEY=AIzaSy...

# Backend
DB_SERVER=sql-server-prod.example.com
DB_DATABASE=SMRollingFX
DB_USER=smrolling_prod_user
DB_PASSWORD=<strong-production-password>
PORT=5000
NODE_ENV=production
JWT_SECRET=<cryptographically-random-32+ chars>
JWT_REFRESH_SECRET=<cryptographically-random-32+ chars>
```

---

## 4. Build Process

### Frontend Build
```bash
cd vfx-studio-pipline-automation

# Install dependencies
npm install

# Run lint
npm run lint

# Type check
npm run typecheck

# Build
npm run build
# Output: .next/ directory

# Start production server
npm start
# Opens at http://localhost:3000
```

### Backend Build
```bash
cd vfx-studio-pipline-automation/backend

# Install dependencies
npm install

# Start production server
NODE_ENV=production node server.js
# Or use PM2:
pm2 start server.js --name "smrolling-backend"
```

---

## 5. Production Deployment

### Option A: Vercel (Frontend) + AWS/Azure (Backend)

#### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**vercel.json** (optional):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

#### Backend (AWS EC2 / Azure VM)
1. Provision Windows Server or Linux VM
2. Install Node.js 20+
3. Install SQL Server client tools
4. Clone repository
5. Configure `.env` with production values
6. Install dependencies: `npm install`
7. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "smrolling-backend"
   pm2 save
   pm2 startup
   ```
8. Configure Nginx reverse proxy (optional):
   ```nginx
   server {
     listen 80;
     server_name api.smrollingfx.com;
     
     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

### Option B: Firebase App Hosting (Frontend) + Cloud Run (Backend)

#### Frontend (Firebase)
1. Install Firebase CLI
2. Initialize project:
   ```bash
   firebase init apphosting
   ```
3. Deploy:
   ```bash
   firebase deploy --only apphosting
   ```

#### Backend (Google Cloud Run)
1. Create Dockerfile:
   ```dockerfile
   FROM node:20-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["node", "server.js"]
   ```
2. Build and deploy:
   ```bash
   gcloud run deploy smrolling-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```

---

## 6. Docker Deployment

### Dockerfile (Backend)
```dockerfile
FROM node:20-slim

# Install SQL Server tools
RUN apt-get update && apt-get install -y curl gnupg
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
RUN curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DB_SERVER=sqlserver
      - DB_DATABASE=SMRollingFX
      - DB_USER=sa
      - DB_PASSWORD=YourStrong@Passw0rd
      - JWT_SECRET=your-secret-key
      - JWT_REFRESH_SECRET=your-refresh-secret
    depends_on:
      - sqlserver
    restart: unless-stopped

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    restart: unless-stopped

volumes:
  sqlserver-data:
```

---

## 7. Database Migration

### Production Migration
```bash
# 1. Backup database
BACKUP DATABASE SMRollingFX TO DISK = 'C:\backup\SMRollingFX.bak'

# 2. Run migration script
cd backend
node scripts/run-migrations.js

# 3. Verify migration
# Check SSMS for new columns/tables
```

### Rollback
```sql
-- If migration fails, restore from backup
RESTORE DATABASE SMRollingFX FROM DISK = 'C:\backup\SMRollingFX.bak'
```

---

## 8. CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - run: npm run lint
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && npm install
      - uses: google-github-actions/deploy-cloudrun@v1
        with:
          source: ./backend
          service: smrolling-backend
          region: us-central1
```

---

## 9. Monitoring

### Health Checks
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Recommended Tools
- **Frontend**: Vercel Analytics, Google Analytics
- **Backend**: PM2 monitoring, CloudWatch/Azure Monitor
- **Database**: SQL Server Performance Monitor, Query Store
- **Errors**: Sentry, LogRocket
- **Uptime**: UptimeRobot, Pingdom

---

## 10. Backup Strategy

### Database Backups
```sql
-- Full backup (daily)
BACKUP DATABASE SMRollingFX TO DISK = 'C:\backup\SMRollingFX_Full.bak'

-- Differential backup (hourly)
BACKUP DATABASE SMRollingFX TO DISK = 'C:\backup\SMRollingFX_Diff.bak' WITH DIFFERENTIAL

-- Transaction log backup (every 15 min)
BACKUP LOG SMRollingFX TO DISK = 'C:\backup\SMRollingFX_Log.trn'
```

### File Backups
- Uploaded Excel files: Store in S3/Azure Blob with versioning
- Application logs: Centralized logging (ELK, CloudWatch)

---

## 11. Scaling

### Frontend
- Vercel automatically scales
- Use CDN for static assets
- Implement ISR (Incremental Static Regeneration) for static pages

### Backend
- Use PM2 cluster mode: `pm2 start server.js -i max`
- Deploy multiple instances behind load balancer
- Use Redis for session sharing

### Database
- Read replicas for analytics queries
- Connection pooling (already implemented via mssql)
- Consider sharding for very large datasets

---

## 12. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change `PORT` in `.env` or kill process |
| DB connection failed | Check SQL Server is running, firewall allows port 1433 |
| JWT errors | Ensure `JWT_SECRET` is set and consistent |
| CORS errors | Check `cors` middleware configuration |
| Build fails | Check Node.js version, clear `.next` and `node_modules` |
| Excel upload fails | Check file size (<20MB), file type (.xlsx/.xls/.csv) |

### Debug Commands
```bash
# Check Node version
node --version

# Check npm version
npm --version

# Clear cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check DB connection
cd backend
node test-db.js

# List users
node list-users.js
```

---

## 13. Rollback Procedure

### Frontend Rollback
```bash
# Vercel: Rollback to previous deployment in dashboard
# Or redeploy previous commit:
git revert HEAD
git push
```

### Backend Rollback
```bash
# PM2: Restart previous version
pm2 restart smrolling-backend --update-env

# Or rollback git commit
git revert HEAD
git push
npm install
pm2 restart smrolling-backend
```

### Database Rollback
```sql
-- Restore from backup
RESTORE DATABASE SMRollingFX FROM DISK = 'C:\backup\SMRollingFX.bak'
```
