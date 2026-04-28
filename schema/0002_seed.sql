-- Seed data for testing
-- Phase 1: Admin and Editor users
-- Password for both: 'password123' (hashed with bcrypt)

INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES 
  (
    '1',
    'admin@corkbooks.test',
    '$2b$10$rKZLvVLWx3xK.JF.YvYkZuYH5pZnX7/yH4qL7XvMQZ4JxJ4YqyYyK',
    'Admin User',
    'admin',
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    '2',
    'editor@corkbooks.test',
    '$2b$10$rKZLvVLWx3xK.JF.YvYkZuYH5pZnX7/yH4qL7XvMQZ4JxJ4YqyYyK',
    'Editor User',
    'editor',
    1,
    datetime('now'),
    datetime('now')
  );
