/*
 * pages/Statistics/Statistics.tsx
 * ─────────────────────────────────────────────────────────────
 * Statistik-Seite: Diagramme und Kennzahlen über Lernverhalten.
 *
 * Server-State Architektur:
 *  - useSessions()   → TanStack Query, befüllt sessionStore
 *  - useCategories() → TanStack Query, befüllt categoryStore
 *  - useStats()      → aggregierte Kennzahlen vom Backend (mit Redis-Cache)
 *
 * Visualisierungen:
 *  - Wöchentliche Lernzeit: Balkendiagramm (7 Tage)
 *  - Fachaufteilung: Donut-Chart pro Kategorie
 *  - Monatsübersicht: Balkendiagramm (4 Wochen)
 *  - Aktivitäts-Heatmap: 28 Tage × 7 Spalten (wie GitHub-Contributions)
 * ─────────────────────────────────────────────────────────────
 */

import {
  Chart as ChartJS,
  CategoryScale,  /* X-Achse: kategorische Werte (z.B. Wochentage) */
  LinearScale,    /* Y-Achse: numerische Werte (Minuten) */
  BarElement,     /* Balken in Bar-Charts */
  ArcElement,     /* Segmente in Doughnut/Pie-Charts */
  Tooltip,        /* Hover-Tooltips */
  Legend,         /* Legende (hier: nur für Donut) */
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import { useSessions }   from '../../hooks/useSessions';
import { useCategories } from '../../hooks/useCategories';
import { useStats }      from '../../hooks/useStats';
import { getWeekDays, getWeeklyMinutes, getTodayMinutes } from '../../utils/time';

/* Hardcodierte Dark-Palette — abgestimmt auf Landing/Login/Dashboard */
const DC = {
  primary:        'rgba(244,114,182,0.80)',  /* Pink — Hauptbalken (aktiver Hover) */
  primaryFaded:   'rgba(139, 92,246,0.28)',  /* Violett gedämpft — Ruhezustand Balken */
  secondary:      'rgba(192,132,252,0.85)',  /* Violett — Sekundärbalken (Monats-Chart) */
  secondaryFaded: 'rgba(129,140,248,0.28)',  /* Indigo gedämpft — Ruhezustand Monatsbalken */
  tick:           'rgba(255,255,255,0.35)',  /* Achsenbeschriftungen */
  grid:           'rgba(255,255,255,0.06)',  /* Gitterlinien (sehr dezent) */
  border:         '#050508',                /* Donut-Segmentrand — trennt Farben visuell */
  tooltipBg:      'rgba(10,10,18,0.95)',    /* Tooltip-Hintergrund — fast schwarz */
};

/* Chart.js Komponenten registrieren — muss einmal pro App aufgerufen werden */
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

/* ── getMonthlyData ──────────────────────────────────────────────
   Gruppiert Sessions in 4 Wochenbuckets (0=älteste, 3=aktuellste).
   86_400_000 = Millisekunden pro Tag (24 * 60 * 60 * 1000). */
function getMonthlyData(sessions: { startTime: string; duration: number }[]) {
  const weeks = [0, 0, 0, 0]; /* Index 0=vor 3 Wo., 1=vor 2 Wo., 2=letzte Wo., 3=diese Wo. */
  const now   = new Date();
  sessions.forEach((s) => {
    /* diff: Anzahl Tage zwischen Session und heute */
    const diff = Math.floor((now.getTime() - new Date(s.startTime).getTime()) / 86_400_000);
    if (diff < 7)       weeks[3] += Math.floor(s.duration / 60); /* Letzte 7 Tage = "Diese Woche" */
    else if (diff < 14) weeks[2] += Math.floor(s.duration / 60); /* 7-14 Tage = "Letzte Woche" */
    else if (diff < 21) weeks[1] += Math.floor(s.duration / 60); /* 14-21 Tage */
    else if (diff < 28) weeks[0] += Math.floor(s.duration / 60); /* 21-28 Tage = "Vor 3 Wochen" */
  });
  return weeks;
}

/* CSS-Klassen für Heatmap-Zellen — 5 Intensitätsstufen */
const HEAT_CLASSES = ['heat-empty', 'heat-low', 'heat-mid', 'heat-high', 'heat-max'];
/* Lernminuten → Heatmap-Intensitätsklasse */
function heatClass(mins: number) {
  if (mins === 0)  return HEAT_CLASSES[0]; /* Keine Aktivität — leer (grau) */
  if (mins < 30)   return HEAT_CLASSES[1]; /* < 30 Min — niedrig */
  if (mins < 60)   return HEAT_CLASSES[2]; /* 30-60 Min — mittel */
  if (mins < 120)  return HEAT_CLASSES[3]; /* 60-120 Min — hoch */
  return HEAT_CLASSES[4];                  /* ≥ 120 Min — Maximum */
}

export default function Statistics() {
  /* ── Server-State ────────────────────────────────────────── */
  const { sessions,   isLoading: sessionsLoading }   = useSessions();    /* Alle Lernsessions */
  const { categories, isLoading: categoriesLoading } = useCategories();  /* Kategorien mit Lernzeit */
  const { data: stats, isLoading: statsLoading }      = useStats();       /* Backend-aggregierte Kennzahlen */

  /* isLoading: true solange einer der 3 Queries noch lädt */
  const isLoading = sessionsLoading || categoriesLoading || statsLoading;

  /* ── Berechnungen auf Store-Daten ──────────────────────── */
  const weekdays     = getWeekDays();                 /* ['Mo', 'Di', ...] — aktuelle Woche */
  const weeklyMins   = getWeeklyMinutes(sessions);    /* [120, 90, 0, ...] — Minuten pro Wochentag */
  const monthlyWeeks = getMonthlyData(sessions);      /* [200, 150, 300, 180] — pro Woche letzte 4 */
  /* stats hat Vorrang vor lokaler Berechnung (Backend-Aggregation ist präziser) */
  const todayMins    = stats?.todayMinutes ?? getTodayMinutes(sessions);
  const weeklyTotal  = stats?.weekMinutes  ?? weeklyMins.reduce((a, b) => a + b, 0); /* Wochensumme */
  const totalMins    = stats?.totalMinutes ?? sessions.reduce((a, s) => a + Math.floor(s.duration / 60), 0);

  /* ── Heatmap: letzte 28 Tage ─────────────────────────── */
  /* 28 Einträge — ein Eintrag pro Tag, rückwärts von heute */
  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i)); /* 27 Tage zurück bis heute */
    /* Alle Sessions dieses Tages summieren — toDateString() normalisiert auf "Wed May 21 2026" */
    const mins = sessions
      .filter((s) => new Date(s.startTime).toDateString() === date.toDateString())
      .reduce((a, s) => a + Math.floor(s.duration / 60), 0);
    return { date, mins };
  });

  /* ── Chart-Optionen (geteilt) ────────────────────────── */
  /* Gemeinsame Chart-Optionen für beide Balkendiagramme */
  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: {
        backgroundColor: DC.tooltipBg,
        titleColor:      DC.tick,
        bodyColor:       'rgba(255,255,255,0.85)',
        borderColor:     'rgba(255,255,255,0.08)',
        borderWidth: 1,
        padding:     10,
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        ticks:  { color: DC.tick, font: { size: 11, family: 'Inter' } },
        border: { display: false },
      },
      y: {
        grid:   { color: DC.grid, drawTicks: false },
        ticks: {
          color: DC.tick,
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
      backgroundColor:      DC.primaryFaded,
      hoverBackgroundColor: DC.primary,
      borderRadius:         4,
      borderSkipped:        false,
    }],
  };

  const monthBarData = {
    labels: ['Vor 3 Wo.', 'Vor 2 Wo.', 'Letzte Wo.', 'Diese Wo.'],
    datasets: [{
      data:                 monthlyWeeks,
      backgroundColor:      DC.secondaryFaded,
      hoverBackgroundColor: DC.secondary,
      borderRadius:         4,
      borderSkipped:        false,
    }],
  };

  const doughnutData = {
    labels: categories.map((cat) => cat.name),
    datasets: [{
      data:            categories.map((cat) => cat.totalMinutes ?? 0),
      backgroundColor: categories.map((cat) => cat.color),
      borderColor:     DC.border,
      borderWidth:     3,
    }],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: DC.tick, boxWidth: 10, padding: 14, font: { size: 11 } },
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
        <div className="h-8 bg-white/5 rounded-xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card py-3 h-16" />
          ))}
        </div>
        <div className="card h-48" />
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
