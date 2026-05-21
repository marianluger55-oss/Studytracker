/*
 * hooks/useAuth.ts
 * ─────────────────────────────────────────────────────────────
 * Zentraler Hook für alle Auth-Operationen (Login, Register, Logout, Token-Refresh).
 *
 * Architektur:
 *  - authStore: hält user, isAuthenticated, isInitialized im Zustand
 *  - apiClient: HTTP-Client mit automatischem Token-Refresh (Interceptor)
 *  - useCallback: verhindert unnötige Re-Renders — Funktionen nur neu erstellen
 *    wenn ihre Abhängigkeiten (setAuth, navigate) sich ändern
 *
 * Der apiClient-Interceptor unwrappt { success: true, data: X } automatisch,
 * daher liest dieser Hook response.data.user / response.data.accessToken direkt.
 *
 * Token-Strategie:
 *  Access-Token (kurz): 15 Min im Memory (authStore) — niemals in localStorage
 *  Refresh-Token (lang): 7 Tage als httpOnly-Cookie — JS kann ihn nicht lesen
 * ─────────────────────────────────────────────────────────────
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/apiClient';
import type { AuthPayload } from '../types';

export function useAuth() {
  /* Auth-State aus dem Store: user (Profil), isAuthenticated (eingeloggt?), isInitialized (App bereit?) */
  const { user, isAuthenticated, isInitialized, setAuth, clearAuth, setInitialized } =
    useAuthStore();
  /* navigate: programmatische Navigation ohne Full-Page-Reload */
  const navigate = useNavigate();

  /* ── login ──────────────────────────────────────────────────── */
  const login = useCallback(
    async (email: string, password: string) => {
      /* POST /auth/login → Backend gibt AccessToken + User-Profil zurück */
      /* Interceptor unwrappt { success, data } → hier ist data direkt AuthPayload */
      const { data } = await apiClient.post<AuthPayload>('/auth/login', { email, password });
      setAuth(data.user, data.accessToken); /* User + Token im Store speichern */
      /* Nach Login direkt zum Dashboard — nicht zur Landing Page */
      navigate('/dashboard');
    },
    [setAuth, navigate] /* useCallback-Abhängigkeiten — Funktion bleibt stabil */
  );

  /* ── register ───────────────────────────────────────────────── */
  const register = useCallback(
    async (email: string, password: string, username: string) => {
      /* POST /auth/register → Backend legt Nutzer an und gibt sofort Token zurück */
      const { data } = await apiClient.post<AuthPayload>('/auth/register', {
        email,
        password,
        username,
      });
      setAuth(data.user, data.accessToken); /* Direkt einloggen nach Registrierung */
      /* Nach Registrierung direkt zum Dashboard — nicht zur Landing Page */
      navigate('/dashboard');
    },
    [setAuth, navigate]
  );

  /* ── logout ─────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try {
      /* POST /auth/logout → Backend löscht den Refresh-Token-Cookie auf dem Server */
      await apiClient.post('/auth/logout');
    } catch {
      /* Netzwerkfehler ignorieren — lokaler Logout soll immer funktionieren */
    } finally {
      /* finally: wird immer ausgeführt, auch wenn der Server-Request fehlschlägt */
      clearAuth();       /* User + Token aus dem Store löschen */
      navigate('/login'); /* Zur Login-Seite umleiten */
    }
  }, [clearAuth, navigate]);

  /* ── tryRefreshToken ────────────────────────────────────────── */
  /* Wird beim App-Start aufgerufen: prüft ob der Refresh-Token-Cookie noch gültig ist.
     Wenn ja: neuen AccessToken holen und eingeloggt bleiben (Session wiederherstellen).
     Wenn nein: clearAuth() und zur Login-Seite (kein automatischer Redirect hier — App.tsx übernimmt). */
  const tryRefreshToken = useCallback(async () => {
    try {
      /* POST /auth/refresh → Browser schickt httpOnly-Cookie automatisch mit */
      const { data } = await apiClient.post<AuthPayload>('/auth/refresh');
      setAuth(data.user, data.accessToken); /* Neuen AccessToken + aktuelles Profil speichern */
    } catch {
      /* Cookie ungültig oder abgelaufen → Nutzer muss sich neu anmelden */
      clearAuth();
    } finally {
      /* isInitialized: App weiß jetzt ob Nutzer eingeloggt ist oder nicht */
      /* Verhindert "Flicker" — App zeigt Loading-Screen bis dieser Check abgeschlossen ist */
      setInitialized();
    }
  }, [setAuth, clearAuth, setInitialized]);

  return {
    user,             /* Nutzer-Profil (id, email, username, role) oder null */
    isAuthenticated,  /* true wenn eingeloggt */
    isInitialized,    /* true sobald tryRefreshToken() abgeschlossen — App ist bereit */
    login,            /* Einloggen mit E-Mail + Passwort */
    register,         /* Neuen Account erstellen */
    logout,           /* Ausloggen (Server + lokal) */
    tryRefreshToken,  /* Session beim App-Start wiederherstellen */
  };
}
