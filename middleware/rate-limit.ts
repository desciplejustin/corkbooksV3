// Rate Limiting Middleware
// Tracks and throttles requests by IP address or identifier

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxAttempts: number;   // Maximum attempts within window
  blockDurationMs: number; // How long to block after exceeding limit
}

export interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting (use KV or Durable Objects in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request should be rate limited
 * Returns null if allowed, error response if blocked
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remainingAttempts?: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  // Currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Window expired, reset
  if (now - entry.firstAttempt > config.windowMs) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  // Within window, check attempt count
  if (entry.attempts >= config.maxAttempts) {
    // Block the identifier
    const blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(identifier, {
      ...entry,
      blockedUntil,
    });
    const retryAfter = Math.ceil(config.blockDurationMs / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment attempts
  rateLimitStore.set(identifier, {
    ...entry,
    attempts: entry.attempts + 1,
  });

  return { 
    allowed: true, 
    remainingAttempts: config.maxAttempts - entry.attempts - 1 
  };
}

/**
 * Clear rate limit entry (e.g., after successful login)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get client identifier from request (IP address + optional user-agent)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from CF headers
  const cfConnectingIp = request.headers.get('CF-Connecting-IP');
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  const xRealIp = request.headers.get('X-Real-IP');
  
  const ip = cfConnectingIp || 
             (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) || 
             xRealIp || 
             'unknown';

  // Optional: Include user agent for better fingerprinting
  // const userAgent = request.headers.get('User-Agent') || '';
  // return `${ip}:${userAgent}`;
  
  return ip;
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 24 hours
    if (now - entry.firstAttempt > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
