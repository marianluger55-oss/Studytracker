/*
 * components/navigation/Sidebar.tsx
 * ─────────────────────────────────────────────────────────────
 * Linke Navigationsleiste — responsiv für Desktop und Mobile.
 * Dark-Design: Glassmorphism-Sidebar, Purple-Akzent, Shimmer-Logo.
 * ─────────────────────────────────────────────────────────────
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme }        from '../../hooks/useTheme';
import { useSessionStore } from '../../store/sessionStore';
import { useAuthStore }    from '../../store/authStore';
import { formatTimer }     from '../../utils/time';

/* ── Props ───────────────────────────────────────────────────── */
interface SidebarProps {
  isOpen:  boolean;    /* true = Mobile-Sidebar aufgeklappt */
  onClose: () => void; /* Callback: schließt die Mobile-Sidebar */
}

/* ── Navigationsgruppen ─────────────────────────────────────── */
const navGroups = [
  {
    label: null,
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
            <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
            <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
            <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
          </svg>
        ),
      },
      {
        to: '/timer',
        label: 'Timer',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <circle cx="8" cy="9" r="5.5" />
            <path d="M8 6v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 1.5h4M8 1.5v2" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Analyse',
    items: [
      {
        to: '/statistics',
        label: 'Statistiken',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M2 13.5V9m4 4.5V5.5m4 8V7.5m4 6V3" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        to: '/goals',
        label: 'Ziele',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <circle cx="8" cy="8" r="6.5" />
            <circle cx="8" cy="8" r="3.5" />
            <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Verwaltung',
    items: [
      {
        to: '/categories',
        label: 'Fächer',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M5 4h9M5 8h9M5 12h6" strokeLinecap="round" />
            <circle cx="2" cy="4" r="0.75" fill="currentColor" stroke="none" />
            <circle cx="2" cy="8" r="0.75" fill="currentColor" stroke="none" />
            <circle cx="2" cy="12" r="0.75" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
      {
        to: '/settings',
        label: 'Einstellungen',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v1.75M8 12.75V14.5M14.5 8h-1.75M3.25 8H1.5M12.36 3.64l-1.24 1.24M4.88 11.12l-1.24 1.24M12.36 12.36l-1.24-1.24M4.88 4.88L3.64 3.64" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
];

/* ── Rechtliche Links ────────────────────────────────────────── */
const legalLinks = [
  { to: '/impressum',   label: 'Impressum'   },
  { to: '/datenschutz', label: 'Datenschutz' },
  { to: '/agb',         label: 'AGB'         },
];

/* ── Komponente ──────────────────────────────────────────────── */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const { activeSession, isRunning } = useSessionStore();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  return (
    /* Sidebar-Wrapper: fixed links, volle Höhe, z-50 über Backdrop */
    /* Mobile: -translate-x-full (versteckt) → translate-x-0 (offen wenn isOpen) */
    /* Desktop: lg:translate-x-0 — immer sichtbar */
    <aside
      className={[
        'sidebar fixed left-0 top-0 h-full w-48 flex flex-col z-50',
        'transition-transform duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      ].join(' ')}
    >

      {/* ── Kopfbereich ──────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">

          {/* Logo — Shimmer-Gradient-Punkt + App-Name */}
          <div className="flex items-center gap-2">
            {/* Kleiner Gradient-Punkt als Logo-Symbol */}
            <div
              className="w-[18px] h-[18px] rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)' }}
            />
            <p className="text-[13px] font-bold tracking-tight text-[var(--text)] leading-none">
              StudyTracker
            </p>
          </div>

          {/* Schließen-Button — nur auf Mobile */}
          <button
            type="button"
            aria-label="Navigation schließen"
            onClick={onClose}
            className="lg:hidden p-1 -mr-1 rounded-md text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="sidebar-divider mb-3" />

      {/* ── Live-Session-Indikator ───────────────────────────── */}
      {/* Wird nur gerendert wenn eine Session aktiv ist */}
      {activeSession && (
        <div className="px-2 mb-3">
          {/* Klickbar → navigiert zur Timer-Seite */}
          <button
            type="button"
            onClick={() => { navigate('/timer'); onClose(); }}
            className="session-live w-full text-left rounded-lg px-3 py-2.5 transition-colors"
          >
            {/* Zeile 1: Pulsierender Punkt + Zeitanzeige */}
            <div className="flex items-center gap-2">
              {/* Violetter Puls-Punkt wenn läuft, gedämpft wenn pausiert */}
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isRunning ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-3)]'
              }`} />
              {/* Zeitanzeige in Akzentfarbe */}
              <span className="text-[11px] font-mono font-semibold tabular-nums text-[var(--accent)]">
                {formatTimer(activeSession.elapsed)}
              </span>
              {/* Pausiert-Label wenn nicht läuft */}
              {!isRunning && (
                <span className="text-[9px] text-[var(--text-3)] uppercase tracking-wide ml-auto">
                  Pause
                </span>
              )}
            </div>
            {/* Zeile 2: Fachname — truncate verhindert Überlauf */}
            <p className="text-[10px] text-[var(--text-3)] mt-0.5 truncate">
              {activeSession.categoryName}
            </p>
          </button>
        </div>
      )}

      {/* ── Navigationslinks ─────────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {/* Gruppenbezeichnung — nur wenn vorhanden */}
            {group.label && (
              <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[0.07em] px-2 mb-1">
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  // end=true beim Dashboard-Link: verhindert "aktiv" auf allen Unterseiten
                  end={item.to === '/dashboard'}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  <span className="text-[13px]">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Admin-Link (nur für Admins) ──────────────────────── */}
      {isAdmin && (
        <div className="px-2 mb-2">
          <div className="sidebar-divider mb-2" />
          <NavLink
            to="/admin/dashboard"
            onClick={onClose}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
              <circle cx="8" cy="5" r="2.5" />
              <path d="M2 13.5c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" />
              <path d="M11.5 9.5l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13px]">Admin</span>
          </NavLink>
        </div>
      )}

      {/* ── Rechtliche Links ─────────────────────────────────── */}
      <div className="px-3 py-3">
        <div className="sidebar-divider mb-3" />
        {/* Drei Links nebeneinander — sehr klein und dezent */}
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {legalLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `text-[10px] transition-colors ${
                  isActive
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Theme-Toggle ─────────────────────────────────────── */}
      <div className="px-2 pb-4">
        <div className="sidebar-divider mb-3" />

        <button
          type="button"
          aria-label="Erscheinungsbild wechseln"
          onClick={toggle}
          className="theme-switch"
        >
          <div className={`switch-track ${isDark ? 'on' : ''}`}>
            <div className="switch-thumb" />
          </div>

          <span className="text-[12px] font-medium text-[var(--text-3)]">
            {isDark ? 'Dunkel' : 'Hell'}
          </span>

          <span className="ml-auto text-[var(--text-3)]">
            {isDark ? (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                <path d="M12.5 7.8A5.5 5.5 0 116.2 1.5 4.3 4.3 0 0012.5 7.8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                <circle cx="7" cy="7" r="3" />
                <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.1 1.1M10 10l1.1 1.1M2.9 11.1L4 10M10 4l1.1-1.1" strokeLinecap="round" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </aside>
  );
}
