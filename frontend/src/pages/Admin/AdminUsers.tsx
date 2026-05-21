/*
 * pages/Admin/AdminUsers.tsx
 * ─────────────────────────────────────────────────────────────
 * Admin-Seite: Benutzerverwaltung.
 *
 * Features:
 *  - Benutzerliste mit Suche (300ms Debounce) und Rollenfilter
 *  - Pagination (20 Nutzer pro Seite)
 *  - Rollen-Toggle (user ↔ admin) per PATCH /admin/users/:id/role
 *  - Sessions widerrufen per POST /admin/users/:id/revoke-sessions
 *  - Nutzer löschen (Soft-Delete) mit Bestätigungsdialog
 *  - Nutzerprofil-Panel mit letzten 10 Sessions (bei Klick auf Name)
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect }                    from 'react';
import { useQuery, useMutation, useQueryClient }  from '@tanstack/react-query';
import apiClient                                  from '../../services/apiClient';

/* ── Typen ────────────────────────────────────────────────────── */
/* AdminUser: Kurzprofil für die Tabellenliste */
interface AdminUser {
  id:           number;
  email:        string;
  username:     string;
  role:         'user' | 'admin';
  createdAt:    string;
  deletedAt:    string | null; /* null = aktiv, ISO-String = soft-deleted */
  sessionCount: number;        /* Anzahl aller Lernsessions */
  totalMinutes: number;        /* Gesamte Lernzeit in Minuten */
}

/* UserDetail: Detailprofil für das ausklappbare Panel */
interface UserDetail {
  id:             number;
  email:          string;
  username:       string;
  role:           'user' | 'admin';
  createdAt:      string;
  deletedAt:      string | null;
  totalSessions:  number;
  totalMinutes:   number;
  lastSession:    string | null; /* ISO-String der letzten Session oder null */
  recentSessions: { id: number; startTime: string; minutes: number; category: string }[];
}

