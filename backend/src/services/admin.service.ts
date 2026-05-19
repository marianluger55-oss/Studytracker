/*
 * services/admin.service.ts
 * Datenbankabfragen für das Admin-Panel.
 */

import { pool } from '../db/pool';

/* ── getAllUsers ──────────────────────────────────────────────── */
/* Paginiert, mit optionaler Volltextsuche + Rollenfilter */
export async function getAllUsers(
  limit      = 50,
  offset     = 0,
  search     = '',
  roleFilter = '',
) {
  const where: string[] = [];
  const p: unknown[]    = [];

  if (search) {
    p.push(`%${search}%`);
    where.push(`(u.email ILIKE $${p.length} OR u.username ILIKE $${p.length})`);
  }
  if (roleFilter) {
    p.push(roleFilter);
    where.push(`u.role = $${p.length}`);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT
         u.id, u.email, u.username, u.role, u.created_at, u.deleted_at,
         COUNT(s.id)::integer                   AS session_count,
         COALESCE(SUM(s.duration), 0)::integer  AS total_seconds
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id
       ${whereSQL}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, offset],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT u.id)::integer AS total FROM users u ${whereSQL}`,
      p,
    ),
  ]);

  return {
    users: rows.rows.map((r) => ({
      id:           r.id           as number,
      email:        r.email        as string,
      username:     r.username     as string,
      role:         r.role         as 'user' | 'admin',
      createdAt:    r.created_at   as Date,
      deletedAt:    r.deleted_at   as Date | null,
      sessionCount: r.session_count as number,
      totalMinutes: Math.floor(Number(r.total_seconds) / 60),
    })),
    total: count.rows[0].total as number,
  };
}

/* ── getPlatformStats ─────────────────────────────────────────── */
export async function getPlatformStats() {
  const [users, sessions, today, newToday, avg] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                             AS total_users,
        COUNT(*) FILTER (WHERE deleted_at IS NULL)           AS active_users,
        COUNT(*) FILTER (WHERE role = 'admin')               AS admin_count
      FROM users
    `),
    pool.query(`
      SELECT
        COUNT(*)::integer                                    AS total_sessions,
        COALESCE(SUM(duration), 0)::integer                 AS total_seconds,
        COUNT(*) FILTER (
          WHERE start_time >= date_trunc('day', NOW())
        )::integer                                           AS sessions_today
      FROM sessions
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::integer AS active_today
      FROM sessions WHERE start_time >= date_trunc('day', NOW())
    `),
    pool.query(`
      SELECT COUNT(*)::integer AS new_today
      FROM users WHERE created_at >= date_trunc('day', NOW())
    `),
    pool.query(`
      SELECT COALESCE(AVG(duration), 0)::integer AS avg_duration FROM sessions
    `),
  ]);

  const u = users.rows[0];
  const s = sessions.rows[0];

  return {
    totalUsers:    parseInt(u.total_users,  10),
    activeUsers:   parseInt(u.active_users, 10),
    adminCount:    parseInt(u.admin_count,  10),
    totalSessions: s.total_sessions   as number,
    totalMinutes:  Math.floor(Number(s.total_seconds) / 60),
    sessionsToday: s.sessions_today   as number,
    activeToday:   today.rows[0].active_today as number,
    newToday:      newToday.rows[0].new_today as number,
    avgSessionMin: Math.floor(Number(avg.rows[0].avg_duration) / 60),
  };
}

/* ── getGrowthData ────────────────────────────────────────────── */
/* Neue Nutzer + Sessions pro Tag — letzte 14 Tage */
export async function getGrowthData() {
  const [userGrowth, sessionActivity] = await Promise.all([
    pool.query(`
      SELECT
        to_char(d.day, 'DD.MM') AS label,
        COUNT(u.id)::integer    AS value
      FROM generate_series(
        date_trunc('day', NOW()) - INTERVAL '13 days',
        date_trunc('day', NOW()),
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN users u ON date_trunc('day', u.created_at) = d.day
      GROUP BY d.day ORDER BY d.day
    `),
    pool.query(`
      SELECT
        to_char(d.day, 'DD.MM') AS label,
        COUNT(s.id)::integer    AS value
      FROM generate_series(
        date_trunc('day', NOW()) - INTERVAL '13 days',
        date_trunc('day', NOW()),
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN sessions s ON date_trunc('day', s.start_time) = d.day
      GROUP BY d.day ORDER BY d.day
    `),
  ]);

  return {
    userGrowth:      userGrowth.rows      as Array<{ label: string; value: number }>,
    sessionActivity: sessionActivity.rows as Array<{ label: string; value: number }>,
  };
}

