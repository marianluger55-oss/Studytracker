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

  await invalidateUserCache(userId); // Stats-Cache nach neuer Session invalidieren
  return result.rows[0];
}

/* ── getSessions ─────────────────────────────────────────────── */
// Gibt Sessions eines Nutzers zurück, neueste zuerst.
// limit/offset ermöglichen Pagination; maximum 200 pro Seite.
export async function getSessions(
  userId: number,
  limit  = 200,
  offset = 0,
) {
  const safeLimit  = Math.min(Math.max(1, limit), 200);
  const safeOffset = Math.max(0, offset);

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
     WHERE s.user_id = $1
     ORDER BY s.start_time DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );

  /* Gesamtanzahl für Pagination-Meta */
  const countResult = await pool.query<{ total: string }>(
    'SELECT COUNT(*) AS total FROM sessions WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  return { sessions: result.rows, total, limit: safeLimit, offset: safeOffset };
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

  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) await invalidateUserCache(userId);
  return deleted;
}
