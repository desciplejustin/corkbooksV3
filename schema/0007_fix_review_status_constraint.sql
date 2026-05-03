-- Migration 0007: Fix review_status CHECK constraint in staged_transactions
-- Adds 'transfer' and 'duplicate' to the allowed values.
-- Must recreate transactions too since it has a FK pointing to staged_transactions.

-- Step 1: Back up existing data into constraint-free temp tables
CREATE TABLE _staged_bak AS SELECT * FROM staged_transactions;
CREATE TABLE _txn_bak AS SELECT * FROM transactions;

-- Step 2: Drop child table first (transactions references staged_transactions)
DROP TABLE transactions;
DROP TABLE staged_transactions;

-- Step 3: Recreate staged_transactions with updated CHECK constraint
CREATE TABLE staged_transactions (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    money_in REAL NOT NULL DEFAULT 0,
    money_out REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL,
    suggested_category_id TEXT,
    assigned_category_id TEXT,
    allocation_source TEXT CHECK(allocation_source IN ('manual', 'rule', 'history')),
    scope TEXT CHECK(scope IN ('personal', 'business', 'shared')),
    tax_deductible INTEGER,
    notes TEXT,
    review_status TEXT NOT NULL DEFAULT 'unallocated' CHECK(review_status IN ('unallocated', 'allocated', 'needs_review', 'transfer', 'duplicate')),
    matched_rule_id TEXT,
    raw_row_json TEXT,
    is_transfer INTEGER NOT NULL DEFAULT 0,
    transfer_account_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 4: Recreate transactions table
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    source_staged_transaction_id TEXT UNIQUE NOT NULL,
    import_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    amount REAL NOT NULL,
    category_id TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('personal', 'business', 'shared')),
    tax_deductible INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    allocation_source TEXT NOT NULL CHECK(allocation_source IN ('manual', 'rule', 'history')),
    transfer_pair_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 5: Restore staged_transactions data
INSERT INTO staged_transactions
SELECT
  id, import_id, bank_account_id, transaction_date, description, reference,
  COALESCE(money_in, 0), COALESCE(money_out, 0), net_amount,
  suggested_category_id, assigned_category_id, allocation_source,
  scope, tax_deductible, notes, review_status, matched_rule_id, raw_row_json,
  COALESCE(is_transfer, 0), transfer_account_id,
  COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
FROM _staged_bak;

-- Step 6: Restore transactions data
INSERT INTO transactions
SELECT
  id, source_staged_transaction_id, import_id, bank_account_id,
  transaction_date, description, reference, amount, category_id,
  scope, COALESCE(tax_deductible, 0), notes, allocation_source,
  transfer_pair_id,
  COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
FROM _txn_bak;

-- Step 7: Drop backup tables
DROP TABLE _staged_bak;
DROP TABLE _txn_bak;

-- Step 8: Recreate staged_transactions indexes
CREATE INDEX idx_staged_import ON staged_transactions(import_id);
CREATE INDEX idx_staged_bank_account ON staged_transactions(bank_account_id);
CREATE INDEX idx_staged_date ON staged_transactions(transaction_date);
CREATE INDEX idx_staged_review_status ON staged_transactions(review_status);
CREATE INDEX idx_staged_assigned_category ON staged_transactions(assigned_category_id);
CREATE INDEX idx_staged_suggested_category ON staged_transactions(suggested_category_id);
CREATE INDEX idx_staged_rule ON staged_transactions(matched_rule_id);
CREATE INDEX idx_staged_is_transfer ON staged_transactions(is_transfer);
CREATE INDEX idx_staged_transfer_account ON staged_transactions(transfer_account_id);

-- Step 9: Recreate transactions indexes
CREATE INDEX idx_transactions_staged ON transactions(source_staged_transaction_id);
CREATE INDEX idx_transactions_import ON transactions(import_id);
CREATE INDEX idx_transactions_bank_account ON transactions(bank_account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_scope ON transactions(scope);
CREATE INDEX idx_transactions_tax_deductible ON transactions(tax_deductible);
CREATE INDEX idx_transactions_transfer_pair ON transactions(transfer_pair_id);
