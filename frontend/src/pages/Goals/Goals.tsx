/*
 * pages/Goals/Goals.tsx
 * ─────────────────────────────────────────────────────────────
 * Lernziele-Seite: Ziele setzen, Fortschritt verfolgen, Streak + Meilensteine.
 *
 * Server-State Architektur:
 *  - useGoals()    → Ziele vom Backend laden + create/delete Mutations
 *  - useSessions() → Sessions für Fortschritts-Berechnung + 7-Tage-Visualisierung
 *  - useStats()    → currentStreak + longestStreak vom Backend (korrekte UTC-Grenze)
 *
 * Wichtig:
 *  - Streak darf NICHT lokal berechnet werden — Backend (SQL) ist Source of Truth
 *  - Achievements sind clientseitig (lokal berechnet, kein extra Backend-Call)
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { useGoals }       from '../../hooks/useGoals';
import { useSessions }    from '../../hooks/useSessions';
import { useStats }       from '../../hooks/useStats';
import { getWeeklyMinutes, getTodayMinutes } from '../../utils/time';
import ProgressBar from '../../components/ui/ProgressBar';
import type { Goal } from '../../types';

/* ── Achievement-Definitionen ─────────────────────────────────── */
/* check-Funktion: (sessionCount, totalMinutes, streak) → boolean
   Parameter mit _ Prefix werden nicht verwendet, müssen aber deklariert sein (TypeScript). */
const ACHIEVEMENTS = [
  { id: 'a1', label: 'Erste Session', desc: 'Eine Session abgeschlossen',   check: (s: number)                         => s >= 1     }, /* s = sessionCount */
  { id: 'a2', label: '1 Stunde',      desc: '60 Minuten gesamt',            check: (_s: number, t: number)             => t >= 60    }, /* t = totalMinutes */
  { id: 'a3', label: '10 Stunden',    desc: '600 Minuten gesamt',           check: (_s: number, t: number)             => t >= 600   },
  { id: 'a4', label: '3 Tage',        desc: '3 Tage am Stück',              check: (_s: number, _t: number, k: number) => k >= 3     }, /* k = streak */
  { id: 'a5', label: '7 Tage',        desc: '7 Tage am Stück',              check: (_s: number, _t: number, k: number) => k >= 7     },
  { id: 'a6', label: '10 Sessions',   desc: '10 Sessions abgeschlossen',    check: (s: number)                         => s >= 10    },
] as const;

