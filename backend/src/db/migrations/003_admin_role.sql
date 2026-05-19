-- 003_admin_role.sql
-- Fügt die role-Spalte zur users-Tabelle hinzu.
-- Werte: 'user' (Standard) | 'admin'

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;
