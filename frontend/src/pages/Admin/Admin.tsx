/*
 * pages/Admin/Admin.tsx
 * Admin-Dashboard: Plattform-Statistiken + Benutzerverwaltung.
 * Nur erreichbar für Benutzer mit role === 'admin'.
 */

import { useState }                    from 'react';
import { motion }                      from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                       from '../../services/apiClient';

/* ── Typen ────────────────────────────────────────────────────── */
interface PlatformStats {
  totalUsers:    number;
  activeUsers:   number;
  adminCount:    number;
  totalSessions: number;
  totalMinutes:  number;
  sessionsToday: number;
  activeToday:   number;
}

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

/* ── Animations-Varianten ─────────────────────────────────────── */
const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [page, setPage]     = useState(0);
  const [confirm, setConfirm] = useState<number | null>(null);
  const pageSize = 20;

  /* ── Plattform-Stats ──────────────────────────────────────────── */
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn:  async () => {
      const { data } = await apiClient.get('/admin/stats');
      return data.data;
    },
  });

  /* ── Benutzerliste ────────────────────────────────────────────── */
  const { data: usersData } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ['admin', 'users', page],
    queryFn:  async () => {
      const { data } = await apiClient.get(`/admin/users?limit=${pageSize}&offset=${page * pageSize}`);
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

  const totalPages = Math.ceil((usersData?.total ?? 0) / pageSize);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <h1 className="page-title">Admin-Panel</h1>
        <p className="page-subtitle">Plattformübersicht und Benutzerverwaltung.</p>
      </motion.div>

      {/* ── Plattform-Stats ────────────────────────────────────── */}
      {stats && (
        <motion.div
          custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: 'Nutzer gesamt',  value: stats.totalUsers    },
            { label: 'Aktive Nutzer',  value: stats.activeUsers   },
            { label: 'Sessions heute', value: stats.sessionsToday },
            { label: 'Lernzeit ges.',  value: `${Math.floor(stats.totalMinutes / 60)}h` },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-[1.5rem] font-bold text-[var(--accent)] tabular-nums">{value}</p>
              <p className="text-[0.6875rem] text-[var(--text-3)] mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Benutzertabelle ────────────────────────────────────── */}
      <motion.div
        custom={2} variants={cardVariants} initial="hidden" animate="visible"
        className="card overflow-hidden p-0"
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <p className="card-title-flush">Benutzer</p>
          <span className="text-xs text-[var(--text-3)]">{usersData?.total ?? 0} gesamt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-3)] text-left">
                <th className="px-5 py-2.5 font-medium">Benutzer</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Sessions</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Lernzeit</th>
                <th className="px-4 py-2.5 font-medium">Rolle</th>
                <th className="px-4 py-2.5 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {usersData?.users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-3)] transition-colors ${u.deletedAt ? 'opacity-40' : ''}`}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-[var(--text)]">{u.username}</p>
                    <p className="text-[0.6875rem] text-[var(--text-3)]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[var(--text-2)] tabular-nums">
                    {u.sessionCount}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[var(--text-2)] tabular-nums">
                    {Math.floor(u.totalMinutes / 60)}h {u.totalMinutes % 60}m
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold ${
                      u.role === 'admin'
                        ? 'bg-pink-500/15 text-pink-400'
                        : 'bg-[var(--bg-3)] text-[var(--text-3)]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!u.deletedAt && (
                      <div className="flex items-center justify-end gap-2">
                        {/* Rolle toggeln */}
                        <button
                          type="button"
                          onClick={() => roleMutation.mutate({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                          className="btn-ghost text-xs py-1 px-2"
                          title={u.role === 'admin' ? 'Zu User degradieren' : 'Zu Admin befördern'}
                        >
                          {u.role === 'admin' ? '↓ User' : '↑ Admin'}
                        </button>

                        {/* Löschen mit Bestätigung */}
                        {confirm === u.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(u.id)}
                              className="btn-danger text-xs py-1 px-2"
                            >
                              Ja
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirm(null)}
                              className="btn-ghost text-xs py-1 px-2"
                            >
                              Nein
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirm(u.id)}
                            className="btn-ghost text-xs py-1 px-2 text-red-400 hover:text-red-300"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost text-xs py-1.5 disabled:opacity-30"
            >
              ← Zurück
            </button>
            <span className="text-xs text-[var(--text-3)]">
              Seite {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-ghost text-xs py-1.5 disabled:opacity-30"
            >
              Weiter →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
