/*
 * routes/admin.routes.ts
 * ─────────────────────────────────────────────────────────────
 * Admin-Routen: Plattform-Verwaltung und Monitoring.
 *
 * Sicherheits-Layer (router.use):
 *  1. adminLimiter: Rate-Limiter speziell für Admin (verhindert automatisierte Scans)
 *  2. auth:         JWT-Authentifizierung — setzt req.userId
 *  3. adminAuth:    Prüft ob req.userId ein Admin-Konto hat (role = 'admin')
 *
 * Alle Admin-Routen sind dreifach gesichert:
 *  Rate-Limit + gültiger JWT + Admin-Rolle.
 *
 * Endpunkte:
 *  GET  /api/admin/stats                    → Plattform-Statistiken (User-, Session-Counts)
 *  GET  /api/admin/growth                   → Wachstums-Daten (letzte 14 Tage)
 *  GET  /api/admin/activity                 → Live-Aktivitätsfeed (letzte 24h)
 *  GET  /api/admin/audit                    → Audit-Log Einträge (paginiert)
 *  GET  /api/admin/users                    → Alle Benutzer (paginiert, Suche, Rollenfilter)
 *  GET  /api/admin/users/:id                → Detailprofil eines Nutzers
 *  PATCH  /api/admin/users/:id/role         → Rolle ändern (user ↔ admin)
 *  POST   /api/admin/users/:id/revoke-sessions → Alle Tokens widerrufen
 *  DELETE /api/admin/users/:id              → Nutzer soft-löschen
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { auth }         from '../middleware/auth';
import { adminAuth }    from '../middleware/adminAuth';
import { adminLimiter } from '../middleware/rateLimiter';
import {
  getUsers, getPlatformStats, getGrowthData, getRecentActivity,
  getUserDetail, revokeSessions, updateUserRole, deleteUser, getAuditLogs,
} from '../controllers/admin.controller';

const router = Router();

/* Alle Admin-Routen: Rate-Limit + JWT-Auth + Role-Check
   router.use gilt für alle folgenden router.get/post/... */
router.use(adminLimiter, auth, adminAuth);

router.get('/stats',                       getPlatformStats);
router.get('/growth',                      getGrowthData);
router.get('/activity',                    getRecentActivity);
router.get('/audit',                       getAuditLogs);
router.get('/users',                       getUsers);
router.get('/users/:id',                   getUserDetail);
router.patch('/users/:id/role',            updateUserRole);
router.post('/users/:id/revoke-sessions',  revokeSessions);
router.delete('/users/:id',                deleteUser);

export default router;
