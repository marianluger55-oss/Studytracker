/*
 * store/categoryStore.ts
 * Kategorien-State — wird aus Backend geladen, kein Demo-Daten.
 */

import { create } from 'zustand';
import type { Category } from '../types';

/* 8 Standard-Farben für den Farbwähler */
export const DEFAULT_COLORS = [
  '#3b82f6', // Blau
  '#22c55e', // Grün
  '#ef4444', // Rot
  '#f59e0b', // Bernstein
  '#8b5cf6', // Lila
  '#ec4899', // Pink
  '#14b8a6', // Türkis
  '#f97316', // Orange
];

interface CategoryStore {
  categories:     Category[];
  setCategories:  (categories: Category[]) => void;
  addCategory:    (category: Category) => void;
  removeCategory: (id: number) => void;
}

export const useCategoryStore = create<CategoryStore>()((set) => ({
  categories:    [],  // Leer — wird aus Backend geladen

  setCategories:  (categories) => set({ categories }),
  addCategory:    (category)   => set((s) => ({ categories: [...s.categories, category] })),
  removeCategory: (id)         => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
}));
