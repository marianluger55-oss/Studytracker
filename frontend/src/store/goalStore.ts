/*
 * store/goalStore.ts
 * Ziele-State — wird aus Backend geladen, kein Demo-Daten.
 */

import { create } from 'zustand';
import type { Goal } from '../types';

interface GoalStore {
  goals:      Goal[];
  setGoals:   (goals: Goal[]) => void;
  addGoal:    (goal: Goal) => void;
  removeGoal: (id: number) => void;
}

export const useGoalStore = create<GoalStore>()((set) => ({
  goals:    [],  // Leer — wird aus Backend geladen

  setGoals:   (goals) => set({ goals }),
  addGoal:    (goal)  => set((s) => {
    // Altes Ziel desselben Zeitraums ersetzen (max. 1 pro Zeitraum)
    const filtered = s.goals.filter((g) => g.period !== goal.period);
    return { goals: [...filtered, goal] };
  }),
  removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
}));
