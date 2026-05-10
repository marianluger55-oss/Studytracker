import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    /* Isolierte Testumgebung — jede Datei bekommt ihre eigene Node-Instanz */
    environment: 'node',
    globals:     true,
    /* Test-Setup-Datei: setzt Umgebungsvariablen und DB-Verbindung */
    setupFiles:  ['./src/tests/setup.ts'],
    /* Testdateien nur aus tests/-Verzeichnis */
    include:     ['src/tests/**/*.test.ts'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'json', 'html'],
      exclude:   ['src/db/migrate.ts', 'src/db/init.ts', 'node_modules'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
