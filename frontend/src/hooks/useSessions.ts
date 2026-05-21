/*
 * hooks/useSessions.ts
 * ─────────────────────────────────────────────────────────────
 * TanStack Query Hook für Lernsessions.
 *
 * Architektur:
 *  - useQuery: lädt Sessions vom Backend und hält sie aktuell
 *  - useEffect: synchronisiert Backend-Daten in den sessionStore (Zustand)
 *  - createMutation: POST /api/sessions — neue Session nach Timer-Stop
 *  - deleteMutation: DELETE /api/sessions/:id
 *
 * Warum zwei Stellen? useQuery ist die "Source of Truth" für Server-Daten.
 * sessionStore ist der lokale Spiegel — wird von Timer-Komponenten gelesen
 * ohne direkten Query-Zugriff zu brauchen.
 * ─────────────────────────────────────────────────────────────
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useSessionStore } from '../store/sessionStore';
import type { StudySession } from '../types';

/* Query-Key als const-Array — verhindert Tipp-Fehler und ermöglicht Invalidierung */
export const SESSIONS_QUERY_KEY = ['sessions'] as const;

/* ── Backend-Datenformat ──────────────────────────────────────────
   Das Backend gibt snake_case zurück (PostgreSQL-Konvention).
   mapSession() wandelt es in camelCase um für die React-Komponenten. */
interface BackendSession {
  id:             number;
  category_id:    number | null;   /* null wenn keine Kategorie zugeordnet */
  category_name:  string | null;   /* JOIN aus categories-Tabelle */
  category_color: string | null;   /* Hex-Farbe der Kategorie */
  start_time:     string;          /* ISO-String: wann Timer gestartet */
  end_time:       string;          /* ISO-String: wann Timer gestoppt */
  duration:       number;          /* Sekunden — berechnet in DB */
  notes:          string | null;   /* Optionale Notizen */
  created_at:     string;
}

/* Wandelt Backend-Format (snake_case) in App-Format (camelCase) um */
function mapSession(s: BackendSession): StudySession {
  return {
    id:            s.id,
    categoryId:    s.category_id,
    categoryName:  s.category_name  ?? 'Kein Fach',      /* Fallback wenn keine Kategorie */
    categoryColor: s.category_color ?? '#6b7280',         /* Grau als Fallback-Farbe */
    startTime:     s.start_time,
    endTime:       s.end_time,
    duration:      s.duration,
    notes:         s.notes ?? undefined,                   /* null → undefined (TypeScript-konsistent) */
    createdAt:     s.created_at,
  };
}

/* ── useSessions ──────────────────────────────────────────────── */
export function useSessions() {
  /* sessionStore: lokaler Zustand — wird von Timer + Dashboard gelesen */
  const { sessions, setSessions, addSession, removeSession } = useSessionStore();
  /* queryClient: ermöglicht Cache-Invalidierung nach Mutations */
  const queryClient = useQueryClient();

  /* Daten vom Backend laden — wird automatisch gecacht und nach 30s als "stale" markiert */
  const query = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ sessions: BackendSession[] }>('/sessions');
      return data.sessions.map(mapSession); /* Alle Sessions in App-Format umwandeln */
    },
    staleTime: 30_000, /* 30 Sekunden: in dieser Zeit kein erneuter Fetch */
  });

  /* Backend-Daten in Store synchronisieren sobald sie verfügbar sind.
     Komponenten lesen aus dem Store statt direkt aus dem Query-Cache. */
  useEffect(() => {
    if (query.data) setSessions(query.data);
  }, [query.data, setSessions]);

  /* ── Create Mutation ───────────────────────────────────────────
     Wird nach Timer-Stop aufgerufen mit den Zeitstempeln aus dem Store. */
  const createMutation = useMutation({
    mutationFn: async (payload: {
      categoryId: number | null; /* Welches Fach wurde gelernt */
      startTime:  string;        /* ISO-String — Timer-Startzeit */
      endTime:    string;        /* ISO-String — Timer-Stoppzeit */
      duration:   number;        /* Sekunden — berechnet in stopSession() */
      notes?:     string;        /* Optional */
    }) => {
      /* POST /api/sessions → Backend speichert in DB und gibt gespeicherte Session zurück */
      const { data } = await apiClient.post<{ session: BackendSession }>('/sessions', {
        categoryId: payload.categoryId,
        startTime:  payload.startTime,
        endTime:    payload.endTime,
        duration:   payload.duration,
        notes:      payload.notes,
      });
      return mapSession(data.session); /* In App-Format umwandeln */
    },
    onSuccess: (session) => {
      addSession(session); /* Sofort im Store sichtbar (optimistisch) */
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }); /* Cache neu laden */
      queryClient.invalidateQueries({ queryKey: ['stats'] }); /* Stats-Cache invalidieren — Dashboard + Statistics */
    },
  });

  /* ── Delete Mutation ─────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sessions/${id}`); /* DELETE /api/sessions/:id */
      return id; /* Id zurückgeben für onSuccess */
    },
    onSuccess: (id) => {
      removeSession(id);                                               /* Aus Store entfernen */
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }); /* Cache aktualisieren */
      queryClient.invalidateQueries({ queryKey: ['stats'] });           /* Stats neu berechnen */
    },
  });

  return {
    sessions,                            /* Aktuelle Sessions aus dem Store */
    isLoading:     query.isLoading,      /* true während erster Daten-Fetch */
    isError:       query.isError,        /* true wenn Backend nicht erreichbar */
    createSession: createMutation.mutateAsync, /* Nach Timer-Stop aufrufen */
    deleteSession: deleteMutation.mutateAsync, /* Session löschen */
    isSaving:      createMutation.isPending,   /* true während Session gespeichert wird */
  };
}
