/*
 * tests/auth.test.ts
 * Integrationstests für die Auth-API.
 * Nutzt Supertest gegen die echte Express-App (keine Mocks).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app     from '../index';
import { pool } from '../db/pool';

/* ── Hilfsfunktionen ─────────────────────────────────────────── */

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

async function cleanupUser(email: string): Promise<void> {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

/* Registriert einen User und gibt Token + Cookie zurück */
async function registerUser(email: string, password = 'Password1', username = 'Testuser') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, username });
  const token     = res.body.data?.accessToken as string;
  const rawCookie = res.headers['set-cookie'];
  const cookie    = Array.isArray(rawCookie) ? rawCookie[0] : (rawCookie ?? '');
  const userId    = res.body.data?.user?.id as number;
  return { token, cookie, userId };
}

/* ── Register ────────────────────────────────────────────────── */

describe('POST /api/auth/register', () => {
  const email = uniqueEmail();
  afterAll(() => cleanupUser(email));

  it('registriert einen neuen Benutzer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1', username: 'Testuser' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    /* Refresh-Token als httpOnly-Cookie gesetzt */
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('lehnt doppelte E-Mail ab', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1', username: 'Doppelt' });

    expect(res.status).toBe(409);
  });

  it('lehnt schwaches Passwort ab (Zod-Validierung)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail(), password: 'weak', username: 'User' });

    expect(res.status).toBe(400);
  });

  it('lehnt ungültige E-Mail ab', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'kein-email', password: 'Password1', username: 'User' });

    expect(res.status).toBe(400);
  });
});

/* ── Login ───────────────────────────────────────────────────── */

describe('POST /api/auth/login', () => {
  const email    = uniqueEmail();
  const password = 'Password1';

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email, password, username: 'LoginTest' });
  });
  afterAll(() => cleanupUser(email));

  it('gibt Access- und Refresh-Token zurück', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    /* Refresh-Token ist im httpOnly-Cookie */
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('lehnt falsches Passwort ab', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Wrong1234' });

    expect(res.status).toBe(401);
  });

  it('lehnt unbekannte E-Mail ab (ohne Timing-Leak)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'Password1' });

    expect(res.status).toBe(401);
  });

  it('login_failed schreibt keinen user-Hinweis in die Fehlermeldung', async () => {
    const wrongRes = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'Password1' });

    const rightRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1' });

    /* Beide Fehler müssen identische Meldung zurückgeben — kein Enumeration-Leak */
    expect(wrongRes.body?.error?.message).toBe(rightRes.body?.error?.message);
  });
});

/* ── /auth/me ────────────────────────────────────────────────── */

describe('GET /api/auth/me', () => {
  const email = uniqueEmail();
  let token: string;

  beforeAll(async () => { ({ token } = await registerUser(email)); });
  afterAll(() => cleanupUser(email));

  it('gibt Nutzerinfo zurück wenn authentifiziert', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('gibt 401 zurück ohne Token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('gibt 401 zurück mit ungültigem Token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});

/* ── /auth/refresh ───────────────────────────────────────────── */

describe('POST /api/auth/refresh', () => {
  const email = uniqueEmail();
  let cookie: string;

  beforeAll(async () => {
    const reg = await registerUser(email);
    cookie    = reg.cookie;
  });
  afterAll(() => cleanupUser(email));

  it('stellt neuen Access-Token aus', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    /* Neuer Refresh-Token wird rotiert */
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('gibt 401 zurück ohne Cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

/* ── /auth/logout ────────────────────────────────────────────── */

describe('POST /api/auth/logout', () => {
  const email = uniqueEmail();
  let cookie: string;
  let token: string;

  beforeAll(async () => { ({ cookie, token } = await registerUser(email)); });
  afterAll(() => cleanupUser(email));

  it('meldet ab und löscht Refresh-Token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    /* Refresh-Token Cookie muss gecleart sein */
    const rawSet    = res.headers['set-cookie'];
    const setCookie = Array.isArray(rawSet) ? rawSet : rawSet ? [rawSet] : [];
    expect(setCookie.some((c: string) => c.includes('refreshToken=;'))).toBe(true);
  });

  it('Refresh nach Logout schlägt fehl', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(res.status).toBe(401);
  });
});

/* ── /auth/logout-all ────────────────────────────────────────── */

describe('POST /api/auth/logout-all', () => {
  const email = uniqueEmail();
  let token: string;
  let cookie: string;

  beforeAll(async () => { ({ token, cookie } = await registerUser(email)); });
  afterAll(() => cleanupUser(email));

  it('invalidiert alle Sessions', async () => {
    /* Zweite Session anlegen */
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password1' });
    const raw2    = login2.headers['set-cookie'];
    const cookie2 = Array.isArray(raw2) ? raw2[0] : (raw2 ?? '');

    /* logout-all ausführen */
    const logoutRes = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    /* Beide Refresh-Tokens müssen ungültig sein */
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', cookie2);
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
  });
});

/* ── /health ─────────────────────────────────────────────────── */

describe('GET /health', () => {
  it('gibt Status ok zurück', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

/* ── Teardown ────────────────────────────────────────────────── */

afterAll(async () => {
  await pool.end();
});
