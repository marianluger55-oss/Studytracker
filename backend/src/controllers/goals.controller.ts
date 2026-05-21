/*
 * controllers/goals.controller.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Handler für Lernziele-Endpunkte.
 *
 * Alle Antworten: { success: true, data: {} }
 * Upsert-Logik: Pro Nutzer kann es maximal ein Ziel pro Zeitraum geben
 * (daily / weekly / monthly) — beim Setzen wird bestehendes überschrieben.
 * ─────────────────────────────────────────────────────────────
 */

import { Response }      from 'express';
import * as goalsService from '../services/goals.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';
import { AppError }      from '../middleware/errorHandler';

/* GET /goals — alle Ziele des Nutzers */
export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const goals = await goalsService.getGoals(req.userId!);
  res.json({ success: true, data: { goals } });
});

/* POST /goals — Ziel setzen oder updaten (Upsert: period ist eindeutig pro User) */
export const upsertGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(upsertGoalSchema) in der Route geprüft */
  const { period, targetHours } = req.body as { period: 'daily' | 'weekly' | 'monthly'; targetHours: number };
  const goal = await goalsService.upsertGoal(req.userId!, period, targetHours);
  res.status(201).json({ success: true, data: { goal } }); /* 201 auch bei Update (vereinfacht) */
});

/* DELETE /goals/:id — Ziel löschen */
export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Ziel-ID');

  /* deleteGoal gibt false zurück wenn Ziel nicht existiert oder andere userId */
  const deleted = await goalsService.deleteGoal(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Ziel nicht gefunden');

  res.json({ success: true, data: null });
});
