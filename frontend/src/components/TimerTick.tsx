/*
 * components/TimerTick.tsx
 *
 * Läuft global im Root — nie unmounted, überlebt jeden Routenwechsel.
 * Ruft tick() jede Sekunde auf → erhöht _tick im Store →
 * alle Komponenten die _tick lesen re-rendern und berechnen
 * elapsed neu aus den echten Timestamps.
 */

import { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';

export default function TimerTick() {
  const isRunning = useSessionStore((s) => s.isRunning);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      useSessionStore.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  return null;
}
