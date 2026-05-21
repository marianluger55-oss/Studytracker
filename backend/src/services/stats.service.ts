/*
 * services/stats.service.ts
 * ─────────────────────────────────────────────────────────────
 * Alle Statistik-Berechnungen vollständig in SQL — kein JS-Loop.
 *
 * Warum SQL statt JS:
 *  - Datenbank ist näher an den Daten → kein Netzwerk-Overhead für jeden Datensatz
 *  - SQL-Aggregationen (SUM, COUNT, GROUP BY) nutzen DB-Indizes direkt
 *  - Weniger Daten-Transfer: DB gibt berechnetes Ergebnis zurück, nicht alle Rohdaten
 *
 * Redis-Caching (TTL 5 Minuten):
 *  - Verhindert wiederholte schwere Queries bei Dashboard-Aufrufen
 *  - Cache-Key: "stats:summary:{userId}" — pro User separater Cache
 *  - Invalidierung: nach jeder Session-Änderung (create/delete) via invalidateUserCache()
 *  - Fallback: läuft ohne Redis weiter (cacheGet gibt null zurück wenn Redis down)
 * ─────────────────────────────────────────────────────────────
 */

import { pool }                         from '../db/pool';
import { cacheGet, cacheSet, cacheDel } from '../db/redis';

/* ── getWeekStats ──────────────────────────────────────────────── */
/* Lernminuten pro Tag für die letzten 7 Tage — für Balkendiagramm im Dashboard */
export async function getWeekStats(userId: number) {
  const key    = `stats:week:${userId}`;         /* Redis-Cache-Key — eindeutig pro User */
  const cached = await cacheGet(key);             /* Aus Cache lesen — null wenn nicht vorhanden */
  if (cached) return JSON.parse(cached);          /* Cache-Hit: kein DB-Zugriff nötig */

  const result = await pool.query(
    `SELECT
       date_trunc('day', start_time AT TIME ZONE 'UTC') AS date,  -- Tag abschneiden (ohne Uhrzeit)
       COALESCE(SUM(duration), 0)::integer               AS total_seconds  -- Sekunden summieren, 0 wenn keine Sessions
     FROM sessions
     WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '7 days'  -- Nur letzte 7 Tage
     GROUP BY date  -- Pro Tag aggregieren
     ORDER BY date ASC`,  -- Ältester Tag zuerst (für Zeitachse)
    [userId]
  );
  const data = result.rows.map((row) => ({
    date:    row.date,
    minutes: Math.floor(row.total_seconds / 60), /* Sekunden → Minuten */
  }));
  await cacheSet(key, JSON.stringify(data), 300); /* 300 Sekunden = 5 Minuten im Cache */
  return data;
}

