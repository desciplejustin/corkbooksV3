// Bank Accounts API Routes
import { Env, ApiResponse, BankAccount } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { requireAuth, requireRole } from '../middleware/rbac';
import { getBankAccountFilter, validateBankAccountOwnership } from '../middleware/authorization';

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
    // Filter by user ownership (admins see all)
    const { condition, params } = getBankAccountFilter(user!.id, user!.role);
    const result = await env.DB.prepare(
      `SELECT id, name, bank_name, account_number_masked, owner_name, account_type, default_import_template_id, is_active, created_at, updated_at FROM bank_accounts WHERE 1=1 ${condition} ORDER BY name`
    ).bind(...params).all<BankAccount>();

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
    // Check ownership
    const account = await validateBankAccountOwnership(user!.id, user!.role, id, env.DB);
    
    if (!account) {
      return jsonResponse<null>({
        success: false,
        error: 'Bank account not found or access denied',
      }, 404);
    }

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
    const { name, bank_name, account_number_masked, owner_name, account_type, default_import_template_id } = body;

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

    if (default_import_template_id) {
      const template = await env.DB.prepare(
        'SELECT id FROM import_templates WHERE id = ? AND is_active = 1'
      ).bind(default_import_template_id).first();

      if (!template) {
        return jsonResponse<null>({
          success: false,
          error: 'Default import template not found',
        }, 404);
      }
    }

    const id = generateId('bank');
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO bank_accounts (id, name, bank_name, account_number_masked, owner_name, account_type, default_import_template_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
     ).bind(id, name, bank_name, account_number_masked, owner_name, account_type || null, default_import_template_id || null, now, now).run();

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
    // Check ownership before allowing update
    const account = await validateBankAccountOwnership(user!.id, user!.role, id, env.DB);
    if (!account) {
      return jsonResponse<null>({
        success: false,
        error: 'Bank account not found or access denied',
      }, 404);
    }

    const body = await request.json() as Partial<BankAccount>;
    const { name, bank_name, account_number_masked, owner_name, account_type, default_import_template_id, is_active } = body;

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

    if (default_import_template_id !== undefined && default_import_template_id !== null) {
      const template = await env.DB.prepare(
        'SELECT id FROM import_templates WHERE id = ? AND is_active = 1'
      ).bind(default_import_template_id).first();

      if (!template) {
        return jsonResponse<null>({
          success: false,
          error: 'Default import template not found',
        }, 404);
      }
    }

    const now = new Date().toISOString();
    
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (bank_name !== undefined) {
      updates.push('bank_name = ?');
      params.push(bank_name);
    }
    if (account_number_masked !== undefined) {
      updates.push('account_number_masked = ?');
      params.push(account_number_masked);
    }
    if (owner_name !== undefined) {
      updates.push('owner_name = ?');
      params.push(owner_name);
    }
    if (account_type !== undefined) {
      updates.push('account_type = ?');
      params.push(account_type || null);
    }
    if (default_import_template_id !== undefined) {
      updates.push('default_import_template_id = ?');
      params.push(default_import_template_id || null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    await env.DB.prepare(
      `UPDATE bank_accounts SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM bank_accounts WHERE id = ?'
    ).bind(id).first<BankAccount>();

    return jsonResponse<BankAccount>({
      success: true,
      data: updated!,
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return jsonResponse<null>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bank account',
    }, 500);
  }
}
