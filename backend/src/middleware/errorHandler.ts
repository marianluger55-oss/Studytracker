/*
 * middleware/errorHandler.ts
 * ─────────────────────────────────────────────────────────────
 * Zentraler Fehler-Handler für alle Express-Routen.
 *
 * Jeder Fehler der mit next(err) weitergeleitet wird landet hier.
 * Drei Fehlertypen werden unterschieden:
 *  1. ZodError     → 400 Bad Request (Validierungsfehler)
 *  2. AppError     → HTTP-Status aus dem Fehler (z.B. 401, 404, 409)
 *  3. Alles andere → 500 Internal Server Error
 *
 * requestId wird in jede Fehlermeldung eingebettet — so kann
 * der Support einen Fehler in den Logs anhand der ID finden.
 * ─────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';              /* Validierungsfehler von zod.parse() */
import { logger } from '../utils/logger';
import { config } from '../config/env';

/* ── AppError ────────────────────────────────────────────────────────
   Bekannter Anwendungsfehler mit HTTP-Statuscode.
   Wird in Controllers mit `throw new AppError(404, 'Nicht gefunden')` geworfen.
   Unterschied zu normalem Error: hat statusCode → kein 500 → kein Alarm. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,  /* HTTP-Statuscode z.B. 401, 404, 409 */
    message: string,                     /* Fehlermeldung für den Client */
    public readonly code?: string,       /* Optionaler maschinenlesbarer Fehler-Code z.B. 'EMAIL_TAKEN' */
  ) {
    super(message);                                          /* Error.message setzen */
    this.name = 'AppError';                                  /* Error.name für instanceof-Check */
    Object.setPrototypeOf(this, new.target.prototype);       /* TypeScript-Fix: instanceof AppError funktioniert korrekt bei Subklassen */
  }
}

/* ── errorHandler ───────────────────────────────────────────────────
   Express erkennt einen Error-Handler an den 4 Parametern (err, req, res, next).
   MUSS als letztes app.use() registriert sein — sonst erreichen Fehler ihn nicht. */
export function errorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  _next: NextFunction, /* _next: nicht verwendet, aber Express erwartet 4 Parameter */
): void {
  /* requestId aus der Anfrage holen — für Korrelation in Logs + Fehlermeldung */
  const requestId = req.requestId;

  /* ── Fall 1: Zod Validierungsfehler ──────────────────────────── */
  /* ZodError tritt auf wenn `z.object().parse(req.body)` fehlschlägt */
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code:      'VALIDATION_ERROR',
        message:   'Validierungsfehler',
        requestId,
        /* err.errors: Array aller fehlgeschlagenen Felder mit Pfad und Meldung */
        details:   err.errors.map((e) => ({
          field:   e.path.join('.') || 'body', /* e.g. "email" oder "password.length" */
          message: e.message,                 /* z.B. "Mindestens 8 Zeichen" */
        })),
      },
    });
    return;
  }

  /* ── Fall 2: AppError (bekannter Applikationsfehler) ─────────── */
  /* z.B. 401 Unauthorized, 404 Not Found, 409 Conflict */
  if (err instanceof AppError) {
    /* 5xx-AppErrors (z.B. 500 aus einem Service) werden geloggt — 4xx nicht */
    if (err.statusCode >= 500) {
      logger.error('AppError 5xx', { statusCode: err.statusCode, message: err.message, requestId });
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        message:   err.message,
        requestId,
        ...(err.code && { code: err.code }), /* Fehler-Code nur wenn vorhanden */
      },
    });
    return;
  }

  /* ── Fall 3: Unerwarteter Fehler → 500 ──────────────────────── */
  /* Stack-Trace NIEMALS in Production — könnte interne Pfade/Versionen leaken */
  logger.error('Unbehandelter Fehler', {
    name:    err.name,
    message: err.message,
    stack:   config.isDevelopment ? err.stack : undefined, /* Nur in Development */
    requestId,
  });

  res.status(500).json({
    success: false,
    error: {
      message:   'Interner Serverfehler', /* Keine technischen Details für den Client */
      requestId,
      ...(config.isDevelopment && { detail: err.message }), /* In Development: Klartext zur Diagnose */
    },
  });
}
