-- Seed data for Phase 2: Common categories and sample bank accounts

-- Common Income Categories
INSERT INTO categories (id, name, category_type, scope, sars_related, is_active, created_at, updated_at) VALUES
  ('cat_1', 'Salary', 'income', 'personal', 0, 1, datetime('now'), datetime('now')),
  ('cat_2', 'Business Income', 'income', 'business', 1, 1, datetime('now'), datetime('now')),
  ('cat_3', 'Investment Income', 'income', 'personal', 1, 1, datetime('now'), datetime('now')),
  ('cat_4', 'Rental Income', 'income', 'business', 1, 1, datetime('now'), datetime('now'));

-- Common Expense Categories
INSERT INTO categories (id, name, category_type, scope, sars_related, is_active, created_at, updated_at) VALUES
  ('cat_5', 'Groceries', 'expense', 'personal', 0, 1, datetime('now'), datetime('now')),
  ('cat_6', 'Utilities', 'expense', 'shared', 0, 1, datetime('now'), datetime('now')),
  ('cat_7', 'Office Supplies', 'expense', 'business', 1, 1, datetime('now'), datetime('now')),
  ('cat_8', 'Internet & Phone', 'expense', 'shared', 1, 1, datetime('now'), datetime('now')),
  ('cat_9', 'Fuel', 'expense', 'shared', 0, 1, datetime('now'), datetime('now')),
  ('cat_10', 'Medical', 'expense', 'personal', 1, 1, datetime('now'), datetime('now')),
  ('cat_11', 'Insurance', 'expense', 'shared', 1, 1, datetime('now'), datetime('now')),
  ('cat_12', 'Home Office', 'expense', 'business', 1, 1, datetime('now'), datetime('now'));

-- Sample Bank Accounts
INSERT INTO bank_accounts (id, name, bank_name, account_number_masked, owner_name, account_type, is_active, created_at, updated_at) VALUES
  ('ba_1', 'Justin Cheque Account', 'Discovery', '****1234', 'Justin', 'Cheque', 1, datetime('now'), datetime('now')),
  ('ba_2', 'Melissa Savings Account', 'FNB', '****5678', 'Melissa', 'Savings', 1, datetime('now'), datetime('now'));
