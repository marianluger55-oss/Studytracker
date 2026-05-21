/*
 * services/users.service.ts
 * ─────────────────────────────────────────────────────────────
 * Geschäftslogik für Benutzerprofil-Verwaltung.
 *
 * Funktionen:
 *  - updateProfile:  Nutzername oder E-Mail ändern
 *  - changePassword: Passwort ändern (invalidiert alle Refresh-Tokens)
 *  - exportData:     DSGVO Art. 20 Datenexport
 *  - deleteAccount:  Soft-Delete mit Passwortbestätigung
 * ─────────────────────────────────────────────────────────────
 */

import bcrypt       from 'bcryptjs';    /* Passwort-Hashing Bibliothek */
import { pool }     from '../db/pool';
import { UserRow }  from '../types';
import { AppError } from '../middleware/errorHandler';

/* ── updateProfile ─────────────────────────────────────────────── */
/* Aktualisiert Nutzerprofil-Felder — nur übergebene Felder werden geändert.
   Dynamisches SQL: verhindert leere UPDATE-Statements wenn kein Feld übergeben. */
export async function updateProfile(
  userId: number,
  data: { username?: string; email?: string }
) {
  /* Dynamisches SQL: Arrays sammeln welche Felder aktualisiert werden */
  const fields: string[] = [];    /* z.B. ["username = $1", "email = $2"] */
  const values: unknown[] = [];   /* Entsprechende Werte für die Bind-Parameter */
  let idx = 1;                    /* Zähler für parametrisierte Query ($1, $2, ...) */

  if (data.username !== undefined) {
    fields.push(`username = $${idx++}`);        /* $1 für ersten Parameter */
    values.push(data.username.trim());           /* Leerzeichen am Rand entfernen */
  }
  if (data.email !== undefined) {
    const email = data.email.toLowerCase().trim(); /* E-Mail immer lowercase — konsistente Suche */
    /* Prüfen ob E-Mail schon vergeben ist (von einem anderen User) */
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
      [email, userId]
    );
    if (existing.rows.length > 0) throw new AppError(409, 'E-Mail bereits in Verwendung');
    fields.push(`email = $${idx++}`);
    values.push(email);
  }

  /* Mindestens ein Feld muss geändert werden */
  if (fields.length === 0) throw new AppError(400, 'Keine Felder zum Aktualisieren angegeben');

  fields.push(`updated_at = NOW()`);  /* Timestamp immer aktualisieren */
  values.push(userId);                /* userId als letzter Parameter für WHERE-Klausel */

  const result = await pool.query<UserRow>(
    /* Dynamisch zusammengebautes SQL: "UPDATE users SET username = $1, email = $2 WHERE id = $3" */
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING id, email, username, created_at, password_hash`,
    values
  );
  if (!result.rows[0]) throw new AppError(404, 'Benutzer nicht gefunden');

  /* password_hash aus der Antwort entfernen — niemals an Frontend senden */
  const { password_hash: _, ...safe } = result.rows[0];
  return safe;
}

/* ── changePassword ────────────────────────────────────────────── */
/* Passwort ändern mit Sicherheitsprüfung:
   1. Aktuelles Passwort verifizieren (verhindert Übernahme bei gestohlener Session)
   2. Neues Passwort hashen (bcrypt, Kostenfaktor 12)
   3. In Transaktion: Hash updaten + alle Refresh-Tokens löschen */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  /* Aktuellen User laden um password_hash zu bekommen */
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

  /* Eingegebenes Passwort gegen gespeicherten Hash prüfen (bcrypt.compare ist timing-sicher) */
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError(401, 'Aktuelles Passwort falsch');

  /* Neues Passwort hashen — Kostenfaktor 12 = ~300ms Rechenzeit (Brute-Force-Schutz) */
  const newHash = await bcrypt.hash(newPassword, 12);

  /* Transaktion: Hash und Token-Löschung müssen atomisch passieren */
  const client = await pool.connect(); /* Dedizierte Verbindung für BEGIN/COMMIT */
  try {
    await client.query('BEGIN');
    /* 1. Neuen Hash speichern */
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId],
    );
    /* 2. Alle Refresh-Tokens invalidieren — zwingt Re-Login auf allen Geräten */
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('COMMIT'); /* Beide Änderungen gleichzeitig sichtbar */
  } catch (err) {
    await client.query('ROLLBACK'); /* Bei Fehler: keins der beiden Änderungen übernehmen */
    throw err;
  } finally {
    client.release(); /* Verbindung zurück in den Pool — auch bei Fehler */
  }
}

/* ── exportData ────────────────────────────────────────────────── */
/* DSGVO Art. 20 (Recht auf Datenübertragbarkeit): alle Nutzerdaten als JSON.
   Promise.all: alle 4 Queries parallel ausführen (schneller als nacheinander). */
export async function exportData(userId: number) {
  const [userRes, sessionsRes, categoriesRes, goalsRes] = await Promise.all([
    /* Nutzerprofil — ohne password_hash (sensitiv) */
    pool.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    ),
    /* Alle Lernsessions, neueste zuerst */
    pool.query(
      'SELECT id, start_time, end_time, duration, notes, created_at FROM sessions WHERE user_id = $1 ORDER BY start_time DESC',
      [userId]
    ),
    /* Alle Kategorien alphabetisch */
    pool.query(
      'SELECT id, name, color, created_at FROM categories WHERE user_id = $1 ORDER BY name',
      [userId]
    ),
    /* Alle Lernziele */
    pool.query(
      'SELECT id, period, target_hours, created_at FROM goals WHERE user_id = $1',
      [userId]
    ),
  ]);

  return {
    exportedAt:  new Date().toISOString(),  /* Zeitstempel des Exports für den Nutzer */
    user:        userRes.rows[0] ?? null,
    sessions:    sessionsRes.rows,
    categories:  categoriesRes.rows,
    goals:       goalsRes.rows,
  };
}

/* ── deleteAccount ─────────────────────────────────────────────── */
/* Soft-Delete mit Passwortbestätigung — Daten werden markiert, nicht sofort gelöscht.
   Soft-Delete: deleted_at Timestamp wird gesetzt, Daten bleiben für DSGVO-Frist erhalten.
   Passwortbestätigung: verhindert Account-Löschung durch gestohlene Session. */
export async function deleteAccount(userId: number, password: string) {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

  /* Passwort prüfen bevor Account gelöscht wird (destruktive Aktion) */
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Passwort falsch');

  /* Alle aktiven Sessions sofort ungültig machen — Nutzer kann sich nicht mehr einloggen */
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  /* Soft-Delete: deleted_at setzen statt Zeile zu löschen
     → Nutzer wird in allen Queries ausgeblendet (WHERE deleted_at IS NULL)
     → Daten bleiben für eventuelle Wiederherstellung oder DSGVO-Anfragen */
  await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1',
    [userId]
  );
}
