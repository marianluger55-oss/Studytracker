/*
 * services/users.service.ts
 * Benutzerprofil-Verwaltung.
 */

import bcrypt      from 'bcryptjs';
import { pool }    from '../db/pool';
import { UserRow } from '../types';
import { AppError } from '../middleware/errorHandler';

/* ── updateProfile ─────────────────────────────────────────────── */
export async function updateProfile(
  userId: number,
  data: { username?: string; email?: string }
) {
  // Nur Felder setzen die wirklich übergeben wurden
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.username !== undefined) {
    fields.push(`username = $${idx++}`);
    values.push(data.username.trim());
  }
  if (data.email !== undefined) {
    const email = data.email.toLowerCase().trim();
    // Prüfen ob E-Mail schon vergeben ist (nicht von diesem User)
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
      [email, userId]
    );
    if (existing.rows.length > 0) throw new AppError(409, 'E-Mail bereits in Verwendung');
    fields.push(`email = $${idx++}`);
    values.push(email);
  }

  if (fields.length === 0) throw new AppError(400, 'Keine Felder zum Aktualisieren angegeben');

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await pool.query<UserRow>(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING id, email, username, created_at, password_hash`,
    values
  );
  if (!result.rows[0]) throw new AppError(404, 'Benutzer nicht gefunden');

  const { password_hash: _, ...safe } = result.rows[0];
  return safe;
}

/* ── changePassword ────────────────────────────────────────────── */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError(401, 'Aktuelles Passwort falsch');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId]
  );
}

/* ── exportData ────────────────────────────────────────────────── */
// DSGVO Art. 20: Alle Daten des Nutzers als strukturiertes JSON zurückgeben.
export async function exportData(userId: number) {
  const [userRes, sessionsRes, categoriesRes, goalsRes] = await Promise.all([
    pool.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    ),
    pool.query(
      'SELECT id, start_time, end_time, duration, notes, created_at FROM sessions WHERE user_id = $1 ORDER BY start_time DESC',
      [userId]
    ),
    pool.query(
      'SELECT id, name, color, created_at FROM categories WHERE user_id = $1 ORDER BY name',
      [userId]
    ),
    pool.query(
      'SELECT id, period, target_hours, created_at FROM goals WHERE user_id = $1',
      [userId]
    ),
  ]);

  return {
    exportedAt:  new Date().toISOString(),
    user:        userRes.rows[0] ?? null,
    sessions:    sessionsRes.rows,
    categories:  categoriesRes.rows,
    goals:       goalsRes.rows,
  };
}

/* ── deleteAccount ─────────────────────────────────────────────── */
// Soft-Delete: Daten werden markiert, nicht sofort gelöscht (DSGVO-Frist)
export async function deleteAccount(userId: number, password: string) {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Passwort falsch');

  // Alle Tokens sofort invalidieren
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  // Soft-Delete
  await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1',
    [userId]
  );
}
