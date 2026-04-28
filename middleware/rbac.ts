// Role-Based Access Control Middleware
import { UserRole, UserPublic, ApiResponse } from '../types';

// Check if user has required role
export function hasRole(user: UserPublic | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Create a 403 Forbidden response
export function forbiddenResponse(): Response {
  const response: ApiResponse = {
    success: false,
    error: 'Forbidden: Insufficient permissions',
  };
  return new Response(JSON.stringify(response), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Create a 401 Unauthorized response
export function unauthorizedResponse(): Response {
  const response: ApiResponse = {
    success: false,
    error: 'Unauthorized: Authentication required',
  };
  return new Response(JSON.stringify(response), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Middleware wrapper to require authentication
export function requireAuth(
  user: UserPublic | null
): Response | null {
  if (!user) {
    return unauthorizedResponse();
  }
  return null;
}

// Middleware wrapper to require specific roles
export function requireRole(
  user: UserPublic | null,
  allowedRoles: UserRole[]
): Response | null {
  if (!user) {
    return unauthorizedResponse();
  }
  if (!hasRole(user, allowedRoles)) {
    return forbiddenResponse();
  }
  return null;
}
