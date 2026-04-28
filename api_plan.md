# API Plan: CorkBooksV3

## Base Rules

- All routes must live under `/api/*`.
- Authentication uses JWT stored in cookies.
- Protected routes must verify authentication and role.
- All responses must use this shape:

```json
{
	"success": true,
	"data": {},
	"error": null
}
```

## Endpoints

### Auth

#### POST /api/auth/login
Purpose:
- Authenticate the user and set the JWT cookie.

Body:
- email
- password

Validation:
- Email and password are required.
- User must exist and be active.
- Password must match stored hash.

Returns:
- Current user details and role.

#### POST /api/auth/logout
Purpose:
- Clear the JWT cookie.

Returns:
- Success confirmation.

#### GET /api/auth/me
Purpose:
- Return the currently logged-in user for frontend route protection and role-based UI.

Returns:
- User id, name, email, and role.

### Dashboard

#### GET /api/dashboard/summary
Purpose:
- Return the main dashboard overview.

Returns:
- Total income this month.
- Total expenses this month.
- Net cash movement.
- Unallocated transactions count.
- Recent imports.

### Bank Accounts

#### GET /api/bank-accounts
Purpose:
- List active bank accounts for forms, filters, and reports.

Returns:
- Bank account summaries.

#### POST /api/bank-accounts
Purpose:
- Create a bank account record.

Body:
- name
- bank_name
- account_number_masked
- owner_name
- account_type

Validation:
- Required fields must be present.

Returns:
- Created bank account.

#### PATCH /api/bank-accounts/:id
Purpose:
- Update a bank account's details or active status.

Body:
- Any editable bank account fields.

Validation:
- Account must exist.

Returns:
- Updated bank account.

### Categories

#### GET /api/categories
Purpose:
- List categories for dropdowns, filters, and category management.

Returns:
- Category list.

#### POST /api/categories
Purpose:
- Create a category.

Body:
- name
- category_type
- scope
- sars_related

Validation:
- Name must be unique.
- Category type must be `income` or `expense`.
- Scope must be `personal`, `business`, or `shared`.

Returns:
- Created category.

#### PATCH /api/categories/:id
Purpose:
- Update category details or active status.

Body:
- Any editable category fields.

Validation:
- Category must exist.

Returns:
- Updated category.

### Imports

#### POST /api/imports/upload
Purpose:
- Upload a CSV, parse it, create an import record, and insert staged transactions.

Body:
- bank_account_id
- statement_month
- csv file
- notes

Validation:
- File must be present and valid.
- Bank account must exist.
- Parsed rows must not be empty.

Returns:
- Import id, row count, and preview summary.

#### GET /api/imports
Purpose:
- List import sessions with status and counts.

Returns:
- Import summaries.

#### GET /api/imports/:id
Purpose:
- Return one import summary.

Returns:
- Import metadata and status.

#### GET /api/imports/:id/staged-transactions
Purpose:
- Return staged rows for the review screen.

Returns:
- Transaction rows with suggestion, assignment, and review state.

#### POST /api/imports/:id/finalise
Purpose:
- Validate that every staged row is allocated, create final transactions, and mark the import as finalised.

Validation:
- Import must exist.
- Import must not already be finalised.
- All staged rows must have assigned categories.

Returns:
- Finalisation result with number of final transactions created.

### Staged Transactions

#### PATCH /api/staged-transactions/:id
Purpose:
- Update one staged transaction during review.

Body:
- assigned_category_id
- scope
- tax_deductible
- notes
- review_status

Validation:
- Staged transaction must exist.
- Assigned category must exist when provided.

Returns:
- Updated staged transaction.

#### POST /api/staged-transactions/bulk-assign
Purpose:
- Apply the same allocation fields to multiple staged transactions.

Body:
- staged_transaction_ids
- assigned_category_id
- scope
- tax_deductible

Validation:
- At least one transaction id is required.
- Category must exist when provided.

Returns:
- Count of updated rows.

