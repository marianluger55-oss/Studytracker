/*
 * services/sessions.service.ts
 * ─────────────────────────────────────────────────────────────
 * Geschäftslogik für Lernsessions.
 *
 * Alle Datenbankabfragen zu Sessions stecken hier.
 * Jede Funktion filtert immer nach user_id, damit ein Nutzer
 * niemals die Sessions eines anderen sehen oder ändern kann.
 * ─────────────────────────────────────────────────────────────
 */

import { pool }                    from '../db/pool';
import { SessionRow }              from '../types';
import { invalidateUserCache }     from './stats.service';

/* ── createSession ───────────────────────────────────────────── */
/* Speichert eine abgeschlossene Lernsession in der Datenbank.
   RETURNING *: gibt die gespeicherte Zeile zurück inkl. DB-generierten Feldern (id, created_at). */
export async function createSession(
  userId:     number,
  categoryId: number | null, /* null wenn keine Kategorie ausgewählt */
  startTime:  string,        /* ISO-8601-String, z. B. "2026-04-15T10:00:00Z" */
  endTime:    string,        /* ISO-8601-String wann Timer gestoppt wurde */
  duration:   number,        /* Sekunden — berechnet in stopSession() des Frontends */
  notes?:     string         /* Optionale Notizen des Nutzers */
) {
  const result = await pool.query<SessionRow>(
    `INSERT INTO sessions (user_id, category_id, start_time, end_time, duration, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, /* Gespeicherte Session zurückgeben — enthält id + created_at */
    [userId, categoryId ?? null, startTime, endTime, duration, notes ?? null]
    /* ?? null: undefined → null konvertieren (PostgreSQL versteht kein undefined) */
  );

  await invalidateUserCache(userId); /* Stats-Cache nach neuer Session invalidieren */
  return result.rows[0]; /* Neu erstellte Session zurückgeben */
}

/* ── getSessions ─────────────────────────────────────────────── */
/* Gibt Sessions eines Nutzers zurück, neueste zuerst.
   limit/offset ermöglichen Pagination; maximum 200 pro Seite (gegen zu große Responses).
   LEFT JOIN categories: Session ohne Kategorie (category_id = NULL) erscheint trotzdem. */
export async function getSessions(
  userId: number,
  limit  = 200,
  offset = 0,
) {
  /* Eingabe-Sanitierung: negative Werte oder zu große Werte abfangen */
  const safeLimit  = Math.min(Math.max(1, limit), 200); /* Mindestens 1, maximal 200 */
  const safeOffset = Math.max(0, offset);               /* Keine negativen Offsets */

  const result = await pool.query(
    `SELECT
       s.id,
       s.start_time,
       s.end_time,
       s.duration,
       s.notes,
       s.created_at,
       c.id    AS category_id,    -- Kategorie-ID (null wenn keine Kategorie)
       c.name  AS category_name,  -- Kategoriename per JOIN
       c.color AS category_color  -- Hex-Farbe der Kategorie
     FROM sessions s
     LEFT JOIN categories c ON s.category_id = c.id  -- Kategorie optional
     WHERE s.user_id = $1  -- Nur eigene Sessions (Datenisolation)
     ORDER BY s.start_time DESC  -- Neueste Sessions zuerst
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );

  /* Gesamtanzahl für Pagination-Meta — separate Query da LIMIT die Zahl begrenzen würde */
  const countResult = await pool.query<{ total: string }>(
    'SELECT COUNT(*) AS total FROM sessions WHERE user_id = $1',
    [userId]
  );
  /* parseInt: PostgreSQL gibt COUNT als String zurück (BigInt) — in Zahl umwandeln */
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  return { sessions: result.rows, total, limit: safeLimit, offset: safeOffset };
}

/* ── getSessionById ──────────────────────────────────────────── */
/* Gibt eine einzelne Session zurück — prüft dass sie dem Nutzer gehört.
   WHERE s.id = $1 AND s.user_id = $2: verhindert dass User fremde Sessions abrufen. */
export async function getSessionById(sessionId: number, userId: number) {
  const result = await pool.query(
    `SELECT s.*, c.name AS category_name, c.color AS category_color
     FROM sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.id = $1 AND s.user_id = $2`, /* Doppelte Sicherheitsprüfung — id UND userId */
    [sessionId, userId]
  );

  return result.rows[0] ?? null; /* null wenn nicht gefunden oder falsche userId */
}

/* ── deleteSession ───────────────────────────────────────────── */
/* Löscht eine Session — nur wenn sie dem Nutzer gehört.
   Gibt true zurück wenn etwas gelöscht wurde (Zeile existierte), sonst false. */
export async function deleteSession(sessionId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
    /* user_id = $2: verhindert dass Nutzer fremde Sessions löschen kann */
    [sessionId, userId]
  );

  const deleted = (result.rowCount ?? 0) > 0; /* rowCount: Anzahl gelöschter Zeilen */
  if (deleted) await invalidateUserCache(userId); /* Stats-Cache nur invalidieren wenn wirklich gelöscht */
  return deleted;
}
