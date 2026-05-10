/*
 * hooks/useCategories.ts
 * TanStack Query Hook für Kategorien.
 * Lädt Kategorien aus Backend, stellt Create/Delete Mutations bereit.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useCategoryStore } from '../store/categoryStore';
import type { Category } from '../types';

const QUERY_KEY = ['categories'] as const;

/* ── Datentypen vom Backend ──────────────────────────────────────  */
interface BackendCategory {
  id:           number;
  name:         string;
  color:        string;
  total_seconds: number;
  created_at:   string;
}

function mapCategory(c: BackendCategory): Category {
  return {
    id:           c.id,
    name:         c.name,
    color:        c.color,
    totalMinutes: Math.floor((c.total_seconds ?? 0) / 60),
  };
}

/* ── useCategories ───────────────────────────────────────────────
   Gibt categories aus dem Store zurück und hält sie mit dem Backend synchron. */
export function useCategories() {
  const { categories, setCategories, addCategory, removeCategory } = useCategoryStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const { data } = await apiClient.get<{ categories: BackendCategory[] }>('/categories');
      return data.categories.map(mapCategory);
    },
    staleTime: 60_000,  // 1 Min — Kategorien ändern sich selten
  });

  /* Backend-Daten in Store synchronisieren */
  useEffect(() => {
    if (query.data) setCategories(query.data);
  }, [query.data, setCategories]);

  /* ── Create Mutation ──────────────────────────────────────────  */
  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data } = await apiClient.post<{ category: BackendCategory }>('/categories', { name, color });
      return mapCategory(data.category);
    },
    onSuccess: (category) => {
      addCategory(category);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  /* ── Delete Mutation ──────────────────────────────────────────  */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/categories/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeCategory(id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    categories,
    isLoading:  query.isLoading,
    isError:    query.isError,
    createCategory: createMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
