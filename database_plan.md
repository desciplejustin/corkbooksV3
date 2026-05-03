# Database Plan: CorkBooksV3

## V1 Goal

Store imported bank transactions safely in a staging area, force allocation before final import, keep a clean final ledger, and support simple repeat-allocation rules.

## Applied Migrations

| File | Description | Status |
|------|-------------|--------|
| 0001_init.sql | Users table, seed admin/editor | ✅ local + prod |
| 0002_seed.sql | Additional seed data | ✅ local + prod |
| 0003_categories_and_bank_accounts.sql | categories + bank_accounts tables | ✅ local + prod |
| 0004_seed_categories_and_accounts.sql | Seed categories and accounts | ✅ local + prod |
| 0005_import_tables.sql | bank_import_configs, imports, staged_transactions, allocation_rules, transactions | ✅ local + prod |
| 0006_source_file_key.sql | source_file_key column on imports (R2 storage) | ✅ local + prod |
| 0007_*.sql | Additional import/review fields | ✅ local |
| 0008_add_balance_column.sql | balance REAL on staged_transactions + transactions | ✅ local — ⏳ prod pending |

## Tables Required

### Table: users
Purpose:
- Stores authenticated users who can log in and use the system.

Fields:
- id: text, primary key
- email: text, unique, required
- password_hash: text, required
- full_name: text, required
- role: text, required, values `admin`, `editor`, `viewer`
- is_active: integer, required, default `1`
- last_login_at: text, nullable ISO timestamp
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Relationships:
- One user creates many imports.
- One user creates many allocation rules.

Indexes:
- unique index on email
- index on role
- index on is_active

Validation Rules:
- Email must be unique.
- Role must be one of `admin`, `editor`, `viewer`.
- Password hash must never store plain text passwords.

### Table: bank_accounts
Purpose:
- Stores the bank accounts that imported transactions belong to.

Fields:
- id: text, primary key
- name: text, required
- bank_name: text, required
- account_number_masked: text, required
- owner_name: text, required
- account_type: text, nullable
- is_active: integer, required, default `1`
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Relationships:
- One bank account has many imports.
- One bank account has many staged transactions.
- One bank account has many final transactions.
- One bank account can optionally scope many allocation rules.

Indexes:
- index on bank_name
- index on is_active

Validation Rules:
- Account numbers should be stored masked for display purposes.
- Name should be user-friendly and unique enough for selection.

### Table: bank_import_configs
Purpose:
- Stores the import configuration for each bank (format type, parser rules, field mappings).
- Allows different banks to use different import formats (CSV, PDF, OFX, etc.).

Fields:
- id: text, primary key
- bank_account_id: text, required, foreign key to bank_accounts.id
- format_type: text, required, values `csv`, `pdf`, `ofx`, `qif`
- parser_config: text, required (JSON string with format-specific configuration)
- is_active: integer, required, default `1`
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Parser Config JSON Structure (examples):
```json
// For CSV:
{
  "delimiter": ",",
  "hasHeader": true,
  "dateColumn": "Date",
  "dateFormat": "DD/MM/YYYY",
  "descriptionColumn": "Description",
  "amountColumn": "Amount",
  "debitColumn": "Debit",
  "creditColumn": "Credit",
  "referenceColumn": "Reference",
  "skipRows": 0
}

// For PDF:
{
  "pdfType": "fnb_cheque",
  "pageStart": 1,
  "skipLines": 30,           // header lines to skip on page 1 (address, account info block)
  "skipLinesSubsequent": 3,  // header lines to skip on pages 2+ (just column header row)
  "pattern": "(?<date>...)",
  "dateFormat": "DD MMM",
  "yearHint": 2025           // year extracted from statementMonth — prevents wrong-year inference
}
```

Relationships:
- One bank account has one active import config.
- One import config belongs to one bank account.

Indexes:
- index on bank_account_id
- index on format_type
- index on is_active

