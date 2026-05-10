-- 002_password_reset_tokens.sql
-- Tabelle für Passwort-Reset-Tokens (SHA-256 gehashte Single-Use-Tokens)

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,        -- SHA-256 Hex (niemals Klartext)
  expires_at TIMESTAMPTZ NOT NULL,               -- 1 Stunde ab Ausstellung
  used_at    TIMESTAMPTZ NULL,                   -- NULL = unbenutzt, NOT NULL = verbraucht
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires    ON password_reset_tokens(expires_at);
