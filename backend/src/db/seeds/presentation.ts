/*
 * db/seeds/presentation.ts
 * ─────────────────────────────────────────────────────────────
 * Präsentationsdaten für marian.luger@icloud.com.
 *
 * Ausführen:
 *   cd backend
 *   npx ts-node src/db/seeds/presentation.ts
 *
 * Idempotent: kann beliebig oft ausgeführt werden.
 * Passwort des Accounts: Abgabe2026!
 * ─────────────────────────────────────────────────────────────
 */

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/* ── Hilfsfunktionen ─────────────────────────────────────── */

/* Gibt einen Timestamp zurück: vor `daysAgo` Tagen, um `hour` Uhr */
function ts(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /* ── 1. User anlegen / abrufen ─────────────────────────── */
    const pwHash = await bcrypt.hash('Abgabe2026!', 12);

    const userRes = await client.query<{ id: number }>(
      `INSERT INTO users (email, username, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      ['marian.luger@icloud.com', 'Marian', pwHash],
    );
    const userId = userRes.rows[0].id;
    console.log(`User ID: ${userId}`);

    /* ── 2. Alte Demo-Sessions löschen ─────────────────────── */
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM categories WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);

    /* ── 3. Kategorien ─────────────────────────────────────── */
    const cats = await client.query<{ id: number; name: string }>(
      `INSERT INTO categories (user_id, name, color, icon) VALUES
         ($1, 'Mathematik',  '#f472b6', '📐'),
         ($1, 'Englisch',    '#818cf8', '📖'),
         ($1, 'Physik',      '#c084fc', '⚗️'),
         ($1, 'Informatik',  '#34d399', '💻'),
         ($1, 'Geschichte',  '#fb923c', '📜')
       RETURNING id, name`,
      [userId],
    );

    const catMap: Record<string, number> = {};
    cats.rows.forEach((r) => { catMap[r.name] = r.id; });
    console.log('Kategorien:', catMap);

    /* ── 4. Sessions ───────────────────────────────────────── */
    /* Format: [daysAgo, hour, durationMin, kategorie] */
    const sessionData: [number, number, number, string][] = [
      /* Heute */
      [0,  8, 50, 'Mathematik'],
      [0, 14, 75, 'Informatik'],
      /* Gestern */
      [1,  9, 90, 'Physik'],
      [1, 15, 45, 'Englisch'],
      [1, 20, 60, 'Mathematik'],
      /* Tag -2 */
      [2,  8, 60, 'Informatik'],
      [2, 13, 55, 'Geschichte'],
      [2, 19, 40, 'Englisch'],
      /* Tag -3 */
      [3,  9, 80, 'Mathematik'],
      [3, 16, 70, 'Physik'],
      /* Tag -4 */
      [4,  8, 45, 'Englisch'],
      [4, 14, 90, 'Informatik'],
      [4, 20, 50, 'Mathematik'],
      /* Tag -5 */
      [5,  9, 60, 'Geschichte'],
      [5, 15, 75, 'Physik'],
      /* Tag -6 */
      [6,  8, 55, 'Mathematik'],
      [6, 13, 45, 'Englisch'],
      /* Woche 2 */
      [7,  9, 70, 'Informatik'],
      [7, 16, 60, 'Mathematik'],
      [8,  8, 50, 'Physik'],
      [8, 14, 80, 'Englisch'],
      [9,  9, 65, 'Geschichte'],
      [9, 15, 55, 'Mathematik'],
      [10, 8, 90, 'Informatik'],
      [10,16, 45, 'Physik'],
      [11, 9, 60, 'Englisch'],
      [11,14, 70, 'Mathematik'],
      [12, 8, 50, 'Geschichte'],
      [12,15, 80, 'Informatik'],
      [13, 9, 55, 'Physik'],
      /* Woche 3 */
      [14, 8, 75, 'Mathematik'],
      [14,15, 60, 'Englisch'],
      [15, 9, 90, 'Informatik'],
      [16, 8, 50, 'Physik'],
      [16,14, 65, 'Mathematik'],
      [17, 9, 70, 'Geschichte'],
      [17,16, 45, 'Englisch'],
      [18, 8, 80, 'Informatik'],
      [19, 9, 60, 'Mathematik'],
      [19,15, 55, 'Physik'],
      [20, 8, 75, 'Englisch'],
      /* Woche 4 */
      [21, 9, 90, 'Mathematik'],
      [21,16, 50, 'Informatik'],
      [22, 8, 65, 'Physik'],
      [22,14, 70, 'Geschichte'],
      [23, 9, 55, 'Englisch'],
      [23,15, 80, 'Mathematik'],
      [24, 8, 60, 'Informatik'],
      [25, 9, 75, 'Physik'],
      [25,15, 45, 'Mathematik'],
      [26, 8, 90, 'Englisch'],
      [26,16, 60, 'Geschichte'],
      [27, 9, 70, 'Informatik'],
      [27,14, 55, 'Mathematik'],
    ];

    for (const [days, hour, durationMin, catName] of sessionData) {
      const start = ts(days, hour);
      const end   = ts(days, hour, durationMin);
      await client.query(
        `INSERT INTO sessions (user_id, category_id, start_time, end_time, duration, mode)
         VALUES ($1, $2, $3, $4, $5, 'focus')`,
        [userId, catMap[catName], start, end, durationMin * 60],
      );
    }

    const totalSessions = sessionData.length;
    const totalMin = sessionData.reduce((a, [,, m]) => a + m, 0);
    console.log(`${totalSessions} Sessions eingefügt — ${Math.floor(totalMin / 60)}h ${totalMin % 60}m gesamt`);

    /* ── 5. Wochenziel ─────────────────────────────────────── */
    await client.query(
      `INSERT INTO goals (user_id, period, target_hours)
       VALUES ($1, 'weekly', 20)
       ON CONFLICT (user_id, period) DO UPDATE SET target_hours = 20`,
      [userId],
    );
    console.log('Wochenziel: 20h');

    /* ── 6. Achievements ───────────────────────────────────── */
    await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       SELECT $1, a.id FROM achievements a
       WHERE a.key IN ('first_session', 'streak_7', 'total_10h', 'pomodoro_10', 'five_categories')
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [userId],
    );
    console.log('Achievements freigeschaltet: first_session, streak_7, total_10h, pomodoro_10, five_categories');

    await client.query('COMMIT');
    console.log('\n✓ Seed erfolgreich — Login: marian.luger@icloud.com / Abgabe2026!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed fehlgeschlagen:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
