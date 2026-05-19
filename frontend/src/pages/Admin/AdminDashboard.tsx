/*
 * pages/Admin/AdminDashboard.tsx
 * Echtzeit-Dashboard: Stats, Wachstums-Charts und Live-Aktivitätsfeed.
 */

import { useQuery }      from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, Filler, Tooltip,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Line, Bar }     from 'react-chartjs-2';
import apiClient         from '../../services/apiClient';

/* Nur verwendete Chart.js-Komponenten registrieren */
ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, Filler, Tooltip,
);

/* ── Typen ────────────────────────────────────────────────────── */
interface PlatformStats {
  totalUsers:    number;
  activeUsers:   number;
  adminCount:    number;
  totalSessions: number;
  totalMinutes:  number;
  sessionsToday: number;
  activeToday:   number;
  newToday:      number;
  avgSessionMin: number;
}

interface GrowthPoint { label: string; value: number; }
interface GrowthData {
  userGrowth:      GrowthPoint[];
  sessionActivity: GrowthPoint[];
}

interface ActivityEvent {
  type:     'session' | 'register';
  time:     string;
  username: string;
  category: string | null;
  minutes:  number | null;
}

/* ── Relativer Zeitstempel ────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60)  return 'gerade eben';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)  return `vor ${hrs} Std.`;
  return `vor ${Math.floor(hrs / 24)} Tagen`;
}

/* ── Chart-Optionen (dark theme) ──────────────────────────────── */
const lineOptions: ChartOptions<'line'> = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      titleColor:      'rgba(255,255,255,0.9)',
      bodyColor:       'rgba(255,255,255,0.55)',
      borderColor:     'rgba(255,255,255,0.10)',
      borderWidth:     1,
      padding:         10,
    },
  },
  scales: {
    x: {
      grid:  { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: 'rgba(255,255,255,0.28)' },
    },
    y: {
      grid:        { color: 'rgba(255,255,255,0.04)' },
      ticks:       { color: 'rgba(255,255,255,0.28)' },
      beginAtZero: true,
    },
  },
};

const barOptions: ChartOptions<'bar'> = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      titleColor:      'rgba(255,255,255,0.9)',
      bodyColor:       'rgba(255,255,255,0.55)',
      borderColor:     'rgba(255,255,255,0.10)',
      borderWidth:     1,
      padding:         10,
    },
  },
  scales: {
    x: {
      grid:  { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: 'rgba(255,255,255,0.28)' },
    },
    y: {
      grid:        { color: 'rgba(255,255,255,0.04)' },
      ticks:       { color: 'rgba(255,255,255,0.28)' },
      beginAtZero: true,
    },
  },
};

/* ── Skeleton-Kachel ──────────────────────────────────────────── */
function SkeletonCard() {
  return <div className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />;
}

