/*
 * pages/Admin/AdminLayout.tsx
 * Eigenständiges Layout für das Admin-Panel.
 * Kein Sidebar, kein App-Design — klare, professionelle Oberfläche.
 */

import { NavLink, useNavigate }  from 'react-router-dom';
import { useAuthStore }          from '../../store/authStore';
import apiClient                 from '../../services/apiClient';

const navItems = [
  {
    to: '/admin/dashboard',
    label: 'Übersicht',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
        <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
        <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
        <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Benutzer',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <circle cx="6" cy="5" r="2.5" />
        <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round" />
        <path d="M11 7.5a2 2 0 100-4M15 13c0-2.2-1.7-4-4-4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);

  async function handleLogout() {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    useAuthStore.getState().clearAuth();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">

      {/* ── Top-Navbar ───────────────────────────────────────────── */}
      <header className="border-b border-white/8 bg-white/[0.02] backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div
              className="w-6 h-6 rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)' }}
            />
            <span className="text-sm font-bold tracking-tight text-white/90">
              Admin
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-xs text-white/40">StudyTracker</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 hidden sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Seiteninhalt ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
