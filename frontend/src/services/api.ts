/*
 * services/api.ts
 * ─────────────────────────────────────────────────────────────
 * Zentraler API-Service für alle Kommunikation mit dem Backend.
 *
 * Wie es funktioniert:
 *  - Alle fetch()-Aufrufe laufen durch die apiFetch()-Hilfsfunktion
 *  - Diese fügt automatisch den JWT-Token aus dem localStorage hinzu
 *  - Bei 401-Fehlern (Token abgelaufen) wird der Nutzer ausgeloggt
 *
 * Verwendung in Komponenten:
 *   import { authApi } from '../services/api';
 *   const result = await authApi.login('mail@test.de', 'passwort');
 * ─────────────────────────────────────────────────────────────
 */

/* ── Basis-URL ───────────────────────────────────────────────── */
// Im Entwicklungsmodus zeigt der Backend-Server auf Port 3001.
// In der Produktion wird diese URL durch eine Umgebungsvariable ersetzt.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/* ── Token-Verwaltung ────────────────────────────────────────── */
// Der JWT-Token wird im localStorage gespeichert — so bleibt der Nutzer
// auch nach einem Seitenneuladen eingeloggt.
const TOKEN_KEY = 'studytracker_token'; // Schlüssel im localStorage

// Token lesen
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Token speichern (nach Login/Registrierung)
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Token löschen (beim Logout)
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ── Zentrale Fetch-Hilfsfunktion ────────────────────────────── */
// Alle API-Aufrufe gehen durch diese Funktion.
// Sie fügt automatisch den Authorization-Header hinzu.
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options, // Alle übergebenen Optionen übernehmen (method, body, ...)
    headers: {
      'Content-Type': 'application/json', // Wir senden immer JSON
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // Token anhängen wenn vorhanden
      ...options.headers, // Optionale zusätzliche Header überschreiben
    },
  });

  // Antwort-Body als JSON lesen
  const data = await response.json();

  if (!response.ok) {
    // HTTP-Fehler (4xx, 5xx) → Fehler werfen mit der Fehlermeldung vom Backend
    throw new Error(data.error ?? `HTTP-Fehler ${response.status}`);
  }

  return data as T; // Typisiertes Ergebnis zurückgeben
}

/* ── Auth-API ────────────────────────────────────────────────── */
export const authApi = {

  // Benutzer registrieren
  register: (email: string, password: string, username: string) =>
    apiFetch<{ user: object; token: string }>('/auth/register', {
      method: 'POST',
      body:   JSON.stringify({ email, password, username }),
    }),

  // Benutzer einloggen
  login: (email: string, password: string) =>
    apiFetch<{ user: object; token: string }>('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    }),

  // Eigenes Profil abrufen (benötigt Token)
  getMe: () =>
    apiFetch<{ user: object }>('/auth/me'),
};

/* ── Sessions-API ────────────────────────────────────────────── */
export const sessionsApi = {

  // Alle Sessions des eingeloggten Nutzers laden
  getAll: () =>
    apiFetch<{ sessions: object[] }>('/sessions'),

  // Neue Session nach Ende speichern
  create: (data: {
    categoryId?: number | null;
    startTime:   string;
    endTime:     string;
    duration:    number;
    notes?:      string;
  }) =>
    apiFetch<{ session: object }>('/sessions', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  // Session löschen
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
};

/* ── Kategorien-API ──────────────────────────────────────────── */
export const categoriesApi = {

  // Alle Kategorien mit Gesamtlernzeit laden
  getAll: () =>
    apiFetch<{ categories: object[] }>('/categories'),

  // Neue Kategorie erstellen
  create: (name: string, color: string) =>
    apiFetch<{ category: object }>('/categories', {
      method: 'POST',
      body:   JSON.stringify({ name, color }),
    }),

  // Kategorie löschen
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};

/* ── Statistik-API ───────────────────────────────────────────── */
export const statsApi = {

  // Lernzeit pro Tag der letzten 7 Tage
  getWeek: () =>
    apiFetch<{ data: object[] }>('/stats/week'),

  // Lernzeit pro Woche der letzten 4 Wochen
  getMonth: () =>
    apiFetch<{ data: object[] }>('/stats/month'),

  // Lernzeit pro Kategorie
  getByCategory: () =>
    apiFetch<{ data: object[] }>('/stats/category'),

  // Gesamtüberblick: Gesamtzeit, heute, Streak, Sessionanzahl
  getSummary: () =>
    apiFetch<{ data: object }>('/stats/summary'),
};
