/*
 * components/auth/AdminProtectedRoute.tsx
 * Schützt Admin-Routen: leitet zu /admin/login weiter wenn
 * der Benutzer nicht eingeloggt oder kein Admin ist.
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore }          from '../../store/authStore';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  /* Noch nicht initialisiert → kurz warten */
  if (!isInitialized) return null;

  /* Nicht eingeloggt → Admin-Login */
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  /* Eingeloggt aber kein Admin → auch zur Admin-Login-Seite */
  if (user?.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ error: 'Kein Admin-Zugriff.' }} replace />;
  }

  return <>{children}</>;
}
