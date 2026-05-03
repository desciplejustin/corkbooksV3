// Reconciliation API Route
// GET /api/reconciliation?bank_account_id=xxx&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
//
// Returns opening balance, period totals, closing balance, and variance
// so users can tie back to their bank statement for any date range.

import { Env, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';

function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface ReconciliationResult {
  bank_account: {
    id: string;
    name: string;
    bank_name: string;
  };
  period: {
    from: string;
    to: string;
  };
  // Bank-reported balances from stored statement data
  opening_balance: number | null;   // balance of last row strictly before date_from
  closing_balance: number | null;   // balance of last row on or before date_to
  // Book totals for the period (non-transfer transactions)
  total_in: number;
  total_out: number;
  transaction_count: number;
  // Derived
  computed_closing: number | null;  // opening_balance + total_in - total_out
  variance: number | null;          // closing_balance - computed_closing (should be 0)
  balanced: boolean | null;         // true when variance is effectively 0
  has_balance_data: boolean;        // false when no balance column data found (pre-migration imports)
}

export async function handleGetReconciliation(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bank_account_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    if (!bankAccountId) {
      return jsonResponse({ success: false, error: 'bank_account_id is required' }, 400);
    }
    if (!dateFrom || !dateTo) {
      return jsonResponse({ success: false, error: 'date_from and date_to are required' }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return jsonResponse({ success: false, error: 'Dates must be in YYYY-MM-DD format' }, 400);
    }
    if (dateFrom > dateTo) {
      return jsonResponse({ success: false, error: 'date_from must be on or before date_to' }, 400);
    }

    // Verify bank account exists
    const account = await env.DB.prepare(
      'SELECT id, name, bank_name FROM bank_accounts WHERE id = ? AND is_active = 1'
    ).bind(bankAccountId).first<{ id: string; name: string; bank_name: string }>();

    if (!account) {
      return jsonResponse({ success: false, error: 'Bank account not found' }, 404);
    }

    // Opening balance: statement balance on the last transaction BEFORE the period
    // Exclude transfers (they have no meaningful statement balance)
    const openingRow = await env.DB.prepare(`
      SELECT balance
      FROM transactions
      WHERE bank_account_id = ?
        AND transaction_date < ?
        AND balance IS NOT NULL
        AND category_id != '__transfer__'
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 1
    `).bind(bankAccountId, dateFrom).first<{ balance: number }>();

    const opening_balance = openingRow?.balance ?? null;

    // Closing balance: statement balance on the last transaction ON OR BEFORE date_to
    const closingRow = await env.DB.prepare(`
      SELECT balance
      FROM transactions
      WHERE bank_account_id = ?
        AND transaction_date <= ?
        AND balance IS NOT NULL
        AND category_id != '__transfer__'
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 1
    `).bind(bankAccountId, dateTo).first<{ balance: number }>();

    const closing_balance = closingRow?.balance ?? null;

    // Period totals — all non-transfer transactions in the date range
    const totalsRow = await env.DB.prepare(`
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_out
      FROM transactions
      WHERE bank_account_id = ?
        AND transaction_date >= ?
        AND transaction_date <= ?
        AND category_id != '__transfer__'
    `).bind(bankAccountId, dateFrom, dateTo).first<{
      transaction_count: number;
      total_in: number;
      total_out: number;
    }>();

    const total_in = totalsRow?.total_in ?? 0;
    const total_out = totalsRow?.total_out ?? 0;
    const transaction_count = totalsRow?.transaction_count ?? 0;

    // Check whether any balance data exists at all for this account
    const hasBalanceRow = await env.DB.prepare(`
      SELECT 1 FROM transactions
      WHERE bank_account_id = ? AND balance IS NOT NULL
      LIMIT 1
    `).bind(bankAccountId).first();

    const has_balance_data = hasBalanceRow !== null;

    // Derived values
    const computed_closing =
      opening_balance !== null ? opening_balance + total_in - total_out : null;

    const variance =
      closing_balance !== null && computed_closing !== null
        ? Math.round((closing_balance - computed_closing) * 100) / 100
        : null;

    const balanced = variance !== null ? Math.abs(variance) < 0.01 : null;

    const result: ReconciliationResult = {
      bank_account: account,
      period: { from: dateFrom, to: dateTo },
      opening_balance,
      closing_balance,
      total_in,
      total_out,
      transaction_count,
      computed_closing,
      variance,
      balanced,
      has_balance_data,
    };

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
}
