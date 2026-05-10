/*
 * lib/queryClient.ts
 * ─────────────────────────────────────────────────────────────
 * TanStack Query Konfiguration.
 *
 * TanStack Query verwaltet Server-Zustand:
 *  - Automatisches Caching von API-Antworten
 *  - Stale-While-Revalidate: Zeigt cached Daten, holt neue im Hintergrund
 *  - Automatisches Re-Fetching wenn das Browser-Fenster wieder aktiv wird
 *  - Optimistic Updates für sofortige UI-Reaktion
 *
 * Konfigurationsentscheidungen:
 *  - staleTime: 60s — Daten gelten 60s als frisch, kein unnecessary Re-Fetch
 *  - gcTime: 5min — Daten bleiben 5min im Cache nach Komponenten-Unmount
 *  - retry: 1 — Fehlgeschlagene Anfragen 1x wiederholen (nicht bei 4xx)
 *  - refetchOnWindowFocus: true — Daten werden frisch geholt wenn Tab aktiviert
 * ─────────────────────────────────────────────────────────────
 */

import { QueryClient } from '@tanstack/react-query';

/* ── QueryClient-Instanz ─────────────────────────────────────── */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 60 Sekunden bis Daten als "veraltet" gelten
      gcTime:    5 * 60 * 1000,   // 5 Minuten im Cache nach Komponenten-Unmount
      retry: (failureCount, error: unknown) => {
        // 4xx-Fehler NICHT wiederholen — das sind Clientfehler (falsche Anfrage)
        // Nur 5xx (Serverfehler) und Netzwerkfehler werden retried
        const status = (error as { response?: { status: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1; // Max 1 Wiederholung
      },
      refetchOnWindowFocus: true,  // Daten erneuern wenn Tab aktiviert wird
      refetchOnReconnect:   true,  // Daten erneuern nach Internet-Wiederkehr
    },
    mutations: {
      retry: 0, // Mutationen (POST/PUT/DELETE) nie automatisch wiederholen
    },
  },
});
