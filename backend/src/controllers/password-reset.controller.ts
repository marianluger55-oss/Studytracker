/*
 * controllers/password-reset.controller.ts
 * HTTP-Handler für Passwort-Reset-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Request, Response }  from 'express';
import { asyncHandler }        from '../utils/asyncHandler';
import { logger }              from '../utils/logger';
import * as passwordResetService from '../services/password-reset.service';

/* POST /api/auth/forgot-password
   Immer 200 — verhindert User-Enumeration durch unterschiedliche Antworten */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  await passwordResetService.requestPasswordReset(email);

  logger.info('Forgot-password angefragt', {
    email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
  });

  res.json({
    success: true,
    data:    { message: 'Falls diese E-Mail-Adresse registriert ist, erhältst du in Kürze eine E-Mail.' },
  });
});

/* POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };

  await passwordResetService.resetPassword(token, password);

  res.json({
    success: true,
    data:    { message: 'Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.' },
  });
});
