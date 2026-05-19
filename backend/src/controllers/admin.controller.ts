/*
 * controllers/admin.controller.ts
 * HTTP-Handler für Admin-Endpunkte.
 */

import { Response }      from 'express';
import { z }             from 'zod';
import * as adminService from '../services/admin.service';
import * as audit        from '../services/audit.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';
import { AppError }      from '../middleware/errorHandler';

/* IP und User-Agent aus Request lesen */
function requestMeta(req: AuthRequest) {
  return {
    ip:        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
                 ?? req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

/* ── Benutzerliste ────────────────────────────────────────────── */
export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit      = Math.min(parseInt(String(req.query.limit  ?? '50'), 10), 100);
  const offset     = Math.max(parseInt(String(req.query.offset ?? '0'),  10), 0);
  const search     = String(req.query.search ?? '').trim();
  const roleFilter = String(req.query.role   ?? '').trim();
  const result = await adminService.getAllUsers(limit, offset, search, roleFilter);
  res.json({ success: true, data: result });
});

/* ── Plattform-Statistiken ────────────────────────────────────── */
export const getPlatformStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getPlatformStats();
  res.json({ success: true, data: stats });
});

/* ── Wachstums-Daten (Charts) ─────────────────────────────────── */
export const getGrowthData = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await adminService.getGrowthData();
  res.json({ success: true, data });
});

/* ── Live-Aktivitätsfeed ──────────────────────────────────────── */
export const getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10), 100);
  const data  = await adminService.getRecentActivity(limit);
  res.json({ success: true, data });
});

/* ── Nutzerprofil (Detail) ────────────────────────────────────── */
export const getUserDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Benutzer-ID');
  const user = await adminService.getUserDetail(id);
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');
  res.json({ success: true, data: user });
});

/* ── Sessions eines Nutzers widerrufen ────────────────────────── */
export const revokeSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Benutzer-ID');
  const count = await adminService.revokeUserSessions(id);

  audit.log('sessions_revoked', {
    userId: req.userId!,
    ...requestMeta(req),
    metadata: { targetUserId: id, revokedCount: count },
  });

  res.json({ success: true, data: { revokedCount: count } });
});

/* ── Rolle ändern ─────────────────────────────────────────────── */
const roleSchema = z.object({ role: z.enum(['user', 'admin']) });

export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) throw new AppError(400, 'Ungültige Benutzer-ID');
  if (targetId === req.userId) throw new AppError(400, 'Eigene Rolle kann nicht geändert werden');
  const { role } = roleSchema.parse(req.body);
  const user     = await adminService.setUserRole(targetId, role);
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

  audit.log('role_changed', {
    userId: req.userId!,
    ...requestMeta(req),
    metadata: { targetUserId: targetId, newRole: role },
  });

  res.json({ success: true, data: { user } });
});

/* ── Benutzer löschen (soft) ──────────────────────────────────── */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) throw new AppError(400, 'Ungültige Benutzer-ID');
  if (targetId === req.userId) throw new AppError(400, 'Eigener Account kann nicht gelöscht werden');
  await adminService.softDeleteUser(targetId);

  audit.log('admin_user_deleted', {
    userId: req.userId!,
    ...requestMeta(req),
    metadata: { targetUserId: targetId },
  });

  res.json({ success: true, data: null });
});

/* ── Audit-Logs ───────────────────────────────────────────────── */
export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit    = Math.min(parseInt(String(req.query.limit  ?? '50'), 10), 200);
  const offset   = Math.max(parseInt(String(req.query.offset ?? '0'),  10), 0);
  const userIdQ  = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
  const result   = await adminService.getAuditLogs(limit, offset, userIdQ);
  res.json({ success: true, data: result });
});