/* ── Hilfsfunktionen ──────────────────────────────────────────── */
/* Minuten → lesbare Anzeige: 45m oder 1h 30m */
function fmtTime(minutes: number) {
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/* ISO-Datum → deutsches Format: "21.05.2026" */
function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/* Anzahl Nutzer pro Seite — Pagination */
const PAGE_SIZE = 20;

export default function AdminUsers() {
  const qc                              = useQueryClient();
  const [page,        setPage]          = useState(0);          /* Aktuelle Seite (0-basiert) */
  const [searchInput, setSearchInput]   = useState('');         /* Suchfeld-Wert (live, unkontrolliert) */
  const [search,      setSearch]        = useState('');         /* Debounced Suchwert — wird an Backend gesendet */
  const [roleFilter,  setRoleFilter]    = useState('');         /* 'user' | 'admin' | '' für Alle */
  const [confirm,     setConfirm]       = useState<number | null>(null); /* Id des Nutzers dessen Löschung bestätigt werden muss */
  const [detailId,    setDetailId]      = useState<number | null>(null); /* Id des aufgeklappten Nutzer-Panels */
  const [revokeOk,    setRevokeOk]      = useState<number | null>(null); /* Id des Nutzers nach erfolgreichem Widerrufen */

  /* Suche: 300ms debounce — verhindert Backend-Request bei jedem Tastendruck */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 300); /* Timer starten */
    return () => clearTimeout(t); /* Timer abbrechen wenn searchInput sich vor Ablauf ändert */
  }, [searchInput]);

  /* Rollenfilter → Seite zurücksetzen damit keine leere Seite erscheint */
  useEffect(() => setPage(0), [roleFilter]);

  /* ── Benutzerliste ────────────────────────────────────────── */
  /* Query-Key enthält page, search und roleFilter → TanStack Query cached jede Kombination separat */
  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: async () => {
      /* URLSearchParams baut die Query-String automatisch: ?limit=20&offset=0&search=... */
      const p = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE), /* Offset = Seite × Seitengröße */
      });
      if (search)     p.set('search', search);       /* Nur anhängen wenn nicht leer */
      if (roleFilter) p.set('role',   roleFilter);   /* Nur anhängen wenn gefiltert */
      const { data } = await apiClient.get<{ users: AdminUser[]; total: number }>(`/admin/users?${p}`);
      return data;
    },
  });

  /* ── Nutzerprofil ─────────────────────────────────────────── */
  /* enabled: false → Query wird nicht ausgeführt wenn kein Nutzer ausgewählt */
  const { data: detail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ['admin', 'user', detailId],
    queryFn:  async () => {
      const { data } = await apiClient.get<UserDetail>(`/admin/users/${detailId}`);
      return data;
    },
    enabled: detailId !== null, /* Nur fetchen wenn ein Nutzer-Panel offen ist */
  });

  /* ── Rolle ändern ─────────────────────────────────────────── */
  /* PATCH /admin/users/:id/role → toggled user ↔ admin */
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'user' | 'admin' }) =>
      apiClient.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }), /* Liste neu laden */
  });

  /* ── Sessions widerrufen ──────────────────────────────────── */
  /* POST /admin/users/:id/revoke-sessions → löscht Refresh-Tokens → erzwingt Re-Login */
  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/admin/users/${id}/revoke-sessions`),
    onSuccess: (_, id) => {
      setRevokeOk(id);                               /* Grünes Häkchen beim Button anzeigen */
      setTimeout(() => setRevokeOk(null), 2500);     /* Häkchen nach 2.5s wieder verstecken */
    },
  });

  /* ── Löschen ──────────────────────────────────────────────── */
  /* DELETE /admin/users/:id → Soft-Delete (deletedAt Timestamp gesetzt, Daten bleiben) */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      setConfirm(null);                               /* Bestätigungsdialog schließen */
      if (detailId === confirm) setDetailId(null);    /* Detail-Panel schließen wenn dieser Nutzer offen war */
      qc.invalidateQueries({ queryKey: ['admin'] });  /* Alle Admin-Queries invalidieren (Liste + Details) */
    },
  });

  /* Gesamtseitenanzahl für Pagination — Math.ceil: letzte Seite auch bei unvollständiger Seite zeigen */
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Benutzer</h1>
        <p className="text-sm text-white/40 mt-1">
          {data ? `${data.total} Account${data.total === 1 ? '' : 's'} gefunden` : 'Wird geladen…'}
        </p>
      </div>

      {/* ── Suche + Filter ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Suchfeld */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name oder E-Mail suchen…"
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Rollenfilter */}
        <div className="flex gap-1.5">
          {([
            { val: '',      label: 'Alle'  },
            { val: 'user',  label: 'User'  },
            { val: 'admin', label: 'Admin' },
          ] as const).map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => setRoleFilter(val)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === val
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/[0.05] text-white/45 border border-white/10 hover:text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Benutzertabelle ─────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-white/28 text-left text-xs">
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
                    className={`border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors ${
                      u.deletedAt ? 'opacity-35' : ''
                    } ${detailId === u.id ? 'bg-white/[0.03]' : ''}`}
                  >
                    {/* Name + E-Mail — klickbar für Detail */}
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDetailId(detailId === u.id ? null : u.id)}
                        className="text-left hover:opacity-75 transition-opacity"
                      >
                        <p className="font-medium text-white/85 flex items-center gap-1.5">
                          {u.username}
                          {detailId === u.id && (
                            <span className="text-[10px] text-purple-400 font-normal">▲</span>
                          )}
                        </p>
                        <p className="text-xs text-white/35 mt-0.5">{u.email}</p>
                      </button>
                    </td>

                    <td className="px-4 py-3.5 hidden sm:table-cell text-white/50 tabular-nums">
                      {u.sessionCount}
                    </td>

                    <td className="px-4 py-3.5 hidden md:table-cell text-white/50 tabular-nums">
                      {fmtTime(u.totalMinutes)}
                    </td>

                    {/* Rolle */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.role === 'admin'
                          ? 'bg-pink-500/15 text-pink-400'
                          : 'bg-white/[0.06] text-white/38'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-3.5 text-right">
                      {!u.deletedAt && (
                        <div className="flex items-center justify-end gap-1">

                          {/* Rolle toggeln */}
                          <button
                            type="button"
                            onClick={() => roleMutation.mutate({
                              id:   u.id,
                              role: u.role === 'admin' ? 'user' : 'admin',
                            })}
                            disabled={roleMutation.isPending}
                            title={u.role === 'admin' ? 'Zu User degradieren' : 'Zu Admin befördern'}
                            className="px-2.5 py-1 rounded-md text-xs text-white/45 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                          >
                            {u.role === 'admin' ? '↓ User' : '↑ Admin'}
                          </button>

                          {/* Sessions widerrufen */}
                          <button
                            type="button"
                            onClick={() => revokeMutation.mutate(u.id)}
                            disabled={revokeMutation.isPending}
                            title="Alle aktiven Sitzungen beenden (erzwingt Re-Login)"
                            className={`px-2.5 py-1 rounded-md text-xs transition-colors disabled:opacity-40 ${
                              revokeOk === u.id
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-amber-400/55 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                          >
                            {revokeOk === u.id ? '✓' : '⏏'}
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
                                Ja
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                className="px-2.5 py-1 rounded-md text-xs text-white/40 hover:bg-white/[0.05] transition-colors"
                              >
                                Nein
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirm(u.id)}
                              title="Benutzer löschen"
                              className="px-2.5 py-1 rounded-md text-xs text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {data?.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-white/25">
                      Keine Benutzer gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
            <span className="text-xs text-white/30">Seite {page + 1} / {totalPages}</span>
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

      {/* ── Nutzerprofil-Panel ───────────────────────────────── */}
      {detailId !== null && (
        <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">

          <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/70">Nutzerprofil</p>
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="text-white/25 hover:text-white/55 transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          {detailLoading || !detail ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="p-5 space-y-5">

              {/* Basis-Infos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Benutzername',    value: detail.username },
                  { label: 'E-Mail',          value: detail.email },
                  { label: 'Registriert',     value: fmtDate(detail.createdAt) },
                  { label: 'Sessions gesamt', value: detail.totalSessions.toLocaleString() },
                  { label: 'Lernzeit gesamt', value: fmtTime(detail.totalMinutes) },
                  { label: 'Letzte Session',  value: detail.lastSession ? fmtDate(detail.lastSession) : '–' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] text-white/28 mb-0.5">{label}</p>
                    <p className="text-sm text-white/75 font-medium truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Letzte 10 Sessions */}
              {detail.recentSessions.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 mb-2">Letzte 10 Sessions</p>
                  <div className="grid gap-1.5">
                    {detail.recentSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                      >
                        <span className="text-xs text-white/55">{s.category}</span>
                        <div className="flex gap-4 text-xs">
                          <span className="text-white/45 tabular-nums">{s.minutes} Min.</span>
                          <span className="text-white/28">{fmtDate(s.startTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.recentSessions.length === 0 && (
                <p className="text-xs text-white/25 italic">Noch keine Sessions aufgezeichnet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