export default function Goals() {
  const { goals, upsertGoal, deleteGoal } = useGoals();    /* Ziele + CRUD-Operationen */
  const { sessions }                      = useSessions();  /* Sessions für Fortschritts-Berechnung */
  const { data: stats }                   = useStats();     /* Aggregierte Kennzahlen inkl. Streak */

  const [targetHours, setTargetHours] = useState(10);                /* Zielstunden im Formular */
  const [period,      setPeriod]      = useState<Goal['period']>('weekly'); /* Zeitraum: daily | weekly | monthly */
  const [showForm,    setShowForm]    = useState(false);              /* Formular ein-/ausblenden */
  const [saveError,   setSaveError]   = useState<string | null>(null); /* Fehlermeldung beim Speichern */

  /* ── Berechnungen ──────────────────────────────────────────── */
  const weeklyMins  = getWeeklyMinutes(sessions);               /* Minuten pro Wochentag [Mo-So] */
  const weeklyTotal = weeklyMins.reduce((a, b) => a + b, 0);    /* Wochensumme aus Array */
  const todayMins   = getTodayMinutes(sessions);                 /* Heutige Lernminuten */
  const totalMins   = sessions.reduce((a, s) => a + Math.floor(s.duration / 60), 0); /* Gesamtminuten */

  /* Streak vom Backend — ?? 0: Fallback während Laden oder wenn stats null */
  const streak = stats?.currentStreak ?? 0;

  /* Aktueller Fortschritt je nach Ziel-Periode: stats hat Vorrang vor lokaler Berechnung */
  const getCurrent = (g: Goal) =>
    g.period === 'weekly'  ? (stats?.weekMinutes  ?? weeklyTotal) : /* Wochenziel: Wochenminuten */
    g.period === 'daily'   ? (stats?.todayMinutes ?? todayMins)   : /* Tagesziel: heutige Minuten */
    totalMins;                                                       /* Monatsziel: alle Minuten (vereinfacht) */

  /* Prozentwert für ProgressBar — Math.min(100, ...) verhindert Überschreiten */
  const getProgress = (g: Goal) =>
    Math.min(100, (getCurrent(g) / (g.targetHours * 60)) * 100); /* targetHours * 60 = Zielminuten */

  /* ── Speichern ─────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaveError(null); /* Alte Fehlermeldung vor neuem Versuch löschen */
    try {
      await upsertGoal({ period, targetHours }); /* Upsert: erstellt oder überschreibt Ziel für diesen Zeitraum */
      setShowForm(false); /* Formular nach Erfolg schließen */
    } catch {
      setSaveError('Ziel konnte nicht gespeichert werden. Bitte prüfe deine Verbindung.');
    }
  };

  /* ── JSX ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">Ziele</h1>
          <p className="page-subtitle">Setze Ziele und verfolge deinen Fortschritt.</p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path d="M6 1v10M1 6h10" strokeLinecap="round" />
          </svg>
          Ziel setzen
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="card card-accent">
          <p className="card-title">Neues Ziel</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="input-label" htmlFor="goal-period">Zeitraum</label>
              <select id="goal-period" value={period} onChange={(e) => setPeriod(e.target.value as Goal['period'])} className="input w-auto">
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            </div>
            <div>
              <label className="input-label" htmlFor="goal-hours">Zielstunden</label>
              <input id="goal-hours" type="number" min={1} max={200} value={targetHours} onChange={(e) => setTargetHours(Number(e.target.value))} className="input w-24" />
            </div>
            <button type="button" onClick={handleSave} className="btn-primary">Speichern</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Abbrechen</button>
          </div>
          {saveError && <p className="mt-3 text-sm text-red-500">{saveError}</p>}
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="card">
          <div className="empty-state py-6">
            <p className="empty-state-sub">Noch keine Ziele — klicke "Ziel setzen".</p>
          </div>
        </div>
      )}

      {/* Zielkarten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {goals.map((goal) => {
          const progress    = getProgress(goal);
          const current     = getCurrent(goal);
          const done        = progress >= 100;
          const periodLabel = goal.period === 'daily' ? 'Tagesziel' : goal.period === 'weekly' ? 'Wochenziel' : 'Monatsziel';

          return (
            <div key={goal.id} className={`card ${done ? 'card-accent' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{periodLabel}</p>
                    {done && <span className="tag tag-green">Erreicht</span>}
                  </div>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {Math.floor(current / 60)}h {current % 60}m von {goal.targetHours}h
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Ziel entfernen"
                  onClick={() => deleteGoal(goal.id).catch(() => setSaveError('Ziel konnte nicht gelöscht werden.'))}
                  className="p-1 text-[var(--text-3)] hover:text-red-400 transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path d="M4 12L12 4M4 4l8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <ProgressBar value={progress} showLabel />
            </div>
          );
        })}
      </div>

      {/* Streak — vom Backend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Lern-Streak</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Aufeinanderfolgende Tage mit Session</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold tracking-tight text-[var(--text)]">{streak}</span>
            <span className="text-sm text-[var(--text-2)] ml-1">{streak === 1 ? 'Tag' : 'Tage'}</span>
          </div>
        </div>

        {/* 7-Tage-Visualisierung */}
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const active = sessions.some((s) => new Date(s.startTime).toDateString() === date.toDateString());
            return (
              <div key={i} className="flex-1">
                {/* Aktiver Tag: Violett-Gradient; inaktiv: dezentes Weiß */}
                <div className={`h-7 rounded-md ${
                  active
                    ? 'bg-gradient-to-b from-purple-400 to-pink-400'
                    : 'bg-[var(--bg-3)]'
                }`} />
                <p className="text-center text-xs text-[var(--text-3)] mt-1">
                  {date.toLocaleDateString('de-DE', { weekday: 'narrow' })}
                </p>
              </div>
            );
          })}
        </div>

        {stats && (
          <p className="text-xs text-[var(--text-3)] mt-3 text-right">
            Längster Streak: {stats.longestStreak} {stats.longestStreak === 1 ? 'Tag' : 'Tage'}
          </p>
        )}
      </div>

      {/* Meilensteine */}
      <div className="card">
        <p className="card-title">Meilensteine</p>
        <div className="space-y-0">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.check(sessions.length, totalMins, streak);
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                {/* Freigeschaltet: Violett-Punkt; gesperrt: leerer Ring */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  unlocked
                    ? 'bg-gradient-to-br from-pink-400 to-purple-500'
                    : 'border border-[var(--border-strong)] bg-transparent'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${unlocked ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}`}>{a.label}</span>
                  <span className="hidden sm:inline text-xs text-[var(--text-3)] ml-2">{a.desc}</span>
                </div>
                {unlocked && (
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-[var(--text)] flex-shrink-0">
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
