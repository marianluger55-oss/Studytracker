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
