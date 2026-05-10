/*
 * hooks/useGoals.ts
 * TanStack Query Hook für Ziele.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useGoalStore } from '../store/goalStore';
import type { Goal } from '../types';

const QUERY_KEY = ['goals'] as const;

interface BackendGoal {
  id:           number;
  period:       'daily' | 'weekly' | 'monthly';
  target_hours: number;
  created_at:   string;
}

function mapGoal(g: BackendGoal): Goal {
  return {
    id:          g.id,
    period:      g.period,
    targetHours: Number(g.target_hours),
  };
}

export function useGoals() {
  const { goals, setGoals, addGoal, removeGoal } = useGoalStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ goals: BackendGoal[] }>('/goals');
      return data.goals.map(mapGoal);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) setGoals(query.data);
  }, [query.data, setGoals]);

  /* ── Upsert Mutation ──────────────────────────────────────────  */
  const upsertMutation = useMutation({
    mutationFn: async ({ period, targetHours }: { period: Goal['period']; targetHours: number }) => {
      const { data } = await apiClient.post<{ goal: BackendGoal }>('/goals', { period, targetHours });
      return mapGoal(data.goal);
    },
    onSuccess: (goal) => {
      addGoal(goal);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  /* ── Delete Mutation ──────────────────────────────────────────  */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/goals/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeGoal(id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    goals,
    isLoading:  query.isLoading,
    upsertGoal: upsertMutation.mutateAsync,
    deleteGoal: deleteMutation.mutateAsync,
  };
}
