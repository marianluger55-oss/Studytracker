/*
 * pages/Admin/AdminUsers.tsx
 * Benutzerverwaltung im Admin-Panel: Tabelle, Rollen-Toggle, Löschen, Pagination.
 */

import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                                 from '../../services/apiClient';

/* ── Typen ────────────────────────────────────────────────────── */
interface AdminUser {
  id:           number;
  email:        string;
  username:     string;
  role:         'user' | 'admin';
  createdAt:    string;
  deletedAt:    string | null;
  sessionCount: number;
  totalMinutes: number;
}

/* ── Hilfsfunktion: Minuten → "Xh Ym" ───────────────────────── */
function fmtTime(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const queryClient           = useQueryClient();
  const [page, setPage]       = useState(0);
  const [confirm, setConfirm] = useState<number | null>(null);

  /* ── Benutzerliste laden ──────────────────────────────────────── */
  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ['admin', 'users', page],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/admin/users?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      );
      return data.data;
    },
  });

  /* ── Rolle ändern ─────────────────────────────────────────────── */
  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: 'user' | 'admin' }) => {
      await apiClient.patch(`/admin/users/${id}/role`, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  /* ── Benutzer löschen ─────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Benutzer</h1>
        <p className="text-sm text-white/40 mt-1">
          {data ? `${data.total} registrierte Accounts` : 'Wird geladen…'}
        </p>
      </div>

      {/* ── Tabelle ─────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">

        {/* Tabellen-Header */}
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/70">Alle Nutzer</p>
          <span className="text-xs text-white/30">{data?.total ?? '–'} gesamt</span>
        </div>

        {/* Skeleton-Loader */}
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-white/30 text-left text-xs">
                  <th className="px-5 py-3 font-medium">Benutzer</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Sessions</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Lernzeit</th>
                  <th className="px-4 py-3 font-medium">Rolle</th>
                  <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.02] ${
                      u.deletedAt ? 'opacity-35' : ''
                    }`}
                  >
                    {/* Name + E-Mail */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white/85">{u.username}</p>
                      <p className="text-xs text-white/35 mt-0.5">{u.email}</p>
                    </td>

                    {/* Sessions */}
                    <td className="px-4 py-3.5 hidden sm:table-cell text-white/50 tabular-nums">
                      {u.sessionCount}
                    </td>

                    {/* Lernzeit */}
                    <td className="px-4 py-3.5 hidden md:table-cell text-white/50 tabular-nums">
                      {fmtTime(u.totalMinutes)}
                    </td>

                    {/* Rolle */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.role === 'admin'
                          ? 'bg-pink-500/15 text-pink-400'
                          : 'bg-white/[0.06] text-white/40'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-3.5 text-right">
                      {!u.deletedAt && (
                        <div className="flex items-center justify-end gap-2">

                          {/* Rolle toggeln */}
                          <button
                            type="button"
                            onClick={() =>
                              roleMutation.mutate({
                                id:   u.id,
                                role: u.role === 'admin' ? 'user' : 'admin',
                              })
                            }
                            disabled={roleMutation.isPending}
                            className="px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                          >
                            {u.role === 'admin' ? '↓ User' : '↑ Admin'}
                          </button>

                          {/* Löschen mit Bestätigung */}
                          {confirm === u.id ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(u.id)}
                                disabled={deleteMutation.isPending}
                                className="px-2.5 py-1 rounded-md text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                              >
                                Ja, löschen
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                className="px-2.5 py-1 rounded-md text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirm(u.id)}
                              className="px-2.5 py-1 rounded-md text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Löschen
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Zurück
            </button>
            <span className="text-xs text-white/30">
              Seite {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Weiter →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
