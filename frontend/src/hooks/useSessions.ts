/*
 * hooks/useSessions.ts
 * TanStack Query Hook für Sessions.
 * Lädt Sessions aus Backend und stellt Create/Delete bereit.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useSessionStore } from '../store/sessionStore';
import type { StudySession } from '../types';

export const SESSIONS_QUERY_KEY = ['sessions'] as const;

/* ── Datentypen vom Backend ──────────────────────────────────────  */
interface BackendSession {
  id:             number;
  category_id:    number | null;
  category_name:  string | null;
  category_color: string | null;
  start_time:     string;
  end_time:       string;
  duration:       number;
  notes:          string | null;
  created_at:     string;
}

function mapSession(s: BackendSession): StudySession {
  return {
    id:            s.id,
    categoryId:    s.category_id,
    categoryName:  s.category_name  ?? 'Kein Fach',
    categoryColor: s.category_color ?? '#6b7280',
    startTime:     s.start_time,
    endTime:       s.end_time,
    duration:      s.duration,
    notes:         s.notes ?? undefined,
    createdAt:     s.created_at,
  };
}

/* ── useSessions ─────────────────────────────────────────────────  */
export function useSessions() {
  const { sessions, setSessions, addSession, removeSession } = useSessionStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ sessions: BackendSession[] }>('/sessions');
      return data.sessions.map(mapSession);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) setSessions(query.data);
  }, [query.data, setSessions]);

  /* ── Create Mutation ──────────────────────────────────────────  */
  const createMutation = useMutation({
    mutationFn: async (payload: {
      categoryId: number | null;
      startTime:  string;
      endTime:    string;
      duration:   number;
      notes?:     string;
    }) => {
      const { data } = await apiClient.post<{ session: BackendSession }>('/sessions', {
        categoryId: payload.categoryId,
        startTime:  payload.startTime,
        endTime:    payload.endTime,
        duration:   payload.duration,
        notes:      payload.notes,
      });
      return mapSession(data.session);
    },
    onSuccess: (session) => {
      addSession(session);
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      // Stats-Cache invalidieren damit Dashboard + Statistics aktuell sind
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  /* ── Delete Mutation ──────────────────────────────────────────  */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sessions/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeSession(id);
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return {
    sessions,
    isLoading:     query.isLoading,
    isError:       query.isError,
    createSession: createMutation.mutateAsync,
    deleteSession: deleteMutation.mutateAsync,
    isSaving:      createMutation.isPending,
  };
}
