-- Migration 0008: Add balance column to staged_transactions and transactions
-- This stores the bank-reported running balance per transaction,
-- enabling bank reconciliation reports (opening/closing balance tie-back).

ALTER TABLE staged_transactions ADD COLUMN balance REAL;
ALTER TABLE transactions ADD COLUMN balance REAL;
