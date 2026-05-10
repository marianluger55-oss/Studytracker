/*
 * db/migrate.ts
 * Produktionsreifes SQL-Migrationssystem.
 *
 * Funktionsweise:
 *  1. Erstellt schema_migrations-Tabelle (Tracking)
 *  2. Liest alle .sql-Dateien aus migrations/ (sortiert)
 *  3. Führt nur noch nicht angewendete Migrationen aus
 *  4. Jede Migration läuft in einer Transaktion (atomisch)
 *  5. Auf Fehler: ROLLBACK + exit(1) — kein Partial-State
 *
 * Aufruf:
 *  npm run db:migrate
 *  oder automatisch beim Deployment via railway.json startCommand
 */

import 'dotenv/config';
import fs    from 'fs';
import path  from 'path';
import { Pool, PoolClient } from 'pg';

// Eigene Pool-Instanz — unabhängig vom App-Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface MigrationRecord {
  filename: string;
  applied_at: Date;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ DEFAULT NOW(),
      checksum    VARCHAR(64) NULL
    )
  `);
}

function sha256(content: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(content).digest('hex');
}

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Migrations-Tracking-Tabelle sicherstellen
    await client.query('BEGIN');
    await ensureMigrationsTable(client);
    await client.query('COMMIT');

    // Bereits angewendete Migrationen laden
    const applied = await client.query<MigrationRecord>(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    // SQL-Migrationsdateien einlesen und sortieren
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('✓ Kein migrations/-Verzeichnis gefunden — nichts zu tun');
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexikografisch → 001, 002, 003, ...

    if (files.length === 0) {
      console.log('✓ Keine Migrationsdateien gefunden');
      return;
    }

    let applied_count = 0;

    for (const filename of files) {
      if (appliedSet.has(filename)) {
        console.log(`  skip  ${filename}`);
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql      = fs.readFileSync(filepath, 'utf8');
      const checksum = sha256(sql);

      console.log(`  run   ${filename}...`);

      // Jede Migration in eigener Transaktion — Rollback bei Fehler
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await client.query('COMMIT');
        console.log(`  ✓     ${filename}`);
        applied_count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗     ${filename} FEHLGESCHLAGEN:`, err instanceof Error ? err.message : err);
        throw err; // outer catch beendet den Prozess
      }
    }

    if (applied_count === 0) {
      console.log('\n✓ Datenbank ist aktuell — keine neuen Migrationen');
    } else {
      console.log(`\n✓ ${applied_count} Migration(en) erfolgreich angewendet`);
    }
  } catch (err) {
    console.error('\n✗ Migration fehlgeschlagen:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\nDatenbank-Migrationen werden ausgeführt...\n');
runMigrations().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
