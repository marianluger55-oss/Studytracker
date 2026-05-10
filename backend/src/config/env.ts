/*
 * config/env.ts
 * Fail-fast Environment-Konfiguration.
 * Fehlende Pflicht-Variablen beenden den Server sofort.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.error(`\nFATAL: Umgebungsvariable "${key}" ist nicht gesetzt oder leer.`);
    console.error('Bitte .env-Datei prüfen und Server neu starten.\n');
    process.exit(1);
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  // ── Pflicht ──────────────────────────────────────────────────
  jwtSecret:   requireEnv('JWT_SECRET'),
  databaseUrl: requireEnv('DATABASE_URL'),

  // ── Server ───────────────────────────────────────────────────
  nodeEnv:      optionalEnv('NODE_ENV', 'development'),
  port:         parseInt(optionalEnv('PORT', '3001'), 10),
  corsOrigin:   optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
  appUrl:       optionalEnv('APP_URL', 'http://localhost:5173'),

  // ── E-Mail (optional — Konsolen-Fallback in Development) ─────
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER?.trim() ?? '',
    pass: process.env.SMTP_PASS?.trim() ?? '',
    from: optionalEnv('SMTP_FROM', 'StudyTracker <noreply@studytracker.app>'),
  },

  get isProduction()  { return this.nodeEnv === 'production';  },
  get isDevelopment() { return this.nodeEnv === 'development'; },
  get smtpConfigured() {
    return !!(this.smtp.host && this.smtp.user && this.smtp.pass);
  },
} as const;
