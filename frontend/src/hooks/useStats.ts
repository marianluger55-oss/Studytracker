/*
 * hooks/useStats.ts
 * TanStack Query Hook für Dashboard-Statistiken vom Backend.
 *
 * Warum eigener Hook statt lokale Berechnung?
 *  - Streak MUSS vom Backend kommen (korrekte UTC-Taggrenze, persistiert)
 *  - Verhindert inkonsistente Daten zwischen Tabs / Geräten
 *  - Streak-Berechnung ist O(n log n) SQL — nicht O(n²) JS
 */

import { useQuery } from '@tanstack/react-query';
import apiClient    from '../services/apiClient';
import type { StatsSummary } from '../types';

export const STATS_QUERY_KEY = ['stats', 'summary'] as const;

export function useStats() {
  return useQuery<StatsSummary>({
    queryKey:  STATS_QUERY_KEY,
    queryFn:   async () => {
      const { data } = await apiClient.get<StatsSummary>('/stats/summary');
      return data;
    },
    staleTime: 30_000,   /* 30s — Streak ändert sich nicht sekündlich */
    gcTime:    5 * 60_000,
  });
}
