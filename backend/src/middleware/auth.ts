/*
 * middleware/auth.ts
 * JWT-Authentifizierungs-Middleware.
 * Verifiziert Bearer-Token und schreibt userId in req.userId.
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export function auth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Kein Token angegeben'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError(401, 'Token ungültig oder abgelaufen'));
  }
}
