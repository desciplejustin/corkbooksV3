# Build Plan: CorkBooksV3

## Objective
A web-based financial allocation tool to import bank statements, stage transactions for review and categorization, and finalize them into a clean ledger for reporting and tax purposes.

## Current Phase
Phase 2 - Foundation Data (Categories & Bank Accounts)

## Stack
Frontend: React + TypeScript (Vite)
Backend: Cloudflare Workers
Database: Cloudflare D1
Authentication: JWT in cookies
Hosting: Cloudflare (Pages + Workers)

## Build Phases

### Phase 1 - Setup & Auth
- [x] Initialize project structure (Vite + Wrangler)
- [x] Setup D1 database and create `users` schema migration
- [x] Create auth and role-check middleware for protected API routes
- [x] Create basic Auth API endpoints (login, logout, me) with JWT
- [x] Create Frontend Login page and protected routes wrapper
- [x] Add seed admin user and seed editor user for testing
- [x] **Test:** Verify login flow and protected route behavior locally

### Phase 2 - Foundation Data (Categories & Bank Accounts)
- [x] Update schema with `bank_accounts` and `categories` tables
- [x] Implement backend CRUD API for Categories and Bank Accounts
- [x] Create Frontend screen for Categories management
- [x] Create Frontend Settings/Setup layout for Bank Accounts
- [x] **Test & Deploy:** Ensure basic data entry and retrieval works, then deploy the first usable slice to Cloudflare

### Phase 3 - The Import Engine
- [x] Update schema with `bank_import_configs`, `imports`, `staged_transactions`, `allocation_rules`, and `transactions` tables
- [x] Create migration file (0005_import_tables.sql) with all Phase 3 tables
- [x] Apply migration to local database
- [x] Add TypeScript types for all Phase 3 entities
- [x] Build CSV parser utility with support for multiple formats
- [x] Create import configuration API routes (CRUD for bank_import_configs)
- [x] Create imports API routes (upload, list, get, staged transactions, update staged, finalize)
- [x] Add all new routes to main router (index.ts)
- [x] Verify backend compiles and runs without errors
- [ ] Build Frontend Import Configuration page (link to bank account setup)
- [ ] Build Frontend CSV Upload page with bank account selection
- [ ] Build Frontend Staging Review table with inline category assignment
- [ ] Implement minimal auto-suggestion logic using allocation rules
- [ ] **Test:** Upload a sample CSV and verify rows reach the staging area safely

### Phase 4 - Review & Finalise Flow
- [ ] Update schema with final `transactions` table
- [ ] Build API to fetch staged transactions and patch allocations
- [ ] Build API to create a rule from a confirmed staged transaction
- [ ] Build API to finalise import (move staged -> final transactions)
- [ ] Create Frontend Review/Staging page with category dropdowns and inline editing
- [ ] Implement the "Save Draft" and "Finalise Import" actions
- [ ] **Test:** Complete a full upload -> allocate -> finalise cycle

### Phase 5 - Ledger, Dashboard & Reports
- [ ] Build backend summary endpoints for Dashboard and basic reports
- [ ] Build Frontend Dashboard (totals, active unallocated count, recent imports)
- [ ] Build Frontend Transactions Ledger with simple filters and limited corrections for category and notes
- [ ] Build simple CSV export for reports
- [ ] **Test:** Verify Dashboard stats update correctly after finalisation

### Phase 6 - Rules Management & V1 Follow-Up
- [ ] Add basic Rules management list for viewing, editing, and disabling rules
- [ ] Add optional bulk-assign flow for unallocated transactions if review becomes too slow
- [ ] Review whether true transaction splitting is still needed after real usage
- [ ] **Test:** Verify a saved rule automatically suggests the correct category on the next upload

## Progress Notes
Agent must update this section after each completed phase.

- Planning: Database and API plans defined and aligned.
- Planning: Build plan updated to vertical slices with explicit RBAC, first-slice deployment timing, and minimal V1 auto-allocation support.
- **Phase 1 Complete ✅:** Authentication system fully implemented and tested
  - ✅ Wrangler and D1 database configured
  - ✅ Users table schema and seed data created
  - ✅ JWT authentication middleware implemented using Web Crypto API
  - ✅ RBAC middleware for role-based access control
  - ✅ Auth API routes: login, logout, me
  - ✅ Frontend login page with form validation
  - ✅ Protected routes wrapper component
  - ✅ Dashboard with user info display
  - ✅ React Router configured with auth state management
  - ✅ CORS configured for local development with credentials
  - ✅ .dev.vars created for local JWT_SECRET
  - ✅ **TESTED:** Login with admin and editor accounts working
  - ✅ **TESTED:** Protected routes redirect to login when unauthenticated
  - ✅ **TESTED:** Dashboard displays user info after successful login
  - ✅ **TESTED:** Logout clears session and redirects to login
