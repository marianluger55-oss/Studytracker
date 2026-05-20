/*
 * store/sessionStore.ts
 *
 * Elapsed wird aus echten Timestamps berechnet — nicht durch inkrementellen Zähler.
 * Dadurch ist der Timer korrekt nach Navigation, Browser-Throttling und Page-Refresh.
 *
 * Konzept:
 *   accumulated  — Sekunden die schon gelaufen sind (vor der aktuellen Laufphase)
 *   runningFrom  — Date.now() beim letzten Start/Resume, null wenn pausiert
 *   elapsed (live) = accumulated + (Date.now() - runningFrom) / 1000
 *
 * _tick — steigt jede Sekunde um 1 damit Komponenten re-rendern und die
 *          aktuelle elapsed-Zeit aus den Timestamps neu berechnen.
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { StudySession } from '../types';

/* ── Typen ──────────────────────────────────────────────────────── */
export interface ActiveSession {
  categoryId:    number | null;
  categoryName:  string;
  categoryColor: string;
  startTime:     string;   /* ISO-String des ursprünglichen Starts (für Backend) */
  runningFrom:   number | null; /* Date.now() beim letzten Start/Resume */
  accumulated:   number;   /* Sekunden aus abgeschlossenen Laufphasen (vor Pausen) */
}

export interface StoppedSessionData {
  categoryId:    number | null;
  categoryName:  string;
  categoryColor: string;
  startTime:     string;
  endTime:       string;
  duration:      number;
}

/* Berechnet die aktuelle Elapsed-Zeit aus den Timestamps */
export function getElapsed(session: ActiveSession | null, isRunning: boolean): number {
  if (!session) return 0;
  const acc = session.accumulated;
  if (!isRunning || session.runningFrom === null) return acc;
  return acc + Math.floor((Date.now() - session.runningFrom) / 1000);
}

interface SessionStore {
  sessions:      StudySession[];
  activeSession: ActiveSession | null;
  isRunning:     boolean;
  _tick:         number; /* Zähler — steigt jede Sekunde, löst Re-Renders aus */

  setSessions:   (sessions: StudySession[]) => void;
  addSession:    (session: StudySession) => void;
  removeSession: (id: number) => void;

  startSession:  (categoryId: number | null, categoryName: string, categoryColor: string) => void;
  pauseSession:  () => void;
  resumeSession: () => void;
  stopSession:   () => StoppedSessionData | null;
  tick:          () => void; /* Wird von TimerTick.tsx jede Sekunde aufgerufen */
}

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        sessions:      [],
        activeSession: null,
        isRunning:     false,
        _tick:         0,

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
            startTime:   new Date().toISOString(),
            runningFrom: Date.now(),
            accumulated: 0,
          },
          isRunning: true,
          _tick:     0,
        }),

        pauseSession: () => {
          const { activeSession } = get();
          if (!activeSession || !activeSession.runningFrom) return;
          const extra = Math.floor((Date.now() - activeSession.runningFrom) / 1000);
          set({
            activeSession: {
              ...activeSession,
              runningFrom:  null,
              accumulated:  activeSession.accumulated + extra,
            },
            isRunning: false,
          });
        },

        resumeSession: () => {
          const { activeSession } = get();
          if (!activeSession) return;
          set({
            activeSession: { ...activeSession, runningFrom: Date.now() },
            isRunning:     true,
          });
        },

        stopSession: () => {
          const { activeSession, isRunning } = get();
          if (!activeSession) return null;

          const duration = isRunning && activeSession.runningFrom !== null
            ? activeSession.accumulated + Math.floor((Date.now() - activeSession.runningFrom) / 1000)
            : activeSession.accumulated;

          const data: StoppedSessionData = {
            categoryId:    activeSession.categoryId,
            categoryName:  activeSession.categoryName,
            categoryColor: activeSession.categoryColor,
            startTime:     activeSession.startTime,
            endTime:       new Date().toISOString(),
            duration,
          };

          set({ activeSession: null, isRunning: false, _tick: 0 });
          return data;
        },

        /* Inkrementiert nur den _tick-Zähler — Elapsed wird aus Timestamps berechnet */
        tick: () => set((s) => ({ _tick: s._tick + 1 })),
      }),
      {
        name: 'study-sessions',
        partialize: (state) => ({
          sessions:      state.sessions,
          activeSession: state.activeSession,
          isRunning:     state.isRunning,
        }),
      }
    )
  )
);
