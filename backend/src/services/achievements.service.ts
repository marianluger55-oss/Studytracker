/*
 * services/achievements.service.ts
 * ─────────────────────────────────────────────────────────────
 * Errungenschaften (Achievements) — automatisches Entsperren und Abfragen.
 *
 * Strategie: Lazy-Evaluation
 *  - Errungenschaften werden NICHT bei jeder Session geprüft (zu teuer)
 *  - Stattdessen: bei GET /api/achievements werden alle Kriterien geprüft
 *    und neu verdiente Errungenschaften sofort eingetragen
 *  - ON CONFLICT DO NOTHING: idempotent — mehrfaches Prüfen ist harmlos
 *
 * Errungenschaften (achievements-Tabelle sind Seed-Daten):
 *  first_session, streak_7, streak_30, total_10h, total_100h,
 *  early_bird, night_owl, five_categories, pomodoro_10, goal_reached
 * ─────────────────────────────────────────────────────────────
 */

import { pool } from '../db/pool';

/* ── Typen ─────────────────────────────────────────────────────── */
export interface AchievementWithStatus {
  id:          number;
  key:         string;   /* Maschinenlesbarer Identifier z.B. "streak_7" */
  name:        string;   /* Anzeigename z.B. "7-Tage-Streak" */
  description: string;   /* Beschreibung der Anforderung */
  icon:        string;   /* Emoji oder Icon-Code */
  xpReward:    number;   /* Erfahrungspunkte für das Entsperren */
  unlockedAt:  string | null; /* ISO-String wenn freigeschaltet, null wenn gesperrt */
}

/* ── checkAndUnlock ─────────────────────────────────────────────
   Prüft alle Achievement-Kriterien und schreibt neu verdiente in die DB.
   Promise.all: alle 6 Queries parallel → schneller als sequentiell. */
async function checkAndUnlock(userId: number): Promise<void> {
  /* Alle Nutzer-Statistiken in einem Batch parallel laden */
  const [statsRow, earlyRow, nightRow, catRow, pomRow, goalRow] = await Promise.all([

    /* Gesamt-Sessions, Gesamt-Minuten, aktueller Streak (gleiche SQL-Logik wie stats.service) */
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

    /* Frühaufsteher: mindestens eine Session vor 7 Uhr (UTC) */
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC') < 7`, /* Stunde 0-6 = vor 7:00 */
      [userId]
    ),

    /* Nachteule: mindestens eine Session nach 22 Uhr (UTC) */
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC') >= 22`, /* Stunde 22-23 = nach 22:00 */
      [userId]
    ),

    /* Allrounder: mindestens 5 verschiedene Kategorien genutzt */
    pool.query<{ count: number }>(
      `SELECT COUNT(DISTINCT category_id)::integer AS count FROM sessions
       WHERE user_id = $1 AND category_id IS NOT NULL`, /* IS NOT NULL: Sessions ohne Kategorie ignorieren */
      [userId]
    ),

    /* Pomodoro-Fan: mindestens 10 Sessions insgesamt */
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count FROM sessions WHERE user_id = $1`,
      [userId]
    ),

    /* Wochenziel erreicht: aktuelle Woche Lernzeit >= wöchentliches Ziel in Sekunden */
    pool.query<{ reached: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM goals g
         WHERE g.user_id = $1 AND g.period = 'weekly'
         AND (
           SELECT COALESCE(SUM(s.duration), 0)  -- Lernzeit dieser Woche in Sekunden
           FROM sessions s
           WHERE s.user_id = $1
             AND s.start_time >= date_trunc('week', NOW())  -- Seit Wochenanfang (Montag)
         ) >= g.target_hours * 3600  -- Zielstunden × 3600 = Zielsekunden
       ) AS reached`,
      [userId]
    ),
  ]);

  const stats      = statsRow.rows[0];
  const earlyCount = earlyRow.rows[0].count;
  const nightCount = nightRow.rows[0].count;
  const catCount   = catRow.rows[0].count;
  const pomCount   = pomRow.rows[0].count;
  const goalReached = goalRow.rows[0]?.reached ?? false;

  /* Achievement-Keys sammeln die entsperrt werden sollen */
  const toUnlock: string[] = [];

  if (stats.session_count >= 1)    toUnlock.push('first_session'); /* Erste Session */
  if (stats.current_streak >= 7)   toUnlock.push('streak_7');      /* 7-Tage-Streak */
  if (stats.current_streak >= 30)  toUnlock.push('streak_30');     /* 30-Tage-Streak */
  if (stats.total_minutes >= 600)  toUnlock.push('total_10h');     /* 10 Stunden gesamt */
  if (stats.total_minutes >= 6000) toUnlock.push('total_100h');    /* 100 Stunden gesamt */
  if (earlyCount >= 1)             toUnlock.push('early_bird');    /* Frühaufsteher */
  if (nightCount >= 1)             toUnlock.push('night_owl');     /* Nachteule */
  if (catCount >= 5)               toUnlock.push('five_categories'); /* 5 Kategorien */
  if (pomCount >= 10)              toUnlock.push('pomodoro_10');   /* 10 Sessions */
  if (goalReached)                 toUnlock.push('goal_reached');  /* Wochenziel erreicht */

  if (toUnlock.length === 0) return; /* Keine neuen Errungenschaften → früh raus */

  /* Masseneinfügung: alle neuen Errungenschaften auf einmal eintragen
     ON CONFLICT DO NOTHING: bereits entsperrte werden still ignoriert (idempotent) */
  await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT $1, a.id
     FROM achievements a
     WHERE a.key = ANY($2::text[])  -- ANY: sucht alle keys im Array
     ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    [userId, toUnlock]
  );
}

/* ── getWithStatus ─────────────────────────────────────────────── */
/* Gibt alle Errungenschaften zurück (freigeschaltet + gesperrt), mit Entsperrzeit.
   Ruft zuerst checkAndUnlock() auf — so werden neue Errungenschaften direkt angezeigt. */
export async function getWithStatus(userId: number): Promise<AchievementWithStatus[]> {
  await checkAndUnlock(userId); /* Neu verdiente zuerst eintragen */

  const result = await pool.query<{
    id:          number;
    key:         string;
    name:        string;
    description: string;
    icon:        string;
    xp_reward:   number;
    unlocked_at: Date | null; /* null = noch gesperrt */
  }>(
    `SELECT
       a.id,
       a.key,
       a.name,
       a.description,
       a.icon,
       a.xp_reward,
       ua.unlocked_at        -- null wenn nicht in user_achievements
     FROM achievements a
     LEFT JOIN user_achievements ua
       ON ua.achievement_id = a.id AND ua.user_id = $1  -- LEFT JOIN: alle Achievements erscheinen
     ORDER BY ua.unlocked_at NULLS LAST, a.id`,  -- Freigeschaltete oben, gesperrte unten
    [userId]
  );

  return result.rows.map((row) => ({
    id:          row.id,
    key:         row.key,
    name:        row.name,
    description: row.description,
    icon:        row.icon,
    xpReward:    row.xp_reward,
    /* Date → ISO-String (React-konsistent), null wenn gesperrt */
    unlockedAt:  row.unlocked_at ? row.unlocked_at.toISOString() : null,
  }));
}
