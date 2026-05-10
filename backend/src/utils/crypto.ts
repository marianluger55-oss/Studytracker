/*
 * utils/crypto.ts
 * Kryptographie-Hilfsfunktionen.
 * Refresh-Tokens werden als SHA-256 Hash gespeichert —
 * bei einem DB-Leak sind die echten Tokens nicht rekonstruierbar.
 */

import { createHash, randomBytes } from 'crypto';

/* Einen kryptographisch sicheren Zufalls-Token erzeugen (128 Hex-Zeichen) */
export function generateSecureToken(): string {
  return randomBytes(64).toString('hex');
}

/* SHA-256 Hash eines Tokens — wird in der DB gespeichert statt des Klartexts */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
