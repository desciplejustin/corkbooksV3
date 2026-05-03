-- Phase 3: Import Engine Tables
-- Creates tables for bank import configs, imports, staged transactions, and allocation rules

-- Table: bank_import_configs
-- Stores import format configuration for each bank account
CREATE TABLE IF NOT EXISTS bank_import_configs (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL,
    format_type TEXT NOT NULL CHECK(format_type IN ('csv', 'pdf', 'ofx', 'qif')),
    parser_config TEXT NOT NULL, -- JSON string with format-specific config
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_bank_import_configs_bank_account ON bank_import_configs(bank_account_id);
CREATE INDEX idx_bank_import_configs_format_type ON bank_import_configs(format_type);
CREATE INDEX idx_bank_import_configs_active ON bank_import_configs(is_active);

-- Table: imports
-- Stores each file import session
CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL,
    import_config_id TEXT NOT NULL,
    uploaded_by_user_id TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_format TEXT NOT NULL CHECK(source_format IN ('csv', 'pdf', 'ofx', 'qif')),
    statement_month TEXT NOT NULL, -- format YYYY-MM
    period_start TEXT,
    period_end TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'finalised')),
    row_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finalised_at TEXT,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (import_config_id) REFERENCES bank_import_configs(id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_imports_bank_account ON imports(bank_account_id);
CREATE INDEX idx_imports_config ON imports(import_config_id);
CREATE INDEX idx_imports_user ON imports(uploaded_by_user_id);
CREATE INDEX idx_imports_month ON imports(statement_month);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_format ON imports(source_format);

-- Table: staged_transactions
-- Stores imported transaction rows that must be reviewed before finalization
CREATE TABLE IF NOT EXISTS staged_transactions (
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
    review_status TEXT NOT NULL DEFAULT 'unallocated' CHECK(review_status IN ('unallocated', 'allocated', 'needs_review')),
    matched_rule_id TEXT,
    raw_row_json TEXT, -- Original CSV row for reference
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_category_id) REFERENCES categories(id),
    FOREIGN KEY (assigned_category_id) REFERENCES categories(id),
    FOREIGN KEY (matched_rule_id) REFERENCES allocation_rules(id)
);

CREATE INDEX idx_staged_import ON staged_transactions(import_id);
CREATE INDEX idx_staged_bank_account ON staged_transactions(bank_account_id);
CREATE INDEX idx_staged_date ON staged_transactions(transaction_date);
CREATE INDEX idx_staged_review_status ON staged_transactions(review_status);
CREATE INDEX idx_staged_assigned_category ON staged_transactions(assigned_category_id);
CREATE INDEX idx_staged_suggested_category ON staged_transactions(suggested_category_id);
CREATE INDEX idx_staged_rule ON staged_transactions(matched_rule_id);

-- Table: allocation_rules
-- Stores simple repeat-allocation rules for auto-suggestions
CREATE TABLE IF NOT EXISTS allocation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK(match_type IN ('contains', 'exact')),
    match_value TEXT NOT NULL,
    bank_account_id TEXT, -- Optional: scope to specific bank account
    category_id TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('personal', 'business', 'shared')),
    tax_deductible INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 100, -- Lower number = higher priority
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_matched_at TEXT,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_rules_bank_account ON allocation_rules(bank_account_id);
CREATE INDEX idx_rules_category ON allocation_rules(category_id);
CREATE INDEX idx_rules_user ON allocation_rules(created_by_user_id);
CREATE INDEX idx_rules_active ON allocation_rules(is_active);
CREATE INDEX idx_rules_priority ON allocation_rules(priority);

-- Table: transactions (final ledger)
-- Stores finalized transactions for reporting
CREATE TABLE IF NOT EXISTS transactions (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_staged_transaction_id) REFERENCES staged_transactions(id),
    FOREIGN KEY (import_id) REFERENCES imports(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_transactions_staged ON transactions(source_staged_transaction_id);
CREATE INDEX idx_transactions_import ON transactions(import_id);
CREATE INDEX idx_transactions_bank_account ON transactions(bank_account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_scope ON transactions(scope);
CREATE INDEX idx_transactions_tax_deductible ON transactions(tax_deductible);
