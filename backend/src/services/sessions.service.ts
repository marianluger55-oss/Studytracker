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

import { pool } from '../db/pool';
import { SessionRow } from '../types';

/* ── createSession ───────────────────────────────────────────── */
// Speichert eine abgeschlossene Lernsession in der Datenbank.
export async function createSession(
  userId:     number,
  categoryId: number | null,
  startTime:  string, // ISO-8601-String, z. B. "2026-04-15T10:00:00Z"
  endTime:    string,
  duration:   number, // Sekunden
  notes?:     string  // Optionale Notizen
) {
  const result = await pool.query<SessionRow>(
    `INSERT INTO sessions (user_id, category_id, start_time, end_time, duration, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, categoryId ?? null, startTime, endTime, duration, notes ?? null]
  );

  return result.rows[0]; // Neu erstellte Session zurückgeben
}

/* ── getSessions ─────────────────────────────────────────────── */
// Gibt alle Sessions eines Nutzers zurück, neueste zuerst.
// Joined mit categories, um Farbe und Name direkt mitzuliefern.
export async function getSessions(userId: number) {
  const result = await pool.query(
    `SELECT
       s.id,
       s.start_time,
       s.end_time,
       s.duration,
       s.notes,
       s.created_at,
       c.id    AS category_id,
       c.name  AS category_name,
       c.color AS category_color
     FROM sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.user_id = $1         -- Nur eigene Sessions
     ORDER BY s.start_time DESC   -- Neueste zuerst
     LIMIT 200`,                  // Maximal 200 Sessions laden (Sicherheitslimit)
    [userId]
  );

  return result.rows;
}

/* ── getSessionById ──────────────────────────────────────────── */
// Gibt eine einzelne Session zurück — prüft dass sie dem Nutzer gehört.
export async function getSessionById(sessionId: number, userId: number) {
  const result = await pool.query(
    `SELECT s.*, c.name AS category_name, c.color AS category_color
     FROM sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.id = $1 AND s.user_id = $2`, // Doppelte Sicherheitsprüfung
    [sessionId, userId]
  );

  return result.rows[0] ?? null; // null wenn nicht gefunden
}

/* ── deleteSession ───────────────────────────────────────────── */
// Löscht eine Session — nur wenn sie dem Nutzer gehört.
// Gibt true zurück wenn etwas gelöscht wurde, sonst false.
export async function deleteSession(sessionId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  // rowCount > 0 bedeutet, eine Zeile wurde wirklich gelöscht
  return (result.rowCount ?? 0) > 0;
}