#### POST /api/staged-transactions/:id/create-rule
Purpose:
- Create an allocation rule from a confirmed staged transaction.

Body:
- name
- match_type
- match_value
- priority

Validation:
- Staged transaction must exist.
- Category and scope must already be available on the staged row or provided explicitly.

Returns:
- Created allocation rule.

### Transactions

#### GET /api/transactions
Purpose:
- List final ledger transactions with filters.

Query Filters:
- date_from
- date_to
- bank_account_id
- category_id
- scope
- tax_deductible
- search

Returns:
- Filtered transaction list.

#### GET /api/transactions/:id
Purpose:
- Return a single final transaction.

Returns:
- Transaction details.

#### PATCH /api/transactions/:id
Purpose:
- Allow limited corrections after finalisation without breaking the audit trail.

Body:
- category_id
- scope
- tax_deductible
- notes

Validation:
- Transaction must exist.
- Editable fields only.

Returns:
- Updated transaction.

### Rules

#### GET /api/rules
Purpose:
- List allocation rules.

Returns:
- Rule list.

#### POST /api/rules
Purpose:
- Create a new allocation rule manually.

Body:
- name
- match_type
- match_value
- bank_account_id
- category_id
- scope
- tax_deductible
- priority

Validation:
- Match type must be valid.
- Category must exist.

Returns:
- Created rule.

#### PATCH /api/rules/:id
Purpose:
- Update rule logic, target category, scope, priority, or active status.

Body:
- Any editable rule fields.

Validation:
- Rule must exist.

Returns:
- Updated rule.

#### DELETE /api/rules/:id
Purpose:
- Remove or disable a rule that should no longer apply.

Returns:
- Success confirmation.

### Reports

#### GET /api/reports/summary
Purpose:
- Return totals for income, expenses, and net movement for a selected period.

Query Filters:
- date_from
- date_to
- bank_account_id
- scope

Returns:
- Summary totals.

#### GET /api/reports/category-breakdown
Purpose:
- Return grouped totals by category.

Query Filters:
- date_from
- date_to
- bank_account_id
- scope

Returns:
- Totals grouped by category.

#### GET /api/reports/cash-flow
Purpose:
- Return period-based income and expense totals for cash flow reporting.

Query Filters:
- date_from
- date_to
- bank_account_id
- scope

Returns:
- Totals grouped by period.

#### GET /api/reports/sars-summary
Purpose:
- Return business-related and tax-deductible totals for SARS preparation.

Query Filters:
- date_from
- date_to
- bank_account_id

Returns:
- SARS-focused grouped totals.

#### GET /api/reports/export
Purpose:
- Export report data as CSV.

Query Filters:
- report_type
- date_from
- date_to
- bank_account_id
- scope

Returns:
- CSV file response.

## Endpoint Priorities

### First Vertical Slice

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/dashboard/summary
- GET /api/categories
- POST /api/imports/upload
- GET /api/imports/:id/staged-transactions
- PATCH /api/staged-transactions/:id
- POST /api/imports/:id/finalise
- GET /api/transactions
- GET /api/reports/summary
- GET /api/reports/category-breakdown

### Next After First Slice

- GET /api/imports
- GET /api/bank-accounts
- POST /api/bank-accounts
- PATCH /api/bank-accounts/:id
- POST /api/staged-transactions/bulk-assign
- GET /api/rules
- POST /api/rules
- PATCH /api/rules/:id
- DELETE /api/rules/:id
- GET /api/reports/cash-flow
- GET /api/reports/sars-summary
- GET /api/reports/export

## Error Handling

- 400 for validation errors.
- 401 for unauthenticated users.
- 403 for permission errors.
- 404 for missing records.
- 409 for duplicate or invalid state transitions such as finalising twice.
- 500 for server or database errors.

## V1 Simplifications

- No budgeting endpoints yet.
- No bank API integration endpoints yet.
- No accountant-specific workflow endpoints yet.
- No PDF export endpoint yet.
- No advanced split-transaction endpoints in V1.