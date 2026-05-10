/*
 * utils/asyncHandler.ts
 * Wrapper für async Route-Handler — leitet alle Fehler an den zentralen
 * errorHandler weiter, ohne try/catch in jedem Controller wiederholen zu müssen.
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next); // Jeder unbehandelte Fehler → errorHandler Middleware
  };
}
