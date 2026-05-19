import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

/* ── Handler-Factory ─────────────────────────────────────────────
   Verhindert Code-Duplizierung und stellt einheitliche Antworten sicher. */
function createLimiter(
  windowMs:   number,
  max:        number,
  message:    string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',  // RateLimit-* Header (moderner Standard)
    legacyHeaders:   false,
    skipSuccessfulRequests: false,
    message: { error: message },
    // Fehler nicht weiterwerfen — 429 direkt antworten
    handler: (_req, res, _next, options) => {
      res.status(429).json(options.message);
    },
  });
}

/* ── Auth-Limiter ─────────────────────────────────────────────────
   5 Versuche pro 15 Min — schützt gegen Brute-Force auf Login/Register */
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.',
);

/* ── Forgot-Password-Limiter ──────────────────────────────────────
   3 Anfragen pro 60 Min — verhindert E-Mail-Flooding */
export const forgotPasswordLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Zu viele Passwort-Zurücksetzen-Anfragen. Bitte 1 Stunde warten.',
);

/* ── API-Limiter ──────────────────────────────────────────────────
   200 Anfragen pro Minute — schützt gegen DDoS und API-Scraping */
export const generalLimiter = createLimiter(
  60 * 1000,
  200,
  'Zu viele Anfragen. Bitte etwas langsamer.',
);

/* ── Strict-Limiter ───────────────────────────────────────────────
   10 Anfragen pro Minute — für sensible Endpunkte (z.B. Passwort ändern) */
export const strictLimiter = createLimiter(
  60 * 1000,
  10,
  'Zu viele Anfragen an diesen Endpunkt.',
);

/* ── Admin-Limiter ────────────────────────────────────────────────
   60 Anfragen pro Minute — Admin-Panel pollt häufig (Activity-Feed 5s),
   aber deutlich strenger als der allgemeine Limiter (200/min) */
export const adminLimiter = createLimiter(
  60 * 1000,
  60,
  'Zu viele Admin-Anfragen.',
);
