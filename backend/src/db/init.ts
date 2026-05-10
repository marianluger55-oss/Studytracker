/*
 * db/init.ts
 * ⚠️  VERALTET — nur noch für lokale Ersteinrichtung in Development.
 *
 * Für Production und alle neuen Installationen stattdessen verwenden:
 *   npm run db:migrate     (führt migrations/*.sql idempotent aus)
 *
 * init.ts existiert weiterhin damit bestehende Dev-Umgebungen weiter
 * funktionieren. Niemals in Production oder CI ausführen.
 */

import { pool } from './pool';

// Produktionsschutz: init.ts darf nicht im Production-Betrieb laufen
if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: db/init.ts darf nicht in Production ausgeführt werden.');
  console.error('Verwende stattdessen: npm run db:migrate');
  process.exit(1);
}

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('Datenbank wird initialisiert...\n');
    await client.query('BEGIN');

    /* ─── users ──────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username      VARCHAR(100) NOT NULL,
        created_at    TIMESTAMPTZ  DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ  NULL
      )
    `);
    console.log('  ✓ users');

    /* ─── refresh_tokens (mit token_hash statt token) ─────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 Hash (64 Hex-Zeichen)
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        user_agent TEXT  NULL,
        ip_address INET  NULL
      )
    `);
    /* Migration: altes 'token'-Feld umbenennen wenn vorhanden */
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'refresh_tokens' AND column_name = 'token'
        ) THEN
          ALTER TABLE refresh_tokens RENAME COLUMN token TO token_hash;
          ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE VARCHAR(64);
        END IF;
      END$$
    `);
    console.log('  ✓ refresh_tokens');

    /* ─── categories ─────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(100) NOT NULL,
        color      VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
        icon       VARCHAR(50)  NULL,
        created_at TIMESTAMPTZ  DEFAULT NOW(),
        deleted_at TIMESTAMPTZ  NULL
      )
    `);
    console.log('  ✓ categories');

    /* ─── sessions ───────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        start_time  TIMESTAMPTZ NOT NULL,
        end_time    TIMESTAMPTZ NOT NULL,
        duration    INTEGER NOT NULL CHECK (duration > 0),
        notes       TEXT NULL,
        mode        VARCHAR(20) DEFAULT 'pomodoro',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_sessions_time_order CHECK (end_time > start_time)
      )
    `);
    console.log('  ✓ sessions');

    /* ─── goals ──────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period       VARCHAR(10) NOT NULL CHECK (period IN ('daily','weekly','monthly')),
        target_hours NUMERIC(5,1) NOT NULL CHECK (target_hours > 0),
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, period)
      )
    `);
    console.log('  ✓ goals');

    /* ─── streaks ────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS streaks (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_study_date DATE NULL,
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ streaks');

    /* ─── achievements ───────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id          SERIAL PRIMARY KEY,
        key         VARCHAR(50) UNIQUE NOT NULL,
        name        VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon        VARCHAR(50) NOT NULL,
        xp_reward   INTEGER NOT NULL DEFAULT 0
      )
    `);
    console.log('  ✓ achievements');

    /* ─── user_achievements ──────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `);
    console.log('  ✓ user_achievements');

    /* ─── study_plans ────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_plans (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_start DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, week_start)
      )
    `);
    console.log('  ✓ study_plans');

    /* ─── study_plan_items ───────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_plan_items (
        id          SERIAL PRIMARY KEY,
        plan_id     INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        title       VARCHAR(200) NOT NULL,
        planned_at  TIMESTAMPTZ NOT NULL,
        duration    INTEGER NOT NULL,
        done        BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ study_plan_items');

    /* ─── password_reset_tokens ─────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ NULL,       -- NULL = noch nicht verwendet (Single-Use)
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address INET NULL
      )
    `);
    console.log('  ✓ password_reset_tokens');

    /* ─── Indizes ────────────────────────────────────────────── */
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id      ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time   ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_date    ON sessions(user_id, start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_category_id  ON sessions(category_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user_id    ON categories(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_goals_user_id          ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email_active     ON users(email) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_categories_user_active ON categories(user_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_prt_token_hash         ON password_reset_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_prt_user_id            ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_prt_expires            ON password_reset_tokens(expires_at);
    `);
    console.log('  ✓ Indizes');

    /* ─── Standard-Errungenschaften ──────────────────────────── */
    await client.query(`
      INSERT INTO achievements (key, name, description, icon, xp_reward)
      VALUES
        ('first_session',  'Erste Schritte',      'Deine allererste Lernsession',           '🎯', 50),
        ('streak_7',       'Eine Woche stark',    '7 Tage am Stück gelernt',                '🔥', 150),
        ('streak_30',      'Monats-Meister',      '30 Tage am Stück gelernt',               '⚡', 500),
        ('total_10h',      '10 Stunden',          'Insgesamt 10 Stunden gelernt',            '📚', 100),
        ('total_100h',     '100-Stunden-Club',    'Insgesamt 100 Stunden gelernt',           '🏆', 1000),
        ('early_bird',     'Frühaufsteher',       'Session vor 7 Uhr morgens gestartet',    '🌅', 75),
        ('night_owl',      'Nachteule',           'Session nach 22 Uhr gestartet',           '🌙', 75),
        ('goal_reached',   'Ziel erreicht',       'Erstes Wochenziel abgeschlossen',         '✅', 200),
        ('five_categories','Allrounder',          'In 5 verschiedenen Fächern gelernt',      '🎨', 100),
        ('pomodoro_10',    'Pomodoro-Fan',        '10 Pomodoro-Sessions abgeschlossen',      '🍅', 150)
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('  ✓ Standard-Errungenschaften');

    await client.query('COMMIT');
    console.log('\n✓ Datenbank erfolgreich initialisiert!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Fehler bei der Datenbankinitialisierung:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
