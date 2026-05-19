/*
 * tests/admin.test.ts
 * Integrationstests für die Admin-API.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app     from '../index';
import { pool } from '../db/pool';

const uniqueEmail = () => `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

async function cleanupUser(email: string) {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

async function registerAndGetToken(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Password1', username: 'AdminTest' });
  return { token: res.body.data?.accessToken as string, id: res.body.data?.user?.id as number };
}

/* ── Admin-Zugriff ohne Admin-Rolle ──────────────────────────── */
describe('Admin-Routen — ohne Admin-Rolle', () => {
  const email = uniqueEmail();
  let token: string;

  beforeAll(async () => { ({ token } = await registerAndGetToken(email)); });
  afterAll(()  => cleanupUser(email));

  it('GET /api/admin/stats gibt 403 zurück', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users gibt 403 zurück', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

/* ── Admin-Zugriff ohne Token ────────────────────────────────── */
describe('Admin-Routen — unauthentifiziert', () => {
  it('gibt 401 zurück', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

afterAll(async () => { await pool.end(); });