export default function AdminDashboard() {

  /* Stats — alle 30 Sekunden */
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn:  async () => { const { data } = await apiClient.get('/admin/stats'); return data.data; },
    refetchInterval: 30_000,
  });

  /* Wachstums-Daten — jede Minute */
  const { data: growth } = useQuery<GrowthData>({
    queryKey: ['admin', 'growth'],
    queryFn:  async () => { const { data } = await apiClient.get('/admin/growth'); return data.data; },
    refetchInterval: 60_000,
  });

  /* Aktivitätsfeed — alle 5 Sekunden */
  const { data: activity } = useQuery<ActivityEvent[]>({
    queryKey: ['admin', 'activity'],
    queryFn:  async () => { const { data } = await apiClient.get('/admin/activity?limit=30'); return data.data; },
    refetchInterval: 5_000,
  });

  /* ── Stat-Kacheln (6 Stück) ───────────────────────────────── */
  const cards = stats ? [
    {
      label: 'Nutzer gesamt',
      value: stats.totalUsers.toLocaleString(),
      sub:   `${stats.activeUsers} aktiv · ${stats.adminCount} Admins`,
      color: 'text-white',
    },
    {
      label: 'Neu heute',
      value: `+${stats.newToday}`,
      sub:   'Registrierungen heute',
      color: 'text-emerald-400',
    },
    {
      label: 'Sessions gesamt',
      value: stats.totalSessions.toLocaleString(),
      sub:   `${stats.sessionsToday} heute`,
      color: 'text-white',
    },
    {
      label: 'Aktive Nutzer heute',
      value: stats.activeToday,
      sub:   `${stats.sessionsToday} Sessions heute`,
      color: 'text-purple-400',
    },
    {
      label: 'Lernzeit gesamt',
      value: `${Math.floor(stats.totalMinutes / 60).toLocaleString()}h`,
      sub:   `${stats.totalMinutes % 60}m Rest`,
      color: 'text-white',
    },
    {
      label: 'Ø Session-Länge',
      value: `${stats.avgSessionMin} Min.`,
      sub:   'Plattform-Durchschnitt',
      color: 'text-white',
    },
  ] : null;

  /* ── Chart-Daten ──────────────────────────────────────────── */
  const lineData: ChartData<'line'> = {
    labels:   growth?.userGrowth.map((d) => d.label) ?? [],
    datasets: [{
      data:            growth?.userGrowth.map((d) => d.value) ?? [],
      borderColor:     '#c084fc',
      backgroundColor: 'rgba(192,132,252,0.08)',
      fill:            true,
      tension:         0.4,
      pointRadius:     3,
      pointHoverRadius: 5,
      borderWidth:     2,
    }],
  };

  const barData: ChartData<'bar'> = {
    labels:   growth?.sessionActivity.map((d) => d.label) ?? [],
    datasets: [{
      data:                growth?.sessionActivity.map((d) => d.value) ?? [],
      backgroundColor:     'rgba(124,58,237,0.55)',
      hoverBackgroundColor:'rgba(124,58,237,0.85)',
      borderRadius:        4,
    }],
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Übersicht</h1>
          <p className="text-sm text-white/40 mt-1">Plattform-Kennzahlen in Echtzeit.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* ── 6 Stat-Kacheln ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards
          ? cards.map(({ label, value, sub, color }) => (
              <div
                key={label}
                className="bg-white/[0.04] border border-white/8 rounded-xl p-4 hover:bg-white/[0.06] transition-colors"
              >
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
                <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>
              </div>
            ))
          : Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        }
      </div>

      {/* ── Charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Neue Nutzer — Linie */}
        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
          <p className="text-sm font-semibold text-white/70 mb-1">Neue Nutzer</p>
          <p className="text-xs text-white/30 mb-4">letzte 14 Tage</p>
          <div className="h-44">
            {growth
              ? <Line data={lineData} options={lineOptions} />
              : <div className="h-full rounded-lg bg-white/[0.04] animate-pulse" />
            }
          </div>
        </div>

        {/* Sessions pro Tag — Balken */}
        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
          <p className="text-sm font-semibold text-white/70 mb-1">Sessions pro Tag</p>
          <p className="text-xs text-white/30 mb-4">letzte 14 Tage</p>
          <div className="h-44">
            {growth
              ? <Bar data={barData} options={barOptions} />
              : <div className="h-full rounded-lg bg-white/[0.04] animate-pulse" />
            }
          </div>
        </div>
      </div>

      {/* ── Live-Aktivitätsfeed ──────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white/70">Live-Aktivität</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-xs text-white/25">letzte 24 Stunden · Aktualisierung alle 5s</span>
        </div>

        {!activity ? (
          <div className="p-5 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-white/25">
            Keine Aktivität in den letzten 24 Stunden.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {activity.map((event, i) => (
              <div
                key={i}
                className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors"
              >
                {/* Icon */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  event.type === 'register'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-purple-500/15 text-purple-400'
                }`}>
                  {event.type === 'register' ? '👤' : '📚'}
                </div>

                {/* Beschreibung */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/80 font-medium">{event.username}</span>
                  {event.type === 'register' && (
                    <span className="text-sm text-white/40"> hat sich registriert</span>
                  )}
                  {event.type === 'session' && (
                    <span className="text-sm text-white/40">
                      {' '}hat{' '}
                      <span className="text-white/60">{event.minutes} Min.</span>
                      {' '}gelernt
                      {event.category && (
                        <span className="text-white/25"> · {event.category}</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Zeitstempel */}
                <span className="text-xs text-white/25 flex-shrink-0 tabular-nums">
                  {timeAgo(event.time)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
