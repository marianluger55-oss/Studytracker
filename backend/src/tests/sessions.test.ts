/*
 * tests/sessions.test.ts
 * Integrationstests für die Sessions-API.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app     from '../index';
import { pool } from '../db/pool';

const uniqueEmail = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

/* Hilfsfunktion: User registrieren und Access-Token holen */
async function registerAndLogin(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Password1', username: 'SessTest' });
  return res.body.data?.accessToken as string;
}

async function cleanupUser(email: string) {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

/* ── POST /api/sessions ──────────────────────────────────────── */
describe('POST /api/sessions', () => {
  const email = uniqueEmail();
  let token: string;

  beforeAll(async () => { token = await registerAndLogin(email); });
  afterAll(()  => cleanupUser(email));

  it('erstellt eine neue Session', async () => {
    const now   = new Date();
    const later = new Date(now.getTime() + 25 * 60 * 1000);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        startTime:  now.toISOString(),
        endTime:    later.toISOString(),
        duration:   1500,
        categoryId: null,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.duration).toBe(1500);
  });

  it('lehnt Session ohne Pflichtfelder ab', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ duration: 100 });

    expect(res.status).toBe(400);
  });

  it('lehnt unauthentifizierte Anfrage ab', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ duration: 100 });
    expect(res.status).toBe(401);
  });
});

/* ── GET /api/sessions ───────────────────────────────────────── */
describe('GET /api/sessions', () => {
  const email = uniqueEmail();
  let token: string;

  beforeAll(async () => { token = await registerAndLogin(email); });
  afterAll(()  => cleanupUser(email));

  it('gibt leere Liste zurück für neuen User', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toBeInstanceOf(Array);
    expect(res.body.data.total).toBe(0);
  });

  it('unterstützt Pagination mit ?limit=10&offset=0', async () => {
    const res = await request(app)
      .get('/api/sessions?limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(10);
    expect(res.body.data.offset).toBe(0);
  });
});

afterAll(async () => { await pool.end(); });
