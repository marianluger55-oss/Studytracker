/*
 * pages/Admin/AdminLogin.tsx
 * Separate Login-Seite für das Admin-Panel.
 * Prüft nach dem Login ob der Account Admin-Rechte hat.
 */

import { useState, useEffect }   from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore }          from '../../store/authStore';
import apiClient                 from '../../services/apiClient';
import type { AuthPayload }      from '../../types';

export default function AdminLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(
    /* Fehlermeldung von AdminProtectedRoute weitergeben */
    (location.state as { error?: string } | null)?.error ?? null
  );
  const [loading, setLoading]   = useState(false);

  /* Schon eingeloggter Admin → direkt weiterleiten */
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await apiClient.post<AuthPayload>('/auth/login', { email, password });

      /* Kein Admin → Zugriff verweigern, sofort wieder ausloggen */
      if (data.user.role !== 'admin') {
        setError('Dieser Account hat keine Admin-Rechte.');
        /* Refresh-Token-Cookie wieder entfernen */
        await apiClient.post('/auth/logout').catch(() => {});
        setLoading(false);
        return;
      }

      setAuth(data.user, data.accessToken);
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('Ungültige Anmeldedaten.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">

      {/* Dezenter Hintergrund-Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-10 h-10 rounded-xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)' }}
          />
          <h1 className="text-xl font-bold text-white tracking-tight">Admin-Panel</h1>
          <p className="text-sm text-white/40 mt-1">StudyTracker — Nur für Administratoren</p>
        </div>

        {/* Login-Karte */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4"
        >
          {/* Fehler-Banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wide" htmlFor="admin-email">
              E-Mail
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wide" htmlFor="admin-password">
              Passwort
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #c084fc)' }}
          >
            {loading ? 'Wird geprüft…' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-6">
          Kein Admin-Account?{' '}
          <a href="/" className="text-white/40 hover:text-white/60 transition">Zurück zur App</a>
        </p>
      </div>
    </div>
  );
}
