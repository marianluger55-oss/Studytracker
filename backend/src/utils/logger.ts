/*
 * utils/logger.ts
 * ─────────────────────────────────────────────────────────────
 * Strukturierter Logger für das Backend.
 *
 * In Production: JSON pro Zeile → maschinenlesbar für Railway/Sentry
 * In Development: lesbare Zeilen mit Zeitstempel + Level-Prefix
 *
 * Sicherheit: Sensible Felder werden automatisch durch [REDACTED]
 * ersetzt bevor sie in Logs landen (kein Passwort-Leak).
 *
 * RequestId: Jede Log-Zeile enthält automatisch die requestId der
 * aktuellen HTTP-Anfrage (aus AsyncLocalStorage via requestId.ts).
 * ─────────────────────────────────────────────────────────────
 */

/* getRequestContext liest RequestId + UserId aus AsyncLocalStorage */
import { getRequestContext } from '../middleware/requestId';

/* Log-Level-Typen — von niedrig (debug) bis hoch (error) */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/* Numerische Prioritäten für Level-Vergleich (debug=0 < info=1 < warn=2 < error=3) */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

/* Minimales Log-Level aus ENV-Variable oder Standard:
   - LOG_LEVEL=warn → nur Warnungen und Fehler
   - Production-Default: 'info' (kein debug-Rauschen)
   - Development-Default: 'debug' (alles sehen) */
const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/* Felder die niemals in Logs erscheinen dürfen — Sicherheits-Allowlist */
const REDACTED_FIELDS = new Set([
  'password', 'password_hash', 'token', 'token_hash',
  'authorization', 'cookie', 'newpassword', 'currentpassword',
]);

/* ── redact ─────────────────────────────────────────────────────────
   Durchsucht rekursiv ein Objekt und ersetzt verbotene Felder durch [REDACTED].
   depth=4 verhindert Endlosrekursion bei zirkulären Referenzen.
   Array-Elemente werden einzeln geprüft (z.B. Array von Usern). */
function redact(obj: unknown, depth = 0): unknown {
  if (depth > 4 || obj === null || typeof obj !== 'object') return obj; // Primitives direkt zurückgeben
  if (Array.isArray(obj)) return obj.map((item) => redact(item, depth + 1)); // Array-Elemente rekursiv
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    /* key.toLowerCase(): case-insensitiv — "Password" und "password" werden beide geschwärzt */
    result[key] = REDACTED_FIELDS.has(key.toLowerCase()) ? '[REDACTED]' : redact(value, depth + 1);
  }
  return result;
}

/* ── log ─────────────────────────────────────────────────────────────
   Interne Kern-Log-Funktion. Wird von debug/info/warn/error aufgerufen. */
function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  /* Wenn Level unter Minimum → Zeile stumm schalten (z.B. debug in Production) */
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp    = new Date().toISOString();                          /* z.B. "2026-05-21T14:32:01.123Z" */
  const safeMeta     = meta ? redact(meta) as Record<string, unknown> : undefined; /* sensible Felder entfernen */

  /* RequestId + UserId aus AsyncLocalStorage — automatisch für jede HTTP-Anfrage verfügbar */
  const ctx       = getRequestContext();
  const requestId = ctx?.requestId; /* undefined wenn außerhalb eines HTTP-Requests (z.B. Migration) */
  const userId    = ctx?.userId;

  /* Nur befüllte Felder anhängen — verhindert "requestId: undefined" in JSON */
  const contextFields = {
    ...(requestId && { requestId }),
    ...(userId    && { userId }),
  };

  if (isProduction) {
    /* JSON-Format: Railway/Sentry können JSON-Logs parsen und durchsuchen */
    const output = JSON.stringify({
      level,
      time:    timestamp,
      msg:     message,
      ...contextFields,
      ...safeMeta,
    });
    /* Fehler auf stderr (wichtig für Railway-Log-Routing), alles andere auf stdout */
    if (level === 'error') process.stderr.write(output + '\n');
    else                   process.stdout.write(output + '\n');
  } else {
    /* Lesbares Format für Development: "[14:32:01] INFO  [a1b2c3d4] Message {meta}" */
    const prefix  = `[${timestamp.slice(11, 19)}] ${level.toUpperCase().padEnd(5)}`; /* padEnd(5): INFO_  statt INFO für Ausrichtung */
    const ctxStr  = requestId ? ` [${requestId.slice(0, 8)}]` : '';                 /* Erste 8 Zeichen der UUID reichen zur Identifikation */
    const metaStr = safeMeta && Object.keys(safeMeta).length
      ? ` ${JSON.stringify(safeMeta)}`
      : '';
    const output  = `${prefix}${ctxStr} ${message}${metaStr}`;

    /* console.error schreibt auf stderr (roter Text im Terminal), console.warn auf stderr mit Warning-Prefix */
    if (level === 'error')     console.error(output);
    else if (level === 'warn') console.warn(output);
    else                       console.log(output);
  }
}

/* ── securityEvent ───────────────────────────────────────────────────
   Speziell markierte Sicherheitsereignisse (Anomaly-Detection, Intrusion).
   Immer geloggt — unabhängig vom MIN_LEVEL. Level-Feld: "security".
   Wird von loginGuard.ts aufgerufen wenn Brute-Force erkannt wird. */
function securityEvent(event: string, meta?: Record<string, unknown>): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const ctx          = getRequestContext();  /* RequestId für Korrelation mit HTTP-Logs */
  const timestamp    = new Date().toISOString();

  const payload = {
    level:     'security',                          /* Eigenes Level — leicht filterbar in Log-Systemen */
    time:      timestamp,
    event,                                          /* z.B. "login_anomaly_detected" */
    requestId: ctx?.requestId,
    ...(meta ? redact(meta) as Record<string, unknown> : {}), /* IP, E-Mail, Fehlversuche */
  };

  if (isProduction) {
    process.stdout.write(JSON.stringify(payload) + '\n'); /* JSON für maschinenlesbare Auswertung */
  } else {
    const requestId = ctx?.requestId;
    const ctxStr = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    /* "SEC" als Level-Prefix — hebt sich im Terminal ab */
    console.log(`[${timestamp.slice(11, 19)}] SEC  ${ctxStr} ${event}`, JSON.stringify(meta ?? {}));
  }
}

/* ── Exportiertes Logger-Objekt ──────────────────────────────────────
   Wird überall im Backend als `logger.info(...)` etc. verwendet. */
export const logger = {
  debug:         (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta), /* Nur Development — interne Debugging-Infos */
  info:          (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta), /* Normaler Betrieb — Start, DB-Verbindung, etc. */
  warn:          (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta), /* Unerwartetes aber nicht fatales Verhalten */
  error:         (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta), /* Fehler die Benutzer-Requests beeinflussen */
  securityEvent: (event: string, meta?: Record<string, unknown>) => securityEvent(event, meta), /* Sicherheitsereignisse — immer geloggt */
};
