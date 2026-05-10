/*
 * services/goals.service.ts
 * Geschäftslogik für Lernziele.
 * Pro Benutzer max. 1 Ziel pro Zeitraum (UNIQUE constraint in DB).
 */

import { pool }   from '../db/pool';
import { GoalRow } from '../types';

/* ── getGoals ──────────────────────────────────────────────────── */
export async function getGoals(userId: number) {
  const result = await pool.query<GoalRow>(
    `SELECT id, user_id, period, target_hours, created_at
     FROM goals
     WHERE user_id = $1
     ORDER BY
       CASE period WHEN 'daily' THEN 1 WHEN 'weekly' THEN 2 ELSE 3 END`,
    [userId]
  );
  return result.rows;
}

/* ── upsertGoal ────────────────────────────────────────────────── */
// Erstellt oder überschreibt das Ziel für einen Zeitraum (UPSERT).
export async function upsertGoal(userId: number, period: 'daily' | 'weekly' | 'monthly', targetHours: number) {
  const result = await pool.query<GoalRow>(
    `INSERT INTO goals (user_id, period, target_hours)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, period)
     DO UPDATE SET target_hours = EXCLUDED.target_hours
     RETURNING id, user_id, period, target_hours, created_at`,
    [userId, period, targetHours]
  );
  return result.rows[0];
}

/* ── deleteGoal ────────────────────────────────────────────────── */
export async function deleteGoal(goalId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM goals WHERE id = $1 AND user_id = $2',
    [goalId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
