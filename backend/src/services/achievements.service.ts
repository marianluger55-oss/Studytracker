/*
 * services/achievements.service.ts
 *
 * Prüft und entsperrt Errungenschaften für einen Nutzer automatisch.
 * Wird bei GET /api/achievements aufgerufen: Neue Errungenschaften
 * werden in user_achievements eingetragen, dann alles zurückgegeben.
 */

import { pool } from '../db/pool';

/* ── Typen ─────────────────────────────────────────────────────── */
export interface AchievementWithStatus {
  id:          number;
  key:         string;
  name:        string;
  description: string;
  icon:        string;
  xpReward:    number;
  unlockedAt:  string | null; // ISO-String oder null wenn noch gesperrt
}

/* ── Kriterien-Prüfung und automatisches Entsperren ────────────── */
async function checkAndUnlock(userId: number): Promise<void> {
  // Alle Nutzer-Statistiken in einem Batch laden
  const [statsRow, earlyRow, nightRow, catRow, pomRow] = await Promise.all([

    // Gesamt-Sessions, Gesamt-Minuten, aktueller Streak
    pool.query<{ session_count: number; total_minutes: number; current_streak: number }>(
      `WITH daily AS (
         SELECT DISTINCT date_trunc('day', start_time AT TIME ZONE 'UTC')::date AS study_date
         FROM sessions WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '366 days'
       ),
       numbered AS (
         SELECT study_date,
                study_date - (ROW_NUMBER() OVER (ORDER BY study_date))::int * INTERVAL '1 day' AS grp
         FROM daily
       ),
       groups AS (
         SELECT COUNT(*)::integer AS len, MAX(study_date) AS last_date
         FROM numbered GROUP BY grp
       )
       SELECT
         (SELECT COUNT(*)::integer FROM sessions WHERE user_id = $1)     AS session_count,
         COALESCE((SELECT SUM(duration)::integer / 60 FROM sessions WHERE user_id = $1), 0) AS total_minutes,
         COALESCE(
           (SELECT len FROM groups WHERE last_date >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY last_date DESC LIMIT 1), 0
         ) AS current_streak`,
      [userId]
    ),

    // Frühaufsteher: mindestens eine Session vor 7 Uhr
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC') < 7`,
      [userId]
    ),

    // Nachteule: mindestens eine Session nach 22 Uhr
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC') >= 22`,
      [userId]
    ),

    // Allrounder: mindestens 5 verschiedene Kategorien genutzt
    pool.query<{ count: number }>(
      `SELECT COUNT(DISTINCT category_id)::integer AS count FROM sessions
       WHERE user_id = $1 AND category_id IS NOT NULL`,
      [userId]
    ),

    // Pomodoro-Fan: mindestens 10 Pomodoro-Sessions
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions
       WHERE user_id = $1 AND mode = 'pomodoro'`,
      [userId]
    ),
  ]);

  const stats = statsRow.rows[0];
  const earlyCount = earlyRow.rows[0].count;
  const nightCount = nightRow.rows[0].count;
  const catCount   = catRow.rows[0].count;
  const pomCount   = pomRow.rows[0].count;

  // Welche Achievement-Keys der Nutzer entsperren soll
  const toUnlock: string[] = [];

  if (stats.session_count >= 1)    toUnlock.push('first_session');
  if (stats.current_streak >= 7)   toUnlock.push('streak_7');
  if (stats.current_streak >= 30)  toUnlock.push('streak_30');
  if (stats.total_minutes >= 600)  toUnlock.push('total_10h');
  if (stats.total_minutes >= 6000) toUnlock.push('total_100h');
  if (earlyCount >= 1)             toUnlock.push('early_bird');
  if (nightCount >= 1)             toUnlock.push('night_owl');
  if (catCount >= 5)               toUnlock.push('five_categories');
  if (pomCount >= 10)              toUnlock.push('pomodoro_10');

  if (toUnlock.length === 0) return;

  // Masseneinfügung mit ON CONFLICT DO NOTHING — idempotent
  await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT $1, a.id
     FROM achievements a
     WHERE a.key = ANY($2::text[])
     ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    [userId, toUnlock]
  );
}

/* ── getWithStatus ─────────────────────────────────────────────── */
// Gibt alle Errungenschaften zurück, mit Entsperrzeit für den Nutzer.
// Prüft und entsperrt neu verdiente Errungenschaften vor der Abfrage.
export async function getWithStatus(userId: number): Promise<AchievementWithStatus[]> {
  await checkAndUnlock(userId);

  const result = await pool.query<{
    id:          number;
    key:         string;
    name:        string;
    description: string;
    icon:        string;
    xp_reward:   number;
    unlocked_at: Date | null;
  }>(
    `SELECT
       a.id,
       a.key,
       a.name,
       a.description,
       a.icon,
       a.xp_reward,
       ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua
       ON ua.achievement_id = a.id AND ua.user_id = $1
     ORDER BY ua.unlocked_at NULLS LAST, a.id`,
    [userId]
  );

  return result.rows.map((row) => ({
    id:          row.id,
    key:         row.key,
    name:        row.name,
    description: row.description,
    icon:        row.icon,
    xpReward:    row.xp_reward,
    unlockedAt:  row.unlocked_at ? row.unlocked_at.toISOString() : null,
  }));
}
