// User Management API Routes (Admin only)
import { Env, User, UserPublic, ApiResponse } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Hash password using PBKDF2
async function hashPassword(password: string, iterations: number = 100000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `$pbkdf2$${iterations}$${saltHex}$${hashHex}`;
}

// GET /api/users - List all users (admin only)
export async function handleListUsers(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    let query = 'SELECT id, email, full_name, role, is_active, last_login_at, created_at, updated_at FROM users';
    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC';

    const result = await env.DB.prepare(query).all<UserPublic & { is_active: number; last_login_at: string | null; created_at: string; updated_at: string }>();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch users',
    }, 500);
  }
}

// GET /api/users/:id - Get single user (admin only)
export async function handleGetUser(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(
      'SELECT id, email, full_name, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?'
    ).bind(id).first<UserPublic & { is_active: number; last_login_at: string | null; created_at: string; updated_at: string }>();

    if (!result) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    return jsonResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch user',
    }, 500);
  }
}

// POST /api/users - Create new user (admin only)
export async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const body = await request.json() as {
      email: string;
      password: string;
      full_name: string;
      role: string;
    };

    const { email, password, full_name, role } = body;

    // Validation
    if (!email || !password || !full_name || !role) {
      return jsonResponse({
        success: false,
        error: 'Email, password, full_name, and role are required',
      }, 400);
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return jsonResponse({
        success: false,
        error: 'Invalid role. Must be one of: admin, editor, viewer',
      }, 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return jsonResponse({
        success: false,
        error: 'Password must be at least 8 characters',
      }, 400);
    }

    // Check for duplicate email
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return jsonResponse({
        success: false,
        error: 'A user with this email already exists',
      }, 409);
    }

    // Hash password
    const password_hash = await hashPassword(password);

    const id = generateId('user');
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).bind(id, email, password_hash, full_name, role, now, now).run();

    const created = await env.DB.prepare(
      'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = ?'
    ).bind(id).first<UserPublic & { is_active: number; created_at: string; updated_at: string }>();

    return jsonResponse({
      success: true,
      data: created!,
    }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to create user',
    }, 500);
  }
}

// PATCH /api/users/:id - Update user (admin only)
export async function handleUpdateUser(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: string;
      is_active?: number;
    };

    const { email, password, full_name, role, is_active } = body;

    // Check if user exists
    const existing = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first<User>();

    if (!existing) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        return jsonResponse({
          success: false,
          error: 'Invalid role. Must be one of: admin, editor, viewer',
        }, 400);
      }
    }

    // Check for duplicate email if changing email
    if (email && email !== existing.email) {
      const duplicate = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
      ).bind(email, id).first();

      if (duplicate) {
        return jsonResponse({
          success: false,
          error: 'A user with this email already exists',
        }, 409);
      }
    }

    // Hash new password if provided
    let password_hash = existing.password_hash;
    if (password) {
      if (password.length < 8) {
        return jsonResponse({
          success: false,
          error: 'Password must be at least 8 characters',
        }, 400);
      }
      password_hash = await hashPassword(password);
    }

    const now = new Date().toISOString();
    
    await env.DB.prepare(
      `UPDATE users 
       SET email = COALESCE(?, email),
           password_hash = ?,
           full_name = COALESCE(?, full_name),
           role = COALESCE(?, role),
           is_active = COALESCE(?, is_active),
           updated_at = ?
       WHERE id = ?`
    ).bind(email || null, password_hash, full_name || null, role || null, is_active ?? null, now, id).run();

    const updated = await env.DB.prepare(
      'SELECT id, email, full_name, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?'
    ).bind(id).first<UserPublic & { is_active: number; last_login_at: string | null; created_at: string; updated_at: string }>();

    return jsonResponse({
      success: true,
      data: updated!,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to update user',
    }, 500);
  }
}