/* ── getMonthStats ─────────────────────────────────────────────── */
/* Lernminuten pro Woche für die letzten 28 Tage — für Monats-Übersicht */
export async function getMonthStats(userId: number) {
  const key    = `stats:month:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT
       date_trunc('week', start_time AT TIME ZONE 'UTC') AS week_start,  -- Wochenanfang (Montag)
       COALESCE(SUM(duration), 0)::integer                AS total_seconds
     FROM sessions
     WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '28 days'  -- Letzte 4 Wochen
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
/* Lernzeit und Session-Anzahl pro Kategorie — für Donut-Chart und Statistik-Seite */
export async function getCategoryStats(userId: number) {
  const key    = `stats:categories:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.color,
       COALESCE(SUM(s.duration), 0)::integer AS total_seconds,  -- 0 wenn keine Sessions in dieser Kategorie
       COUNT(s.id)::integer                  AS session_count   -- Anzahl Sessions (nicht Dauer)
     FROM categories c
     LEFT JOIN sessions s ON s.category_id = c.id AND s.user_id = $1  -- LEFT JOIN: Kategorien ohne Sessions bleiben sichtbar
     WHERE c.user_id = $1 AND c.deleted_at IS NULL  -- Nur aktive Kategorien
     GROUP BY c.id, c.name, c.color
     ORDER BY total_seconds DESC`,  -- Meist gelernte Kategorie oben
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
/* Alle Stats-Cache-Einträge eines Users löschen — nach jeder Session-Änderung aufrufen.
   Wird von sessions.service.ts nach createSession/deleteSession aufgerufen. */
export async function invalidateUserCache(userId: number): Promise<void> {
  /* cacheDel: löscht alle 4 Cache-Einträge gleichzeitig */
  await cacheDel(
    `stats:summary:${userId}`,    /* Dashboard-Zusammenfassung */
    `stats:week:${userId}`,       /* Tages-Chart letzte 7 Tage */
    `stats:month:${userId}`,      /* Wochen-Chart letzte 28 Tage */
    `stats:categories:${userId}`, /* Kategorie-Aufteilung */
  );
}

/* ── getSummary ────────────────────────────────────────────────── */
/* Dashboard-Zusammenfassung: 5 Queries parallel in einem Redis-Cache-Eintrag.
   Promise.all: alle 5 DB-Queries gleichzeitig ausführen (statt nacheinander ~5x schneller). */
export async function getSummary(userId: number) {
  const key    = `stats:summary:${userId}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached); /* Cache-Hit: sofortige Antwort ohne DB */

  /* 5 Queries gleichzeitig ausführen — schneller als sequentiell */
  const [totalResult, todayResult, weekResult, countResult, streakResult] = await Promise.all([

    /* Gesamte Lernzeit aller Zeiten */
    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions WHERE user_id = $1`,
      [userId]
    ),

    /* Lernzeit heute (UTC-Tag) */
    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions
       WHERE user_id = $1
         AND date_trunc('day', start_time AT TIME ZONE 'UTC')  -- Tag abschneiden
             = date_trunc('day', NOW() AT TIME ZONE 'UTC')`,   -- Mit heutigem Tag vergleichen
      [userId]
    ),

    /* Lernzeit diese Woche (ab Montag 00:00 UTC) */
    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::integer AS total_seconds
       FROM sessions
       WHERE user_id = $1
         AND start_time >= date_trunc('week', NOW() AT TIME ZONE 'UTC')`,  -- Wochenanfang
      [userId]
    ),

    /* Gesamtanzahl aller Sessions */
    pool.query(
      `SELECT COUNT(*)::integer AS count FROM sessions WHERE user_id = $1`,
      [userId]
    ),

    /* Lern-Streak via SQL Gruppen-Differenz-Methode:
       Idee: Wenn Tage aufeinanderfolgen, ist (study_date - ROW_NUMBER) konstant.
       Gleiche Konstante = gleiche Gruppe = ein zusammenhängender Streak. */
    pool.query(
      `WITH daily AS (
         -- Alle Tage an denen gelernt wurde (DISTINCT: mehrere Sessions pro Tag = 1 Tag)
         SELECT DISTINCT
           date_trunc('day', start_time AT TIME ZONE 'UTC')::date AS study_date
         FROM sessions
         WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '366 days'  -- Max. 1 Jahr zurück
       ),
       numbered AS (
         -- Gruppen-Differenz: study_date - ROW_NUMBER ergibt bei aufeinanderfolgenden Tagen denselben Wert
         SELECT study_date,
                study_date
                  - (ROW_NUMBER() OVER (ORDER BY study_date))::int
                  * INTERVAL '1 day' AS grp  -- grp ist für aufeinanderfolgende Tage identisch
         FROM daily
       ),
       groups AS (
         -- Zusammenhängende Streaks mit Länge, Start- und End-Datum
         SELECT COUNT(*)::integer AS len,
                MIN(study_date)   AS first_date,
                MAX(study_date)   AS last_date
         FROM numbered GROUP BY grp
       )
       SELECT
         -- Aktueller Streak: Gruppe die gestern oder heute endet
         COALESCE(
           (SELECT len FROM groups
            WHERE last_date >= CURRENT_DATE - INTERVAL '1 day'  -- Erlaubt heute und gestern (Zeitzone-Puffer)
            ORDER BY last_date DESC LIMIT 1),
           0
         ) AS current_streak,
         COALESCE(MAX(len), 0) AS longest_streak  -- Längster Streak aller Zeiten
       FROM groups`,
      [userId]
    ),
  ]);

  const streak = streakResult.rows[0]; /* Streak-Ergebnis aus der komplexen CTE-Query */
  const data = {
    totalMinutes:  Math.floor(totalResult.rows[0].total_seconds / 60),
    todayMinutes:  Math.floor(todayResult.rows[0].total_seconds / 60),
    weekMinutes:   Math.floor(weekResult.rows[0].total_seconds / 60),
    sessionCount:  countResult.rows[0].count,
    currentStreak: streak.current_streak,   /* Aktueller Streak in Tagen */
    longestStreak: streak.longest_streak,   /* Längster Streak aller Zeiten */
  };
  await cacheSet(key, JSON.stringify(data), 300); /* 5 Minuten cachen */
  return data;
}
