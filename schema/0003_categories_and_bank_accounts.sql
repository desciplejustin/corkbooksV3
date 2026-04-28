-- Phase 2: Categories and Bank Accounts Tables

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category_type TEXT NOT NULL CHECK(category_type IN ('income', 'expense')),
  scope TEXT NOT NULL CHECK(scope IN ('personal', 'business', 'shared')),
  sars_related INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_type ON categories(category_type);
CREATE INDEX idx_categories_scope ON categories(scope);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Bank Accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  account_type TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_bank_accounts_bank_name ON bank_accounts(bank_name);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);
