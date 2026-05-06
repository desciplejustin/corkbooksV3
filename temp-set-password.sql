-- Set working password for admin user
-- Password: DevPass2026!
UPDATE users 
SET password_hash = '$pbkdf2$100000$6436744cde28eee6e5fd1b812f3b9ff0$aac94d7367c7ecb718d0893ad2d96ea08913480920b76f84ad604495b82272b7',
    updated_at = datetime('now')
WHERE email = 'admin@corkbooks.test';

-- Verify the update
SELECT email, substr(password_hash, 1, 30) || '...' as hash_preview FROM users WHERE email = 'admin@corkbooks.test';
