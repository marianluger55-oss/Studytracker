/*
 * controllers/stats.controller.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Handler für Statistik-Endpunkte.
 *
 * Alle Antworten: { success: true, data: {} }
 * Alle Statistiken sind Redis-gecacht (5 Min TTL) — schnelle Antwortzeiten
 * auch bei vielen Sessions. Cache wird nach jeder Session-Änderung invalidiert.
 * ─────────────────────────────────────────────────────────────
 */

import { Response }      from 'express';
import * as statsService from '../services/stats.service';
import { AuthRequest }   from '../types';
import { asyncHandler }  from '../utils/asyncHandler';

/* GET /stats/week — Lernminuten pro Tag der letzten 7 Tage (für Balkendiagramm) */
export const getWeekStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getWeekStats(req.userId!);
  res.json({ success: true, data: stats });
});

/* GET /stats/month — Lernminuten pro Woche der letzten 28 Tage (für Monats-Chart) */
export const getMonthStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getMonthStats(req.userId!);
  res.json({ success: true, data: stats });
});

/* GET /stats/categories — Lernzeit + Session-Count pro Kategorie (für Donut-Chart) */
export const getCategoryStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await statsService.getCategoryStats(req.userId!);
  res.json({ success: true, data: stats });
});

/* GET /stats/summary — Dashboard-Zusammenfassung: Heute, Woche, Gesamt, Streak */
export const getSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const summary = await statsService.getSummary(req.userId!);
  res.json({ success: true, data: summary });
});
