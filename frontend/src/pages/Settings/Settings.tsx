/*
 * pages/Settings/Settings.tsx
 *
 * Backend-Anbindung:
 *  - Profil (Username/E-Mail): PUT /api/users/profile via useMutation
 *  - Passwort ändern:          PUT /api/users/password via useMutation
 *  - Löscht Refresh-Sessions nach Passwortänderung automatisch (Backend)
 *
 * Timer-Einstellungen: lokal in settingsStore (keine Backend-Relevanz)
 * Daten-Export: client-seitig, kein Backend nötig
 */

import { useState, useEffect }         from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore }     from '../../store/authStore';
import { useSessions }      from '../../hooks/useSessions';
import { useCategories }    from '../../hooks/useCategories';
import apiClient            from '../../services/apiClient';
import type { User }        from '../../types';

/* ── Typen ──────────────────────────────────────────────────── */
interface ProfilePayload   { username?: string; email?: string }
interface PasswordPayload  { currentPassword: string; newPassword: string }

/* ── Timer-Felder ───────────────────────────────────────────── */
const TIMER_FIELDS = [
  { key: 'pomodoroLength', label: 'Pomodoro',    id: 'pomodoro-len' },
  { key: 'shortBreak',     label: 'Kurze Pause', id: 'short-break'  },
  { key: 'longBreak',      label: 'Lange Pause', id: 'long-break'   },
] as const;

