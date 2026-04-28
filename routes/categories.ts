// Categories API Routes
import { Env, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { requireAuth, requireRole } from '../middleware/rbac';

interface Category {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  scope: 'personal' | 'business' | 'shared';
  sars_related: number;
  is_active: number;
  sort_order: number | null;
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

// GET /api/categories - List all categories (including inactive)
export async function handleListCategories(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT id, name, category_type, scope, sars_related, is_active, sort_order FROM categories ORDER BY category_type, name'
    ).all<Category>();

    return jsonResponse<Category[]>({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to fetch categories',
    }, 500);
  }
}

// GET /api/categories/:id - Get single category
export async function handleGetCategory(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    if (!result) {
      return jsonResponse<null>({
        success: false,
        error: 'Category not found',
      }, 404);
    }

    return jsonResponse<Category>({
      success: true,
      data: result,
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to fetch category',
    }, 500);
  }
}

// POST /api/categories - Create new category
export async function handleCreateCategory(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin', 'editor']);
  if (authError) return authError;

  try {
    const body = await request.json() as Partial<Category>;
    const { name, category_type, scope, sars_related, sort_order } = body;

    // Validation
    if (!name || !category_type || !scope) {
      return jsonResponse<null>({
        success: false,
        error: 'Name, category_type, and scope are required',
      }, 400);
    }

    if (!['income', 'expense'].includes(category_type)) {
      return jsonResponse<null>({
        success: false,
        error: 'Category type must be income or expense',
      }, 400);
    }

    if (!['personal', 'business', 'shared'].includes(scope)) {
      return jsonResponse<null>({
        success: false,
        error: 'Scope must be personal, business, or shared',
      }, 400);
    }

    // Check for duplicate name
    const existing = await env.DB.prepare(
      'SELECT id FROM categories WHERE name = ?'
    ).bind(name).first();

    if (existing) {
      return jsonResponse<null>({
        success: false,
        error: 'A category with this name already exists',
      }, 409);
    }

    const id = generateId('cat');
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO categories (id, name, category_type, scope, sars_related, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).bind(id, name, category_type, scope, sars_related || 0, sort_order || null, now, now).run();

    const created = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    return jsonResponse<Category>({
      success: true,
      data: created!,
    }, 201);
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to create category',
    }, 500);
  }
}

// PATCH /api/categories/:id - Update category
export async function handleUpdateCategory(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin', 'editor']);
  if (authError) return authError;

  try {
    const body = await request.json() as Partial<Category>;
    const { name, category_type, scope, sars_related, is_active, sort_order } = body;

    // Check if category exists
    const existing = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    if (!existing) {
      return jsonResponse<null>({
        success: false,
        error: 'Category not found',
      }, 404);
    }

    // Validate types if provided
    if (category_type && !['income', 'expense'].includes(category_type)) {
      return jsonResponse<null>({
        success: false,
        error: 'Category type must be income or expense',
      }, 400);
    }

    if (scope && !['personal', 'business', 'shared'].includes(scope)) {
      return jsonResponse<null>({
        success: false,
        error: 'Scope must be personal, business, or shared',
      }, 400);
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await env.DB.prepare(
        'SELECT id FROM categories WHERE name = ? AND id != ?'
      ).bind(name, id).first();

      if (duplicate) {
        return jsonResponse<null>({
          success: false,
          error: 'A category with this name already exists',
        }, 409);
      }
    }

    const now = new Date().toISOString();
    
    await env.DB.prepare(
      `UPDATE categories 
       SET name = COALESCE(?, name),
           category_type = COALESCE(?, category_type),
           scope = COALESCE(?, scope),
           sars_related = COALESCE(?, sars_related),
           is_active = COALESCE(?, is_active),
           sort_order = COALESCE(?, sort_order),
           updated_at = ?
       WHERE id = ?`
    ).bind(
      name || null,
      category_type || null,
      scope || null,
      sars_related !== undefined ? sars_related : null,
      is_active !== undefined ? is_active : null,
      sort_order !== undefined ? sort_order : null,
      now,
      id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    return jsonResponse<Category>({
      success: true,
      data: updated!,
    });
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Failed to update category',
    }, 500);
  }
}
