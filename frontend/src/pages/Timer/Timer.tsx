/*
 * pages/Timer/Timer.tsx
 * ─────────────────────────────────────────────────────────────
 * Timer-Seite — Kern der App.
 * Sessions werden im Backend gespeichert.
 * Dark-Design: Glassmorphism-Karte, violetter SVG-Ring, CSS-Klassen.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';

import { useSessionStore }  from '../../store/sessionStore';
import { useCategories }    from '../../hooks/useCategories';
import { useSessions }      from '../../hooks/useSessions';
import { formatTimer, formatDuration } from '../../utils/time';

export default function Timer() {
  /* Kategorien aus Backend */
  const { categories, isLoading: catsLoading } = useCategories();

  /* Sessions-Hook für Backend-Save */
  const { createSession, isSaving } = useSessions();

  /* Timer-State aus dem Store */
  const {
    activeSession,
    isRunning,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    tickElapsed,
  } = useSessionStore();

  /* Ausgewählte Kategorie-ID */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [justSaved,  setJustSaved]  = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  /* Initial-Auswahl sobald Kategorien geladen sind */
  useEffect(() => {
    if (categories.length > 0 && selectedId === null) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  const ringRef   = useRef<SVGCircleElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  /* Sekundentakt — tickt nur wenn isRunning */
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => tickElapsed(), 1000);
    return () => clearInterval(id);
  }, [isRunning, tickElapsed]);

  /* SVG-Ring: Fortschritt relativ zu 25 Minuten */
  const elapsed       = activeSession?.elapsed ?? 0;
  const progress      = Math.min(100, (elapsed / (25 * 60)) * 100);
  const circumference = 2 * Math.PI * 110;
  const offset        = circumference - (progress / 100) * circumference;

  /* Ring-Farbe: Kategorie-Farbe oder Violett als Fallback */
  const ringColor = activeSession?.categoryColor ?? '#c084fc';

  /* Ring-Farbe per ref setzen (vermeidet inline style Linter-Warnung) */
  useEffect(() => {
    ringRef.current?.style.setProperty('stroke', ringColor);
  }, [ringColor]);

  /* Status-Punkt: grün = läuft, rot = pausiert */
  useEffect(() => {
    if (!statusRef.current) return;
    statusRef.current.style.setProperty(
      'background-color',
      isRunning ? '#22c55e' : '#ef4444'
    );
  }, [isRunning]);

  const selected = categories.find((cat) => cat.id === selectedId);

  /* ── Start ───────────────────────────────────────────────── */
  const handleStart = () => {
    if (!selected) return;
    startSession(selected.id, selected.name, selected.color);
  };

  /* ── Stop + Backend-Save ─────────────────────────────────── */
  const handleStop = async () => {
    const data = stopSession();
    if (!data || data.duration < 5) {
      /* Unter 5 Sekunden → nicht speichern */
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      return;
    }

    setSaveError(null);
    try {
      await createSession({
        categoryId: data.categoryId,
        startTime:  data.startTime,
        endTime:    data.endTime,
        duration:   data.duration,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch {
      setSaveError('Session konnte nicht gespeichert werden. Bitte prüfe deine Verbindung.');
    }
  };

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Seitenüberschrift ─────────────────────────────── */}
      <div>
        <h1 className="page-title">Timer</h1>
        <p className="page-subtitle">Starte eine fokussierte Lernsession.</p>
      </div>

      {/* ── Timer-Karte ────────────────────────────────────── */}
      {/* .card erhält im Dark Mode Glassmorphism via CSS-Override */}
      <div className="card flex flex-col items-center py-10">

        {/* SVG-Ring-Uhr */}
        <div className="timer-ring-wrap w-44 h-44 sm:w-56 sm:h-56 mb-8">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 240 240" width="100%" height="100%">
            {/* Hintergrund-Ring — sehr dezent im Dark Mode */}
            <circle
              cx="120" cy="120" r="110"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            {/* Fortschritts-Ring — Kategorie-Farbe oder Violett */}
            <circle
              ref={ringRef}
              cx="120" cy="120" r="110"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>

          {/* Zeit + Fachname zentriert im Ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight tabular-nums text-[var(--text)]">
              {formatTimer(elapsed)}
            </span>
            <span className="text-sm text-[var(--text-3)] mt-2">
              {activeSession ? activeSession.categoryName : 'bereit'}
            </span>
          </div>
        </div>

        {/* Fachauswahl — nur wenn keine Session läuft */}
        {!activeSession && (
          <div className="w-full max-w-xs mb-7">
            <label className="input-label text-center block" htmlFor="cat-select">Fach</label>
            {catsLoading ? (
              /* Lade-Zustand */
              <div className="input flex items-center justify-center text-[var(--text-3)] text-sm">
                Lädt…
              </div>
            ) : categories.length === 0 ? (
              /* Noch keine Kategorien angelegt */
              <p className="text-sm text-[var(--text-3)] text-center py-2">
                Zuerst ein Fach unter "Fächer" anlegen.
              </p>
            ) : (
              <select
                id="cat-select"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="input text-center"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Steuerungsknöpfe ────────────────────────────── */}
        <div className="flex gap-3">
          {!activeSession ? (
            /* Start-Button — erbt im Dark Mode den Shimmer-Gradient */
            <button
              type="button"
              onClick={handleStart}
              disabled={!selected || catsLoading}
              className="btn-primary px-10"
            >
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                <polygon points="2,1 10,6 2,11" />
              </svg>
              Starten
            </button>
          ) : (
            <>
              {isRunning ? (
                /* Pausieren-Button */
                <button type="button" onClick={pauseSession} className="btn-ghost">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <rect x="3" y="2" width="3.5" height="12" rx="1" />
                    <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                  </svg>
                  Pausieren
                </button>
              ) : (
                /* Fortsetzen-Button */
                <button type="button" onClick={resumeSession} className="btn-primary">
                  <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                    <polygon points="2,1 10,6 2,11" />
                  </svg>
                  Fortsetzen
                </button>
              )}

              {/* Stopp + Speichern-Button */}
              <button
                type="button"
                onClick={handleStop}
                disabled={isSaving}
                className="btn-danger"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                  </svg>
                )}
                {isSaving ? 'Speichert…' : 'Speichern'}
              </button>
            </>
          )}
        </div>

        {/* ── Feedback-Meldungen ──────────────────────────── */}
        {justSaved && (
          <p className="mt-5 text-sm tag tag-neutral">Session gespeichert</p>
        )}
        {saveError && (
          <p className="mt-5 text-sm text-red-400">{saveError}</p>
        )}
      </div>

      {/* ── Aktive Session-Info ─────────────────────────────── */}
      {activeSession && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--text)]">Aktuelle Session</p>
            {/* Grüner/roter Punkt + Status-Text */}
            <div className="flex items-center gap-1.5">
              <span ref={statusRef} className="w-2 h-2 rounded-full" />
              <span className="text-xs text-[var(--text-3)]">
                {isRunning ? 'Läuft' : 'Pausiert'}
              </span>
            </div>
          </div>

          {/* Session-Details als Zeilen */}
          <div>
            {[
              { label: 'Fach',      value: activeSession.categoryName },
              {
                label: 'Gestartet',
                value: new Date(activeSession.startTime).toLocaleTimeString('de-DE', {
                  hour: '2-digit', minute: '2-digit',
                }),
              },
              { label: 'Dauer', value: formatDuration(elapsed) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2.5 border-b border-[var(--border)] last:border-0"
              >
                <span className="text-sm text-[var(--text-3)]">{label}</span>
                <span className="text-sm font-medium text-[var(--text)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
