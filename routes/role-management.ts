// Role Management API (Admin only)
// Manages default permissions for roles (admin, editor, viewer)

import { Env, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

// Available menu items for permission configuration
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈', description: 'Main dashboard and overview' },
  { id: 'imports', label: 'Imports', icon: '↑', description: 'Bank statement imports' },
  { id: 'transactions', label: 'Transactions', icon: '≡', description: 'View and manage transactions' },
  { id: 'categories', label: 'Categories', icon: '⊞', description: 'Income and expense categories' },
  { id: 'bank-accounts', label: 'Bank Accounts', icon: '🏦', description: 'Manage bank accounts' },
  { id: 'import-templates', label: 'Import Templates', icon: '📋', description: 'Statement parsing templates' },
  { id: 'reports', label: 'Reports', icon: '📊', description: 'Reconciliation and reports' },
  { id: 'users', label: 'Users', icon: '👥', description: 'User management (admin only)' },
  { id: 'role-management', label: 'Role Management', icon: '🔐', description: 'Configure role permissions (admin only)' },
];

// GET /api/role-management/menu-items
// Returns list of available menu items for permission configuration
export async function handleGetMenuItems(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  const response: ApiResponse<typeof MENU_ITEMS> = {
    success: true,
    data: MENU_ITEMS,
  };

  return Response.json(response);
}

// GET /api/role-management/roles
// Returns all roles with their default permissions
export async function handleListRoles(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT role, permissions, updated_at FROM role_permissions ORDER BY role'
    ).all();

    const roles = result.results.map((row: any) => ({
      role: row.role,
      permissions: JSON.parse(row.permissions),
      updated_at: row.updated_at,
    }));

    const response: ApiResponse<typeof roles> = {
      success: true,
      data: roles,
    };

    return Response.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles',
    };
    return Response.json(response, { status: 500 });
  }
}

// GET /api/role-management/roles/:role
// Returns specific role's permissions
export async function handleGetRole(
  role: string,
  request: Request,
  env: Env
): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  // Validate role
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid role. Must be admin, editor, or viewer',
    };
    return Response.json(response, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      'SELECT role, permissions, updated_at FROM role_permissions WHERE role = ?'
    ).bind(role).first();

    if (!result) {
      const response: ApiResponse = {
        success: false,
        error: 'Role not found',
      };
      return Response.json(response, { status: 404 });
    }

    const roleData = {
      role: result.role,
      permissions: JSON.parse(result.permissions as string),
      updated_at: result.updated_at,
    };

    const response: ApiResponse<typeof roleData> = {
      success: true,
      data: roleData,
    };

    return Response.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role',
    };
    return Response.json(response, { status: 500 });
  }
}

// PATCH /api/role-management/roles/:role
// Updates role's default permissions
export async function handleUpdateRole(
  role: string,
  request: Request,
  env: Env
): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  // Validate role
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid role. Must be admin, editor, or viewer',
    };
    return Response.json(response, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON body',
    };
    return Response.json(response, { status: 400 });
  }

  // Validate permissions object
  if (!body.permissions || typeof body.permissions !== 'object') {
    const response: ApiResponse = {
      success: false,
      error: 'Missing or invalid permissions object',
    };
    return Response.json(response, { status: 400 });
  }

  // Validate all permission keys are valid menu items
  const validMenuIds = MENU_ITEMS.map(item => item.id);
  const providedKeys = Object.keys(body.permissions);
  const invalidKeys = providedKeys.filter(key => !validMenuIds.includes(key));
  
  if (invalidKeys.length > 0) {
    const response: ApiResponse = {
      success: false,
      error: `Invalid permission keys: ${invalidKeys.join(', ')}`,
    };
    return Response.json(response, { status: 400 });
  }

  // Ensure all permission values are boolean
  const invalidValues = providedKeys.filter(key => typeof body.permissions[key] !== 'boolean');
  if (invalidValues.length > 0) {
    const response: ApiResponse = {
      success: false,
      error: `Permission values must be boolean for keys: ${invalidValues.join(', ')}`,
    };
    return Response.json(response, { status: 400 });
  }

  try {
    await env.DB.prepare(
      'UPDATE role_permissions SET permissions = ?, updated_at = datetime("now") WHERE role = ?'
    ).bind(JSON.stringify(body.permissions), role).run();

    // Fetch updated role
    const result = await env.DB.prepare(
      'SELECT role, permissions, updated_at FROM role_permissions WHERE role = ?'
    ).bind(role).first();

    const roleData = {
      role: result!.role,
      permissions: JSON.parse(result!.permissions as string),
      updated_at: result!.updated_at,
    };

    const response: ApiResponse<typeof roleData> = {
      success: true,
      data: roleData,
    };

    return Response.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role permissions',
    };
    return Response.json(response, { status: 500 });
  }
}
