/*
 * services/auth.service.ts
 * Authentifizierungs-Geschäftslogik.
 *
 * Security-Fixes:
 *  - SEC-01: Refresh-Token als SHA-256 Hash in DB gespeichert (nicht Klartext)
 *  - SEC-05: deleted_at IS NULL Filter bei allen User-Queries
 *  - SEC-06: Token-Rotation in atomarer Transaktion mit SELECT FOR UPDATE
 *  - Register: User + Token in einer Transaktion (kein Orphaned Record bei Fehler)
 */

import bcrypt           from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool }         from '../db/pool';
import { UserRow }      from '../types';
import { AppError }     from '../middleware/errorHandler';
import { config }       from '../config/env';
import { generateSecureToken, hashToken } from '../utils/crypto';

/* Kurzlebigen Access Token ausstellen (15 Minuten) */
function signAccessToken(userId: number): string {
  // expiresIn als unknown casten um strict StringValue-Typ-Check zu umgehen
  const options = { expiresIn: config.jwtExpiresIn } as SignOptions;
  return jwt.sign({ userId }, config.jwtSecret, options);
}

/* Ablaufdatum für Refresh Token (7 Tage ab jetzt) */
function refreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/* Benutzer-Objekt ohne password_hash */
function sanitizeUser(user: UserRow) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

/* ── register ──────────────────────────────────────────────────── */
export async function register(email: string, password: string, username: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Duplikat-Check — nur aktive Accounts (deleted_at IS NULL)
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }

    // Passwort hashen (12 Runden: ~250ms — schützt gegen Brute-Force)
    const password_hash = await bcrypt.hash(password, 12);

    const userResult = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at, password_hash`,
      [email.toLowerCase(), password_hash, username]
    );
    const user = userResult.rows[0];

    // Refresh-Token erzeugen und nur als Hash speichern (SEC-01)
    const refreshToken = generateSecureToken();
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashToken(refreshToken), refreshTokenExpiry()]
    );

    await client.query('COMMIT');

    return {
      user:         sanitizeUser(user),
      accessToken:  signAccessToken(user.id),
      refreshToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/* ── login ─────────────────────────────────────────────────────── */
export async function login(email: string, password: string) {
  // Nur aktive Accounts — deleted_at IS NULL (SEC-05)
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()]
  );
  const user = result.rows[0];

  // Absichtlich vage — verrät nicht ob E-Mail oder Passwort falsch ist
  if (!user) {
    // Dummy-Compare verhindet Timing-Attack: gleiche Antwortzeit egal ob User existiert
    await bcrypt.compare(password, '$2a$12$dummy.hash.to.prevent.timing.attack.xxxxxx');
    throw new AppError(401, 'Ungültige Anmeldedaten');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Ungültige Anmeldedaten');

  const refreshToken = generateSecureToken();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), refreshTokenExpiry()]
  );

  return {
    user:         sanitizeUser(user),
    accessToken:  signAccessToken(user.id),
    refreshToken,
  };
}

/* ── refreshAccessToken ────────────────────────────────────────── */
// Token-Rotation: Atomare Transaktion mit SELECT FOR UPDATE verhindert
// Race Conditions bei gleichzeitigen Refresh-Requests (SEC-06)
export async function refreshAccessToken(token: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // SELECT FOR UPDATE: sperrt die Zeile bis zum COMMIT — zweiter Request wartet
    const result = await client.query<{ id: number; user_id: number }>(
      `SELECT id, user_id
       FROM refresh_tokens
       WHERE token_hash = $1 AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError(401, 'Ungültiger oder abgelaufener Refresh-Token');
    }

    const { id: tokenId, user_id: userId } = result.rows[0];

    // Alten Token sofort löschen (Rotation)
    await client.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenId]);

    // Benutzer laden (nur aktive)
    const userResult = await client.query<UserRow>(
      'SELECT id, email, username, created_at, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      throw new AppError(401, 'Benutzer nicht gefunden');
    }

    // Neuen Token ausstellen
    const newRefreshToken = generateSecureToken();
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(newRefreshToken), refreshTokenExpiry()]
    );

    await client.query('COMMIT');

    return {
      user:         sanitizeUser(user),
      accessToken:  signAccessToken(userId),
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/* ── logout ────────────────────────────────────────────────────── */
export async function logout(token: string | undefined) {
  if (!token) return;
  // Hash des Tokens in DB suchen und löschen
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)]);
}

/* ── getMe ─────────────────────────────────────────────────────── */
export async function getMe(userId: number) {
  const result = await pool.query<UserRow>(
    'SELECT id, email, username, created_at, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (!result.rows[0]) throw new AppError(404, 'Benutzer nicht gefunden');
  return sanitizeUser(result.rows[0]);
}

/* ── logoutAllDevices ──────────────────────────────────────────── */
export async function logoutAllDevices(userId: number) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
