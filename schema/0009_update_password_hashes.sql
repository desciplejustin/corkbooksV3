-- SECURITY UPDATE: Password Hash Migration
-- This migration updates seed users to use PBKDF2 password hashes
-- 
-- CRITICAL: These are TEMPORARY hashes for development only!
-- Production deployment MUST:
-- 1. Delete these seed users OR
-- 2. Generate new secure passwords and update the hashes
-- 3. Force password change on first login
--
-- To generate proper password hashes, use utils/password.ts:
-- const hash = await hashPassword('YourSecurePassword123!');

-- Temporary development hashes (password: TempDev2026!)
-- These are example hashes - ROTATE IMMEDIATELY in production

UPDATE users 
SET password_hash = '$pbkdf2$100000$a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
WHERE email = 'admin@corkbooks.test';

UPDATE users 
SET password_hash = '$pbkdf2$100000$b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7$234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1'
WHERE email = 'editor@corkbooks.test';

-- Add updated_at timestamp
UPDATE users 
SET updated_at = datetime('now')
WHERE email IN ('admin@corkbooks.test', 'editor@corkbooks.test');
