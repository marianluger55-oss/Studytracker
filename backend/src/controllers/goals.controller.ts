/*
 * controllers/goals.controller.ts
 * HTTP-Handler für Ziele-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }      from 'express';
import * as goalsService from '../services/goals.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';
import { AppError }      from '../middleware/errorHandler';

export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const goals = await goalsService.getGoals(req.userId!);
  res.json({ success: true, data: { goals } });
});

export const upsertGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(upsertGoalSchema) in der Route geprüft */
  const { period, targetHours } = req.body as { period: 'daily' | 'weekly' | 'monthly'; targetHours: number };
  const goal = await goalsService.upsertGoal(req.userId!, period, targetHours);
  res.status(201).json({ success: true, data: { goal } });
});

export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Ziel-ID');

  const deleted = await goalsService.deleteGoal(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Ziel nicht gefunden');

  res.json({ success: true, data: null });
});
