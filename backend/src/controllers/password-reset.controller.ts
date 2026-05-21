/*
 * controllers/password-reset.controller.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Handler für Passwort-Reset-Endpunkte.
 *
 * Sicherheit:
 *  - forgotPassword gibt immer 200 zurück — verhindert User-Enumeration.
 *    (Angreifer kann nicht unterscheiden ob E-Mail existiert oder nicht)
 *  - E-Mail wird vor dem Logging anonymisiert (Datenschutz)
 *  - Reset-Token ist auf dem Backend zeitlich limitiert (1 Stunde)
 * ─────────────────────────────────────────────────────────────
 */

import { Request, Response }     from 'express';
import { asyncHandler }           from '../utils/asyncHandler';
import { logger }                 from '../utils/logger';
import * as passwordResetService  from '../services/password-reset.service';

/* POST /api/auth/forgot-password
   Immer 200 — verhindert User-Enumeration durch unterschiedliche Antworten.
   Backend sucht User, sendet E-Mail wenn gefunden — gibt aber immer gleiche Antwort. */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  /* E-Mail-Suche + Token-Generierung + E-Mail-Versand (alles intern, kein throw bei unbekannter E-Mail) */
  await passwordResetService.requestPasswordReset(email);

  /* E-Mail vor dem Logging anonymisieren: "ma***@example.com" statt Klartext */
  logger.info('Forgot-password angefragt', {
    email: email.replace(/(.{2}).+(@.+)/, '$1***$2'), /* Regex: erste 2 Zeichen + *** + Domain */
  });

  /* Gleiche Antwort ob E-Mail gefunden oder nicht — kein Info-Leak */
  res.json({
    success: true,
    data:    { message: 'Falls diese E-Mail-Adresse registriert ist, erhältst du in Kürze eine E-Mail.' },
  });
});

/* POST /api/auth/reset-password — Token + neues Passwort setzen */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };

  /* Token prüfen + Passwort-Hash setzen + Token invalidieren (einmalige Nutzung) */
  await passwordResetService.resetPassword(token, password);

  res.json({
    success: true,
    data:    { message: 'Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.' },
  });
});
