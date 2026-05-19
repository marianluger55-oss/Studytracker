/*
 * components/TimerTick.tsx
 *
 * Hält den Timer-Takt global am Leben — unabhängig von der aktuellen Seite.
 * Rendert nichts. Wird einmalig in AppInner gemountet und nie wieder unmounted.
 *
 * Warum hier statt in Timer.tsx?
 * Timer.tsx wird beim Seitenwechsel unmounted → clearInterval → Timer stoppt.
 * Diese Komponente lebt im Root und überlebt jeden Routenwechsel.
 */

import { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';

export default function TimerTick() {
  const isRunning   = useSessionStore((s) => s.isRunning);
  const tickElapsed = useSessionStore((s) => s.tickElapsed);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tickElapsed, 1000);
    return () => clearInterval(id);
  }, [isRunning, tickElapsed]);

  return null;
}
