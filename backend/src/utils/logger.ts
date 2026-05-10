import { getRequestContext } from '../middleware/requestId';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/* Felder die niemals in Logs erscheinen dürfen */
const REDACTED_FIELDS = new Set([
  'password', 'password_hash', 'token', 'token_hash',
  'authorization', 'cookie', 'newpassword', 'currentpassword',
]);

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 4 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redact(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = REDACTED_FIELDS.has(key.toLowerCase()) ? '[REDACTED]' : redact(value, depth + 1);
  }
  return result;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp    = new Date().toISOString();
  const safeMeta     = meta ? redact(meta) as Record<string, unknown> : undefined;

  // RequestId aus AsyncLocalStorage automatisch anhängen
  const ctx       = getRequestContext();
  const requestId = ctx?.requestId;
  const userId    = ctx?.userId;

  const contextFields = {
    ...(requestId && { requestId }),
    ...(userId    && { userId }),
  };

  if (isProduction) {
    const output = JSON.stringify({
      level,
      time:    timestamp,
      msg:     message,
      ...contextFields,
      ...safeMeta,
    });
    if (level === 'error') process.stderr.write(output + '\n');
    else                   process.stdout.write(output + '\n');
  } else {
    const prefix  = `[${timestamp.slice(11, 19)}] ${level.toUpperCase().padEnd(5)}`;
    const ctxStr  = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    const metaStr = safeMeta && Object.keys(safeMeta).length
      ? ` ${JSON.stringify(safeMeta)}`
      : '';
    const output  = `${prefix}${ctxStr} ${message}${metaStr}`;

    if (level === 'error')     console.error(output);
    else if (level === 'warn') console.warn(output);
    else                       console.log(output);
  }
}

/* Security-Event-Log (immer auf info-Level, auch wenn MIN_LEVEL höher wäre) */
function securityEvent(event: string, meta?: Record<string, unknown>): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const ctx          = getRequestContext();
  const timestamp    = new Date().toISOString();

  const payload = {
    level:     'security',
    time:      timestamp,
    event,
    requestId: ctx?.requestId,
    ...(meta ? redact(meta) as Record<string, unknown> : {}),
  };

  if (isProduction) {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } else {
    const requestId = ctx?.requestId;
    const ctxStr = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    console.log(`[${timestamp.slice(11, 19)}] SEC  ${ctxStr} ${event}`, JSON.stringify(meta ?? {}));
  }
}

export const logger = {
  debug:         (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info:          (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:          (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error:         (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  securityEvent: (event: string, meta?: Record<string, unknown>) => securityEvent(event, meta),
};
