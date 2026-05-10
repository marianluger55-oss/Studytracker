/*
 * routes/stats.routes.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Routen für Statistiken.
 *
 *  GET /api/stats/week     → Lernzeit pro Tag (letzte 7 Tage)
 *  GET /api/stats/month    → Lernzeit pro Woche (letzte 4 Wochen)
 *  GET /api/stats/category → Lernzeit pro Kategorie
 *  GET /api/stats/summary  → Gesamtüberblick (Zeit, Streak, Anzahl)
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { getWeekStats, getMonthStats, getCategoryStats, getSummary }
  from '../controllers/stats.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Alle Statistik-Routen sind geschützt — JWT erforderlich
router.get('/week',     auth, getWeekStats);      // Wöchentliche Statistik
router.get('/month',    auth, getMonthStats);     // Monatliche Statistik
router.get('/category', auth, getCategoryStats);  // Fach-Statistik
router.get('/summary',  auth, getSummary);        // Gesamtüberblick

export default router;
