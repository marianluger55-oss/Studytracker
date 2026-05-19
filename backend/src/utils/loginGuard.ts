/*
 * utils/loginGuard.ts
 *
 * Erkennt auffällige Login-Muster (viele Fehlversuche von einer IP).
 * Nutzt Redis wenn verfügbar, sonst In-Memory-Fallback.
 * Wirft nie — Fehler werden geloggt und ignoriert.
 *
 * Schwellwert: 3 Fehlversuche in 15 Minuten → audit_log + security event
 */

import { cacheGet, cacheSet } from '../db/redis';
import { logger } from './logger';
import * as audit from '../services/audit.service';

const WINDOW_MS    = 15 * 60 * 1000; /* 15 Minuten */
const THRESHOLD    = 3;              /* Fehlversuche bis Alarm */

/* ── In-Memory-Fallback ─────────────────────────────────────────── */
interface Bucket { count: number; firstSeen: number }
const memoryStore = new Map<string, Bucket>();

/* Veraltete Einträge alle 5 Minuten aufräumen */
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, bucket] of memoryStore) {
    if (bucket.firstSeen < cutoff) memoryStore.delete(key);
  }
}, 5 * 60 * 1000).unref(); /* .unref() damit der Timer den Prozess nicht offen hält */

/* ── Fehlversuch registrieren ───────────────────────────────────── */
export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  try {
    const count = await incrementCounter(ip);
    if (count === THRESHOLD) {
      /* Schwellwert erreicht — Security-Event + Audit-Log */
      logger.securityEvent('login_anomaly_detected', {
        ip,
        email,
        failedAttempts: count,
        windowMinutes:  WINDOW_MS / 60_000,
      });

      audit.log('login_anomaly', {
        ip,
        metadata: { email, failedAttempts: count },
      });
    }
  } catch (err) {
    /* Nie den Login-Flow blockieren */
    logger.warn('loginGuard.recordFailedLogin error (non-fatal)', { err: String(err) });
  }
}

/* ── Zähler nach erfolgreichem Login zurücksetzen ───────────────── */
export async function resetFailedLogins(ip: string): Promise<void> {
  try {
    const key = `failed_login:${ip}`;
    memoryStore.delete(key);
    /* Redis: Eintrag löschen (cacheSet mit Wert 0 reicht auch) */
    await cacheSet(key, '0', 1); /* TTL 1s → wird sofort ungültig */
  } catch { /* non-fatal */ }
}

/* ── Intern: Zähler atomisch erhöhen ───────────────────────────── */
async function incrementCounter(ip: string): Promise<number> {
  const key    = `failed_login:${ip}`;
  const ttlSec = Math.floor(WINDOW_MS / 1000);

  /* Redis-Pfad (bevorzugt — verteilt und persistent über Restarts) */
  const stored = await cacheGet(key);
  if (stored !== null) {
    /* Redis verfügbar */
    const newCount = parseInt(stored, 10) + 1;
    await cacheSet(key, String(newCount), ttlSec);
    return newCount;
  }

  /* In-Memory-Fallback */
  const now    = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || now - bucket.firstSeen > WINDOW_MS) {
    /* Neues Fenster starten */
    memoryStore.set(key, { count: 1, firstSeen: now });
    return 1;
  }

  bucket.count++;
  return bucket.count;
}
