import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

/* ── Request-Context Store ───────────────────────────────────────
   AsyncLocalStorage propagiert den Kontext automatisch durch den
   gesamten Async-Call-Tree — kein manuelles Durchreichen nötig.   */
interface RequestContext {
  requestId: string;
  userId?:   number;
}

export const requestStorage = new AsyncLocalStorage<RequestContext>();

/* Aktuellen Kontext aus dem Storage lesen (null-safe) */
export function getRequestContext(): RequestContext | undefined {
  return requestStorage.getStore();
}

/* ── Middleware ──────────────────────────────────────────────────
   Erzeugt eine RequestId pro eingehender Anfrage und speichert sie
   im AsyncLocalStorage-Kontext für das gesamte Request-Lifecycle.  */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Vorhandene RequestId aus Header übernehmen (z.B. von Load Balancer)
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // next() innerhalb des ALS-Kontexts aufrufen — alle downstream Calls erben den Kontext
  requestStorage.run({ requestId }, next);
}

/* Express Request-Interface erweitern */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
