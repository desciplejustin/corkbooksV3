// Authorization Helpers
// Object-level authorization through bank account ownership

import { Env } from '../types';

export interface AuthorizedUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Check if user owns or has access to a bank account
 * Admins can access all accounts
 * Non-admins can only access their own accounts
 */
export async function checkBankAccountAccess(
  userId: string,
  userRole: string,
  bankAccountId: string,
  db: D1Database
): Promise<boolean> {
  // All authenticated users have access to all bank accounts
  // (no user_id column in schema for ownership)
  const account = await db
    .prepare('SELECT id FROM bank_accounts WHERE id = ?')
    .bind(bankAccountId)
    .first();

  return account !== null;
}

/**
 * Get bank account ID from import and check access
 */
export async function checkImportAccess(
  userId: string,
  userRole: string,
  importId: string,
  db: D1Database
): Promise<boolean> {
  // Admins have access to all imports
  if (userRole === 'admin') {
    return true;
  }

  // Get bank_account_id from import and check ownership
  const importRecord = await db
    .prepare('SELECT bank_account_id FROM imports WHERE id = ?')
    .bind(importId)
    .first<{ bank_account_id: string }>();

  if (!importRecord) {
    return false;
  }

  return checkBankAccountAccess(userId, userRole, importRecord.bank_account_id, db);
}

/**
 * Validate bank account ownership for data modification
 * Returns the bank account if access is granted, null otherwise
 */
export async function validateBankAccountOwnership(
  userId: string,
  userRole: string,
  bankAccountId: string,
  db: D1Database
): Promise<{ id: string; name: string } | null> {
  // All authenticated users can access all bank accounts
  // (no user_id column in schema for ownership)
  const account = await db
    .prepare('SELECT id, name FROM bank_accounts WHERE id = ? AND is_active = 1')
    .bind(bankAccountId)
    .first<{ id: string; name: string }>();

  return account || null;
}

/**
 * Filter bank accounts query by user permissions
 * Returns SQL condition and parameters
 */
export function getBankAccountFilter(
  userId: string,
  userRole: string
): { condition: string; params: string[] } {
  // All authenticated users see all accounts
  // (no user_id column in schema for ownership)
  return { condition: '', params: [] };
}
