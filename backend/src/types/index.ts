/*
 * types/index.ts
 * ─────────────────────────────────────────────────────────────
 * TypeScript-Typen und -Interfaces für das Backend.
 *
 * Diese Typen beschreiben die Form der Daten, die zwischen
 * Datenbank, API-Routen und dem Frontend ausgetauscht werden.
 * ─────────────────────────────────────────────────────────────
 */

import { Request } from 'express';

/* ── Datenbankzeilen-Typen ───────────────────────────────────── */
// Diese Typen spiegeln die Spalten der jeweiligen Datenbanktabellen wider.

// Eine Zeile aus der users-Tabelle
export interface UserRow {
  id:            number;
  email:         string;
  password_hash: string;
  role:          'user' | 'admin';
  username:      string;
  created_at:    Date;
}

// Eine Zeile aus der categories-Tabelle
export interface CategoryRow {
  id:         number;
  user_id:    number;
  name:       string;
  color:      string;
  created_at: Date;
}

// Eine Zeile aus der sessions-Tabelle
export interface SessionRow {
  id:          number;
  user_id:     number;
  category_id: number | null; // null wenn die Kategorie gelöscht wurde
  start_time:  Date;
  end_time:    Date;
  duration:    number; // Sekunden
  notes:       string | null;
  created_at:  Date;
}

// Eine Zeile aus der goals-Tabelle
export interface GoalRow {
  id:           number;
  user_id:      number;
  period:       'daily' | 'weekly' | 'monthly';
  target_hours: number;
  created_at:   Date;
}

/* ── JWT-Payload ─────────────────────────────────────────────── */
// Was im JWT-Token gespeichert wird (userId reicht — mehr brauchen wir nicht).
export interface JwtPayload {
  userId: number; // Die ID des eingeloggten Benutzers
}

/* ── Erweiterter Request mit Benutzer ───────────────────────── */
// Express-Request erweitert um die userId, die die Auth-Middleware setzt.
// So können Routen einfach auf req.userId zugreifen.
export interface AuthRequest extends Request {
  userId?: number;
}
