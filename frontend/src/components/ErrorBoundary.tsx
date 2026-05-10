/*
 * components/ErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────
 * React Error Boundary — fängt unbehandelte Fehler in Kind-Komponenten ab
 * und zeigt eine Fallback-UI statt einem leeren weißen Bildschirm.
 *
 * Warum eine Klassen-Komponente?
 *  getDerivedStateFromError und componentDidCatch sind nur in Klassen-Komponenten
 *  verfügbar. React stellt noch keinen Hook-Ersatz bereit.
 *
 * Verwendung:
 *  <ErrorBoundary>
 *    <MeineSeite />
 *  </ErrorBoundary>
 * ─────────────────────────────────────────────────────────────
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children:  ReactNode; // Die zu schützenden Komponenten
  fallback?: ReactNode; // Optionale eigene Fallback-UI
}

interface State {
  hasError: boolean;  // true sobald ein Fehler gefangen wurde
  error:    Error | null; // Der gefangene Fehler (für Anzeige in Dev)
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Startzustand: kein Fehler vorhanden
    this.state = { hasError: false, error: null };
  }

  // getDerivedStateFromError: wird aufgerufen wenn ein Kind-Fehler auftritt
  // Setzt hasError=true damit render() die Fallback-UI zeigt
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // componentDidCatch: wird nach getDerivedStateFromError aufgerufen
  // Hier könnte man den Fehler an ein Monitoring-System senden (z.B. Sentry)
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  // handleReset: setzt den Fehlerzustand zurück und versucht die Komponente neu zu laden
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    // Fehler-Zustand: eigene Fallback-UI oder Standard-Fallback anzeigen
    if (this.state.hasError) {
      // Wenn eine eigene Fallback-UI übergeben wurde → diese anzeigen
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Standard-Fallback: zentrierte Fehlermeldung mit Retry-Button
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          {/* Fehlersymbol */}
          <div className="w-12 h-12 rounded-full bg-[var(--bg-3)] flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-6 h-6 text-[var(--text-3)]"
            >
              {/* Ausrufezeichen im Dreieck (Warning-Icon) */}
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Titel */}
          <h2 className="text-base font-semibold text-[var(--text)] mb-1">
            Etwas ist schiefgelaufen
          </h2>

          {/* Beschreibungstext */}
          <p className="text-sm text-[var(--text-3)] mb-5 max-w-xs">
            Diese Seite konnte nicht geladen werden. Versuche es erneut oder lade die App neu.
          </p>

          {/* Retry-Button: setzt den Fehlerzustand zurück */}
          <button
            type="button"
            onClick={this.handleReset}
            className="btn-primary"
          >
            Erneut versuchen
          </button>

          {/* Fehler-Detail in Entwicklungsumgebung anzeigen (nicht in Production) */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 text-left text-xs text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg p-4 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    // Kein Fehler: Kind-Komponenten normal rendern
    return this.props.children;
  }
}
