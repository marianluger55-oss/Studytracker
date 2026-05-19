import 'dotenv/config';
import fs             from 'fs';
import path           from 'path';
import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import compression    from 'compression';
import cookieParser   from 'cookie-parser';

import { config }              from './config/env';
import { logger }              from './utils/logger';
import { errorHandler }        from './middleware/errorHandler';
import { generalLimiter }      from './middleware/rateLimiter';
import { requestIdMiddleware }  from './middleware/requestId';
import { initSentry }           from './utils/monitoring';
import { checkDbConnection }    from './db/pool';

/* Sentry muss vor allem anderen initialisiert werden */
initSentry();

import authRoutes          from './routes/auth.routes';
import sessionsRoutes      from './routes/sessions.routes';
import categoriesRoutes    from './routes/categories.routes';
import statsRoutes         from './routes/stats.routes';
import goalsRoutes         from './routes/goals.routes';
import usersRoutes         from './routes/users.routes';
import achievementsRoutes  from './routes/achievements.routes';
import adminRoutes         from './routes/admin.routes';

const app = express();

/* ── Compression ─────────────────────────────────────────────────
   Gzip/Deflate-Komprimierung für alle Antworten über 1 KB.
   Muss vor allen Routen stehen damit auch API-Responses komprimiert werden. */
app.use(compression());

/* ── Request Timeout ─────────────────────────────────────────────
   30 Sekunden HTTP-Timeout — verhindert hängende Verbindungen. */
app.use((_req, res, next) => {
  res.setTimeout(30_000, () => {
    res.status(408).json({ success: false, error: 'Request-Timeout' });
  });
  next();
});

/* ── Request-ID ──────────────────────────────────────────────────
   Erste Middleware — jede Anfrage bekommt eine UUID.
   Wird automatisch in alle Log-Zeilen dieser Anfrage eingebettet.  */
app.use(requestIdMiddleware);

/* ── Security Headers (Helmet) ───────────────────────────────────  */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      mediaSrc:    ["'none'"],
      frameSrc:    ["'none'"],
      upgradeInsecureRequests: config.isProduction ? [] : null,
    } as Record<string, string[] | null>,
  },
  crossOriginEmbedderPolicy: false,
}));

/* ── CORS ────────────────────────────────────────────────────────
   In Production (Railway): Frontend wird von Express selbst bedient
   → kein Cross-Origin nötig, aber corsOrigin bleibt konfigurierbar
   für den Fall eines separaten Frontend-Deployments.               */
app.use(cors({
  origin:         config.corsOrigin,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

/* ── Request-Logging ─────────────────────────────────────────────  */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info('Request', {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms,
    });
  });
  next();
});

/* ── Rate-Limiting ───────────────────────────────────────────────  */
app.use('/api', generalLimiter);

/* ── Health-Checks ───────────────────────────────────────────────
   Müssen VOR den API-Routen stehen damit Railway den Check findet.
   /health        → Uptime-Monitor-Endpunkt (schnell, kein DB-Check)
   /health/detail → Vollständiger Check (DB + Redis + Speicher)    */
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    env:       config.nodeEnv,
    version:   process.env.npm_package_version ?? '1.0.0',
  });
});

app.get('/health/db', async (_req, res) => {
  const { ok, latencyMs } = await checkDbConnection();
  res.status(ok ? 200 : 503).json({
    status:    ok ? 'ok' : 'unreachable',
    latencyMs,
    timestamp: new Date().toISOString(),
  });
});

/* Detaillierter Health-Check — für Monitoring-Dashboards */
app.get('/health/detail', async (_req, res) => {
  const { ok: dbOk, latencyMs: dbLatency } = await checkDbConnection();
  const mem = process.memoryUsage();
  res.status(dbOk ? 200 : 503).json({
    status:    dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    checks: {
      database: { status: dbOk ? 'ok' : 'error', latencyMs: dbLatency },
      redis:    { status: process.env.REDIS_URL ? 'configured' : 'not-configured' },
    },
    memory: {
      heapUsedMB:  Math.round(mem.heapUsed  / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB:       Math.round(mem.rss       / 1024 / 1024),
    },
  });
});

/* ── API-Routen ──────────────────────────────────────────────────  */
app.use('/api/auth',         authRoutes);
app.use('/api/sessions',    sessionsRoutes);
app.use('/api/categories',  categoriesRoutes);
app.use('/api/stats',       statsRoutes);
app.use('/api/goals',       goalsRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/admin',        adminRoutes);

/* ── Frontend Static-File Serving ────────────────────────────────
   Wenn das /public-Verzeichnis existiert (Docker-Build kopiert das
   Vite-Bundle dorthin), wird es immer als statische Dateibasis
   genutzt — unabhängig von NODE_ENV.
   SPA-Fallback: alle Nicht-API-Routen → index.html, damit React
   Router clientseitig die Navigation übernimmt.                    */
const publicDir = path.join(__dirname, '..', 'public');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    maxAge:  '1y',   // Statische Assets lang cachen (Vite-Hashes)
    etag:    true,
    index:   false,  // SPA-Fallback unten übernimmt index.html
  }));

  // SPA-Fallback: index.html für alle Nicht-API-Anfragen
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

/* ── 404 für unbekannte API-Routen ─────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpunkt nicht gefunden' });
});

/* ── Zentraler Error-Handler ─────────────────────────────────────
   MUSS als letztes registriert sein — fängt alle next(err) ab.      */
app.use(errorHandler);

/* ── Server starten ──────────────────────────────────────────────  */
const server = app.listen(config.port, () => {
  logger.info('StudyTracker-Backend gestartet', {
    port: config.port,
    env:  config.nodeEnv,
  });
});

/* ── Graceful Shutdown ───────────────────────────────────────────
   Bei SIGTERM (Railway Deployment): laufende Requests abschließen.  */
function shutdown(signal: string): void {
  logger.info(`Signal empfangen: ${signal} — Server wird beendet`);
  server.close(() => {
    logger.info('Server gestoppt');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('Graceful Shutdown Timeout — hart beenden');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unbehandelte Promise-Ablehnung', { reason: String(reason) });
});

export default app;
