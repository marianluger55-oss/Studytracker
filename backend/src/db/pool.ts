/*
 * db/pool.ts
 * ─────────────────────────────────────────────────────────────
 * PostgreSQL Connection Pool — verwaltet Datenbankverbindungen.
 *
 * Connection Pool: Hält offene DB-Verbindungen warm statt bei
 * jeder Anfrage eine neue aufzubauen (kostet ~100ms).
 * max=20: Maximale gleichzeitige Verbindungen.
 *
 * db.query(): Wrapper um pool.query() mit Slow-Query-Monitoring.
 * checkDbConnection(): Health-Check für /health/db Endpoint.
 * ─────────────────────────────────────────────────────────────
 */

import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/* Queries über diesem Wert werden als "slow" geloggt (Millisekunden) */
const SLOW_QUERY_THRESHOLD_MS = 500;

/* ── Connection Pool ─────────────────────────────────────────────
   max=20 reicht für Railway Starter (1 vCPU).
   In Production mit hoher Last: erhöhen und Redis-Session-Store prüfen. */
export const pool = new Pool({
  connectionString:        config.databaseUrl,      /* postgres://user:pass@host:5432/db */
  max:                     20,                      /* Maximale gleichzeitige Verbindungen */
  min:                     2,                       /* Mindestens 2 Verbindungen warm halten — erste Anfrage schneller */
  idleTimeoutMillis:       30_000,                  /* Verbindung nach 30s Inaktivität schließen */
  connectionTimeoutMillis: 8_000,                   /* Timeout wenn keine freie Verbindung im Pool */
  statement_timeout:       30_000,                  /* Hängende Queries nach 30s abbrechen — verhindert DB-Blockierungen */
  ssl: config.isProduction
    ? { rejectUnauthorized: false }                 /* Railway PostgreSQL nutzt self-signed Zertifikate intern */
    : false,                                        /* Kein SSL in Development (lokale DB) */
});

/* Pool-Events für Debugging und Monitoring */
pool.on('error',   (err) => logger.error('DB Pool Fehler',           { message: err.message })); /* Verbindungsabbruch */
pool.on('connect', ()    => logger.debug('DB Pool: neue Verbindung'));                           /* Neue Verbindung aufgebaut */
pool.on('remove',  ()    => logger.debug('DB Pool: Verbindung entfernt'));                       /* Verbindung aus Pool entfernt */

/* ── Slow-Query-Wrapper ──────────────────────────────────────────
   Jede Query über diesem Wrapper wird auf Langsamkeit überwacht.
   Existierenden Code kann `pool.query()` weiterhin direkt nutzen —
   neue Services sollten `db.query()` bevorzugen für Monitoring.   */
export const db = {
  query: async <R extends QueryResultRow = QueryResultRow>(
    text:   string | QueryConfig,    /* SQL-String oder QueryConfig-Objekt mit parametrisierten Werten */
    values?: unknown[],              /* Bind-Parameter ($1, $2, ...) — verhindert SQL-Injection */
  ): Promise<QueryResult<R>> => {
    const start    = Date.now();
    const queryStr = typeof text === 'string' ? text : text.text; /* SQL-Text für Logging */

    try {
      /* values: parametrisiert mit $1/$2 (sicher), ohne: direkt ausgeführt */
      const result = await (values
        ? pool.query<R>(text as string, values)
        : pool.query<R>(text));

      const ms = Date.now() - start;
      /* Slow-Query-Warnung: hilft Indizes oder fehlende WHERE-Klauseln zu finden */
      if (ms > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn('Slow Query erkannt', {
          ms,
          rows:  result.rowCount,
          query: queryStr.replace(/\s+/g, ' ').slice(0, 200), /* Whitespace normalisieren, max 200 Zeichen */
        });
      }
      return result;
    } catch (err) {
      /* Query-Fehler loggen aber nicht schlucken — Fehler wird weitergegeben */
      logger.error('DB Query Fehler', {
        message: err instanceof Error ? err.message : String(err),
        query:   queryStr.replace(/\s+/g, ' ').slice(0, 200),
      });
      throw err;
    }
  },

  /* Verbindung für manuelle Transaktionen (BEGIN/COMMIT/ROLLBACK) */
  connect: (): Promise<PoolClient> => pool.connect(),
};

/* ── DB Connectivity Check ───────────────────────────────────────
   Für /health/db Endpoint — prüft ob die DB erreichbar ist.
   SELECT 1 ist die schnellste mögliche Query (keine Tabelle nötig). */
export async function checkDbConnection(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start }; /* Latenz für Monitoring-Dashboards */
  } catch {
    return { ok: false, latencyMs: Date.now() - start }; /* Fehler: DB nicht erreichbar */
  }
}
