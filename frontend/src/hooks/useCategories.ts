/*
 * hooks/useCategories.ts
 * ─────────────────────────────────────────────────────────────
 * TanStack Query Hook für Lernkategorien (z.B. "Mathe", "Englisch").
 *
 * Architektur:
 *  - useQuery: lädt alle Kategorien des eingeloggten Nutzers vom Backend
 *  - useEffect: synchronisiert Backend-Daten in den categoryStore (Zustand)
 *  - createMutation: POST /api/categories — neue Kategorie anlegen
 *  - deleteMutation: DELETE /api/categories/:id — Kategorie löschen
 *
 * Warum Store + Query?
 *  useQuery ist die "Source of Truth" für Server-Daten.
 *  categoryStore ist der lokale Spiegel — wird von Timer + Dashboard
 *  gelesen ohne direkten Query-Zugriff zu brauchen.
 * ─────────────────────────────────────────────────────────────
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useCategoryStore } from '../store/categoryStore';
import type { Category } from '../types';

/* Query-Key als const-Array — verhindert Tipp-Fehler und ermöglicht gezielte Cache-Invalidierung */
const QUERY_KEY = ['categories'] as const;

/* ── Backend-Datenformat ──────────────────────────────────────────
   Das Backend gibt snake_case zurück (PostgreSQL-Konvention).
   mapCategory() wandelt es in camelCase um für die React-Komponenten. */
interface BackendCategory {
  id:            number;
  name:          string;
  color:         string;   /* Hex-Farbe z.B. "#3b82f6" */
  total_seconds: number;   /* Gesamte Lernzeit in Sekunden — berechnet aus Sessions */
  created_at:    string;   /* ISO-Timestamp — wann die Kategorie erstellt wurde */
}

/* Wandelt Backend-Format (snake_case) in App-Format (camelCase) um */
function mapCategory(c: BackendCategory): Category {
  return {
    id:           c.id,
    name:         c.name,
    color:        c.color,
    totalMinutes: Math.floor((c.total_seconds ?? 0) / 60), /* Sekunden → Minuten, ?? 0 als Fallback wenn null */
  };
}

/* ── useCategories ───────────────────────────────────────────────
   Gibt categories aus dem Store zurück und hält sie mit dem Backend synchron. */
export function useCategories() {
  /* categoryStore: lokaler Zustand — wird von Timer + Categories-Seite gelesen */
  const { categories, setCategories, addCategory, removeCategory } = useCategoryStore();
  /* queryClient: ermöglicht Cache-Invalidierung nach Mutations */
  const queryClient = useQueryClient();

  /* Kategorien vom Backend laden — gecacht für 1 Minute (Kategorien ändern sich selten) */
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ categories: BackendCategory[] }>('/categories');
      return data.categories.map(mapCategory); /* Alle Kategorien in App-Format umwandeln */
    },
    staleTime: 60_000, /* 60 Sekunden: Kategorien selten geändert → weniger Refetches als Sessions */
  });

  /* Backend-Daten in Store synchronisieren sobald sie verfügbar sind.
     Komponenten lesen aus dem Store statt direkt aus dem Query-Cache. */
  useEffect(() => {
    if (query.data) setCategories(query.data);
  }, [query.data, setCategories]);

  /* ── Create Mutation ──────────────────────────────────────────
     Wird aufgerufen wenn Nutzer neue Kategorie über das Formular anlegt. */
  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      /* POST /api/categories → Backend speichert in DB und gibt gespeicherte Kategorie zurück */
      const { data } = await apiClient.post<{ category: BackendCategory }>('/categories', { name, color });
      return mapCategory(data.category); /* In App-Format umwandeln */
    },
    onSuccess: (category) => {
      addCategory(category);                                    /* Sofort im Store sichtbar */
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });   /* Cache neu laden */
    },
  });

  /* ── Delete Mutation ──────────────────────────────────────────
     Wird aufgerufen wenn Nutzer Kategorie über den Lösch-Button entfernt. */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/categories/${id}`); /* DELETE /api/categories/:id */
      return id;                                   /* Id zurückgeben für onSuccess */
    },
    onSuccess: (id) => {
      removeCategory(id);                                       /* Aus Store entfernen */
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });   /* Cache aktualisieren */
    },
  });

  return {
    categories,                                   /* Aktuelle Kategorien aus dem Store */
    isLoading:      query.isLoading,              /* true während erster Daten-Fetch */
    isError:        query.isError,                /* true wenn Backend nicht erreichbar */
    createCategory: createMutation.mutateAsync,   /* Neue Kategorie anlegen */
    deleteCategory: deleteMutation.mutateAsync,   /* Kategorie löschen */
    isCreating:     createMutation.isPending,     /* true während Kategorie gespeichert wird */
    isDeleting:     deleteMutation.isPending,     /* true während Kategorie gelöscht wird */
  };
}
