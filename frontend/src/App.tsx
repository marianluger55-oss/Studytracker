/*
 * App.tsx
 * ─────────────────────────────────────────────────────────────
 * Wurzelkomponente — steuert Layout, Theme, Auth und Navigation.
 *
 * Routing-Architektur:
 *  /login, /register      → Öffentlich (kein Layout, kein Auth-Check)
 *  Alle anderen Routen    → Durch ProtectedRoute geschützt (brauchen Login)
 *
 * TanStack Query:
 *  QueryClientProvider umschließt die gesamte App — alle Komponenten
 *  können useQuery/useMutation ohne eigenes Setup verwenden.
 *
 * AuthInitializer:
 *  Führt beim ersten Render den Refresh-Token-Versuch durch.
 *  Muss innerhalb von BrowserRouter liegen (braucht navigate).
 *
 * Lazy Loading:
 *  Seiten werden erst geladen wenn sie zum ersten Mal aufgerufen werden.
 *  Reduziert das initiale Bundle-Gewicht der App.
 *
 * ErrorBoundary:
 *  Fängt unbehandelte JS-Fehler innerhalb einer Route und zeigt
 *  eine Fallback-UI statt einem leeren Bildschirm.
 * ─────────────────────────────────────────────────────────────
 */

// Router-Importe
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// React Hooks + Lazy Loading
import { useEffect, useState, lazy, Suspense } from 'react';

// Framer Motion — für die globalen Aurora-Blobs im AppLayout
import { motion } from 'framer-motion';

// TanStack Query — Server-State-Verwaltung
import { QueryClientProvider } from '@tanstack/react-query';

// App-Infrastruktur
import { queryClient }     from './lib/queryClient';
import { useSettingsStore } from './store/settingsStore';

// Auth-Komponenten
import AuthInitializer    from './components/auth/AuthInitializer';
import ProtectedRoute     from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import ErrorBoundary      from './components/ErrorBoundary';
import TimerTick          from './components/TimerTick';

// Admin-Layout (eigenes Top-Navbar-Layout, ohne Sidebar)
import AdminLayout from './pages/Admin/AdminLayout';

// Navigations-Komponenten
import Sidebar        from './components/navigation/Sidebar';
import CookieConsent  from './components/ui/CookieConsent';

// Auth-Seiten werden direkt importiert (klein, immer benötigt)
import Login          from './pages/Auth/Login';
import Register       from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword  from './pages/Auth/ResetPassword';

// Landing Page: öffentliche Startseite — lazy geladen
const Landing = lazy(() => import('./pages/Landing/Landing'));

// App-Seiten werden lazy geladen — nur wenn die Route aufgerufen wird
// lazy(): lädt das Modul erst beim ersten Besuch dieser Route
const Dashboard  = lazy(() => import('./pages/Dashboard/Dashboard'));
const Timer      = lazy(() => import('./pages/Timer/Timer'));
const Statistics = lazy(() => import('./pages/Statistics/Statistics'));
const Categories = lazy(() => import('./pages/Categories/Categories'));
const Goals      = lazy(() => import('./pages/Goals/Goals'));
const Settings   = lazy(() => import('./pages/Settings/Settings'));

// Admin-Panel: eigene Website mit eigenem Login (komplett getrennt von der App)
const AdminLogin      = lazy(() => import('./pages/Admin/AdminLogin'));
const AdminDashboard  = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminUsers      = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminAuditLogs  = lazy(() => import('./pages/Admin/AdminAuditLogs'));

// Legal-Seiten (selten besucht → ideal für Lazy Loading)
const Impressum   = lazy(() => import('./pages/Legal/Impressum'));
const Datenschutz = lazy(() => import('./pages/Legal/Datenschutz'));
const AGB         = lazy(() => import('./pages/Legal/AGB'));

