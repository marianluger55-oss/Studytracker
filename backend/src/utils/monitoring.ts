/*
 * utils/monitoring.ts
 * Sentry-Integration für Error-Monitoring in Production.
 *
 * Nur aktiv wenn SENTRY_DSN gesetzt ist — lokale Entwicklung bleibt unberührt.
 * Muss als allererster Import in index.ts stehen (vor allen anderen Imports).
 */

import * as Sentry from '@sentry/node';
import { config }  from '../config/env';

/* DSN aus Umgebungsvariable — ohne DSN ist Sentry komplett deaktiviert */
const SENTRY_DSN = process.env.SENTRY_DSN?.trim();

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (!config.isProduction) {
      console.log('[monitoring] SENTRY_DSN nicht gesetzt — Sentry deaktiviert');
    }
    return;
  }

  Sentry.init({
    dsn:              SENTRY_DSN,
    environment:      config.nodeEnv,
    release:          process.env.npm_package_version,
    /* Nur 10% der Traces sampeln um Quota zu schonen */
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
    /* PII-Daten (IP, User-Agent) nicht an Sentry senden */
    sendDefaultPii:   false,
  });

  console.log('[monitoring] Sentry initialisiert');
}

/* Fehler manuell an Sentry melden (z.B. aus dem Error-Handler) */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

/* Nicht-kritisches Ereignis loggen (z.B. Rate-Limit überschritten) */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}