Validation Rules:
- Format type must be one of the supported formats.
- Parser config must be valid JSON.
- Only one active config per bank account.

### Table: categories
Purpose:
- Stores the categories used for allocation and reporting.

Fields:
- id: text, primary key
- name: text, unique, required
- category_type: text, required, values `income` or `expense`
- scope: text, required, values `personal`, `business`, `shared`
- sars_related: integer, required, default `0`
- is_active: integer, required, default `1`
- sort_order: integer, nullable
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Relationships:
- One category can be assigned to many staged transactions.
- One category can classify many final transactions.
- One category can be used by many allocation rules.

Indexes:
- unique index on name
- index on category_type
- index on scope
- index on is_active

Validation Rules:
- Name must be unique.
- Category type must be `income` or `expense`.
- Scope must be `personal`, `business`, or `shared`.

### Table: imports
Purpose:
- Stores each uploaded file import session (CSV, PDF, etc.).

Fields:
- id: text, primary key
- bank_account_id: text, required, foreign key to bank_accounts.id
- import_config_id: text, required, foreign key to bank_import_configs.id
- uploaded_by_user_id: text, required, foreign key to users.id
- source_filename: text, required
- source_format: text, required, values `csv`, `pdf`, `ofx`, `qif`
- statement_month: text, required, format `YYYY-MM`
- period_start: text, nullable
- period_end: text, nullable
- notes: text, nullable
- status: text, required, values `draft`, `ready`, `finalised`
- row_count: integer, required, default `0`
- created_at: text, required ISO timestamp
- finalised_at: text, nullable ISO timestamp

Relationships:
- One import belongs to one bank account.
- One import uses one import config.
- One import belongs to one user.
- One import contains many staged transactions.
- One finalised import produces many final transactions.

Indexes:
- index on bank_account_id
- index on import_config_id
- index on uploaded_by_user_id
- index on statement_month
- index on status
- index on source_format

Validation Rules:
- Source file name must be present.
- Source format must match the config format type.
- Statement month must be valid.
- Import cannot be finalised unless all staged rows are allocated.

### Table: staged_transactions
Purpose:
- Stores imported transaction rows that must be reviewed before final import.

Fields:
- id: text, primary key
- import_id: text, required, foreign key to imports.id
- bank_account_id: text, required, foreign key to bank_accounts.id
- transaction_date: text, required
- description: text, required
- reference: text, nullable
- money_in: numeric, required, default `0`
- money_out: numeric, required, default `0`
- net_amount: numeric, required
- balance: real, nullable — running balance captured from bank statement row (used for reconciliation)
- suggested_category_id: text, nullable, foreign key to categories.id
- assigned_category_id: text, nullable, foreign key to categories.id
- allocation_source: text, nullable, values `manual`, `rule`, `history`
- scope: text, nullable, values `personal`, `business`, `shared`
- tax_deductible: integer, nullable
- notes: text, nullable
- review_status: text, required, values `unallocated`, `allocated`, `needs_review`
- matched_rule_id: text, nullable, foreign key to allocation_rules.id
- raw_row_json: text, nullable
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Relationships:
- Many staged transactions belong to one import.
- Many staged transactions belong to one bank account.
- Many staged transactions can reference one suggested category.
- Many staged transactions can reference one assigned category.
- Many staged transactions can reference one matching rule.
- One staged transaction may produce zero or one final transaction.

Indexes:
- index on import_id
- index on bank_account_id
- index on transaction_date
- index on review_status
- index on assigned_category_id
- index on suggested_category_id
- index on matched_rule_id

Validation Rules:
- Description and transaction date are required.
- Net amount must be consistent with money in and money out.
- Assigned category is required before finalisation.
- Review status must reflect allocation state.

### Table: transactions
Purpose:
- Stores final ledger transactions used for reporting.

