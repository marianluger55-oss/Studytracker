/*
 * components/auth/AuthInitializer.tsx
 * ─────────────────────────────────────────────────────────────
 * Führt beim App-Start einmalig den Refresh-Token-Versuch durch.
 *
 * Warum eine eigene Komponente?
 *  Der tryRefreshToken()-Aufruf braucht den Router-Kontext (navigate).
 *  Da BrowserRouter in App.tsx außen liegt, muss diese Komponente
 *  drin liegen — genau wie AppInner bei useLocation().
 *
 * Diese Komponente rendert nichts — sie ist nur ein Effekt-Container.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function AuthInitializer() {
  const { tryRefreshToken } = useAuth();

  // useRef verhindert dass useEffect bei Hot-Reload doppelt ausgeführt wird
  const hasRun = useRef(false);

  useEffect(() => {
    // React 18 Strict-Mode ruft useEffect zweimal auf (nur in Entwicklung)
    // hasRun verhindert den doppelten Refresh-API-Call
    if (hasRun.current) return;
    hasRun.current = true;

    // Refresh-Token-Versuch starten — setzt isInitialized wenn fertig
    tryRefreshToken();
  }, [tryRefreshToken]);

  // Nichts rendern — nur Effekt ausführen
  return null;
}
