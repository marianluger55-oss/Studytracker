/*
 * controllers/sessions.controller.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Handler für Lernsessions-Endpunkte.
 *
 * Alle Antworten: { success: true, data: {} }
 * Alle Routes sind durch auth-Middleware geschützt (req.userId ist immer gesetzt).
 * Datenisolation: jede Query filtert nach req.userId → Nutzer sehen nur eigene Sessions.
 * ─────────────────────────────────────────────────────────────
 */

import { Response }          from 'express';
import * as sessionsService  from '../services/sessions.service';
import { AuthRequest }       from '../types';
import { asyncHandler }      from '../utils/asyncHandler'; /* Wrapper der async-Fehler an next() weitergibt */
import { AppError }          from '../middleware/errorHandler';

export const createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(createSessionSchema) in der Route geprüft — Typen sind sicher */
  const { categoryId, startTime, endTime, duration, notes } =
    req.body as {
      categoryId?: number | null;
      startTime:   string;
      endTime:     string;
      duration:    number;
      notes?:      string;
    };

  const session = await sessionsService.createSession(
    req.userId!,          /* ! = TypeScript-Non-Null-Assertion — auth-Middleware garantiert userId */
    categoryId ?? null,   /* undefined → null (DB erwartet null statt undefined) */
    startTime,
    endTime,
    duration,
    notes
  );
  res.status(201).json({ success: true, data: { session } }); /* 201 Created für neue Ressource */
});

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* ?limit=50&offset=0 — beide Werte werden serverseitig auf gültige Ranges geclampt (1-200 / ≥0) */
  const limit  = parseInt(String(req.query.limit  ?? '200'), 10); /* String → Zahl, Default 200 */
  const offset = parseInt(String(req.query.offset ?? '0'),   10); /* String → Zahl, Default 0 */

  const result = await sessionsService.getSessions(req.userId!, limit, offset);
  res.json({ success: true, data: result }); /* Enthält sessions[], total, limit, offset */
});

export const getSessionById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10); /* URL-Parameter ':id' als Zahl */
  if (isNaN(id)) throw new AppError(400, 'Ungültige Session-ID'); /* Keine Zahl → 400 Bad Request */

  const session = await sessionsService.getSessionById(id, req.userId!);
  if (!session) throw new AppError(404, 'Session nicht gefunden'); /* Nicht vorhanden oder andere userId */

  res.json({ success: true, data: { session } });
});

export const deleteSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Session-ID');

  /* deleteSession gibt false zurück wenn Session nicht existiert oder andere userId */
  const deleted = await sessionsService.deleteSession(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Session nicht gefunden');

  res.json({ success: true, data: null }); /* null: kein Body nötig bei Löschung */
});
