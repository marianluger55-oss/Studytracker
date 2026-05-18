/*
 * pages/Auth/Login.tsx
 * ─────────────────────────────────────────────────────────────
 * Login-Seite im Dark-Design der Landing Page.
 * Gleiche Validierungslogik, neues visuelles Design.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

/* ── Shimmer-Button CSS (gleich wie Landing Page) ────────────── */
const SHIMMER_CSS = `
  @keyframes shimmerBtn {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .shimmer-btn {
    background: linear-gradient(90deg,#f472b6,#c084fc,#818cf8,#c084fc,#f472b6);
    background-size: 300% 100%;
    animation: shimmerBtn 4s linear infinite;
  }
  * { cursor: none !important; }
  @keyframes cursorPing {
    0%,100%{opacity:1;}50%{opacity:.6;}
  }
`;

/* ── Validierungsschema (unverändert) ────────────────────────── */
const loginSchema = z.object({
  email:    z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ── Custom Cursor (mini) ────────────────────────────────────── */
// Gleicher Cursor wie Landing Page — konsistentes Erlebnis
function MiniCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);
  useState(() => {
    const move = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); };
    const leave = () => setVisible(false);
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); document.removeEventListener('mouseleave', leave); };
  });
  return (
    <div
      style={{
        position: 'fixed', top: pos.y, left: pos.x,
        transform: 'translate(-50%,-50%)',
        width: 12, height: 12, borderRadius: '50%',
        background: 'white', mixBlendMode: 'difference',
        opacity: visible ? 1 : 0, pointerEvents: 'none', zIndex: 9999,
        transition: 'opacity .15s',
      }}
    />
  );
}

/* ── Login-Seite ─────────────────────────────────────────────── */
export default function Login() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword]  = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const error = (err as { response?: { data?: { error?: { message?: string } | string } } })
        ?.response?.data?.error;
      const message = typeof error === 'string'
        ? error
        : error?.message ?? 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
      setServerError(message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] px-4">
      <style>{SHIMMER_CSS}</style>
      <MiniCursor />

      {/* ── Aurora-Blobs ──────────────────────────────────────── */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.12] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #ec4899 0%, transparent 70%)', left: '-15%', top: '-10%' }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[130px] opacity-[0.10] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)', right: '-10%', bottom: '-10%' }}
        animate={{ x: [0, -25, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Dot-Grid ────────────────────────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      {/* ── Formular-Karte ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm z-10"
      >
        {/* Glühen hinter der Karte */}
        <div className="absolute inset-0 blur-2xl opacity-20 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-3xl pointer-events-none" />

        <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-7">

          {/* ── Logo + Überschrift ────────────────────────────── */}
          <div className="text-center mb-7">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -3 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4"
            >
              <span className="text-white text-lg font-black">S</span>
            </motion.div>
            <h1 className="text-xl font-black text-white tracking-tight">Willkommen zurück</h1>
            <p className="text-sm text-white/40 mt-1">Melde dich an, um weiterzulernen</p>
          </div>

          {/* ── Formular ─────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* E-Mail */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/50 mb-1.5">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="deine@email.de"
                aria-invalid={!!errors.email}
                {...register('email')}
                className="w-full bg-white/5 border border-white/12 text-white placeholder-white/20 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
              {errors.email && (
                <p className="text-[11px] text-red-400 mt-1.5" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Passwort */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-medium text-white/50">
                  Passwort
                </label>
                <Link to="/forgot-password" className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors">
                  Vergessen?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                  className="w-full bg-white/5 border border-white/12 text-white placeholder-white/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 0 1-8.516-1.199A10.004 10.004 0 0 1 2.4 11.5a1.651 1.651 0 0 1 0-1.185 10.003 10.003 0 0 1 4.552-5.002l1.415 1.415a4 4 0 0 0 2.38 7.201Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-400 mt-1.5" role="alert">{errors.password.message}</p>
              )}
            </div>

            {/* Server-Fehler */}
            {serverError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-[12px] text-red-400" role="alert">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="shimmer-btn w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg mt-1 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728 2.121 2.121m6.486 6.486 2.121 2.121" />
                  </svg>
                  Wird angemeldet…
                </>
              ) : 'Anmelden'}
            </motion.button>
          </form>

          {/* ── Registrierungs-Link ───────────────────────────── */}
          <p className="text-center text-xs text-white/35 mt-5">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
              Jetzt registrieren
            </Link>
          </p>

        </div>
      </motion.div>

      {/* ── Back to Landing ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="absolute top-5 left-5 z-10"
      >
        <Link to="/" className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors text-sm">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </Link>
      </motion.div>
    </div>
  );
}