// GET /api/users/:id/permissions - Get user's effective permissions (admin only)
export async function handleGetUserPermissions(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    // Get user's role
    const userRecord = await env.DB.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(id).first<{ role: string }>();

    if (!userRecord) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Get role's default permissions
    const rolePerms = await env.DB.prepare(
      'SELECT permissions FROM role_permissions WHERE role = ?'
    ).bind(userRecord.role).first<{ permissions: string }>();

    const defaultPermissions = rolePerms ? JSON.parse(rolePerms.permissions) : {};

    // Get user's custom permissions
    const userPerms = await env.DB.prepare(
      'SELECT permissions FROM user_permissions WHERE user_id = ?'
    ).bind(id).first<{ permissions: string }>();

    const customPermissions = userPerms ? JSON.parse(userPerms.permissions) : null;

    // Effective permissions = custom overrides || role defaults
    const effectivePermissions = customPermissions || defaultPermissions;

    return jsonResponse({
      success: true,
      data: {
        user_id: id,
        role: userRecord.role,
        default_permissions: defaultPermissions,
        custom_permissions: customPermissions,
        effective_permissions: effectivePermissions,
        has_custom_permissions: !!customPermissions,
      },
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch user permissions',
    }, 500);
  }
}

// PATCH /api/users/:id/permissions - Set custom permissions for user (admin only)
export async function handleUpdateUserPermissions(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    const body = await request.json() as { permissions: Record<string, boolean> };

    if (!body.permissions || typeof body.permissions !== 'object') {
      return jsonResponse({
        success: false,
        error: 'Missing or invalid permissions object',
      }, 400);
    }

    // Check if user exists
    const userRecord = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(id).first();

    if (!userRecord) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Validate all permission values are boolean
    const invalidValues = Object.keys(body.permissions).filter(
      key => typeof body.permissions[key] !== 'boolean'
    );
    if (invalidValues.length > 0) {
      return jsonResponse({
        success: false,
        error: `Permission values must be boolean for keys: ${invalidValues.join(', ')}`,
      }, 400);
    }

    const permissionsJson = JSON.stringify(body.permissions);
    const now = new Date().toISOString();

    // Check if user already has custom permissions
    const existing = await env.DB.prepare(
      'SELECT user_id FROM user_permissions WHERE user_id = ?'
    ).bind(id).first();

    if (existing) {
      // Update existing
      await env.DB.prepare(
        'UPDATE user_permissions SET permissions = ?, updated_at = ? WHERE user_id = ?'
      ).bind(permissionsJson, now, id).run();
    } else {
      // Insert new
      await env.DB.prepare(
        'INSERT INTO user_permissions (user_id, permissions, updated_at) VALUES (?, ?, ?)'
      ).bind(id, permissionsJson, now).run();
    }

    // Fetch updated permissions
    const result = await env.DB.prepare(
      'SELECT permissions, updated_at FROM user_permissions WHERE user_id = ?'
    ).bind(id).first<{ permissions: string; updated_at: string }>();

    return jsonResponse({
      success: true,
      data: {
        user_id: id,
        permissions: JSON.parse(result!.permissions),
        updated_at: result!.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to update user permissions',
    }, 500);
  }
}

// DELETE /api/users/:id/permissions - Remove custom permissions (revert to role defaults) (admin only)
export async function handleDeleteUserPermissions(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    // Check if user exists
    const userRecord = await env.DB.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(id).first<{ role: string }>();

    if (!userRecord) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Delete custom permissions
    await env.DB.prepare(
      'DELETE FROM user_permissions WHERE user_id = ?'
    ).bind(id).run();

    // Get role's default permissions
    const rolePerms = await env.DB.prepare(
      'SELECT permissions FROM role_permissions WHERE role = ?'
    ).bind(userRecord.role).first<{ permissions: string }>();

    const defaultPermissions = rolePerms ? JSON.parse(rolePerms.permissions) : {};

    return jsonResponse({
      success: true,
      data: {
        user_id: id,
        reverted_to_role: userRecord.role,
        effective_permissions: defaultPermissions,
      },
    });
  } catch (error) {
    console.error('Error deleting user permissions:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to delete user permissions',
    }, 500);
  }
}

// DELETE /api/users/:id - Soft delete user (admin only)
export async function handleDeleteUser(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  const authError = requireRole(user, ['admin']);
  if (authError) return authError;

  try {
    // Check if user exists
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return jsonResponse({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Prevent deleting yourself
    if (user!.id === id) {
      return jsonResponse({
        success: false,
        error: 'Cannot delete your own account',
      }, 400);
    }

    // Soft delete (set is_active = 0)
    const now = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?'
    ).bind(now, id).run();

    return jsonResponse({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to delete user',
    }, 500);
  }
}
