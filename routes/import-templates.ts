import { Env, ApiResponse, CSVParserConfig, ImportTemplate } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { hasRole } from '../middleware/rbac';
import { nanoid } from 'nanoid';

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function slugifyTemplateKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `template_${Date.now()}`;
}

export async function handleListImportTemplates(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === '1';
    const bankName = url.searchParams.get('bank_name');

    let query = 'SELECT * FROM import_templates WHERE 1=1';
    const params: string[] = [];

    if (!includeInactive) {
      query += ' AND is_active = 1';
    }

    if (bankName) {
      query += ' AND bank_name = ?';
      params.push(bankName);
    }

    query += ' ORDER BY COALESCE(bank_name, \'\'), name, version DESC';

    const result = await env.DB.prepare(query).bind(...params).all<ImportTemplate>();
    return jsonResponse({ success: true, data: result.results || [] });
  } catch (error) {
    console.error('Error listing import templates:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

export async function handleGetImportTemplate(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const template = await env.DB.prepare(
      'SELECT * FROM import_templates WHERE id = ?'
    ).bind(id).first<ImportTemplate>();

    if (!template) {
      return jsonResponse({ success: false, error: 'Import template not found' }, 404);
    }

    return jsonResponse({ success: true, data: template });
  } catch (error) {
    console.error('Error getting import template:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

export async function handleCreateImportTemplate(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const body = await request.json() as {
      name: string;
      template_key?: string;
      bank_name?: string | null;
      format_type: string;
      parser_config: CSVParserConfig | string;
      is_active?: number;
      is_system?: number;
      version?: number;
    };

    const { name, bank_name, format_type, parser_config } = body;
    const templateKey = slugifyTemplateKey(body.template_key || name);

    if (!name || !format_type || !parser_config) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }

    const validFormats = ['csv', 'pdf', 'ofx', 'qif'];
    if (!validFormats.includes(format_type)) {
      return jsonResponse({ success: false, error: 'Invalid format type' }, 400);
    }

    const parserConfigStr = typeof parser_config === 'string'
      ? parser_config
      : JSON.stringify(parser_config);

    try {
      JSON.parse(parserConfigStr);
    } catch {
      return jsonResponse({ success: false, error: 'Invalid parser_config JSON' }, 400);
    }

    const existingKey = await env.DB.prepare(
      'SELECT id FROM import_templates WHERE template_key = ?'
    ).bind(templateKey).first();

    if (existingKey) {
      return jsonResponse({ success: false, error: 'Template key already exists' }, 409);
    }

    const id = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO import_templates (
        id, name, template_key, bank_name, format_type, parser_config,
        is_active, is_system, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      name,
      templateKey,
      bank_name || null,
      format_type,
      parserConfigStr,
      body.is_active ?? 1,
      body.is_system ?? 0,
      body.version ?? 1,
      now,
      now
    ).run();

    const template = await env.DB.prepare(
      'SELECT * FROM import_templates WHERE id = ?'
    ).bind(id).first<ImportTemplate>();

    return jsonResponse({ success: true, data: template }, 201);
  } catch (error) {
    console.error('Error creating import template:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

export async function handleUpdateImportTemplate(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM import_templates WHERE id = ?'
    ).bind(id).first<ImportTemplate>();

    if (!existing) {
      return jsonResponse({ success: false, error: 'Import template not found' }, 404);
    }

    const body = await request.json() as Partial<ImportTemplate>;
    const updates: string[] = [];
    const params: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      params.push(body.name);
    }

    if (body.template_key !== undefined) {
      const nextKey = slugifyTemplateKey(body.template_key);
      const duplicate = await env.DB.prepare(
        'SELECT id FROM import_templates WHERE template_key = ? AND id != ?'
      ).bind(nextKey, id).first();
      if (duplicate) {
        return jsonResponse({ success: false, error: 'Template key already exists' }, 409);
      }
      updates.push('template_key = ?');
      params.push(nextKey);
    }

    if (body.bank_name !== undefined) {
      updates.push('bank_name = ?');
      params.push(body.bank_name || null);
    }

    if (body.format_type !== undefined) {
      const validFormats = ['csv', 'pdf', 'ofx', 'qif'];
      if (!validFormats.includes(body.format_type)) {
        return jsonResponse({ success: false, error: 'Invalid format type' }, 400);
      }
      updates.push('format_type = ?');
      params.push(body.format_type);
    }

    if (body.parser_config !== undefined) {
      try {
        JSON.parse(body.parser_config);
      } catch {
        return jsonResponse({ success: false, error: 'Invalid parser_config JSON' }, 400);
      }
      updates.push('parser_config = ?');
      params.push(body.parser_config);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(body.is_active);
    }

    if (body.is_system !== undefined) {
      updates.push('is_system = ?');
      params.push(body.is_system);
    }

    if (body.version !== undefined) {
      updates.push('version = ?');
      params.push(body.version);
    }

    if (updates.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await env.DB.prepare(`
      UPDATE import_templates
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM import_templates WHERE id = ?'
    ).bind(id).first<ImportTemplate>();

    return jsonResponse({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating import template:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

export async function handleDeleteImportTemplate(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM import_templates WHERE id = ?'
    ).bind(id).first<ImportTemplate>();

    if (!existing) {
      return jsonResponse({ success: false, error: 'Import template not found' }, 404);
    }

    // Check if template is in use by any bank accounts
    const inUse = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM bank_accounts WHERE default_import_template_id = ?'
    ).bind(id).first<{ count: number }>();

    if (inUse && inUse.count > 0) {
      return jsonResponse({ 
        success: false, 
        error: `Cannot delete template. It is currently linked to ${inUse.count} bank account(s).` 
      }, 400);
    }

    // Check if template is in use by any imports
    const importsInUse = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM imports WHERE import_template_id = ?'
    ).bind(id).first<{ count: number }>();

    if (importsInUse && importsInUse.count > 0) {
      return jsonResponse({ 
        success: false, 
        error: `Cannot delete template. It has been used in ${importsInUse.count} import(s).` 
      }, 400);
    }

    await env.DB.prepare('DELETE FROM import_templates WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting import template:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}