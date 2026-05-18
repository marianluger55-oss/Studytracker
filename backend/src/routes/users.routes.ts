/*
 * routes/users.routes.ts
 *
 *  GET    /api/users/profile          → Profil lesen
 *  PUT    /api/users/profile          → Profil aktualisieren
 *  PUT    /api/users/password         → Passwort ändern
 *  DELETE /api/users/account          → Account löschen (Soft-Delete)
 */

import { Router } from 'express';
import { getProfile, updateProfile, changePassword, deleteAccount, exportData } from '../controllers/users.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/profile',     auth, getProfile);
router.put('/profile',     auth, updateProfile);
router.put('/password',    auth, changePassword);
router.get('/export',      auth, exportData);
router.delete('/account',  auth, deleteAccount);

export default router;
