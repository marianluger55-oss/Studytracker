/*
 * services/audit.service.ts
 *
 * INSERT-only Audit-Log für sicherheitsrelevante Ereignisse.
 * log() wirft nie — Audit-Fehler dürfen keine Nutzer-Requests blockieren.
 */

import { pool }   from '../db/pool';
import { logger } from '../utils/logger';

/* ── Erlaubte Aktionstypen (Vollständige Liste) ─────────────────── */
export type AuditAction =
  | 'register'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'logout_all'
  | 'password_changed'
  | 'account_deleted'
  | 'data_exported'
  | 'role_changed'
  | 'sessions_revoked'
  | 'admin_user_deleted';

/* ── Optionen für log() ─────────────────────────────────────────── */
export interface AuditLogOptions {
  userId?:    number | null; /* null bei fehlgeschlagenen Logins (kein User) */
  ip?:        string;
  userAgent?: string;
  metadata?:  Record<string, unknown>;
}

/* ── log ────────────────────────────────────────────────────────── */
/* Fire-and-forget: fängt alle Fehler intern ab, blockiert nie. */
export function log(action: AuditAction, opts: AuditLogOptions = {}): void {
  const { userId = null, ip = null, userAgent = null, metadata = {} } = opts;

  pool
    .query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3::inet, $4, $5)`,
      [userId, action, ip, userAgent, JSON.stringify(metadata)],
    )
    .catch((err: unknown) => {
      /* Audit-Fehler nur loggen, niemals weitergeben */
      logger.error('audit.log insert failed', { action, userId: userId ?? undefined, err: String(err) });
    });
}

/* ── getRecentAuditLogs ──────────────────────────────────────────── */
/* Gibt paginierte Audit-Einträge zurück — optional nach userId filtern. */
export async function getRecentAuditLogs(
  limit  = 50,
  offset = 0,
  userId?: number,
) {
  const where  = userId ? 'WHERE al.user_id = $3' : '';
  const params = userId ? [limit, offset, userId] : [limit, offset];

  const result = await pool.query(
    `SELECT
       al.id,
       al.user_id,
       al.action,
       al.ip_address,
       al.user_agent,
       al.metadata,
       al.created_at,
       u.username,
       u.email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $1 OFFSET $2`,
    params,
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::integer AS total FROM audit_logs ${userId ? 'WHERE user_id = $1' : ''}`,
    userId ? [userId] : [],
  );

  return {
    logs: result.rows.map((r) => ({
      id:        r.id         as number,
      userId:    r.user_id    as number | null,
      username:  r.username   as string | null,
      email:     r.email      as string | null,
      action:    r.action     as AuditAction,
      ip:        r.ip_address as string | null,
      userAgent: r.user_agent as string | null,
      metadata:  r.metadata   as Record<string, unknown>,
      createdAt: r.created_at as Date,
    })),
    total: countResult.rows[0].total as number,
  };
}
