/*
 * controllers/admin.controller.ts
 * HTTP-Handler für Admin-Endpunkte.
 */

import { Response }      from 'express';
import { z }             from 'zod';
import * as adminService from '../services/admin.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';
import { AppError }      from '../middleware/errorHandler';

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit  = Math.min(parseInt(String(req.query.limit  ?? '50'), 10), 100);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'),  10), 0);
  const result = await adminService.getAllUsers(limit, offset);
  res.json({ success: true, data: result });
});

export const getPlatformStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getPlatformStats();
  res.json({ success: true, data: stats });
});

const roleSchema = z.object({ role: z.enum(['user', 'admin']) });

export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) throw new AppError(400, 'Ungültige Benutzer-ID');

  /* Admin kann sich nicht selbst degradieren */
  if (targetId === req.userId) throw new AppError(400, 'Eigene Rolle kann nicht geändert werden');

  const { role } = roleSchema.parse(req.body);
  const user     = await adminService.setUserRole(targetId, role);
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');
  res.json({ success: true, data: { user } });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) throw new AppError(400, 'Ungültige Benutzer-ID');
  if (targetId === req.userId) throw new AppError(400, 'Eigener Account kann nicht gelöscht werden');

  await adminService.softDeleteUser(targetId);
  res.json({ success: true, data: null });
});
