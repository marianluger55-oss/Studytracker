/*
 * pages/Auth/Register.tsx
 * ─────────────────────────────────────────────────────────────
 * Registrierungs-Seite im Dark-Design der Landing Page.
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

/* ── Shimmer-CSS (identisch mit Login) ───────────────────────── */
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
`;

/* ── Passwort-Anforderungen ──────────────────────────────────── */
const passwordRules = [
  { key: 'length', label: 'Mindestens 8 Zeichen',      test: (v: string) => v.length >= 8 },
  { key: 'upper',  label: 'Mindestens 1 Großbuchstabe', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'number', label: 'Mindestens 1 Zahl',          test: (v: string) => /\d/.test(v) },
];

/* ── Validierungsschema (unverändert) ────────────────────────── */
const registerSchema = z.object({
  username: z.string().min(2, 'Name mindestens 2 Zeichen').max(50, 'Name maximal 50 Zeichen')
    .regex(/^[a-zA-ZÄäÖöÜüß\s\-'.]+$/, 'Name enthält ungültige Zeichen'),
  email:    z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Mindestens 8 Zeichen')
    .regex(/[A-Z]/, 'Mindestens 1 Großbuchstabe')
    .regex(/\d/, 'Mindestens 1 Zahl'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

/* ── Custom Cursor ───────────────────────────────────────────── */
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
    <div style={{
      position: 'fixed', top: pos.y, left: pos.x,
      transform: 'translate(-50%,-50%)',
      width: 12, height: 12, borderRadius: '50%',
      background: 'white', mixBlendMode: 'difference',
      opacity: visible ? 1 : 0, pointerEvents: 'none', zIndex: 9999,
      transition: 'opacity .15s',
    }} />
  );
}

/* ── Register-Seite ─────────────────────────────────────────── */
export default function Register() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const passwordValue = watch('password', '');

  async function onSubmit(data: RegisterForm) {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.username);
    } catch (err: unknown) {
      const error = (err as { response?: { data?: { error?: { message?: string } | string } } })
        ?.response?.data?.error;
      const message = typeof error === 'string'
        ? error
        : error?.message ?? 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      setServerError(message);
    }
  }

  /* ── Eye-Icon (wiederverwendbar) ─────────────────────────── */
  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 0 1-8.516-1.199A10.004 10.004 0 0 1 2.4 11.5a1.651 1.651 0 0 1 0-1.185 10.003 10.003 0 0 1 4.552-5.002l1.415 1.415a4 4 0 0 0 2.38 7.201Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] px-4 py-10">
      <style>{SHIMMER_CSS}</style>
      <MiniCursor />

      {/* ── Aurora-Blobs ─────────────────────────────────────── */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.10] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)', right: '-15%', top: '-15%' }}
        animate={{ x: [0, -30, 0], y: [0, 25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[130px] opacity-[0.09] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #ec4899 0%, transparent 70%)', left: '-10%', bottom: '-10%' }}
        animate={{ x: [0, 25, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Dot-Grid ──────────────────────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      {/* ── Formular-Karte ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm z-10"
      >
        {/* Glow */}
        <div className="absolute inset-0 blur-2xl opacity-20 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-3xl pointer-events-none" />

        <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-7">

          {/* ── Logo + Überschrift ────────────────────────────── */}
          <div className="text-center mb-6">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -3 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4"
            >
              <span className="text-white text-lg font-black">S</span>
            </motion.div>
            <h1 className="text-xl font-black text-white tracking-tight">Konto erstellen</h1>
            <p className="text-sm text-white/40 mt-1">Starte deine Lernreise heute</p>
          </div>

          {/* ── Formular ─────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Name */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-white/50 mb-1.5">
                Dein Name
              </label>
              <input
                id="username"
                type="text"
                autoComplete="name"
                placeholder="Max Mustermann"
                aria-invalid={!!errors.username}
                {...register('username')}
                className="w-full bg-white/5 border border-white/12 text-white placeholder-white/20 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
              {errors.username && (
                <p className="text-[11px] text-red-400 mt-1.5" role="alert">{errors.username.message}</p>
              )}
            </div>

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
              <label htmlFor="password" className="block text-xs font-medium text-white/50 mb-1.5">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                  className="w-full bg-white/5 border border-white/12 text-white placeholder-white/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Passwort-Anforderungs-Checkliste */}
              {passwordValue.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const met = rule.test(passwordValue);
                    return (
                      <li key={rule.key} className={`flex items-center gap-1.5 text-[11px] transition-colors ${met ? 'text-emerald-400' : 'text-white/30'}`}>
                        <svg viewBox="0 0 16 16" className="w-3 h-3 flex-shrink-0" fill="currentColor">
                          {met ? (
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          ) : (
                            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          )}
                        </svg>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Passwort bestätigen */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-white/50 mb-1.5">
                Passwort bestätigen
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                  className="w-full bg-white/5 border border-white/12 text-white placeholder-white/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showConfirm ? 'Passwort verbergen' : 'Passwort anzeigen'}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1.5" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* DSGVO-Hinweis */}
            <p className="text-[11px] text-white/25 leading-relaxed">
              Mit der Registrierung stimmst du unseren{' '}
              <Link to="/agb" className="text-pink-400/80 hover:text-pink-400 transition-colors">AGB</Link>
              {' '}und der{' '}
              <Link to="/datenschutz" className="text-pink-400/80 hover:text-pink-400 transition-colors">Datenschutzerklärung</Link>
              {' '}zu.
            </p>

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
                  Konto wird erstellt…
                </>
              ) : 'Konto erstellen'}
            </motion.button>
          </form>

          {/* ── Login-Link ───────────────────────────────────── */}
          <p className="text-center text-xs text-white/35 mt-5">
            Bereits registriert?{' '}
            <Link to="/login" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
              Jetzt anmelden
            </Link>
          </p>

        </div>
      </motion.div>

      {/* ── Back to Landing ──────────────────────────────────── */}
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
