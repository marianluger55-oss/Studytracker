/*
 * tests/e2e/auth.spec.ts
 * Playwright E2E-Tests für den Auth-Flow.
 *
 * Testet: Register → Login → Dashboard → Logout
 * Setzt voraus: Vite-Dev-Server läuft (via playwright.config.ts webServer)
 */

import { test, expect } from '@playwright/test';

/* Eindeutige E-Mail pro Testlauf damit Tests nicht voneinander abhängen */
const uniqueEmail = () =>
  `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

test.describe('Auth-Flow', () => {
  const email    = uniqueEmail();
  const password = 'Password1';
  const username = 'E2ETestUser';

  test('Register → Dashboard', async ({ page }) => {
    await page.goto('/register');

    /* Felder ausfüllen */
    await page.getByLabel(/benutzername/i).fill(username);
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/passwort/i).first().fill(password);

    /* Absenden */
    await page.getByRole('button', { name: /registrieren/i }).click();

    /* Nach Register → Dashboard (geschützte Route) */
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('Logout → Login-Seite', async ({ page }) => {
    /* Einloggen */
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/passwort/i).fill(password);
    await page.getByRole('button', { name: /anmelden/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    /* Logout über Sidebar (Abmelden-Link) */
    await page.getByRole('button', { name: /abmelden/i }).click();

    /* Nach Logout → Login-Seite */
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('Falsches Passwort zeigt Fehlermeldung', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/passwort/i).fill('WrongPass999');
    await page.getByRole('button', { name: /anmelden/i }).click();

    /* Fehlermeldung muss sichtbar sein */
    await expect(page.getByText(/ungültige anmeldedaten/i)).toBeVisible({ timeout: 5_000 });
    /* Seite bleibt auf Login */
    await expect(page).toHaveURL(/\/login/);
  });

  test('Geschützte Route ohne Auth → Login', async ({ page }) => {
    /* Kein Cookie → ProtectedRoute soll auf /login umleiten */
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
