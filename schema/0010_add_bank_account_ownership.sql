-- Schema Migration: Add User Ownership to Bank Accounts
-- This establishes object-level authorization through bank account ownership
-- All imports and transactions are tied to bank accounts, so securing bank accounts
-- secures the entire financial data hierarchy.

-- Add user_id column to bank_accounts
ALTER TABLE bank_accounts ADD COLUMN user_id TEXT;

-- For existing accounts, assign to the first admin user
-- In production, manually update these after migration
UPDATE bank_accounts 
SET user_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id required going forward (cannot use NOT NULL constraint after data exists in SQLite)
-- Application will enforce this on new accounts

-- Add index for efficient ownership queries
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);

-- Note: This creates a single-owner model. For shared accounts, consider:
-- Option 1: Create a separate bank_account_users junction table
-- Option 2: Add an organization/household concept
-- Option 3: Use role-based access (admin sees all)
