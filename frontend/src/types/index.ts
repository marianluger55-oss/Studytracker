/*
 * types/index.ts
 * ─────────────────────────────────────────────────────────────
 * Zentrale TypeScript-Typdefinitionen für die gesamte App.
 * Alle Interfaces beschreiben die "Form" unserer Daten.
 * Änderungen hier wirken sich auf Frontend + API aus.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Benutzer ────────────────────────────────────────────────── */
// Repräsentiert einen eingeloggten Benutzer (ohne Passwort-Hash)
export interface User {
  id: number;        // Eindeutige Datenbankid
  email: string;     // E-Mail-Adresse
  username: string;  // Anzeigename
  createdAt: string; // ISO-Datumsstring der Registrierung
}

/* ── Standard API-Wrapper ────────────────────────────────────── */
// Alle Backend-Antworten sind in dieses Format eingepackt
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiFailure {
  success: false;
  error: { message: string; code?: string; requestId?: string };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/* ── Auth-Antworten vom Backend ──────────────────────────────── */
// Antwort beim Login/Register — enthält Benutzer + Access-Token
export interface AuthPayload {
  user: User;
  accessToken: string; // Kurzlebiger JWT (15 Minuten)
}
// Für Rückwärtskompatibilität
export type AuthResponse = AuthPayload;

/* ── Category ───────────────────────────────────────────────── */
export interface Category {
  id: number;            // Eindeutige ID
  name: string;          // Anzeigename, z. B. "Mathematik"
  color: string;         // Hex-Farbcode, z. B. "#3b82f6"
  totalMinutes?: number; // Gesamte Lernminuten — optional, kommt aus Stats-Join
  sessionCount?: number; // Anzahl der Sessions in dieser Kategorie
}

/* ── StudySession ────────────────────────────────────────────── */
export interface StudySession {
  id: number;                // Eindeutige ID
  categoryId: number | null; // Kategorie-ID (null = ohne Kategorie)
  categoryName: string;      // Kategoriename — für schnelle Anzeige ohne Join
  categoryColor: string;     // Farbe — für Badges und Charts
  startTime: string;         // ISO-Datumsstring des Starts
  endTime: string;           // ISO-Datumsstring des Endes
  duration: number;          // Dauer in SEKUNDEN
  notes?: string;            // Optionale Notizen zur Session
  createdAt: string;         // Wann die Session gespeichert wurde
}

/* ── Goal ────────────────────────────────────────────────────── */
export interface Goal {
  id: number;
  targetHours: number;
  period: 'daily' | 'weekly' | 'monthly'; // Zeitraum — nur diese drei Werte erlaubt
  currentHours?: number;    // Bereits absolvierte Stunden (aus Stats berechnet)
  progressPercent?: number; // Fortschritt 0–100
}

/* ── Settings ────────────────────────────────────────────────── */
export interface Settings {
  theme: 'dark' | 'light';
  pomodoroLength: number; // Fokusblock in Minuten
  shortBreak: number;     // Kurze Pause in Minuten
  longBreak: number;      // Lange Pause in Minuten
  username: string;
  email: string;
  // Neue Einstellungen
  autoStartBreaks: boolean;       // Pausen automatisch starten
  autoStartPomodoros: boolean;    // Nächsten Pomodoro automatisch starten
  longBreakInterval: number;      // Nach wie vielen Pomodoros lange Pause
  notificationsEnabled: boolean;  // Browser-Benachrichtigungen ein/aus
  soundEnabled: boolean;          // Ton ein/aus
}

/* ── Statistik-Daten ─────────────────────────────────────────── */
// Ein Datenpunkt im Wochen-/Monatsdiagramm
export interface ChartDataPoint {
  label: string;   // x-Achse: Wochentag oder KW-Bezeichnung
  minutes: number; // y-Achse: Lernminuten
}

// Gesamtüberblick — für Dashboard-Kacheln
export interface StatsSummary {
  totalMinutes:  number;  // Gesamte Lernzeit aller Zeiten
  todayMinutes:  number;  // Heute gelernt
  weekMinutes:   number;  // Diese Woche gelernt (Montag–Sonntag UTC)
  sessionCount:  number;  // Gesamtanzahl Sessions
  currentStreak: number;  // Aktuelle Lernserie in Tagen (backend-berechnet)
  longestStreak: number;  // Längste Serie aller Zeiten
}

/* ── Timer-Modus ─────────────────────────────────────────────── */
// Welchen Modus der Timer gerade anzeigt
export type TimerMode = 'pomodoro' | 'short-break' | 'long-break' | 'deep-work';

/* ── API-Fehler ──────────────────────────────────────────────── */
// Einheitlicher Fehlertyp für alle API-Aufrufe
export interface ApiError {
  error: string;    // Fehlermeldung
  code?: string;    // Optionaler Fehlercode
  status?: number;  // HTTP-Statuscode
}

/* ── Pagination ──────────────────────────────────────────────── */
// Wird für paginierte Listen-Endpunkte verwendet
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
