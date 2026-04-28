// Frontend Auth Utilities

import { UserPublic } from '../api';

// Check if user is authenticated (has user data)
export function isAuthenticated(user: UserPublic | null): boolean {
  return user !== null;
}

// Check if user has specific role
export function hasRole(user: UserPublic | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Check if user is admin
export function isAdmin(user: UserPublic | null): boolean {
  return hasRole(user, ['admin']);
}

// Check if user can edit (admin or editor)
export function canEdit(user: UserPublic | null): boolean {
  return hasRole(user, ['admin', 'editor']);
}