- **Phase 2 Complete ✅:** Categories and Bank Accounts CRUD
  - ✅ Schema migrations created (0003_categories_and_bank_accounts.sql, 0004_seed_categories_and_accounts.sql)
  - ✅ Database migrations executed: 12 categories and 2 bank accounts seeded
  - ✅ Backend routes/categories.ts: GET, POST, PATCH endpoints with auth
  - ✅ Backend routes/bank-accounts.ts: GET, POST, PATCH endpoints with auth
  - ✅ Worker routing updated in index.ts for new endpoints
  - ✅ Frontend API client (src/api.ts) extended with categoriesApi and bankAccountsApi
  - ✅ Categories page (src/pages/Categories.tsx): List, create, edit, toggle active, filter by type/scope, show inactive
  - ✅ Bank Accounts page (src/pages/BankAccounts.tsx): List, create, edit, toggle active, show inactive
  - ✅ App routing updated with /categories and /bank-accounts protected routes
  - ✅ Navigation links added to header
  - ✅ Cookie authentication fixed for local development (removed Secure flag, changed to SameSite=Lax)
  - ✅ **TESTED:** All CRUD operations confirmed working
  - ✅ **TESTED:** List views display seeded data correctly
  - ✅ **TESTED:** Create new categories and bank accounts working
  - ✅ **TESTED:** Edit existing items working
  - ✅ **TESTED:** Toggle active/inactive working with show inactive filter
  - ✅ **TESTED:** Filters working (type, scope, active status)
  - ✅ **TESTED:** Error handling for duplicate names working
- **Phase 2 DEPLOYED TO PRODUCTION ✅**
  - ✅ Worker deployed to: https://corkbookv3.desciplejustin.workers.dev
  - ✅ Frontend deployed to: https://aef0d1be.corkbookv3.pages.dev
  - ✅ Production D1 database migrated and seeded
  - ✅ JWT_SECRET configured as Worker secret
  - ✅ CORS updated to support production domains
  - ✅ Cookie authentication fixed for cross-origin (SameSite=None; Secure)
  - ✅ **TESTED:** Login, categories, and bank accounts working in production
- **Phase 3 Backend Complete (In Progress) 🔄**
  - ✅ Database schema designed for multi-format import support (CSV, PDF, OFX, QIF)
  - ✅ Migration 0005_import_tables.sql created with 6 tables:
    - bank_import_configs: Store format and parser configuration per bank
    - imports: Track upload sessions with metadata
    - staged_transactions: Temporary review area before finalization
    - allocation_rules: Rule-based auto-suggestions
    - transactions: Final ledger entries
  - ✅ Migration applied to local database successfully
  - ✅ TypeScript types added for all Phase 3 entities
  - ✅ CSV parser utility created (utils/csv-parser.ts):
    - Supports custom delimiters, headers, date formats
    - Handles separate debit/credit columns or single amount column
    - Parses amounts with currency symbols and parentheses
    - Provides detailed error messages
  - ✅ Import configuration API routes (routes/import-configs.ts):
    - GET /api/import-configs (list all or filter by bank account)
    - POST /api/import-configs (create with JSON parser config)
    - GET /api/import-configs/:id (get single config)
    - PATCH /api/import-configs/:id (update config)
  - ✅ Imports API routes (routes/imports.ts):
    - POST /api/imports/upload (upload CSV with FormData)
    - GET /api/imports (list with filters)
    - GET /api/imports/:id (get single import)
    - GET /api/imports/:id/staged-transactions (review area)
    - PATCH /api/staged-transactions/:id (assign categories)
    - POST /api/imports/:id/finalize (move to final ledger)
  - ✅ All routes registered in index.ts
  - ✅ Backend tested and runs without compilation errors
  - ✅ **R2 file storage added** – original statement files saved to `corkbookv3-statements` R2 bucket
    - `storage/index.ts` implements `saveStatementFile`, `getStatementFile`, `deleteStatementFile`
    - Upload handler saves raw file to R2, stores key in `imports.source_file_key`
    - Download endpoint: GET `/api/imports/:id/download` streams original file
    - Migration 0006 adds `source_file_key` column to imports table
  - ✅ **Frontend Phase 3 pages built and compiled**
    - `/imports` – list all imports with status badges and download links
    - `/imports/new` – upload form with bank account selection, month picker, drag-friendly file input
    - `/imports/:id/review` – inline category assignment, scope, tax flag, flag for review, finalize button
  - ✅ **DOCUMENTATION:** TESTING_PHASE3.md created with API examples
  - 🔄 **Next:** Apply production migrations, deploy, test end-to-end
