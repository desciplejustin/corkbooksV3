-- Add granular RBAC permission system
-- This allows role-level defaults and user-level overrides

-- Role permissions table (default permissions for each role)
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,  -- 'admin', 'editor', 'viewer'
  permissions TEXT NOT NULL,  -- JSON: { "dashboard": true, "users": false, ... }
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id TEXT PRIMARY KEY,
  permissions TEXT NOT NULL,  -- JSON: { "dashboard": true, "users": false, ... }
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default role permissions
-- Admin: full access to everything
INSERT INTO role_permissions (role, permissions) VALUES (
  'admin',
  '{"dashboard":true,"imports":true,"transactions":true,"categories":true,"bank-accounts":true,"import-templates":true,"reports":true,"users":true,"role-management":true}'
);

-- Editor: access to data management, no user/role management
INSERT INTO role_permissions (role, permissions) VALUES (
  'editor',
  '{"dashboard":true,"imports":true,"transactions":true,"categories":true,"bank-accounts":true,"import-templates":true,"reports":true,"users":false,"role-management":false}'
);

-- Viewer: read-only access, no management features
INSERT INTO role_permissions (role, permissions) VALUES (
  'viewer',
  '{"dashboard":true,"imports":true,"transactions":true,"categories":true,"bank-accounts":true,"import-templates":true,"reports":true,"users":false,"role-management":false}'
);

-- Index for faster user permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
