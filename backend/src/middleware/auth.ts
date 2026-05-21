/*
 * middleware/auth.ts
 * ─────────────────────────────────────────────────────────────
 * JWT-Authentifizierungs-Middleware.
 *
 * Verifiziert den Bearer-Token aus dem Authorization-Header.
 * Bei Erfolg: schreibt userId in req.userId → Controller kann auf den
 * eingeloggten Benutzer zugreifen ohne erneut in die DB zu gehen.
 *
 * Verwendung in Routes:
 *   router.get('/profile', auth, getProfile);
 * ─────────────────────────────────────────────────────────────
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';                /* JSON Web Token Bibliothek */
import { AuthRequest, JwtPayload } from '../types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export function auth(req: AuthRequest, _res: Response, next: NextFunction): void {
  /* Authorization-Header lesen: "Bearer eyJhbGci..." */
  const header = req.headers.authorization;

  /* Header fehlt oder hat falsches Format → 401 ohne Token-Verifikation */
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Kein Token angegeben'));
  }

  /* "Bearer " (7 Zeichen) entfernen → nur den Token-String */
  const token = header.slice(7);

  try {
    /* jwt.verify: prüft Signatur + Ablaufzeit gleichzeitig.
       Wirft JsonWebTokenError wenn Signatur falsch, TokenExpiredError wenn abgelaufen. */
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = payload.userId; /* userId in Request schreiben — für Controller zugänglich */
    next();                      /* Anfrage weitergeben (kein Fehler) */
  } catch {
    /* Alle JWT-Fehler → gleiche Fehlermeldung (verhindert Enumeration-Angriffe) */
    next(new AppError(401, 'Token ungültig oder abgelaufen'));
  }
}
