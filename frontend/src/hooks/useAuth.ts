/*
 * hooks/useAuth.ts
 * Zentraler Hook für alle Auth-Operationen.
 *
 * Der apiClient-Interceptor unwrappt { success: true, data: X } automatisch,
 * daher liest dieser Hook response.data.user / response.data.accessToken direkt.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/apiClient';
import type { AuthPayload } from '../types';

export function useAuth() {
  const { user, isAuthenticated, isInitialized, setAuth, clearAuth, setInitialized } =
    useAuthStore();
  const navigate = useNavigate();

  /* ── login ──────────────────────────────────────────────────── */
  const login = useCallback(
    async (email: string, password: string) => {
      /* Interceptor unwrappt { success, data } → hier ist data direkt AuthPayload */
      const { data } = await apiClient.post<AuthPayload>('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      navigate('/');
    },
    [setAuth, navigate]
  );

  /* ── register ───────────────────────────────────────────────── */
  const register = useCallback(
    async (email: string, password: string, username: string) => {
      const { data } = await apiClient.post<AuthPayload>('/auth/register', {
        email,
        password,
        username,
      });
      setAuth(data.user, data.accessToken);
      navigate('/');
    },
    [setAuth, navigate]
  );

  /* ── logout ─────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      /* Logout lokal trotzdem durchführen */
    } finally {
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  /* ── tryRefreshToken ────────────────────────────────────────── */
  const tryRefreshToken = useCallback(async () => {
    try {
      const { data } = await apiClient.post<AuthPayload>('/auth/refresh');
      setAuth(data.user, data.accessToken);
    } catch {
      clearAuth();
    } finally {
      setInitialized();
    }
  }, [setAuth, clearAuth, setInitialized]);

  return {
    user,
    isAuthenticated,
    isInitialized,
    login,
    register,
    logout,
    tryRefreshToken,
  };
}
