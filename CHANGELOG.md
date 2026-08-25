# CHANGELOG.md

Version history and roadmap for SM rolling FX / Lumina VFX Hub.

---

## [Unreleased]

### Added
- Complete documentation suite (README, AI_CONTEXT, PROJECT_STRUCTURE, etc.)
- Import review workflow with staging queue
- Production conversion engine (staging → production hierarchy)
- Artist management module (separate from Users)
- Department progress tracking
- Daily tracking page
- Production queue page
- Settings page
- Version audit trail page
- AI flows: automated-shot-task-generation, intelligent-scheduling-assistant, review-feedback-summary

### Changed
- Frontend UI: 100% complete with 20+ pages
- State Logic: 100% complete with Zustand store
- SQL Schema: 100% complete with Clients, Episodes, Converted columns

### Fixed
- Database schema duplication in `docs/database-schema.sql`
- Import controller stub replaced with `simpleImportController`

### Known Issues
- State volatility: Data resets on browser refresh
- Mock services: `userService`, `notificationService` return hardcoded data
- TypeScript errors: Several `any` types in import page
- Build errors ignored: `next.config.ts` ignores TS/ESLint errors
- Open import endpoints: No authentication on `/api/import` and `/api/simple-import`

---

## [0.1.0] - 2024-01-01

### Added
- Initial project structure
- Next.js 15 frontend with App Router
- Express.js backend with SQL Server
- Basic authentication (JWT + bcrypt)
- User management (CRUD)
- Project management (CRUD)
- Task management (list, assign, progress, review)
- Artist management
- Department listing
- Sequence and shot listing
- Simple Excel import
- Import review and conversion
- Analytics dashboard
- AI integration (Genkit + Gemini)
- Dark theme UI with ShadCN components
- Zustand state management
- Role-based access control

### Documentation
- README.md
- API_DOCUMENTATION.md
- DATABASE_DOCUMENTATION.md
- PROJECT_DOCUMENTATION.md
- PROJECT_TREE.md
- blueprint.md
- sql-server-blueprint.md
- db-migration-guide.md
- readiness-audit.md
- implementation_plan.md

---

## Roadmap

### Phase 1: Backend Integration (Current)
- [x] SQL Server schema design
- [x] Backend API structure
- [x] Authentication flow
- [x] Import/conversion engine
- [ ] Replace all mock services with real API calls
- [ ] Persist Zustand state to SQL Server
- [ ] Implement proper error boundaries

### Phase 2: Enhanced Features
- [ ] Time tracking with start/stop timer
- [ ] Version submission with file upload
- [ ] Leave management API
- [ ] Notification system API
- [ ] Shot status history tracking
- [ ] Client management module
- [ ] Reports generation

### Phase 3: AI & Automation
- [ ] AI-driven predictive bidding
- [ ] Automated scheduling with conflict resolution
- [ ] Render farm integration
- [ ] Real-time collaboration features

### Phase 4: Enterprise Features
- [ ] Multi-studio support
- [ ] Advanced analytics with SQL Views
- [ ] Audit logging
- [ ] SSO integration (SAML/OAuth)
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync

### Phase 5: Integrations
- [ ] ShotGrid/Ftrack sync
- [ ] Slack/Teams notifications
- [ ] Email reporting
- [ ] Cloud storage (S3/Azure Blob)
- [ ] Render farm APIs (Ranch, Deadline)

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to API or data model
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

---

## Release History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2024-01-01 | Initial release with core features |
| Unreleased | - | Documentation suite, import review, AI flows |
