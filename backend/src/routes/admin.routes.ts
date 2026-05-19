/*
 * routes/admin.routes.ts
 *
 *  GET  /api/admin/stats                    → Plattform-Statistiken
 *  GET  /api/admin/growth                   → Wachstums-Daten (Charts)
 *  GET  /api/admin/activity                 → Live-Aktivitätsfeed
 *  GET  /api/admin/users                    → Alle Benutzer (paginiert, Suche, Filter)
 *  GET  /api/admin/users/:id                → Nutzerprofil Detail
 *  PATCH  /api/admin/users/:id/role         → Rolle ändern
 *  POST   /api/admin/users/:id/revoke-sessions → Sessions widerrufen
 *  DELETE /api/admin/users/:id              → Benutzer löschen
 */

import { Router } from 'express';
import { auth }         from '../middleware/auth';
import { adminAuth }    from '../middleware/adminAuth';
import { adminLimiter } from '../middleware/rateLimiter';
import {
  getUsers, getPlatformStats, getGrowthData, getRecentActivity,
  getUserDetail, revokeSessions, updateUserRole, deleteUser,
} from '../controllers/admin.controller';

const router = Router();

/* Alle Admin-Routen: eigenes Rate-Limit + auth + Role-Check */
router.use(adminLimiter, auth, adminAuth);

router.get('/stats',                       getPlatformStats);
router.get('/growth',                      getGrowthData);
router.get('/activity',                    getRecentActivity);
router.get('/users',                       getUsers);
router.get('/users/:id',                   getUserDetail);
router.patch('/users/:id/role',            updateUserRole);
router.post('/users/:id/revoke-sessions',  revokeSessions);
router.delete('/users/:id',                deleteUser);

export default router;
