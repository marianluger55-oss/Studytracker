/*
 * controllers/users.controller.ts
 * HTTP-Handler für Benutzerprofil-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }      from 'express';
import { z }             from 'zod';
import * as usersService from '../services/users.service';
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
  res.json({ success: true, data: null });
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { password } = deleteAccountSchema.parse(req.body);
  await usersService.deleteAccount(req.userId!, password);
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ success: true, data: null });
});
