import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

type Source = 'body' | 'query' | 'params';

/*
 * validate(schema, source?)
 * Express-Middleware die einen Request gegen ein Zod-Schema prüft.
 * Bei Erfolg: req[source] enthält die sanitisierten, typisierten Daten.
 * Bei Fehler: next(ZodError) → zentraler errorHandler gibt 400 zurück.
 */
export function validate<T>(schema: ZodSchema<T>, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // req[source] durch validierte + transformierte Daten ersetzen (z.B. toLowerCase)
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
