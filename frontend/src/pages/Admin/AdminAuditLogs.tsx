/*
 * pages/Admin/AdminAuditLogs.tsx
 *
 * Backend: GET /api/admin/audit?limit=&offset=&userId=
 * Zeigt alle sicherheitsrelevanten Ereignisse mit Pagination und Aktionsfilter.
 */

import { useState }    from 'react';
import { useQuery }    from '@tanstack/react-query';
import apiClient       from '../../services/apiClient';

/* ── Typen ──────────────────────────────────────────────────────── */
interface AuditEntry {
  id:        number;
  userId:    number | null;
  username:  string | null;
  email:     string | null;
  action:    string;
  ip:        string | null;
  userAgent: string | null;
  metadata:  Record<string, unknown>;
  createdAt: string;
}

interface AuditResponse {
  logs:  AuditEntry[];
  total: number;
}

/* ── Aktions-Badge Farben ───────────────────────────────────────── */
const ACTION_COLORS: Record<string, string> = {
  login:              'bg-green-500/15 text-green-400',
  register:           'bg-blue-500/15 text-blue-400',
  logout:             'bg-white/10 text-white/50',
  logout_all:         'bg-orange-500/15 text-orange-400',
  login_failed:       'bg-red-500/15 text-red-400',
  login_anomaly:      'bg-red-500/30 text-red-300 font-semibold',
  password_changed:   'bg-yellow-500/15 text-yellow-400',
  account_deleted:    'bg-red-500/20 text-red-400',
  data_exported:      'bg-purple-500/15 text-purple-400',
  role_changed:       'bg-pink-500/15 text-pink-400',
  sessions_revoked:   'bg-orange-500/15 text-orange-400',
  admin_user_deleted: 'bg-red-500/20 text-red-500',
};

const PAGE_SIZE = 50;

/* ── Hilfsfunktionen ─────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    login:              'Login',
    register:           'Registrierung',
    logout:             'Logout',
    logout_all:         'Alle abmelden',
    login_failed:       'Login fehlgeschlagen',
    login_anomaly:      '⚠ Angriff erkannt',
    password_changed:   'Passwort geändert',
    account_deleted:    'Account gelöscht',
    data_exported:      'Daten exportiert',
    role_changed:       'Rolle geändert',
    sessions_revoked:   'Sessions widerrufen',
    admin_user_deleted: 'Admin: User gelöscht',
  };
  return map[action] ?? action;
}

/* ── Komponente ──────────────────────────────────────────────────── */
export default function AdminAuditLogs() {
  const [page,         setPage]         = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page, actionFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit:  String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      };
      const { data } = await apiClient.get<{ success: boolean; data: AuditResponse }>(
        '/admin/audit', { params },
      );
      return data.data;
    },
    /* Alle 30s aktualisieren */
    refetchInterval: 30_000,
  });

  const logs         = data?.logs ?? [];
  const total        = data?.total ?? 0;
  const totalPages   = Math.ceil(total / PAGE_SIZE);

  /* Clientseitiger Aktionsfilter (kein extra Backend-Roundtrip) */
  const visible = actionFilter
    ? logs.filter((l) => l.action === actionFilter)
    : logs;

  const allActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Audit-Log</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {total.toLocaleString('de-DE')} Einträge gesamt · INSERT-only · tamper-resistent
        </p>
      </div>

      {/* ── Filter ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setActionFilter(''); setPage(0); }}
          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
            !actionFilter
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
          }`}
        >
          Alle
        </button>
        {allActions.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => { setActionFilter(a === actionFilter ? '' : a); setPage(0); }}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              actionFilter === a
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
            }`}
          >
            {actionLabel(a)}
          </button>
        ))}
      </div>

      {/* ── Tabelle ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Zeit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Aktion</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Benutzer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40">IP</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-white/30 text-sm">
                    Lade…
                  </td>
                </tr>
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-white/30 text-sm">
                    Keine Einträge
                  </td>
                </tr>
              )}
              {visible.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  {/* Zeit */}
                  <td className="px-4 py-3 text-white/50 whitespace-nowrap font-mono text-xs">
                    {formatDate(entry.createdAt)}
                  </td>

                  {/* Aktion */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        ACTION_COLORS[entry.action] ?? 'bg-white/10 text-white/60'
                      }`}
                    >
                      {actionLabel(entry.action)}
                    </span>
                  </td>

                  {/* Benutzer */}
                  <td className="px-4 py-3 text-white/70">
                    {entry.username
                      ? <span>{entry.username} <span className="text-white/30 text-xs">#{entry.userId}</span></span>
                      : <span className="text-white/20 text-xs italic">unbekannt</span>
                    }
                  </td>

                  {/* IP */}
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">
                    {entry.ip ?? '—'}
                  </td>

                  {/* Metadata */}
                  <td className="px-4 py-3 text-white/30 text-xs font-mono max-w-xs truncate">
                    {Object.keys(entry.metadata).length > 0
                      ? JSON.stringify(entry.metadata)
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/30">
            Seite {page + 1} von {totalPages} · {total} Einträge
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
