/*
 * services/password-reset.service.ts
 * ─────────────────────────────────────────────────────────────
 * Passwort-Reset via E-Mail-Token.
 *
 * Sicherheits-Design:
 *  - Anti-User-Enumeration: Gleiche Antwort ob E-Mail existiert oder nicht
 *  - Einmal-Token: nach Nutzung als used_at markiert (nicht gelöscht für Audit-Trail)
 *  - Token-Hash in DB: rawToken geht nur per E-Mail — DB speichert nur SHA256-Hash
 *  - FOR UPDATE: verhindert Race Conditions bei gleichzeitigen Reset-Versuchen
 *  - Nach erfolgreichem Reset: ALLE Refresh-Tokens widerrufen (alle Geräte ausloggen)
 * ─────────────────────────────────────────────────────────────
 */

import bcrypt           from 'bcryptjs';
import { pool }         from '../db/pool';
import { AppError }     from '../middleware/errorHandler';
import { config }       from '../config/env';
import { logger }       from '../utils/logger';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { sendMail, buildPasswordResetEmail } from './email.service';

/* Token-Gültigkeitsdauer: 1 Stunde in Millisekunden */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/* ── requestPasswordReset ────────────────────────────────────────
   Anti-User-Enumeration: Gibt immer void zurück,
   egal ob die E-Mail existiert oder nicht.                         */
export async function requestPasswordReset(email: string): Promise<void> {
  /* Benutzer suchen — deleted_at IS NULL: soft-deleted User bekommen keinen Reset */
  const result = await pool.query<{ id: number; email: string; username: string }>(
    'SELECT id, email, username FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()] /* Lowercase: konsistente Suche (E-Mails werden lowercase gespeichert) */
  );
  const user = result.rows[0];

  if (!user) {
    /* Kein throw, kein anderer Return — verhindert User Enumeration */
    logger.securityEvent('password_reset_unknown_email', { email });
    return; /* Stille Rückkehr — gleicher Code-Pfad wie bei bekannter E-Mail */
  }

  /* Altes Token für diesen User löschen — nur 1 aktives Token pro User erlaubt */
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1',
    [user.id]
  );

  /* Neues sicheres Token erzeugen: 64 Bytes = 128 Hex-Zeichen (kryptographisch sicher) */
  const rawToken  = generateSecureToken();  /* Nur per E-Mail übermittelt — verlässt den Server nicht */
  const tokenHash = hashToken(rawToken);    /* SHA256-Hash wird in DB gespeichert (Token-Diebstahl aus DB nutzlos) */
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS); /* Ablaufzeit: jetzt + 1 Stunde */

  /* Token-Hash + Ablaufzeit in DB speichern */
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  /* Reset-Link: rawToken als URL-Parameter — HTTPS überträgt ihn verschlüsselt */
  const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;

  /* E-Mail senden mit Reset-Link */
  const { html, text } = buildPasswordResetEmail(resetUrl); /* HTML + Plain-Text Version */
  await sendMail({
    to:      user.email,
    subject: 'Passwort zurücksetzen — StudyTracker',
    html,
    text,
  });

  logger.securityEvent('password_reset_requested', { userId: user.id });
}

/* ── resetPassword ───────────────────────────────────────────────
   Token validieren, Passwort ändern, Token invalidieren,
   alle Refresh-Tokens widerrufen (Sicherheits-Best-Practice).      */
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  /* Token hashen um in DB zu suchen (DB enthält nur den Hash, nicht das rohe Token) */
  const tokenHash = hashToken(rawToken);

  /* Transaktion: alle Schritte müssen gemeinsam gelingen oder nichts ändert sich */
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* Token suchen — nicht abgelaufen (expires_at > NOW()), noch nicht verwendet (used_at IS NULL) */
    /* FOR UPDATE: Zeile sperren — verhindert Race Condition bei parallelen Reset-Anfragen */
    const tokenResult = await client.query<{ id: number; user_id: number }>(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()   -- Abgelaufen? → nicht akzeptieren
         AND used_at IS NULL      -- Schon verwendet? → nicht akzeptieren
       FOR UPDATE`,               /* Zeilensperre gegen Race Conditions */
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query('ROLLBACK');
      /* Generische Fehlermeldung — kein Hinweis ob Token nie existiert hat oder abgelaufen ist */
      throw new AppError(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte erneut anfordern.');
    }

    /* Benutzer validieren — kann zwischenzeitlich soft-deleted worden sein */
    const userResult = await client.query<{ id: number }>(
      'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [tokenRow.user_id]
    );
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError(400, 'Benutzer nicht gefunden.');
    }

    /* Token als verwendet markieren (Single-Use) — nicht löschen für Audit-Trail */
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [tokenRow.id]
    );

    /* Neues Passwort hashen — Kostenfaktor 12 = sicher gegen Brute-Force */
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, tokenRow.user_id]
    );

    /* Alle Refresh-Tokens widerrufen → alle eingeloggten Geräte werden ausgeloggt */
    /* Sicherheits-Best-Practice: Passwort-Änderung invalidiert bestehende Sessions */
    await client.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [tokenRow.user_id]
    );

    await client.query('COMMIT'); /* Alle 4 Änderungen gleichzeitig sichtbar */

    logger.securityEvent('password_reset_completed', { userId: tokenRow.user_id });
  } catch (err) {
    await client.query('ROLLBACK'); /* Bei Fehler: keine der Änderungen übernehmen */
    throw err;
  } finally {
    client.release(); /* Verbindung zurück in den Pool — auch bei Fehler */
  }
}

/* ── cleanupExpiredTokens ────────────────────────────────────────
   Abgelaufene und verwendete Tokens bereinigen — als Cron-Job aufrufbar.
   Gibt Anzahl gelöschter Zeilen zurück für Logging. */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW()    -- Token abgelaufen
        OR used_at IS NOT NULL   -- Token schon verwendet
     RETURNING id`               /* RETURNING: rowCount wird korrekt befüllt */
  );
  return result.rowCount ?? 0; /* Anzahl der gelöschten Tokens */
}
