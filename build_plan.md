# Build Plan: CorkBooksV3

## Objective
A web-based financial allocation tool to import bank statements, stage transactions for review and categorization, and finalize them into a clean ledger for reporting and tax purposes.

## Current Phase
Phase 5 - Ledger, Dashboard & Reports (In Progress)

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
- [x] Update schema with final `transactions` table
- [x] Build API to fetch staged transactions and patch allocations
- [x] Build API to create a rule from a confirmed staged transaction
- [x] Build API to finalise import (move staged -> final transactions)
- [x] Create Frontend Review/Staging page with category dropdowns and inline editing
- [x] Implement partial "Finalise Import" action (partial flag — unallocated rows stay staged)
- [x] **Test:** Complete a full upload -> allocate -> finalise cycle

### Phase 5 - Ledger, Dashboard & Reports
- [ ] Build backend summary endpoints for Dashboard and basic reports
- [ ] Build Frontend Dashboard (totals, active unallocated count, recent imports)
- [ ] Build Frontend Transactions Ledger with simple filters and limited corrections for category and notes
- [ ] Build simple CSV export for reports
- [x] **Bank Reconciliation report built** — opening/closing balance per account, variance check
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

- **Evening Session — 3 May 2026 ✅**
  - **Migration 0008:** Added `balance REAL` column to `staged_transactions` and `transactions` — captures running balance from bank statement for reconciliation use.
  - **Bank Reconciliation feature (full stack):**
    - `routes/reconciliation.ts` — `GET /api/reconciliation?bank_account_id=&date_from=&date_to=` returns opening balance, closing balance, total in/out, computed closing, variance, balanced flag.
    - `src/pages/Reconciliation.tsx` — account picker + date range, waterfall table, variance indicator (green ✓ / red ⚠), 4 summary cards.
    - `src/App.tsx` — route `/reconciliation` wired.
    - `src/nav.ts` — "Reports" nav item points to `/reconciliation`.
    - `index.ts` — reconciliation handler registered.
  - **FNB PDF import — three bugs diagnosed and fixed:**
    1. `skipLines` was applied to ALL pages → all of page 2 consumed by skip. Fixed with new `skipLinesSubsequent` field for pages 2+.
    2. Accrued bank charges trailing column (e.g. `1.50` at end of line) broke `\s*$`. Fixed: pattern ends with `(?:\s+[\d,]+\.\d{2})?\s*$`.
    3. Year inference used `new Date()` (May 2026) → all past dates got year 2026. Fixed: `stmtYear` extracted from `statementMonth`, passed as `yearHint` to `parsePDFDate`.
  - **Import config wizard improvements:**
    - `pageStart` auto-migration: old configs that stored skip count in `pageStart` are auto-corrected on `openConfig()` load (`pageStart > 5 && !skipLines` → sets `skipLines = pageStart`, `pageStart = 1`).
    - Step 2 now shows two separate skip fields: "Lines to skip — first page" (`skipLines`) and "Lines to skip — pages 2+" (`skipLinesSubsequent`).
    - `pageStart` input shows red warning if value exceeds actual PDF page count.
    - Diagnostic error message improved: shows exact failure mode with per-page line counts.
  - **ImportReview UX — standalone "+ New Category" button:**
    - Added `quickAddStandalone` boolean state alongside existing `quickAddCatRow`.
    - "+" button in sticky header toolbar opens same modal but does not auto-select a row after save — just adds category to all dropdowns.
    - Per-row trigger still works and auto-selects the new category for that row.
    - Modal save button label: "Save & Select" (per-row) vs "Save" (standalone).
  - ✅ Clean `vite build` verified after all changes.

  **Lessons Learned — Architecture & Patterns:**
  - **PDF per-page skip config:** Plan for `skipLines` (page 1) + `skipLinesSubsequent` (pages 2+) from the start. Bank statement page 1 always has far more header lines (address, account info) than subsequent pages.
  - **Date inference in parsers:** Never infer year from `new Date()` when parsing historical statements. Always use the statement's own month/year as the source of truth (`yearHint`).
  - **Regex for bank statement rows:** Use optional groups for trailing columns that may or may not appear (e.g. accrued charges). End the pattern with `(?:\s+[\d,]+\.\d{2})?\s*$` not just `\s*$`.
  - **Config schema migration strategy:** When a new field is added to a JSON config stored in DB, implement silent auto-migration on the read path (load → detect old shape → fix in-memory → let user save). Do not require manual re-configuration.
  - **Quick-add pattern in review UIs:** Use a separate boolean flag (e.g. `quickAddStandalone`) alongside the row-id state to distinguish toolbar vs per-row invocation. Adjust post-save behavior accordingly — toolbar: add to list only; per-row: add + auto-select.
