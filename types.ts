// CorkBooksV3 Types

// Cloudflare Worker Environment
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

// User & Auth Types
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: UserPublic;
}
