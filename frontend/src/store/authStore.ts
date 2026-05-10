/*
 * store/authStore.ts
 * ─────────────────────────────────────────────────────────────
 * Verwaltet den Authentifizierungsstatus der App.
 *
 * Sicherheitsstrategie:
 *  - Access Token (15 min): Im Zustand gespeichert, NICHT persistiert.
 *    Wird bei jedem Seitenneuladen per Refresh-Token neu geholt.
 *  - Refresh Token (7 Tage): Nur als httpOnly-Cookie — JavaScript kann
 *    ihn nicht lesen. Das verhindert XSS-Angriffe.
 *  - Benutzerdaten (id, email, username): Im localStorage persistiert —
 *    keine sensiblen Daten, nur für die Anzeige.
 *
 * Ablauf beim Seitenneuladen:
 *  1. authStore lädt Benutzerdaten aus localStorage
 *  2. apiClient erkennt fehlenden accessToken → sendet automatisch
 *     POST /api/auth/refresh mit dem Cookie
 *  3. Backend validiert Cookie → schickt neuen accessToken zurück
 *  4. authStore speichert neuen accessToken im Speicher
 * ─────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

/* ── Store-Interface ─────────────────────────────────────────── */
interface AuthState {
  // Benutzerdaten — aus localStorage geladen beim Start
  user: User | null;

  // Access Token — nur im Speicher, kein localStorage!
  // Bei Seitenneuladen ist er null → muss per Refresh-Cookie erneuert werden
  accessToken: string | null;

  // Ob der Benutzer eingeloggt ist (user !== null)
  isAuthenticated: boolean;

  // Ob die erste Auth-Prüfung (Refresh-Versuch) abgeschlossen ist
  // Verhindert dass Seiten kurz als "nicht eingeloggt" flackern
  isInitialized: boolean;

  // ── Aktionen ─────────────────────────────────────────────────
  // Setzt Benutzer + Access-Token nach Login/Register/Refresh
  setAuth: (user: User, accessToken: string) => void;

  // Aktualisiert nur den Access Token (nach Refresh)
  setAccessToken: (token: string) => void;

  // Löscht alle Auth-Daten beim Logout
  clearAuth: () => void;

  // Markiert die Initialisierung als abgeschlossen
  setInitialized: () => void;
}

/* ── Store erstellen ─────────────────────────────────────────── */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null, // NICHT persistiert — siehe partialize
      isAuthenticated: false,
      isInitialized:   false,

      // Vollständige Auth setzen — nach Login oder Refresh
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      // Nur Token aktualisieren — nach stiller Token-Erneuerung
      setAccessToken: (token) =>
        set({ accessToken: token }),

      // Alle Daten löschen — beim Logout oder abgelaufenem Refresh-Token
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      // Initialisierung abschließen — nach erstem Refresh-Versuch beim Start
      setInitialized: () =>
        set({ isInitialized: true }),
    }),
    {
      name: 'studytracker-auth', // localStorage-Schlüssel

      // partialize: Nur diese Felder werden in localStorage gespeichert.
      // accessToken ABSICHTLICH ausgelassen — er bleibt im Arbeitsspeicher.
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
        // accessToken: NICHT hier — sicherheitsrelevant!
      }),
    }
  )
);
