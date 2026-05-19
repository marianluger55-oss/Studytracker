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

async function registerAndGetToken(email: string, username = 'AdminTest') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Password1', username });
  return {
    token:  res.body.data?.accessToken as string,
    userId: res.body.data?.user?.id    as number,
  };
}

/* Gibt einem User Admin-Rolle direkt in der DB */
async function makeAdmin(userId: number) {
  await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [userId]);
}

/* Admin-Token für Tests, die Admin-Rechte brauchen */
async function getAdminToken(email: string) {
  const { token, userId } = await registerAndGetToken(email, 'AdminUser');
  await makeAdmin(userId);
  /* Neuen Token ausstellen — Login gibt role aus DB zurück */
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password1' });
  return { token: loginRes.body.data?.accessToken as string, userId };
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

  it('GET /api/admin/audit gibt 403 zurück', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
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

/* ── Admin-Routen mit Admin-Token ────────────────────────────── */
describe('Admin-Routen — mit Admin-Rechten', () => {
  const email = uniqueEmail();
  let adminToken: string;

  beforeAll(async () => {
    ({ token: adminToken } = await getAdminToken(email));
  });
  afterAll(() => cleanupUser(email));

  it('GET /api/admin/stats gibt Plattform-Statistiken zurück', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalSessions');
    expect(res.body.data).toHaveProperty('activeToday');
  });

  it('GET /api/admin/growth gibt 14-Tage-Chartdaten zurück', async () => {
    const res = await request(app)
      .get('/api/admin/growth')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.userGrowth).toHaveLength(14);
    expect(res.body.data.sessionActivity).toHaveLength(14);
  });

  it('GET /api/admin/activity gibt Aktivitätsfeed zurück', async () => {
    const res = await request(app)
      .get('/api/admin/activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/admin/users gibt paginierte Benutzerliste zurück', async () => {
    const res = await request(app)
      .get('/api/admin/users?limit=10&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });

  it('GET /api/admin/users?search= filtert Benutzer', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=AdminUser')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    /* Mindestens der Admin selbst muss im Ergebnis sein */
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });

  it('GET /api/admin/audit gibt Audit-Log zurück', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });
});

afterAll(async () => { await pool.end(); });
