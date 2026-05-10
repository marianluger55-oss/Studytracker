import bcrypt           from 'bcryptjs';
import { pool }         from '../db/pool';
import { AppError }     from '../middleware/errorHandler';
import { config }       from '../config/env';
import { logger }       from '../utils/logger';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { sendMail, buildPasswordResetEmail } from './email.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 Stunde

/* ── requestPasswordReset ────────────────────────────────────────
   Anti-User-Enumeration: Gibt immer denselben Status zurück,
   egal ob die E-Mail existiert oder nicht.                         */
export async function requestPasswordReset(email: string): Promise<void> {
  // Benutzer suchen — deleted_at IS NULL (soft-deleted User bekommen keinen Reset)
  const result = await pool.query<{ id: number; email: string; username: string }>(
    'SELECT id, email, username FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()]
  );
  const user = result.rows[0];

  if (!user) {
    // Kein Fehler — verhindert User Enumeration
    logger.securityEvent('password_reset_unknown_email', { email });
    return;
  }

  // Altes Token für diesen User löschen (nur 1 aktives Token pro User erlaubt)
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1',
    [user.id]
  );

  // Neues sicheres Token erzeugen (128 Hex-Zeichen = 64 Bytes)
  const rawToken  = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // Reset-Link bauen
  const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;

  // E-Mail senden (Fehler werden geloggt, nicht nach außen propagiert)
  const { html, text } = buildPasswordResetEmail(resetUrl);
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
  const tokenHash = hashToken(rawToken);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Token suchen — nicht abgelaufen, noch nicht verwendet
    const tokenResult = await client.query<{ id: number; user_id: number }>(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND used_at IS NULL
       FOR UPDATE`,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query('ROLLBACK');
      // Generische Fehlermeldung — kein Hinweis ob Token nie existiert hat oder abgelaufen ist
      throw new AppError(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte erneut anfordern.');
    }

    // Benutzer validieren (kann zwischenzeitlich gelöscht worden sein)
    const userResult = await client.query<{ id: number }>(
      'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [tokenRow.user_id]
    );
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError(400, 'Benutzer nicht gefunden.');
    }

    // Token als verwendet markieren (Single-Use — nicht löschen für Audit-Trail)
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [tokenRow.id]
    );

    // Neues Passwort hashen und speichern
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, tokenRow.user_id]
    );

    // Alle Refresh-Tokens widerrufen → alle Geräte werden ausgeloggt
    await client.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [tokenRow.user_id]
    );

    await client.query('COMMIT');

    logger.securityEvent('password_reset_completed', { userId: tokenRow.user_id });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/* ── cleanupExpiredTokens ────────────────────────────────────────
   Abgelaufene Tokens bereinigen — als Cron-Job aufrufbar.          */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW() OR used_at IS NOT NULL
     RETURNING id`
  );
  return result.rowCount ?? 0;
}
