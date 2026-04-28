// Bank Accounts API Routes
import { Env, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { requireAuth, requireRole } from '../middleware/rbac';

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number_masked: string;
  owner_name: string;
  account_type: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/bank-accounts - List all bank accounts (including inactive)
export async function handleListBankAccounts(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT id, name, bank_name, account_number_masked, owner_name, account_type, is_active FROM bank_accounts ORDER BY name'
    ).all<BankAccount>();

    return jsonResponse<BankAccount[]>({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to fetch bank accounts',
    }, 500);
  }
}

// GET /api/bank-accounts/:id - Get single bank account
export async function handleGetBankAccount(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT * FROM bank_accounts WHERE id = ?'
    ).bind(id).first<BankAccount>();

    if (!result) {
      return jsonResponse<null>({
        success: false,
        error: 'Bank account not found',
      }, 404);
    }

    return jsonResponse<BankAccount>({
      success: true,
      data: result,
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to fetch bank account',
    }, 500);
  }
}

// POST /api/bank-accounts - Create new bank account
export async function handleCreateBankAccount(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin', 'editor']);
  if (authError) return authError;

  try {
    const body = await request.json() as Partial<BankAccount>;
    const { name, bank_name, account_number_masked, owner_name, account_type } = body;

    // Validation
    if (!name || !bank_name || !account_number_masked || !owner_name) {
      return jsonResponse<null>({
        success: false,
        error: 'Name, bank_name, account_number_masked, and owner_name are required',
      }, 400);
    }

    // Check for duplicate name
    const existing = await env.DB.prepare(
      'SELECT id FROM bank_accounts WHERE name = ?'
    ).bind(name).first();

    if (existing) {
      return jsonResponse<null>({
        success: false,
        error: 'A bank account with this name already exists',
      }, 409);
    }

    const id = generateId('bank');
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO bank_accounts (id, name, bank_name, account_number_masked, owner_name, account_type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).bind(id, name, bank_name, account_number_masked, owner_name, account_type || null, now, now).run();

    const created = await env.DB.prepare(
      'SELECT * FROM bank_accounts WHERE id = ?'
    ).bind(id).first<BankAccount>();

    return jsonResponse<BankAccount>({
      success: true,
      data: created!,
    }, 201);
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to create bank account',
    }, 500);
  }
}

// PATCH /api/bank-accounts/:id - Update bank account
export async function handleUpdateBankAccount(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin', 'editor']);
  if (authError) return authError;

  try {
    const body = await request.json() as Partial<BankAccount>;
    const { name, bank_name, account_number_masked, owner_name, account_type, is_active } = body;

    // Check if bank account exists
    const existing = await env.DB.prepare(
      'SELECT * FROM bank_accounts WHERE id = ?'
    ).bind(id).first<BankAccount>();

    if (!existing) {
      return jsonResponse<null>({
        success: false,
        error: 'Bank account not found',
      }, 404);
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await env.DB.prepare(
        'SELECT id FROM bank_accounts WHERE name = ? AND id != ?'
      ).bind(name, id).first();

      if (duplicate) {
        return jsonResponse<null>({
          success: false,
          error: 'A bank account with this name already exists',
        }, 409);
      }
    }

    const now = new Date().toISOString();
    
    await env.DB.prepare(
      `UPDATE bank_accounts 
       SET name = COALESCE(?, name),
           bank_name = COALESCE(?, bank_name),
           account_number_masked = COALESCE(?, account_number_masked),
           owner_name = COALESCE(?, owner_name),
           account_type = COALESCE(?, account_type),
           is_active = COALESCE(?, is_active),
           updated_at = ?
       WHERE id = ?`
    ).bind(
      name || null,
      bank_name || null,
      account_number_masked || null,
      owner_name || null,
      account_type !== undefined ? account_type : null,
      is_active !== undefined ? is_active : null,
      now,
      id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM bank_accounts WHERE id = ?'
    ).bind(id).first<BankAccount>();

    return jsonResponse<BankAccount>({
      success: true,
      data: updated!,
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to update bank account',
    }, 500);
  }
}
