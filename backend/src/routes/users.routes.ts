/*
 * routes/users.routes.ts
 *
 *  GET    /api/users/profile          → Profil lesen
 *  PUT    /api/users/profile          → Profil aktualisieren
 *  PUT    /api/users/password         → Passwort ändern (strictLimiter: 10/min)
 *  GET    /api/users/export           → Datenenexport (DSGVO Art. 20)
 *  DELETE /api/users/account          → Account löschen (Soft-Delete)
 */

import { Router } from 'express';
import { getProfile, updateProfile, changePassword, deleteAccount, exportData } from '../controllers/users.controller';
import { auth } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/profile',     auth, getProfile);
router.put('/profile',     auth, updateProfile);
/* strictLimiter (10/min): Passwort-Änderung ist Brute-Force-Ziel */
router.put('/password',    strictLimiter, auth, changePassword);
router.get('/export',      auth, exportData);
router.delete('/account',  auth, deleteAccount);

export default router;
