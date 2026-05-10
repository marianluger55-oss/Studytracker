/*
 * pages/Dashboard/Dashboard.tsx
 *
 * Server-State Architektur:
 *  - useSessions()    → lädt Sessions vom Backend, synct in sessionStore
 *  - useCategories()  → lädt Kategorien vom Backend, synct in categoryStore
 *  - useGoals()       → lädt Ziele vom Backend, synct in goalStore
 *  - useStats()       → lädt Streak + aggregierte Werte vom Backend
 *
 * Lokale Berechnungen (weeklyMins, todayDisplay) laufen auf den Store-Daten,
 * die von TanStack Query befüllt werden — kein direkter Store-Import mehr.
 */

import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { useSessions }   from '../../hooks/useSessions';
import { useCategories } from '../../hooks/useCategories';
import { useGoals }      from '../../hooks/useGoals';
import { useStats }      from '../../hooks/useStats';
import { useChartColors } from '../../hooks/useChartColors';
import ProgressBar        from '../../components/ui/ProgressBar';
import ColorDot           from '../../components/ui/ColorDot';
import {
  formatDuration,
  formatRelativeDate,
  getWeekDays,
  getWeeklyMinutes,
  getTodayMinutes,
} from '../../utils/time';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function Dashboard() {
  /* ── Server-State via TanStack Query ─────────────────────────
     Hooks befüllen automatisch die Zustand-Stores als Seiteneffekt.
     sessions/categories/goals kommen aus den Stores (immer aktuell). */
  const { sessions,   isLoading: sessionsLoading }    = useSessions();
  const { categories, isLoading: categoriesLoading }  = useCategories();
  const { goals }                                      = useGoals();
  const { data: stats, isLoading: statsLoading }       = useStats();

  const navigate = useNavigate();
  const c        = useChartColors();

  const isLoading = sessionsLoading || categoriesLoading || statsLoading;

  /* ── Lokale Berechnungen auf befüllten Store-Daten ─────────── */
  const weeklyMins  = getWeeklyMinutes(sessions);   /* [min_Mo, ..., min_So] */
  const weekdays    = getWeekDays();
  const weekGoal    = goals.find((g) => g.period === 'weekly');
  const weeklyTotal = weeklyMins.reduce((a, b) => a + b, 0);

  /* Streak + aggregierte Zahlen kommen ausschließlich vom Backend */
  const currentStreak  = stats?.currentStreak ?? 0;
  const todayMinutes   = stats?.todayMinutes  ?? getTodayMinutes(sessions);
  const weekMinutes    = stats?.weekMinutes   ?? weeklyTotal;

  const goalPct = weekGoal
    ? Math.min(100, (weekMinutes / (weekGoal.targetHours * 60)) * 100)
    : 0;

  const todayDisplay = todayMinutes >= 60
    ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`
    : `${todayMinutes}m`;

  const weekDisplay = weekMinutes >= 60
    ? `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`
    : `${weekMinutes}m`;

  /* ── Chart-Daten ─────────────────────────────────────────── */
  const chartData = {
    labels: weekdays,
    datasets: [{
      data:                 weeklyMins,
      backgroundColor:      weeklyMins.map((_, i) => i === 6 ? c.primary : c.primaryFaded),
      hoverBackgroundColor: weeklyMins.map((_, i) => i === 6 ? c.primary : c.secondary),
      borderRadius:         3,
      borderSkipped:        false,
    }],
  };

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor:      c.tick,
        bodyColor:       c.tick,
        borderColor:     c.grid,
        borderWidth:     1,
        padding:         8,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => ` ${ctx.parsed.y ?? 0}m`,
        },
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        ticks:  { color: c.tick, font: { size: 10, family: 'Inter' } },
        border: { display: false },
      },
      y: {
        grid:   { color: c.grid, drawTicks: false },
        ticks: {
          color:    c.tick,
          font:     { size: 10, family: 'Inter' },
          padding:  6,
          callback: (v: number | string) => `${v}m`,
        },
        border: { display: false },
      },
    },
  } as const;

  /* ── Lade-Skeleton ───────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-[var(--bg-3)] rounded w-48" />
        <div className="card p-0 overflow-hidden h-24 bg-[var(--bg-3)]" />
        <div className="card h-40 bg-[var(--bg-3)]" />
      </div>
    );
  }

  /* ── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Übersicht</h1>
          <p className="page-subtitle">Dein Lernfortschritt auf einen Blick.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => navigate('/timer')}>
          <svg viewBox="0 0 10 12" fill="currentColor" className="w-2.5 h-2.5">
            <path d="M1 1l8 5-8 5V1z" />
          </svg>
          Starten
        </button>
      </div>

      {/* ── Stats-Zeile ─────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">

          <div className="px-5 py-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.07em] text-[var(--text-3)] mb-1.5">Heute</p>
            <p className="text-[1.375rem] font-bold tracking-[-0.035em] leading-none text-[var(--text)]">{todayDisplay}</p>
            <p className="text-[0.6875rem] text-[var(--text-3)] mt-1">Lernzeit</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.07em] text-[var(--text-3)] mb-1.5">Diese Woche</p>
            <p className="text-[1.375rem] font-bold tracking-[-0.035em] leading-none text-[var(--text)]">{weekDisplay}</p>
            <p className="text-[0.6875rem] text-[var(--text-3)] mt-1">
              {weekGoal ? `${goalPct.toFixed(0)}% des Ziels` : 'Gesamt'}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.07em] text-[var(--text-3)] mb-1.5">Streak</p>
            <p className="text-[1.375rem] font-bold tracking-[-0.035em] leading-none text-[var(--text)]">{currentStreak}</p>
            <p className="text-[0.6875rem] text-[var(--text-3)] mt-1">
              {currentStreak === 1 ? 'Tag am Stück' : 'Tage am Stück'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Wochendiagramm ──────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="card-title-flush">Diese Woche</p>
          <span className="text-[0.6875rem] text-[var(--text-3)] tabular-nums">
            {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
          </span>
        </div>
        <div className="chart-container-sm">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* ── Karten-Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

        {/* Wochenziel */}
        {weekGoal ? (
          <div className="card">
            <p className="card-title">Wochenziel</p>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-2xl font-bold tracking-[-0.035em] text-[var(--text)]">
                {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
              </span>
              <span className="text-xs text-[var(--text-3)]">/ {weekGoal.targetHours}h</span>
            </div>
            <ProgressBar value={goalPct} showLabel />
          </div>
        ) : (
          <div className="card flex flex-col justify-between min-h-[120px]">
            <div>
              <p className="card-title">Kein Ziel gesetzt</p>
              <p className="text-[0.8125rem] text-[var(--text-3)] leading-snug">
                Wochenziel festlegen um den Fortschritt zu sehen.
              </p>
            </div>
            <button type="button" className="btn-ghost mt-3 self-start text-xs py-1.5" onClick={() => navigate('/goals')}>
              Ziel setzen →
            </button>
          </div>
        )}

        {/* Letzte Sessions */}
        <div className="card">
          <p className="card-title">Zuletzt</p>
          {sessions.length === 0 ? (
            <div className="empty-state py-4">
              <p className="empty-state-sub">Noch keine Sessions.</p>
            </div>
          ) : (
            <div className="space-y-0.5 -mx-1.5">
              {sessions.slice(0, 4).map((s) => (
                <div key={s.id} className="session-row">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColorDot color={s.categoryColor} />
                    <span className="text-[0.8125rem] text-[var(--text)] truncate">{s.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[0.8125rem] font-medium tabular-nums text-[var(--text)]">
                      {formatDuration(s.duration)}
                    </span>
                    <span className="text-[0.6875rem] text-[var(--text-3)] w-12 text-right">
                      {formatRelativeDate(s.startTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fächer */}
        {categories.length > 0 && (
          <div className="card sm:col-span-2 xl:col-span-1">
            <p className="card-title">Fächer</p>
            <div className="space-y-3">
              {categories.map((cat) => {
                const mins = cat.totalMinutes ?? 0;
                const max  = Math.max(...categories.map((c2) => c2.totalMinutes ?? 0), 1);
                return (
                  <div key={cat.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <ColorDot color={cat.color} size="w-1.5 h-1.5" />
                        <span className="text-[0.8125rem] text-[var(--text)]">{cat.name}</span>
                      </div>
                      <span className="text-[0.6875rem] text-[var(--text-3)] tabular-nums">
                        {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
                      </span>
                    </div>
                    <ProgressBar value={(mins / max) * 100} color={cat.color} thin />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
