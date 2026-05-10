/*
 * controllers/stats.controller.ts
 * HTTP-Handler für Statistik-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }      from 'express';
import * as statsService from '../services/stats.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';

export const getWeekStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getWeekStats(req.userId!);
  res.json({ success: true, data: stats });
});

export const getMonthStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getMonthStats(req.userId!);
  res.json({ success: true, data: stats });
});

export const getCategoryStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getCategoryStats(req.userId!);
  res.json({ success: true, data: stats });
});

export const getSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const summary = await statsService.getSummary(req.userId!);
  res.json({ success: true, data: summary });
});
