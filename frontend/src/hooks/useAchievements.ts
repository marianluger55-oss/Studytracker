/*
 * hooks/useAchievements.ts
 * TanStack Query Hook für Errungenschaften.
 *
 * Ruft GET /api/achievements auf. Das Backend prüft und entsperrt
 * automatisch neue Errungenschaften vor der Antwort.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/* ── Typ für eine einzelne Errungenschaft ──────────────────────── */
export interface Achievement {
  id:          number;
  key:         string;
  name:        string;
  description: string;
  icon:        string;
  xpReward:    number;
  unlockedAt:  string | null; // ISO-String oder null
}

const QUERY_KEY = ['achievements'] as const;

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ achievements: Achievement[] }>('/achievements');
      return data.achievements;
    },
    staleTime: 60_000, // 1 Minute — Errungenschaften ändern sich selten
  });
}
