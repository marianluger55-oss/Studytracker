/*
 * db/redis.ts
 * ─────────────────────────────────────────────────────────────
 * Redis-Client mit graceful Fallback.
 * Ist REDIS_URL nicht gesetzt, läuft die App ohne Cache weiter —
 * kein Hard-Fail. Alle Cache-Operationen sind fehlerresistent.
 * ─────────────────────────────────────────────────────────────
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

/* Singleton — nur eine Verbindung pro Prozess */
let client: Redis | null = null;

function getClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect:         true,
      maxRetriesPerRequest: 1,    /* Schnell fehlschlagen statt hängen */
      connectTimeout:       3000,
    });
    client.on('error', (err) => {
      /* Redis-Fehler sind nicht fatal — App läuft ohne Cache weiter */
      logger.warn('Redis Verbindungsfehler (non-fatal)', { message: err.message });
    });
  }
  return client;
}

/* Cache-Eintrag lesen — null bei Fehler oder Cache-Miss */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await getClient()?.get(key) ?? null;
  } catch {
    return null;
  }
}

/* Cache-Eintrag schreiben mit TTL in Sekunden */
export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  try {
    await getClient()?.setex(key, ttlSeconds, value);
  } catch { /* non-fatal */ }
}

/* Cache-Eintrag löschen — z. B. bei Datenänderung */
export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await getClient()?.del(...keys);
  } catch { /* non-fatal */ }
}

/* Pattern-basiertes Löschen — z. B. cacheDel nach Session-Erstellung */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const c = getClient();
    if (!c) return;
    const keys = await c.keys(pattern);
    if (keys.length > 0) await c.del(...keys);
  } catch { /* non-fatal */ }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
