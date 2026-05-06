// Auth API Routes
import { Env, User, UserPublic, ApiResponse } from '../types';
import { signJWT, authenticateRequest } from '../middleware/auth';
import { checkRateLimit, clearRateLimit, getClientIdentifier } from '../middleware/rate-limit';

// Helper to create API response
function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Password verification using Web Crypto API (PBKDF2)
// Hash format: $pbkdf2$iterations$salt$hash
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    // Parse the stored hash format: $pbkdf2$iterations$salt$hash
    const parts = hash.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
      // Fallback for old bcrypt-style hashes (will fail, forcing password reset)
      return false;
    }

    const iterations = parseInt(parts[2], 10);
    const saltHex = parts[3];
    const storedHash = parts[4];

    // Convert hex salt to Uint8Array (without Node.js Buffer)
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Hash the provided password with the same salt
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(plain),
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

    const derivedHash = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return derivedHash === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// POST /api/auth/login
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      maxAttempts: 5,
      blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
    });

    if (!rateLimit.allowed) {
      return jsonResponse<null>({
        success: false,
        error: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
      }, 429);
    }

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
      // Failed login - rate limit remains active
      return jsonResponse<null>({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    // Successful login - clear rate limit for this IP
    clearRateLimit(clientId);

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
