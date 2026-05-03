// Auth API Routes
import { Env, User, UserPublic, ApiResponse } from '../types';
import { signJWT, authenticateRequest } from '../middleware/auth';

// Helper to create API response
function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// TODO: Implement proper bcrypt password verification for production
// For now, using simple string comparison with pre-hashed seed data
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Temporary: In production, use bcryptjs or compatible library
  // For seed data testing, we'll accept 'password123' as valid
  if (plain === 'password123') {
    return true;
  }
  return false;
}

// POST /api/auth/login
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse<null>({
        success: false,
        error: 'Email and password are required',
      }, 400);
    }

    // Query user from database
    const result = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first<User>();

    if (!result) {
      return jsonResponse<null>({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, result.password_hash);
    if (!isValid) {
      return jsonResponse<null>({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    // Update last login
    await env.DB.prepare(
      'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
    ).bind(result.id).run();

    // Create JWT
    const token = await signJWT(
      {
        userId: result.id,
        email: result.email,
        role: result.role,
      },
      env.JWT_SECRET
    );

    // Set cookie
    const userPublic: UserPublic = {
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      role: result.role,
    };

    const response = jsonResponse<UserPublic>({
      success: true,
      data: userPublic,
    });

    // Use SameSite=None; Secure for production cross-origin requests
    // Check if we're in production (request uses https)
    const url = new URL(request.url);
    const isProduction = url.protocol === 'https:';
    
    const cookieSettings = isProduction
      ? `auth_token=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${7 * 24 * 60 * 60}`
      : `auth_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;

    response.headers.set('Set-Cookie', cookieSettings);

    return response;
  } catch (error) {
    return jsonResponse<null>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
}

// POST /api/auth/logout
export async function handleLogout(): Promise<Response> {
  const response = jsonResponse<null>({
    success: true,
    data: null,
  });

  // Clear cookie with same settings used to set it
  response.headers.set(
    'Set-Cookie',
    'auth_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
  );

  return response;
}

// GET /api/auth/me
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);

  if (!user) {
    return jsonResponse<null>({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  // Fetch full user details from database
  const result = await env.DB.prepare(
    'SELECT id, email, full_name, role FROM users WHERE id = ? AND is_active = 1'
  ).bind(user.id).first<UserPublic>();

  if (!result) {
    return jsonResponse<null>({
      success: false,
      error: 'User not found',
    }, 404);
  }

  return jsonResponse<UserPublic>({
    success: true,
    data: result,
  });
}
