/*
 * pages/Admin/AdminDashboard.tsx
 * Plattform-Übersicht: Kennzahlen auf einen Blick.
 */

import { useQuery }   from '@tanstack/react-query';
import apiClient      from '../../services/apiClient';

interface PlatformStats {
  totalUsers:    number;
  activeUsers:   number;
  adminCount:    number;
  totalSessions: number;
  totalMinutes:  number;
  sessionsToday: number;
  activeToday:   number;
}

const statCards = (s: PlatformStats) => [
  { label: 'Registrierte Nutzer',  value: s.totalUsers,                    sub: `${s.activeUsers} aktiv`        },
  { label: 'Sessions gesamt',      value: s.totalSessions.toLocaleString(), sub: `${s.sessionsToday} heute`      },
  { label: 'Lernzeit gesamt',      value: `${Math.floor(s.totalMinutes / 60).toLocaleString()}h`, sub: `${s.totalMinutes % 60}m`  },
  { label: 'Aktive Nutzer heute',  value: s.activeToday,                   sub: `${s.adminCount} Admins`        },
];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn:  async () => {
      const { data } = await apiClient.get('/admin/stats');
      return data.data;
    },
    refetchInterval: 60_000, /* jede Minute aktualisieren */
  });

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Übersicht</h1>
        <p className="text-sm text-white/40 mt-1">Plattform-Kennzahlen in Echtzeit.</p>
      </div>

      {/* ── Stat-Kacheln ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards(stats).map(({ label, value, sub }) => (
            <div
              key={label}
              className="bg-white/[0.04] border border-white/8 rounded-xl p-5 hover:bg-white/[0.06] transition-colors"
            >
              <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
              <p className="text-xs text-white/50 mt-1">{label}</p>
              <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Hinweis ───────────────────────────────────────────────── */}
      <div className="bg-purple-500/8 border border-purple-500/15 rounded-xl p-5">
        <p className="text-sm font-semibold text-white/70 mb-1">Benutzerverwaltung</p>
        <p className="text-xs text-white/40">
          Unter <strong className="text-white/60">Benutzer</strong> kannst du Rollen vergeben,
          Accounts sperren und detaillierte Nutzerstatistiken einsehen.
        </p>
      </div>
    </div>
  );
}
