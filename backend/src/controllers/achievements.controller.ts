/*
 * controllers/achievements.controller.ts
 * HTTP-Handler für Errungenschaften.
 *
 *  GET /api/achievements — Gibt alle Errungenschaften mit Entsperrzeit zurück.
 *                          Prüft und entsperrt neue Errungenschaften automatisch.
 */

import { Response }            from 'express';
import * as achievementsService from '../services/achievements.service';
import { AuthRequest }          from '../types';
import { asyncHandler }         from '../utils/asyncHandler';

export const getAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const achievements = await achievementsService.getWithStatus(req.userId!);
  res.json({ success: true, data: { achievements } });
});
