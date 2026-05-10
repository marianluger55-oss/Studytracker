/*
 * services/categories.service.ts
 * ─────────────────────────────────────────────────────────────
 * Geschäftslogik für Lernkategorien (Fächer).
 *
 * Jede Abfrage filtert nach user_id — ein Nutzer sieht
 * und verwaltet ausschließlich seine eigenen Kategorien.
 * ─────────────────────────────────────────────────────────────
 */

import { pool } from '../db/pool';
import { CategoryRow } from '../types';

/* ── getCategories ───────────────────────────────────────────── */
// Gibt alle Kategorien eines Nutzers zurück, mit der
// Gesamtlernzeit pro Kategorie (aus der sessions-Tabelle berechnet).
export async function getCategories(userId: number) {
  const result = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.color,
       c.created_at,
       -- SUM addiert die Sekunden aller Sessions dieser Kategorie
       -- COALESCE ersetzt NULL durch 0 wenn keine Sessions vorhanden
       COALESCE(SUM(s.duration), 0)::integer AS total_seconds
     FROM categories c
     LEFT JOIN sessions s ON s.category_id = c.id AND s.user_id = $1
     WHERE c.user_id = $1
     GROUP BY c.id, c.name, c.color, c.created_at
     ORDER BY c.created_at ASC`, // Älteste zuerst
    [userId]
  );

  // Sekunden in Minuten umrechnen, damit das Frontend konsistent bleibt
  return result.rows.map((row) => ({
    ...row,
    totalMinutes: Math.floor(row.total_seconds / 60), // Sekunden → Minuten
  }));
}

/* ── createCategory ──────────────────────────────────────────── */
// Legt eine neue Kategorie an.
export async function createCategory(userId: number, name: string, color: string) {
  const result = await pool.query<CategoryRow>(
    `INSERT INTO categories (user_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, name, color]
  );

  return result.rows[0];
}

/* ── deleteCategory ──────────────────────────────────────────── */
// Löscht eine Kategorie — nur wenn sie dem Nutzer gehört.
// Dank ON DELETE SET NULL in der DB bleiben Sessions erhalten,
// aber ihre category_id wird auf NULL gesetzt.
export async function deleteCategory(categoryId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );

  return (result.rowCount ?? 0) > 0; // true = etwas wurde gelöscht
}
