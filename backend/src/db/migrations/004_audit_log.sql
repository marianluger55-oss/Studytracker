-- 004_audit_log.sql
-- Tamper-resistente Audit-Log-Tabelle für sicherheitsrelevante Ereignisse.
-- Einträge werden nie gelöscht (INSERT-only) — 90-Tage-Retention empfohlen.

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  ip_address INET         NULL,
  user_agent TEXT         NULL,
  metadata   JSONB        NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip         ON audit_logs(ip_address);
