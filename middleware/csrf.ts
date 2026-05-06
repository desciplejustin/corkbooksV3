// CSRF Protection Middleware
// Validates Origin and Referer headers for state-changing requests

import { ApiResponse } from '../types';

/**
 * Validates the Origin or Referer header for state-changing requests
 * to prevent Cross-Site Request Forgery attacks.
 */
export function validateRequestOrigin(request: Request, allowedOrigins: string[]): boolean {
  const method = request.method;
  
  // Only validate state-changing methods
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  // Check Origin header (modern browsers)
  const origin = request.headers.get('Origin');
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Fallback to Referer header
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (allowedOrigins.includes(refererOrigin)) {
        return true;
      }
    } catch {
      // Invalid referer URL
      return false;
    }
  }

  return false;
}

/**
 * Creates a CSRF error response
 */
export function csrfErrorResponse(): Response {
  const response: ApiResponse = {
    success: false,
    error: 'Invalid request origin - possible CSRF attack',
  };
  return new Response(JSON.stringify(response), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
