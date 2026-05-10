/*
 * pages/Statistics/Statistics.tsx
 *
 * Server-State Architektur:
 *  - useSessions()   → TanStack Query, befüllt sessionStore
 *  - useCategories() → TanStack Query, befüllt categoryStore
 *  - useStats()      → aggregierte Kennzahlen vom Backend
 *
 * Alle Diagramme und Kacheln rechnen auf den Store-Daten die von den
 * Hooks befüllt werden. Kein direkter Zustand-Import mehr für Server-State.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import { useSessions }   from '../../hooks/useSessions';
import { useCategories } from '../../hooks/useCategories';
import { useStats }      from '../../hooks/useStats';
import { useChartColors } from '../../hooks/useChartColors';
import { getWeekDays, getWeeklyMinutes, getTodayMinutes } from '../../utils/time';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

/* ── Hilfsfunktion: Lernminuten der letzten 4 Wochen ─────────── */
function getMonthlyData(sessions: { startTime: string; duration: number }[]) {
  const weeks = [0, 0, 0, 0];
  const now   = new Date();
  sessions.forEach((s) => {
    const diff = Math.floor((now.getTime() - new Date(s.startTime).getTime()) / 86_400_000);
    if (diff < 7)       weeks[3] += Math.floor(s.duration / 60);
    else if (diff < 14) weeks[2] += Math.floor(s.duration / 60);
    else if (diff < 21) weeks[1] += Math.floor(s.duration / 60);
    else if (diff < 28) weeks[0] += Math.floor(s.duration / 60);
  });
  return weeks;
}

const HEAT_CLASSES = ['heat-empty', 'heat-low', 'heat-mid', 'heat-high', 'heat-max'];
function heatClass(mins: number) {
  if (mins === 0) return HEAT_CLASSES[0];
  if (mins < 30)  return HEAT_CLASSES[1];
  if (mins < 60)  return HEAT_CLASSES[2];
  if (mins < 120) return HEAT_CLASSES[3];
  return HEAT_CLASSES[4];
}

export default function Statistics() {
  /* ── Server-State ────────────────────────────────────────── */
  const { sessions,   isLoading: sessionsLoading }   = useSessions();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { data: stats, isLoading: statsLoading }      = useStats();

  const c = useChartColors();

  const isLoading = sessionsLoading || categoriesLoading || statsLoading;

  /* ── Berechnungen auf Store-Daten ──────────────────────── */
  const weekdays     = getWeekDays();
  const weeklyMins   = getWeeklyMinutes(sessions);
  const monthlyWeeks = getMonthlyData(sessions);
  const todayMins    = stats?.todayMinutes ?? getTodayMinutes(sessions);
  const weeklyTotal  = stats?.weekMinutes  ?? weeklyMins.reduce((a, b) => a + b, 0);
  const totalMins    = stats?.totalMinutes ?? sessions.reduce((a, s) => a + Math.floor(s.duration / 60), 0);

  /* ── Heatmap: letzte 28 Tage ─────────────────────────── */
  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    const mins = sessions
      .filter((s) => new Date(s.startTime).toDateString() === date.toDateString())
      .reduce((a, s) => a + Math.floor(s.duration / 60), 0);
    return { date, mins };
  });

  /* ── Chart-Optionen (geteilt) ────────────────────────── */
  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid:   { display: false },
        ticks:  { color: c.tick, font: { size: 11, family: 'Inter' } },
        border: { display: false },
      },
      y: {
        grid:   { color: c.grid, drawTicks: false },
        ticks: {
          color: c.tick,
          font:  { size: 11, family: 'Inter' },
          callback: (v: number | string) => `${v}m`,
        },
        border: { display: false },
      },
    },
  } as const;

  const weekBarData = {
    labels: weekdays,
    datasets: [{
      data:                 weeklyMins,
      backgroundColor:      c.primaryFaded,
      hoverBackgroundColor: c.primary,
      borderRadius:         4,
      borderSkipped:        false,
    }],
  };

  const monthBarData = {
    labels: ['Vor 3 Wo.', 'Vor 2 Wo.', 'Letzte Wo.', 'Diese Wo.'],
    datasets: [{
      data:                 monthlyWeeks,
      backgroundColor:      c.secondaryFaded,
      hoverBackgroundColor: c.secondary,
      borderRadius:         4,
      borderSkipped:        false,
    }],
  };

  const doughnutData = {
    labels: categories.map((cat) => cat.name),
    datasets: [{
      data:            categories.map((cat) => cat.totalMinutes ?? 0),
      backgroundColor: categories.map((cat) => cat.color),
      borderColor:     c.border,
      borderWidth:     3,
    }],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: c.tick, boxWidth: 10, padding: 14, font: { size: 11 } },
      },
    },
    cutout: '68%',
  };

  const summary = [
    { label: 'Heute',       value: `${todayMins}m` },
    { label: 'Diese Woche', value: `${Math.floor(weeklyTotal / 60)}h ${weeklyTotal % 60}m` },
    { label: 'Sessions',    value: (stats?.sessionCount ?? sessions.length).toString() },
    { label: 'Gesamt',      value: `${Math.floor(totalMins / 60)}h` },
  ];

  /* ── Lade-Skeleton ────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-[var(--bg-3)] rounded w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card py-3 h-16 bg-[var(--bg-3)]" />
          ))}
        </div>
        <div className="card h-48 bg-[var(--bg-3)]" />
      </div>
    );
  }

  /* ── JSX ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      <div>
        <h1 className="page-title">Statistiken</h1>
        <p className="page-subtitle">Analysiere dein Lernverhalten.</p>
      </div>

      {/* Kacheln */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="card py-3">
            <p className="text-xs text-[var(--text-3)] mb-1">{s.label}</p>
            <p className="text-lg font-bold tracking-tight text-[var(--text)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Woche */}
      <div className="card">
        <p className="card-title">Wöchentliche Lernzeit</p>
        <div className="chart-container-md">
          <Bar data={weekBarData} options={barOpts} />
        </div>
      </div>

      {/* Donut + Monat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card">
          <p className="card-title">Fachaufteilung</p>
          <div className="chart-container-md">
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
        </div>
        <div className="card">
          <p className="card-title">Monatsübersicht</p>
          <div className="chart-container-md">
            <Bar data={monthBarData} options={barOpts} />
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card">
        <p className="card-title">Aktivität — letzte 28 Tage</p>
        <div className="grid grid-cols-7 gap-1.5">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
            <p key={d} className="text-center text-xs text-[var(--text-3)] pb-1">{d}</p>
          ))}
          {heatmap.map((day, i) => (
            <div
              key={i}
              className={`h-8 rounded-md ${heatClass(day.mins)}`}
              title={`${day.date.toLocaleDateString('de-DE')}: ${day.mins}m`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-xs text-[var(--text-3)]">Weniger</span>
          {HEAT_CLASSES.map((cls) => (
            <div key={cls} className={`w-3 h-3 rounded ${cls}`} />
          ))}
          <span className="text-xs text-[var(--text-3)]">Mehr</span>
        </div>
      </div>
    </div>
  );
}
