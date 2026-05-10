/*
 * controllers/sessions.controller.ts
 * HTTP-Handler für Lernsessions-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }          from 'express';
import * as sessionsService  from '../services/sessions.service';
import { AuthRequest }       from '../types';
import { asyncHandler }      from '../utils/asyncHandler';
import { AppError }          from '../middleware/errorHandler';

export const createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(createSessionSchema) in der Route geprüft */
  const { categoryId, startTime, endTime, duration, notes } =
    req.body as {
      categoryId?: number | null;
      startTime:   string;
      endTime:     string;
      duration:    number;
      notes?:      string;
    };

  const session = await sessionsService.createSession(
    req.userId!,
    categoryId ?? null,
    startTime,
    endTime,
    duration,
    notes
  );
  res.status(201).json({ success: true, data: { session } });
});

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await sessionsService.getSessions(req.userId!);
  res.json({ success: true, data: { sessions } });
});

export const getSessionById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Session-ID');

  const session = await sessionsService.getSessionById(id, req.userId!);
  if (!session) throw new AppError(404, 'Session nicht gefunden');

  res.json({ success: true, data: { session } });
});

export const deleteSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Session-ID');

  const deleted = await sessionsService.deleteSession(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Session nicht gefunden');

  res.json({ success: true, data: null });
});
