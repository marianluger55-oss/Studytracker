/*
 * components/auth/ProtectedRoute.tsx
 * Schützt Seiten vor unauthentifizierten Zugriffen.
 *
 * isInitialized = false → Ladeindikator (App prüft noch Auth via Refresh-Cookie)
 * isAuthenticated = false → Weiterleitung zu /login
 * isAuthenticated = true → Seite normal rendern
 *
 * Warum isInitialized?
 *  Beim Seitenneuladen ist der Access-Token im Speicher null.
 *  Ohne isInitialized würde die Seite sofort nach /login weiterleiten,
 *  bevor der Refresh-Token-Versuch abgeschlossen ist.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ── Ladeindikator ───────────────────────────────────────────── */
function AuthLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--bg)]"
      aria-label="Wird geladen"
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}

/* ── ProtectedRoute ──────────────────────────────────────────── */
interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized   = useAuthStore((s) => s.isInitialized);
  const location        = useLocation();

  /* Noch nicht initialisiert → Auth-Prüfung läuft noch */
  if (!isInitialized) return <AuthLoader />;

  /* Nicht eingeloggt → zur Login-Seite, mit "from" für Rück-Redirect */
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
