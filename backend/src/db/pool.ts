import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const SLOW_QUERY_THRESHOLD_MS = 500;

/* ── Connection Pool ─────────────────────────────────────────────
   max=20 reicht für Railway Starter (1 vCPU).
   In Production mit hoher Last: erhöhen und Redis-Session-Store prüfen. */
export const pool = new Pool({
  connectionString:        config.databaseUrl,
  max:                     20,
  min:                     2,    // Mindestens 2 Verbindungen warm halten
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 8_000,
  statement_timeout:       30_000, // Hängende Queries nach 30s abbrechen
  ssl: config.isProduction
    ? { rejectUnauthorized: false }  // Railway PostgreSQL nutzt self-signed Zertifikate intern
    : false,
});

pool.on('error',   (err) => logger.error('DB Pool Fehler',           { message: err.message }));
pool.on('connect', ()    => logger.debug('DB Pool: neue Verbindung'));
pool.on('remove',  ()    => logger.debug('DB Pool: Verbindung entfernt'));

/* ── Slow-Query-Wrapper ──────────────────────────────────────────
   Jede Query über diesem Wrapper wird auf Langsamkeit überwacht.
   Existierenden Code kann `pool.query()` weiterhin direkt nutzen —
   neue Services sollten `db.query()` bevorzugen.                   */
export const db = {
  query: async <R extends QueryResultRow = QueryResultRow>(
    text:   string | QueryConfig,
    values?: unknown[],
  ): Promise<QueryResult<R>> => {
    const start    = Date.now();
    const queryStr = typeof text === 'string' ? text : text.text;

    try {
      const result = await (values
        ? pool.query<R>(text as string, values)
        : pool.query<R>(text));

      const ms = Date.now() - start;
      if (ms > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn('Slow Query erkannt', {
          ms,
          rows:  result.rowCount,
          query: queryStr.replace(/\s+/g, ' ').slice(0, 200),
        });
      }
      return result;
    } catch (err) {
      logger.error('DB Query Fehler', {
        message: err instanceof Error ? err.message : String(err),
        query:   queryStr.replace(/\s+/g, ' ').slice(0, 200),
      });
      throw err;
    }
  },

  /* Convenience: Verbindung für Transaktionen holen */
  connect: (): Promise<PoolClient> => pool.connect(),
};

/* ── DB Connectivity Check ───────────────────────────────────────
   Für /health/db Endpoint — prüft ob die DB erreichbar ist.        */
export async function checkDbConnection(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
