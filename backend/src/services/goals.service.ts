/*
 * services/goals.service.ts
 * ─────────────────────────────────────────────────────────────
 * Geschäftslogik für Lernziele.
 *
 * Constraint: Pro Benutzer max. 1 Ziel pro Zeitraum
 * (UNIQUE(user_id, period) in der DB — enforced via ON CONFLICT).
 * ─────────────────────────────────────────────────────────────
 */

import { pool }    from '../db/pool';
import { GoalRow } from '../types';

/* ── getGoals ──────────────────────────────────────────────────── */
/* Alle Ziele des Nutzers — sortiert: Täglich → Wöchentlich → Monatlich.
   CASE WHEN ORDER BY: keine alphabetische Sortierung sondern logische Reihenfolge. */
export async function getGoals(userId: number) {
  const result = await pool.query<GoalRow>(
    `SELECT id, user_id, period, target_hours, created_at
     FROM goals
     WHERE user_id = $1
     ORDER BY
       CASE period WHEN 'daily' THEN 1 WHEN 'weekly' THEN 2 ELSE 3 END`, /* 1=täglich, 2=wöchentlich, 3=monatlich */
    [userId]
  );
  return result.rows;
}

/* ── upsertGoal ────────────────────────────────────────────────── */
/* Erstellt oder überschreibt das Ziel für einen Zeitraum (PostgreSQL UPSERT).
   ON CONFLICT: wenn (user_id, period) bereits existiert → target_hours aktualisieren.
   EXCLUDED.target_hours: bezieht sich auf den neuen Wert aus der INSERT-Zeile. */
export async function upsertGoal(userId: number, period: 'daily' | 'weekly' | 'monthly', targetHours: number) {
  const result = await pool.query<GoalRow>(
    `INSERT INTO goals (user_id, period, target_hours)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, period)                          /* Gleicher User + gleiche Periode */
     DO UPDATE SET target_hours = EXCLUDED.target_hours    /* Stundenzahl überschreiben */
     RETURNING id, user_id, period, target_hours, created_at`,
    [userId, period, targetHours]
  );
  return result.rows[0]; /* Gibt das gespeicherte/aktualisierte Ziel zurück */
}

/* ── deleteGoal ────────────────────────────────────────────────── */
/* Löscht ein Ziel — nur wenn es dem Nutzer gehört.
   Gibt true zurück wenn etwas gelöscht wurde. */
export async function deleteGoal(goalId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM goals WHERE id = $1 AND user_id = $2', /* userId-Check: Datenisolation */
    [goalId, userId]
  );
  return (result.rowCount ?? 0) > 0; /* rowCount > 0 = erfolgreich gelöscht */
}
