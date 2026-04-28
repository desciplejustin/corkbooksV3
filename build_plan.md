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
- [ ] Update schema with `imports`, `staged_transactions`, and `allocation_rules` tables
- [ ] Build CSV upload and parsing logic
- [ ] Implement minimal auto-suggestion logic using exact or contains rule matching during import
- [ ] Build API endpoint to receive parsed rows and stage them
- [ ] Create Frontend Import Transactions page with CSV upload
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
- Next: Phase 3 - Import Engine