export default function Settings() {
  const { settings, updateSettings } = useSettingsStore();
  const { user, setAuth, accessToken } = useAuthStore();
  const { sessions }   = useSessions();
  const { categories } = useCategories();
  const queryClient    = useQueryClient();

  /* ── Lokaler Profil-State (Pre-filled vom Auth-Store) ──── */
  const [username,   setUsername]   = useState(user?.username ?? '');
  const [email,      setEmail]      = useState(user?.email    ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /* ── Passwort-State ─────────────────────────────────────── */
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwMsg,      setPwMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  /* Wenn user sich ändert (z.B. nach Refresh) Felder synchronisieren */
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  /* ── Profil-Mutation ────────────────────────────────────── */
  const profileMutation = useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const { data } = await apiClient.put<{ user: User }>('/users/profile', payload);
      return data.user;
    },
    onSuccess: (updatedUser) => {
      /* Auth-Store mit aktualisierten Daten überschreiben */
      if (accessToken) setAuth(updatedUser, accessToken);
      /* Einstellungen für konsistente UI-Anzeige synchronisieren */
      updateSettings({ username: updatedUser.username, email: updatedUser.email });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setProfileMsg({ ok: true, text: 'Profil gespeichert.' });
      setTimeout(() => setProfileMsg(null), 3000);
    },
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err, 'Profil konnte nicht gespeichert werden.');
      setProfileMsg({ ok: false, text: msg });
    },
  });

  /* ── Passwort-Mutation ──────────────────────────────────── */
  const passwordMutation = useMutation({
    mutationFn: async (payload: PasswordPayload) => {
      await apiClient.put('/users/password', payload);
    },
    onSuccess: () => {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMsg({ ok: true, text: 'Passwort geändert. Bitte melde dich erneut an.' });
      /* Backend invalidiert alle Refresh-Tokens — Auth-State lokal clearen */
      setTimeout(() => {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }, 2000);
    },
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err, 'Passwort konnte nicht geändert werden.');
      setPwMsg({ ok: false, text: msg });
    },
  });

  /* ── Account-Löschen-State ──────────────────────────────── */
  const [deleteStep,      setDeleteStep]      = useState(0); // 0=hidden, 1=form
  const [deletePw,        setDeletePw]        = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteMsg,       setDeleteMsg]       = useState('');

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiClient.delete('/users/account', { data: { password: deletePw } }); },
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      window.location.href = '/';
    },
    onError: (err: unknown) => {
      setDeleteMsg(extractErrorMessage(err, 'Account konnte nicht gelöscht werden.'));
    },
  });

  const handleDeleteAccount = () => {
    if (!deletePw) { setDeleteMsg('Bitte Passwort eingeben.'); return; }
    if (!deleteConfirmed) { setDeleteMsg('Bitte bestätige, dass du die Konsequenzen verstehst.'); return; }
    deleteMutation.mutate();
  };

  /* ── Logout-All-Mutation ─────────────────────────────────── */
  const [logoutAllConfirm, setLogoutAllConfirm] = useState(false);
  const logoutAllMutation = useMutation({
    mutationFn: async () => { await apiClient.post('/auth/logout-all'); },
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    },
  });

  /* ── Handler ────────────────────────────────────────────── */
  const handleSaveProfile = () => {
    if (!username.trim()) {
      setProfileMsg({ ok: false, text: 'Benutzername darf nicht leer sein.' });
      return;
    }
    profileMutation.mutate({ username: username.trim(), email: email.trim() });
  };

  const handleChangePassword = () => {
    if (!currentPw || !newPw) {
      setPwMsg({ ok: false, text: 'Bitte alle Felder ausfüllen.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'Neue Passwörter stimmen nicht überein.' });
      return;
    }
    if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      setPwMsg({ ok: false, text: 'Passwort: min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl.' });
      return;
    }
    passwordMutation.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  /* ── Export (DSGVO Art. 20 — Datenportabilität) ────────── */
  // Lädt alle Daten vom Backend herunter (vollständiger Export)
  const [exportLoading, setExportLoading] = useState(false);
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data } = await apiClient.get('/users/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `studytracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  /* ── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      <div>
        <h1 className="page-title">Einstellungen</h1>
        <p className="page-subtitle">Konfiguriere deinen Tracker.</p>
      </div>

      {/* ── Profil ──────────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Profil</p>
        <div className="space-y-3 max-w-sm">
          <div>
            <label className="input-label" htmlFor="username">Benutzername</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Dein Name" className="input" />
          </div>
          <div>
            <label className="input-label" htmlFor="email">E-Mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de" className="input" />
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.ok ? 'text-green-500' : 'text-red-500'}`}>{profileMsg.text}</p>
          )}

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={profileMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {profileMutation.isPending ? 'Wird gespeichert…' : 'Profil speichern'}
          </button>
        </div>
      </div>

      {/* ── Passwort ─────────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Passwort ändern</p>
        <div className="space-y-3 max-w-sm">
          <div>
            <label className="input-label" htmlFor="current-pw">Aktuelles Passwort</label>
            <input id="current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="input" autoComplete="current-password" />
          </div>
          <div>
            <label className="input-label" htmlFor="new-pw">Neues Passwort</label>
            <input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input" autoComplete="new-password" />
          </div>
          <div>
            <label className="input-label" htmlFor="confirm-pw">Neues Passwort bestätigen</label>
            <input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input" autoComplete="new-password" />
          </div>

          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? 'text-green-500' : 'text-red-500'}`}>{pwMsg.text}</p>
          )}

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={passwordMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {passwordMutation.isPending ? 'Wird geändert…' : 'Passwort ändern'}
          </button>
        </div>
      </div>

      {/* ── Sicherheit ───────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Sicherheit</p>
        <p className="text-sm text-[var(--text-2)] mb-4">
          Meldet dich auf allen anderen Geräten ab und macht alle aktiven Sitzungen ungültig.
        </p>
        {logoutAllConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-2)]">Wirklich alle Geräte abmelden?</span>
            <button
              type="button"
              onClick={() => logoutAllMutation.mutate()}
              disabled={logoutAllMutation.isPending}
              className="btn-danger text-sm disabled:opacity-50"
            >
              {logoutAllMutation.isPending ? 'Wird abgemeldet…' : 'Ja, abmelden'}
            </button>
            <button
              type="button"
              onClick={() => setLogoutAllConfirm(false)}
              className="btn-ghost text-sm"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLogoutAllConfirm(true)}
            className="btn-ghost text-sm"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Von allen Geräten abmelden
          </button>
        )}
      </div>

      {/* ── Timer ────────────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Timer</p>
        <div className="flex gap-4 flex-wrap">
          {TIMER_FIELDS.map(({ key, label, id }) => (
            <div key={key}>
              <label className="input-label" htmlFor={id}>{label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={120}
                  value={settings[key]}
                  onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
                  className="input w-20"
                />
                <span className="text-xs text-[var(--text-3)] flex-shrink-0">Min</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daten ────────────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Daten</p>
        <p className="text-sm text-[var(--text-2)] mb-4">
          {sessions.length} Sessions · {categories.length} Fächer
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="btn-ghost disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
            <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2M8 3v8m-3-3l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {exportLoading ? 'Wird exportiert…' : 'Alle Daten exportieren (DSGVO)'}
        </button>
      </div>

      {/* ── Danger Zone: Account löschen ─────────────────────── */}
      <div className="card border border-red-500/20">
        <p className="card-title text-red-400">Danger Zone</p>
        <p className="text-sm text-[var(--text-2)] mb-4">
          Löscht deinen Account und alle Daten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        {deleteStep === 0 && (
          <button
            type="button"
            onClick={() => setDeleteStep(1)}
            className="btn-danger text-sm"
          >
            Account löschen
          </button>
        )}
        {deleteStep === 1 && (
          <div className="space-y-3 max-w-sm">
            <div>
              <label className="input-label" htmlFor="delete-pw">Passwort bestätigen</label>
              <input
                id="delete-pw"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="input"
                autoComplete="current-password"
                placeholder="Dein aktuelles Passwort"
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span className="text-sm text-[var(--text-2)]">
                Ich verstehe, dass alle meine Daten unwiderruflich gelöscht werden.
              </span>
            </label>
            {deleteMsg && (
              <p className="text-sm text-red-500">{deleteMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteMutation.isPending || !deleteConfirmed || !deletePw}
                className="btn-danger text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Wird gelöscht…' : 'Unwiderruflich löschen'}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteStep(0); setDeletePw(''); setDeleteConfirmed(false); setDeleteMsg(''); }}
                className="btn-ghost text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Über ─────────────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Über</p>
        <div className="space-y-1 text-sm text-[var(--text-2)]">
          <p>StudyTracker v1.0.0</p>
          <p>React · TypeScript · Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}

/* ── Hilfsfunktion: Fehlermeldung aus Axios-Error extrahieren ── */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return res?.data?.error?.message ?? fallback;
  }
  return fallback;
}
