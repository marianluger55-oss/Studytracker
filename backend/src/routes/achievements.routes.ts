/*
 * routes/achievements.routes.ts
 *
 *  GET /api/achievements — Alle Errungenschaften mit Entsperrzeit
 */

import { Router }            from 'express';
import { getAchievements }   from '../controllers/achievements.controller';
import { auth }              from '../middleware/auth';

const router = Router();

router.get('/', auth, getAchievements);

export default router;