/* ── getRecentActivity ────────────────────────────────────────── */
/* Letzte Ereignisse (Sessions + Registrierungen) aus 24h */
export async function getRecentActivity(limit = 30) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT
         'session'                        AS type,
         s.created_at                     AS time,
         u.username,
         COALESCE(c.name, 'Kein Fach')   AS category,
         s.duration                       AS value
       FROM sessions s
       JOIN  users u      ON u.id  = s.user_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.created_at >= NOW() - INTERVAL '24 hours'

       UNION ALL

       SELECT
         'register'   AS type,
         u.created_at AS time,
         u.username,
         NULL          AS category,
         NULL          AS value
       FROM users u
       WHERE u.created_at >= NOW() - INTERVAL '24 hours'
     ) combined
     ORDER BY time DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((r) => ({
    type:     r.type     as 'session' | 'register',
    time:     r.time     as Date,
    username: r.username as string,
    category: r.category as string | null,
    minutes:  r.value != null ? Math.floor(Number(r.value) / 60) : null,
  }));
}

/* ── getUserDetail ────────────────────────────────────────────── */
/* Vollständiges Nutzerprofil mit letzten Sessions */
export async function getUserDetail(id: number) {
  const [userRes, statsRes, sessionsRes] = await Promise.all([
    pool.query(
      `SELECT id, email, username, role, created_at, deleted_at FROM users WHERE id = $1`,
      [id],
    ),
    pool.query(
      `SELECT
         COUNT(*)::integer                   AS total_sessions,
         COALESCE(SUM(duration), 0)::integer AS total_seconds,
         MAX(start_time)                      AS last_session
       FROM sessions WHERE user_id = $1`,
      [id],
    ),
    pool.query(
      `SELECT s.id, s.start_time, s.duration, COALESCE(c.name, 'Kein Fach') AS category
       FROM sessions s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.user_id = $1
       ORDER BY s.start_time DESC LIMIT 10`,
      [id],
    ),
  ]);

  if (!userRes.rows[0]) return null;
  const u  = userRes.rows[0];
  const st = statsRes.rows[0];

  return {
    id:             u.id          as number,
    email:          u.email       as string,
    username:       u.username    as string,
    role:           u.role        as 'user' | 'admin',
    createdAt:      u.created_at  as Date,
    deletedAt:      u.deleted_at  as Date | null,
    totalSessions:  st.total_sessions as number,
    totalMinutes:   Math.floor(Number(st.total_seconds) / 60),
    lastSession:    st.last_session   as Date | null,
    recentSessions: sessionsRes.rows.map((s) => ({
      id:        s.id         as number,
      startTime: s.start_time as Date,
      minutes:   Math.floor(Number(s.duration) / 60),
      category:  s.category   as string,
    })),
  };
}

/* ── revokeUserSessions ───────────────────────────────────────── */
/* Alle Refresh-Tokens eines Nutzers löschen (zwingt Re-Login) */
export async function revokeUserSessions(targetId: number) {
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [targetId],
  );
  return result.rowCount ?? 0;
}

/* ── setUserRole ──────────────────────────────────────────────── */
export async function setUserRole(targetId: number, role: 'user' | 'admin') {
  const result = await pool.query(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, email, username, role`,
    [role, targetId],
  );
  return result.rows[0] ?? null;
}

/* ── softDeleteUser ───────────────────────────────────────────── */
export async function softDeleteUser(targetId: number) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [targetId]);
  await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [targetId],
  );
}

/* ── getAuditLogs ─────────────────────────────────────────────── */
/* Delegiert an audit.service — hält admin.service schlank */
export async function getAuditLogs(limit = 50, offset = 0, userId?: number) {
  const { getRecentAuditLogs } = await import('./audit.service');
  return getRecentAuditLogs(limit, offset, userId);
}
