// Transactions API Routes
import { Env, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface TransactionRow {
  id: string;
  import_id: string;
  bank_account_id: string;
  bank_account_name: string;
  bank_name: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  amount: number;
  category_id: string;
  category_name: string | null;
  category_type: string | null;
  scope: string;
  tax_deductible: number;
  notes: string | null;
  allocation_source: string;
  transfer_pair_id: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/transactions
export async function handleListTransactions(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bank_account_id');
    const categoryId = url.searchParams.get('category_id');
    const month = url.searchParams.get('month'); // YYYY-MM
    const scope = url.searchParams.get('scope');
    const search = url.searchParams.get('search');
    const includeTransfers = url.searchParams.get('include_transfers') === 'true'; // default false
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (bankAccountId) {
      conditions.push('t.bank_account_id = ?');
      params.push(bankAccountId);
    }
    if (categoryId) {
      conditions.push('t.category_id = ?');
      params.push(categoryId);
    }
    if (month) {
      conditions.push("strftime('%Y-%m', t.transaction_date) = ?");
      params.push(month);
    }
    if (scope) {
      conditions.push('t.scope = ?');
      params.push(scope);
    }
    if (search) {
      conditions.push('(t.description LIKE ? OR t.reference LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (!includeTransfers) {
      conditions.push("t.category_id != '__transfer__'");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await env.DB.prepare(`
      SELECT
        t.*,
        ba.name AS bank_account_name,
        ba.bank_name,
        c.name AS category_name,
        c.category_type
      FROM transactions t
      LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
      LEFT JOIN categories c ON t.category_id = c.id
      ${where}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all<TransactionRow>();

    const summary = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS total_in,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS total_out
      FROM transactions t
      ${where}
    `).bind(...params).first<{ total: number; total_in: number | null; total_out: number | null }>();

    return jsonResponse({
      success: true,
      data: {
        transactions: rows.results || [],
        total: summary?.total ?? 0,
        total_in: summary?.total_in ?? 0,
        total_out: summary?.total_out ?? 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}
