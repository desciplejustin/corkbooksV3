-- Phase 6: Transfer support
-- Adds transfer linking between transactions across accounts

-- Allow staged_transactions to flag a row as a transfer to/from another account
ALTER TABLE staged_transactions ADD COLUMN is_transfer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staged_transactions ADD COLUMN transfer_account_id TEXT REFERENCES bank_accounts(id);

-- Update review_status check to include 'transfer'
-- SQLite does not support ALTER COLUMN, so we patch via trigger/application logic.
-- The check constraint is not enforced retroactively on existing rows.
-- New values allowed: 'unallocated' | 'allocated' | 'needs_review' | 'duplicate' | 'transfer'

-- Add transfer_pair_id to transactions to link both sides of a transfer
ALTER TABLE transactions ADD COLUMN transfer_pair_id TEXT;
-- Insert a system sentinel category for transfer rows (no real category needed)
-- category_id is NOT NULL, so we use this reserved id instead of NULL.
INSERT OR IGNORE INTO categories (id, name, category_type, scope, sars_related, is_active, sort_order, created_at, updated_at)
VALUES ('__transfer__', 'Transfer', 'income', 'personal', 0, 0, NULL, datetime('now'), datetime('now'));

CREATE INDEX idx_transactions_transfer_pair ON transactions(transfer_pair_id);
CREATE INDEX idx_staged_is_transfer ON staged_transactions(is_transfer);
CREATE INDEX idx_staged_transfer_account ON staged_transactions(transfer_account_id);
