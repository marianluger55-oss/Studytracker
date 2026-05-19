/*
 * routes/admin.routes.ts
 *
 *  GET    /api/admin/stats         → Plattform-Statistiken
 *  GET    /api/admin/users         → Alle Benutzer (paginiert)
 *  PATCH  /api/admin/users/:id/role → Rolle ändern
 *  DELETE /api/admin/users/:id     → Benutzer löschen
 */

import { Router } from 'express';
import { auth }       from '../middleware/auth';
import { adminAuth }  from '../middleware/adminAuth';
import {
  getUsers, getPlatformStats, updateUserRole, deleteUser,
} from '../controllers/admin.controller';

const router = Router();

/* Alle Admin-Routen brauchen auth + adminAuth */
router.use(auth, adminAuth);

router.get('/stats',            getPlatformStats);
router.get('/users',            getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id',     deleteUser);

export default router;
