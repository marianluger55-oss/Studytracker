/*
 * services/admin.service.ts
 * Datenbankabfragen für das Admin-Panel.
 */

import { pool } from '../db/pool';

/* ── getAllUsers ───────────────────────────────────────────────── */
export async function getAllUsers(limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.username,
       u.role,
       u.created_at,
       u.deleted_at,
       COUNT(s.id)::integer AS session_count,
       COALESCE(SUM(s.duration), 0)::integer AS total_seconds
     FROM users u
     LEFT JOIN sessions s ON s.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countRes = await pool.query<{ total: string }>(
    'SELECT COUNT(*) AS total FROM users'
  );

  return {
    users: result.rows.map((r) => ({
      id:           r.id,
      email:        r.email,
      username:     r.username,
      role:         r.role,
      createdAt:    r.created_at,
      deletedAt:    r.deleted_at,
      sessionCount: r.session_count,
      totalMinutes: Math.floor(r.total_seconds / 60),
    })),
    total: parseInt(countRes.rows[0].total, 10),
  };
}

/* ── getPlatformStats ──────────────────────────────────────────── */
export async function getPlatformStats() {
  const [users, sessions, today] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                    AS total_users,
        COUNT(*) FILTER (WHERE deleted_at IS NULL)  AS active_users,
        COUNT(*) FILTER (WHERE role = 'admin')       AS admin_count
      FROM users
    `),
    pool.query(`
      SELECT
        COUNT(*)::integer                          AS total_sessions,
        COALESCE(SUM(duration), 0)::integer        AS total_seconds,
        COUNT(*) FILTER (
          WHERE start_time >= date_trunc('day', NOW())
        )::integer                                 AS sessions_today
      FROM sessions
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::integer AS active_today
      FROM sessions
      WHERE start_time >= date_trunc('day', NOW())
    `),
  ]);

  const u = users.rows[0];
  const s = sessions.rows[0];
  return {
    totalUsers:     parseInt(u.total_users, 10),
    activeUsers:    parseInt(u.active_users, 10),
    adminCount:     parseInt(u.admin_count, 10),
    totalSessions:  s.total_sessions,
    totalMinutes:   Math.floor(s.total_seconds / 60),
    sessionsToday:  s.sessions_today,
    activeToday:    today.rows[0].active_today,
  };
}

/* ── setUserRole ───────────────────────────────────────────────── */
export async function setUserRole(targetId: number, role: 'user' | 'admin') {
  const result = await pool.query(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, email, username, role`,
    [role, targetId]
  );
  return result.rows[0] ?? null;
}

/* ── softDeleteUser ────────────────────────────────────────────── */
export async function softDeleteUser(targetId: number) {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [targetId]
  );
  await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [targetId]
  );
}
