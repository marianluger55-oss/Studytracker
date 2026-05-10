import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { config } from '../config/env';

/* Bekannter Applikationsfehler mit HTTP-Statuscode und optionalem Fehler-Code */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    // Stack-Trace korrekt setzen für Error-Subklassen in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* Zentraler Express Error-Handler — MUSS als letztes app.use() registriert sein */
export function errorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  // ── Zod Validierungsfehler → 400 ──────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code:      'VALIDATION_ERROR',
        message:   'Validierungsfehler',
        requestId,
        details:   err.errors.map((e) => ({
          field:   e.path.join('.') || 'body',
          message: e.message,
        })),
      },
    });
    return;
  }

  // ── Bekannte AppError → HTTP-Status aus dem Fehler ────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('AppError 5xx', { statusCode: err.statusCode, message: err.message, requestId });
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        message:   err.message,
        requestId,
        ...(err.code && { code: err.code }),
      },
    });
    return;
  }

  // ── Unbekannte Fehler → 500, Stack-Trace nie in Production ────
  logger.error('Unbehandelter Fehler', {
    name:    err.name,
    message: err.message,
    stack:   config.isDevelopment ? err.stack : undefined,
    requestId,
  });

  res.status(500).json({
    success: false,
    error: {
      message:   'Interner Serverfehler',
      requestId,
      ...(config.isDevelopment && { detail: err.message }),
    },
  });
}