/* ── Lade-Fallback für Suspense ──────────────────────────────── */
// Wird kurz angezeigt während eine lazy-geladene Seite heruntergeladen wird
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      {/* Dezenter rotierender Ring — passt zum Design-System */}
      <div
        className="w-6 h-6 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Haupt-App-Layout (für eingeloggte Benutzer)
   ─────────────────────────────────────────────────────────────
   Enthält: Sidebar + Mobile-Topbar + Hauptinhalt
   ═══════════════════════════════════════════════════════════════ */
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  /* navOpen: steuert die Mobile-Sidebar (geöffnet/geschlossen) */
  const [navOpen, setNavOpen] = useState(false);

  /* Theme — steuert Aurora-Farben und Hintergrundfarbe */
  const isDark = useSettingsStore((s) => s.settings.theme === 'dark');

  /* Sidebar schließen wenn Route wechselt */
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  /* Scroll sperren wenn Mobile-Nav offen */
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  return (
    <div className="app-shell">

      {/* ── Globaler Hintergrund + Aurora-Blobs ─────────────────── */}
      {/* fixed -z-10: hinter Sidebar und Inhalt, niemals geklickt   */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-300"
        style={{ backgroundColor: isDark ? '#050508' : '#f5f3ff' }}
      />

      {/* Blob 1 — Pink — links oben */}
      <motion.div
        className="fixed rounded-full blur-[180px] pointer-events-none -z-10"
        style={{
          width: 700, height: 700,
          background: 'radial-gradient(ellipse, #ec4899 0%, transparent 70%)',
          left: '-18%', top: '-18%',
          opacity: isDark ? 0.08 : 0.06,
        }}
        animate={{ x: [0, 50, 0], y: [0, 35, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Blob 2 — Violett — rechts unten */}
      <motion.div
        className="fixed rounded-full blur-[160px] pointer-events-none -z-10"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)',
          right: '-12%', bottom: '-8%',
          opacity: isDark ? 0.07 : 0.05,
        }}
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Blob 3 — Indigo — Mitte */}
      <motion.div
        className="fixed rounded-full blur-[140px] pointer-events-none -z-10"
        style={{
          width: 450, height: 450,
          background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)',
          left: '45%', top: '48%',
          opacity: isDark ? 0.05 : 0.04,
        }}
        animate={{ x: [0, 30, 0], y: [0, 25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Dot-Grid — Farbe je nach Theme */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, rgba(255,255,255,.30) 1px, transparent 1px)'
            : 'radial-gradient(circle, rgba(124,58,237,.18) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: isDark ? 0.08 : 0.40,
        }}
      />

      {/* ── Mobile Topbar (nur < lg) ──────────────────────── */}
      <header className="mobile-topbar lg:hidden">
        {/* Hamburger-Button öffnet Sidebar */}
        <button
          type="button"
          aria-label="Navigation öffnen"
          onClick={() => setNavOpen(true)}
          className="p-2 -ml-1 rounded-md text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
            <path d="M2 4h12M2 8h12M2 12h8" strokeLinecap="round" />
          </svg>
        </button>

        <span className="text-[0.8125rem] font-semibold tracking-tight text-[var(--text)]">
          StudyTracker
        </span>

        {/* Platzhalter für optische Symmetrie */}
        <div className="w-8" aria-hidden="true" />
      </header>

      {/* ── Sidebar ──────────────────────────────────────── */}
      <Sidebar isOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* ── Backdrop (Mobile) ────────────────────────────── */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Hauptinhalt ──────────────────────────────────── */}
      <main className="flex-1 pt-12 lg:pt-8 lg:ml-48 pb-5 lg:pb-8 px-4 sm:px-6 lg:px-10 min-w-0">
        {children}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Innere App (hat Router-Kontext — braucht useLocation)
   ═══════════════════════════════════════════════════════════════ */
function AppInner() {
  /* Theme aus dem Store lesen — Migration in settingsStore.ts stellt sicher
     dass der Wert bereits 'dark' ist, auch wenn 'light' in localStorage stand */
  const theme = useSettingsStore((s) => s.settings.theme);

  /* body.dark setzen — useTheme im Sidebar tut dasselbe, aber dieser
     Effect läuft als Eltern-Komponente zuerst und verhindert einen Flash */
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <>
      {/* Auth-Initialisierung beim Start — prüft Refresh-Token-Cookie */}
      <AuthInitializer />
      {/* Timer-Takt: läuft global, überlebt jeden Routenwechsel */}
      <TimerTick />

      <Routes>
        {/* ── Landing Page (öffentlich) ────────────────── */}
        {/* Startseite für nicht eingeloggte Besucher */}
        <Route path="/" element={<Suspense fallback={<PageLoader />}><Landing /></Suspense>} />

        {/* ── Öffentliche Auth-Seiten (kein Layout) ─────── */}
        {/* Eigenes Layout ohne Sidebar — volle Seite für Login/Register */}
        <Route path="/login"           element={<Login />}          />
        <Route path="/register"        element={<Register />}       />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />}  />

        {/* ── Legal-Seiten (öffentlich zugänglich) ─────── */}
        {/* Suspense: zeigt PageLoader während das Modul geladen wird */}
        <Route path="/impressum"   element={<Suspense fallback={<PageLoader />}><Impressum /></Suspense>}   />
        <Route path="/datenschutz" element={<Suspense fallback={<PageLoader />}><Datenschutz /></Suspense>} />
        <Route path="/agb"         element={<Suspense fallback={<PageLoader />}><AGB /></Suspense>}         />

        {/* ── Admin-Panel (eigene Website, eigenes Login) ── */}
        {/* Komplett getrennt von der Haupt-App — eigenes Layout, eigener Auth-Flow */}
        <Route
          path="/admin/login"
          element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>}
        />
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users"     element={<AdminUsers />}     />
                    <Route path="audit"     element={<AdminAuditLogs />} />
                    {/* /admin → /admin/dashboard */}
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        {/* ── Geschützte App-Seiten (brauchen Login) ─────── */}
        {/* ProtectedRoute prüft Auth und zeigt Ladeindikator während Initialisierung */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                {/* Suspense auf Route-Ebene: einzelner Loader für alle geschützten Seiten */}
                <Suspense fallback={<PageLoader />}>
                  {/* ErrorBoundary: fängt Laufzeitfehler in Seiten-Komponenten */}
                  <ErrorBoundary>
                    <Routes>
                      {/* Dashboard ist jetzt unter /dashboard erreichbar */}
                      <Route path="/dashboard"  element={<Dashboard />}  />
                      <Route path="/timer"      element={<Timer />}       />
                      <Route path="/statistics" element={<Statistics />}  />
                      <Route path="/categories" element={<Categories />}  />
                      <Route path="/goals"      element={<Goals />}       />
                      <Route path="/settings"   element={<Settings />}    />
                      {/* / innerhalb des geschützten Bereichs → Dashboard */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      {/* Unbekannte Routen → Dashboard */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Wurzelkomponente — Provider-Baum
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    // QueryClientProvider muss die gesamte App umschließen
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter stellt Router-Kontext für alle Kind-Komponenten bereit */}
      <BrowserRouter>
        <AppInner />
        {/* DSGVO-Cookie-Consent — erscheint beim ersten Besuch */}
        <CookieConsent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
