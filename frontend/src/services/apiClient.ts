/*
 * services/apiClient.ts
 * ─────────────────────────────────────────────────────────────
 * Zentraler HTTP-Client für alle Backend-Anfragen.
 *
 * Warum Axios statt fetch?
 *  - Automatische JSON-Serialisierung
 *  - Request/Response Interceptors für Token-Handling
 *  - Bessere Fehlerbehandlung (Error-Objekte mit Status)
 *  - Timeout-Support ohne extra Code
 *
 * Token-Erneuerung (Token Refresh Flow):
 *  1. API antwortet mit 401 (Token abgelaufen)
 *  2. Interceptor fängt den Fehler ab
 *  3. Schickt POST /auth/refresh mit dem httpOnly-Cookie
 *  4. Backend antwortet mit neuem Access-Token
 *  5. Ursprüngliche Anfrage wird automatisch wiederholt
 *
 * Queue-System: Mehrere parallele Anfragen die gleichzeitig 401 erhalten
 * werden nicht alle einzeln refreshed — sie warten alle auf den einen
 * laufenden Refresh und bekommen dann den neuen Token.
 * ─────────────────────────────────────────────────────────────
 */

import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

/* ── Basis-URL ───────────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/* ── Axios-Instanz erstellen ─────────────────────────────────── */
const apiClient = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true, // Sendet automatisch Cookies (Refresh-Token-Cookie!)
  timeout:         10_000, // 10 Sekunden — danach Timeout-Fehler
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ── Request Interceptor ─────────────────────────────────────── */
// Hängt den Access-Token an jede ausgehende Anfrage.
// Wird NACH dem Refresh-Token-Refresh aufgerufen, wenn der Token erneuert wurde.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Access-Token aus dem Store lesen (nicht localStorage — sicherer)
    const token = useAuthStore.getState().accessToken;

    if (token) {
      // Authorization Header: "Bearer eyJhbGci..." — Standard-Format für JWT
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor ────────────────────────────────────── */
// Behandelt 401-Fehler durch automatische Token-Erneuerung.

// Laufender Refresh? Andere Anfragen warten in dieser Queue
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Alle wartenden Anfragen auflösen oder abbrechen
function drainQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token!);
    }
  });
  pendingQueue = [];
}

/* ── Envelope-Unwrapping ─────────────────────────────────────────
   Backend antwortet immer mit { success: true, data: { ... } }.
   Dieser Interceptor unwrappt das automatisch, so dass Aufrufer
   einfach `response.data.field` statt `response.data.data.field` schreiben.
   Fehlerantworten (4xx/5xx) haben success: false — Axios wirft diese
   ohnehin als Error, sie landen nie hier. */
apiClient.interceptors.response.use((response) => {
  const body = response.data;
  if (body && body.success === true && Object.prototype.hasOwnProperty.call(body, 'data')) {
    response.data = body.data;
  }
  return response;
});

apiClient.interceptors.response.use(
  (response) => response,

  // Fehler abfangen
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Nur 401 behandeln — und nur einmal pro Anfrage (_retry verhindert Endlosschleife)
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Login-Endpunkt selbst nicht refreshen — sonst Endlosschleife
    if (original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Bereits ein Refresh läuft — in Queue einreihen und auf das Ergebnis warten
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        })
        .catch(Promise.reject.bind(Promise));
    }

    // Refresh starten
    original._retry  = true;
    isRefreshing      = true;

    try {
      // Refresh-Token aus httpOnly-Cookie wird automatisch mitgeschickt (withCredentials)
      /* Direkter axios-Aufruf (kein apiClient) um Interceptor-Loop zu vermeiden.
         Manuelles Unwrapping da der apiClient-Interceptor hier nicht läuft. */
      const { data } = await axios.post<{ success: true; data: { accessToken: string } }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = data.success ? data.data.accessToken : (data as unknown as { accessToken: string }).accessToken;

      useAuthStore.getState().setAccessToken(newToken);
      drainQueue(null, newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
