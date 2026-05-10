/*
 * store/sessionStore.ts
 * Timer-State (active session) + Sessions-Liste (aus Backend).
 *
 * Wichtig: activeSession wird NICHT in localStorage gespeichert —
 * ein Tab-Schließen während einer Session setzt den Timer zurück.
 * sessions wird nach Backend-Antwort befüllt (kein Demo-Daten).
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { StudySession } from '../types';

/* Aktive-Session-Daten (nur während Timer läuft) */
interface ActiveSession {
  categoryId:    number | null;
  categoryName:  string;
  categoryColor: string;
  startTime:     string;   // ISO-String des Starts
  elapsed:       number;   // Vergangene Sekunden
}

/* Rückgabewert von stopSession — wird ans Backend gesendet */
export interface StoppedSessionData {
  categoryId:    number | null;
  categoryName:  string;
  categoryColor: string;
  startTime:     string;
  endTime:       string;
  duration:      number;
}

interface SessionStore {
  sessions:      StudySession[];
  activeSession: ActiveSession | null;
  isRunning:     boolean;

  /* API-Sync-Aktionen */
  setSessions:   (sessions: StudySession[]) => void;
  addSession:    (session: StudySession) => void;
  removeSession: (id: number) => void;

  /* Timer-Aktionen */
  startSession:  (categoryId: number | null, categoryName: string, categoryColor: string) => void;
  pauseSession:  () => void;
  resumeSession: () => void;
  stopSession:   () => StoppedSessionData | null;
  tickElapsed:   () => void;
}

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        sessions:      [],   // Leer — wird aus Backend geladen
        activeSession: null,
        isRunning:     false,

        /* ── API-Sync ─────────────────────────────────────────── */
        setSessions:   (sessions) => set({ sessions }),
        addSession:    (session)  => set((s) => ({ sessions: [session, ...s.sessions] })),
        removeSession: (id)       => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

        /* ── Timer ───────────────────────────────────────────── */
        startSession: (categoryId, categoryName, categoryColor) => set({
          activeSession: {
            categoryId,
            categoryName,
            categoryColor,
            startTime: new Date().toISOString(),
            elapsed:   0,
          },
          isRunning: true,
        }),

        pauseSession:  () => set({ isRunning: false }),
        resumeSession: () => set({ isRunning: true }),

        /* Gibt Rohdaten zurück — Timer.tsx sendet diese ans Backend */
        stopSession: () => {
          const { activeSession } = get();
          if (!activeSession) return null;

          const data: StoppedSessionData = {
            categoryId:    activeSession.categoryId,
            categoryName:  activeSession.categoryName,
            categoryColor: activeSession.categoryColor,
            startTime:     activeSession.startTime,
            endTime:       new Date().toISOString(),
            duration:      activeSession.elapsed,
          };

          set({ activeSession: null, isRunning: false });
          return data;
        },

        tickElapsed: () => set((state) => {
          if (!state.activeSession || !state.isRunning) return state;
          return {
            activeSession: {
              ...state.activeSession,
              elapsed: state.activeSession.elapsed + 1,
            },
          };
        }),
      }),
      {
        name: 'study-sessions',
        // sessions aus Backend laden — localStorage nur als Offline-Fallback
        partialize: (state) => ({ sessions: state.sessions }),
      }
    )
  )
);
