/*
 * services/stats.service.ts
 * Alle Statistik-Berechnungen vollständig in SQL — kein JS-Loop.
 * Redis-Caching (TTL 5 Min) vermeidet wiederholte schwere Queries.
 * Fallback: läuft ohne Redis weiter (cacheGet gibt null zurück).
 */

import { pool }                         from '../db/pool';
import { cacheGet, cacheSet, cacheDel } from '../db/redis';

/* ── getWeekStats ──────────────────────────────────────────────── */
export async function getWeekStats(userId: number) {
  const key    = `stats:week:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT
       date_trunc('day', start_time AT TIME ZONE 'UTC') AS date,
       COALESCE(SUM(duration), 0)::integer               AS total_seconds
     FROM sessions
     WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '7 days'
     GROUP BY date
     ORDER BY date ASC`,
    [userId]
  );
  const data = result.rows.map((row) => ({
    date:    row.date,
    minutes: Math.floor(row.total_seconds / 60),
  }));
  await cacheSet(key, JSON.stringify(data), 300);
  return data;
}

/* ── getMonthStats ─────────────────────────────────────────────── */
export async function getMonthStats(userId: number) {
  const key    = `stats:month:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT
       date_trunc('week', start_time AT TIME ZONE 'UTC') AS week_start,
       COALESCE(SUM(duration), 0)::integer                AS total_seconds
     FROM sessions
     WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '28 days'
     GROUP BY week_start
     ORDER BY week_start ASC`,
    [userId]
  );
  const data = result.rows.map((row) => ({
    weekStart: row.week_start,
    minutes:   Math.floor(row.total_seconds / 60),
  }));
  await cacheSet(key, JSON.stringify(data), 300);
  return data;
}

/* ── getCategoryStats ──────────────────────────────────────────── */
export async function getCategoryStats(userId: number) {
  const key    = `stats:categories:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.color,
       COALESCE(SUM(s.duration), 0)::integer AS total_seconds,
       COUNT(s.id)::integer                  AS session_count
     FROM categories c
     LEFT JOIN sessions s ON s.category_id = c.id AND s.user_id = $1
     WHERE c.user_id = $1 AND c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.color
     ORDER BY total_seconds DESC`,
    [userId]
  );
  const data = result.rows.map((row) => ({
    id:           row.id,
    name:         row.name,
    color:        row.color,
    totalMinutes: Math.floor(row.total_seconds / 60),
    sessionCount: row.session_count,
  }));
  await cacheSet(key, JSON.stringify(data), 300);
  return data;
}

/* ── invalidateUserCache ───────────────────────────────────────── */
/* Alle Stats-Cache-Einträge eines Users löschen — nach jeder Session-Änderung aufrufen */
export async function invalidateUserCache(userId: number): Promise<void> {
  await cacheDel(
    `stats:summary:${userId}`,
    `stats:week:${userId}`,
    `stats:month:${userId}`,
    `stats:categories:${userId}`,
  );
}

/* ── getSummary ────────────────────────────────────────────────── */
/* Single-query dashboard payload — mit 5-Min-Redis-Cache */
export async function getSummary(userId: number) {
  const key    = `stats:summary:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const [totalResult, todayResult, weekResult, countResult, streakResult] = await Promise.all([

    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions WHERE user_id = $1`,
      [userId]
    ),

    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions
       WHERE user_id = $1
         AND date_trunc('day', start_time AT TIME ZONE 'UTC')
             = date_trunc('day', NOW() AT TIME ZONE 'UTC')`,
      [userId]
    ),

    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions
       WHERE user_id = $1
         AND start_time >= date_trunc('week', NOW() AT TIME ZONE 'UTC')`,
      [userId]
    ),

    pool.query(
      `SELECT COUNT(*)::integer AS count FROM sessions WHERE user_id = $1`,
      [userId]
    ),

    /* Streak via SQL Gruppen-Differenz-Methode */
    pool.query(
      `WITH daily AS (
         SELECT DISTINCT
           date_trunc('day', start_time AT TIME ZONE 'UTC')::date AS study_date
         FROM sessions
         WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '366 days'
       ),
       numbered AS (
         SELECT study_date,
                study_date
                  - (ROW_NUMBER() OVER (ORDER BY study_date))::int
                  * INTERVAL '1 day' AS grp
         FROM daily
       ),
       groups AS (
         SELECT COUNT(*)::integer AS len,
                MIN(study_date)   AS first_date,
                MAX(study_date)   AS last_date
         FROM numbered GROUP BY grp
       )
       SELECT
         COALESCE(
           (SELECT len FROM groups
            WHERE last_date >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY last_date DESC LIMIT 1),
           0
         ) AS current_streak,
         COALESCE(MAX(len), 0) AS longest_streak
       FROM groups`,
      [userId]
    ),
  ]);

  const streak = streakResult.rows[0];
  const data = {
    totalMinutes:  Math.floor(totalResult.rows[0].total_seconds / 60),
    todayMinutes:  Math.floor(todayResult.rows[0].total_seconds / 60),
    weekMinutes:   Math.floor(weekResult.rows[0].total_seconds / 60),
    sessionCount:  countResult.rows[0].count,
    currentStreak: streak.current_streak,
    longestStreak: streak.longest_streak,
  };
  await cacheSet(key, JSON.stringify(data), 300);
  return data;
}
