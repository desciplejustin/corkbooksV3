// Import Configuration API Routes
import { Env, BankImportConfig, ApiResponse, CSVParserConfig } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { hasRole } from '../middleware/rbac';
import { nanoid } from 'nanoid';

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/import-configs?bank_account_id=xxx
export async function handleListImportConfigs(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bank_account_id');

    let query = 'SELECT * FROM bank_import_configs WHERE 1=1';
    const params: string[] = [];

    if (bankAccountId) {
      query += ' AND bank_account_id = ?';
      params.push(bankAccountId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await env.DB.prepare(query).bind(...params).all<BankImportConfig>();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Error listing import configs:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// GET /api/import-configs/:id
export async function handleGetImportConfig(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const config = await env.DB.prepare(
      'SELECT * FROM bank_import_configs WHERE id = ?'
    ).bind(id).first<BankImportConfig>();

    if (!config) {
      return jsonResponse({ success: false, error: 'Import config not found' }, 404);
    }

    return jsonResponse({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting import config:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// POST /api/import-configs
export async function handleCreateImportConfig(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const body = await request.json() as {
      bank_account_id: string;
      format_type: string;
      parser_config: CSVParserConfig | string;
    };

    const { bank_account_id, format_type, parser_config } = body;

    if (!bank_account_id || !format_type || !parser_config) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }

    // Validate format type
    const validFormats = ['csv', 'pdf', 'ofx', 'qif'];
    if (!validFormats.includes(format_type)) {
      return jsonResponse({ success: false, error: 'Invalid format type' }, 400);
    }

    // Verify bank account exists
    const bankAccount = await env.DB.prepare(
      'SELECT id FROM bank_accounts WHERE id = ?'
    ).bind(bank_account_id).first();

    if (!bankAccount) {
      return jsonResponse({ success: false, error: 'Bank account not found' }, 404);
    }

    // Convert parser_config to JSON string if it's an object
    const parserConfigStr = typeof parser_config === 'string' 
      ? parser_config 
      : JSON.stringify(parser_config);

    // Validate JSON
    try {
      JSON.parse(parserConfigStr);
    } catch {
      return jsonResponse({ success: false, error: 'Invalid parser_config JSON' }, 400);
    }

    // Deactivate existing configs for this bank account
    await env.DB.prepare(
      'UPDATE bank_import_configs SET is_active = 0 WHERE bank_account_id = ?'
    ).bind(bank_account_id).run();

    const id = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO bank_import_configs (
        id, bank_account_id, format_type, parser_config,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(
      id,
      bank_account_id,
      format_type,
      parserConfigStr,
      now,
      now
    ).run();

    const config = await env.DB.prepare(
      'SELECT * FROM bank_import_configs WHERE id = ?'
    ).bind(id).first<BankImportConfig>();

    return jsonResponse({
      success: true,
      data: config,
    }, 201);
  } catch (error) {
    console.error('Error creating import config:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// PATCH /api/import-configs/:id
export async function handleUpdateImportConfig(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM bank_import_configs WHERE id = ?'
    ).bind(id).first<BankImportConfig>();

    if (!existing) {
      return jsonResponse({ success: false, error: 'Import config not found' }, 404);
    }

    const body = await request.json() as Partial<{
      format_type: string;
      parser_config: CSVParserConfig | string;
      is_active: number;
    }>;

    const updates: string[] = [];
    const params: any[] = [];

    if (body.format_type !== undefined) {
      const validFormats = ['csv', 'pdf', 'ofx', 'qif'];
      if (!validFormats.includes(body.format_type)) {
        return jsonResponse({ success: false, error: 'Invalid format type' }, 400);
      }
      updates.push('format_type = ?');
      params.push(body.format_type);
    }

    if (body.parser_config !== undefined) {
      const parserConfigStr = typeof body.parser_config === 'string'
        ? body.parser_config
        : JSON.stringify(body.parser_config);
      
      try {
        JSON.parse(parserConfigStr);
      } catch {
        return jsonResponse({ success: false, error: 'Invalid parser_config JSON' }, 400);
      }

      updates.push('parser_config = ?');
      params.push(parserConfigStr);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(body.is_active);
    }

    if (updates.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await env.DB.prepare(`
      UPDATE bank_import_configs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM bank_import_configs WHERE id = ?'
    ).bind(id).first<BankImportConfig>();

    return jsonResponse({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating import config:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}
