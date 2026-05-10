-- 001_initial_schema.sql
-- Vollständiges Initiales Datenbankschema

-- ── users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username      VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ  NULL
);

-- ── refresh_tokens ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT  NULL,
  ip_address INET  NULL
);

-- ── categories ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
  icon       VARCHAR(50)  NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  NULL
);

-- ── sessions ───────────────────────────────────────────────────
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
);

-- ── goals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period       VARCHAR(10) NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  target_hours NUMERIC(5,1) NOT NULL CHECK (target_hours > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- ── streaks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── achievements ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(50) NOT NULL,
  xp_reward   INTEGER NOT NULL DEFAULT 0
);

-- ── user_achievements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ── Indizes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_id      ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time   ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date    ON sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_category_id  ON sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id    ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_goals_user_id         ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email_active    ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_user_active ON categories(user_id) WHERE deleted_at IS NULL;

-- ── Standard-Errungenschaften ───────────────────────────────────
INSERT INTO achievements (key, name, description, icon, xp_reward) VALUES
  ('first_session',  'Erste Schritte',    'Deine allererste Lernsession',         '🎯', 50),
  ('streak_7',       'Eine Woche stark',  '7 Tage am Stück gelernt',             '🔥', 150),
  ('streak_30',      'Monats-Meister',    '30 Tage am Stück gelernt',            '⚡', 500),
  ('total_10h',      '10 Stunden',        'Insgesamt 10 Stunden gelernt',         '📚', 100),
  ('total_100h',     '100-Stunden-Club',  'Insgesamt 100 Stunden gelernt',        '🏆', 1000),
  ('early_bird',     'Frühaufsteher',     'Session vor 7 Uhr morgens gestartet', '🌅', 75),
  ('night_owl',      'Nachteule',         'Session nach 22 Uhr gestartet',        '🌙', 75),
  ('goal_reached',   'Ziel erreicht',     'Erstes Wochenziel abgeschlossen',      '✅', 200),
  ('five_categories','Allrounder',        'In 5 verschiedenen Fächern gelernt',   '🎨', 100),
  ('pomodoro_10',    'Pomodoro-Fan',      '10 Pomodoro-Sessions abgeschlossen',   '🍅', 150)
ON CONFLICT (key) DO NOTHING;
