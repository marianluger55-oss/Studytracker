/*
 * controllers/users.controller.ts
 * HTTP-Handler für Benutzerprofil-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }      from 'express';
import { z }             from 'zod';
import * as usersService from '../services/users.service';
import * as audit        from '../services/audit.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';

const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).trim().optional(),
  email:    z.string().email('Ungültige E-Mail').optional(),
}).refine((d) => d.username || d.email, {
  message: 'Mindestens ein Feld (username oder email) muss angegeben werden',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string()
    .min(8, 'Mindestens 8 Zeichen')
    .max(100)
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Passwort erforderlich'),
});

/* IP und User-Agent aus Request lesen */
function requestMeta(req: AuthRequest) {
  return {
    ip:        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
                 ?? req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const authService = await import('../services/auth.service');
  const user = await authService.getMe(req.userId!);
  res.json({ success: true, data: { user } });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await usersService.updateProfile(req.userId!, data);
  res.json({ success: true, data: { user } });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await usersService.changePassword(req.userId!, currentPassword, newPassword);

  audit.log('password_changed', { userId: req.userId!, ...requestMeta(req) });

  res.json({ success: true, data: null });
});

export const exportData = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* DSGVO Art. 20 — Datenportabilität: alle eigenen Daten als JSON-Download */
  const data = await usersService.exportData(req.userId!);

  audit.log('data_exported', { userId: req.userId!, ...requestMeta(req) });

  const filename = `studytracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { password } = deleteAccountSchema.parse(req.body);
  await usersService.deleteAccount(req.userId!, password);

  audit.log('account_deleted', { userId: req.userId!, ...requestMeta(req) });

  res.clearCookie('refreshToken', { path: '/' });
  res.json({ success: true, data: null });
});
