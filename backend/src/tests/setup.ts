/*
 * tests/setup.ts
 * Globales Test-Setup: setzt Umgebungsvariablen bevor irgendein Modul
 * importiert wird. Verhindert "FATAL: Umgebungsvariable nicht gesetzt".
 */

import 'dotenv/config';

/* Test-Umgebungsvariablen — überschreiben .env falls vorhanden */
process.env.NODE_ENV    = 'test';
process.env.JWT_SECRET  = process.env.JWT_SECRET  || 'test-secret-min-32-chars-long!!!';
process.env.DATABASE_URL= process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/studytracker_test';
process.env.PORT        = '0'; /* Zufälliger freier Port für jeden Test-Run */
