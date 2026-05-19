import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    /* Vite-Dev-Server läuft auf 5173 */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Vite-Dev-Server beim Test automatisch starten */
  webServer: {
    command:            'npm run dev',
    url:                'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout:             60_000,
  },
});
