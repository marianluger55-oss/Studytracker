/*
 * middleware/adminAuth.ts
 * Prüft ob der eingeloggte User Admin-Rechte hat.
 * Muss nach der auth-Middleware eingesetzt werden (req.userId muss gesetzt sein).
 */

import { Response, NextFunction } from 'express';
import { pool }       from '../db/pool';
import { AuthRequest } from '../types';
import { AppError }   from './errorHandler';

export async function adminAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.userId) return next(new AppError(401, 'Nicht authentifiziert'));

    const result = await pool.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.userId]
    );
    if (result.rows[0]?.role !== 'admin') {
      return next(new AppError(403, 'Kein Admin-Zugriff'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