Fields:
- id: text, primary key
- source_staged_transaction_id: text, unique, required, foreign key to staged_transactions.id
- import_id: text, required, foreign key to imports.id
- bank_account_id: text, required, foreign key to bank_accounts.id
- transaction_date: text, required
- description: text, required
- reference: text, nullable
- amount: numeric, required
- category_id: text, required, foreign key to categories.id
- scope: text, required, values `personal`, `business`, `shared`
- tax_deductible: integer, required, default `0`
- notes: text, nullable
- allocation_source: text, required, values `manual`, `rule`, `history`
- balance: real, nullable — running balance from source bank statement (mirrors staged_transactions.balance)
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp

Relationships:
- Many final transactions belong to one import.
- Many final transactions belong to one bank account.
- Many final transactions belong to one category.
- One final transaction maps back to one staged transaction.

Indexes:
- unique index on source_staged_transaction_id
- index on import_id
- index on bank_account_id
- index on transaction_date
- index on category_id
- index on scope
- index on tax_deductible

Validation Rules:
- A final transaction must always link back to its staged source row.
- Category is required.
- Scope must be `personal`, `business`, or `shared`.

### Table: allocation_rules
Purpose:
- Stores simple repeat-allocation rules for future suggestions.

Fields:
- id: text, primary key
- name: text, required
- match_type: text, required, values `contains`, `exact`
- match_value: text, required
- bank_account_id: text, nullable, foreign key to bank_accounts.id
- category_id: text, required, foreign key to categories.id
- scope: text, required, values `personal`, `business`, `shared`
- tax_deductible: integer, required, default `0`
- priority: integer, required, default `100`
- is_active: integer, required, default `1`
- created_by_user_id: text, required, foreign key to users.id
- created_at: text, required ISO timestamp
- updated_at: text, required ISO timestamp
- last_matched_at: text, nullable ISO timestamp

Relationships:
- Many rules can target one category.
- Many rules can optionally target one bank account.
- Many rules are created by one user.
- One rule can match many staged transactions.

Indexes:
- index on bank_account_id
- index on category_id
- index on created_by_user_id
- index on is_active
- index on priority

Validation Rules:
- Match type must be `contains` or `exact`.
- Match value must not be empty.
- Lower priority number should be evaluated first.

## Table Relationships Summary

- users -> imports: one-to-many
- users -> allocation_rules: one-to-many
- bank_accounts -> bank_import_configs: one-to-one (active)
- bank_accounts -> imports: one-to-many
- bank_accounts -> staged_transactions: one-to-many
- bank_accounts -> transactions: one-to-many
- bank_accounts -> allocation_rules: one-to-many, optional
- bank_import_configs -> imports: one-to-many
- categories -> staged_transactions: one-to-many
- categories -> transactions: one-to-many
- categories -> allocation_rules: one-to-many
- imports -> staged_transactions: one-to-many
- imports -> transactions: one-to-many
- staged_transactions -> transactions: one-to-zero-or-one
- allocation_rules -> staged_transactions: one-to-many

## V1 Simplifications

- No separate roles table.
- No budget tables yet.
- No full double-entry accounting model.
- No transaction split table in V1. Use `shared` scope where needed and add true splits later if required.
- **CSV parsing only in Phase 3** - PDF and other formats added later.
- Import configs stored but PDF parser not implemented until later phase.

## Multi-Format Import Strategy

### Phase 3 (Current): CSV Implementation
- Create `bank_import_configs` table schema
- Implement CSV parser only
- Store parser_config JSON for CSV format
- Test with CSV files from different banks

### Future Phase: PDF Support
- Implement PDF parsing library integration
- Add PDF-specific parser logic
- Extract text from PDF statements
- Parse tables/transaction data
- Use stored parser_config to handle bank-specific PDF layouts

### Future Phase: Other Formats
- OFX (Open Financial Exchange)
- QIF (Quicken Interchange Format)
- Direct bank API integration

## Notes

- Keep staging and final ledger separate.
- Preserve raw import row data for auditability.
- Keep the first version explicit and easy to reason about.
- Design for multiple formats but implement incrementally.
- Each bank can have its own parser configuration.