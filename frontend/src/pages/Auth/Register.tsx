/*
 * pages/Auth/Register.tsx
 * ─────────────────────────────────────────────────────────────
 * Registrierungs-Seite — Name, E-Mail, Passwort, Bestätigung.
 *
 * Passwort-Anforderungen (produktionssicher):
 *  - Mindestens 8 Zeichen
 *  - Mindestens 1 Großbuchstabe
 *  - Mindestens 1 Zahl
 *  - Passwort und Bestätigung müssen übereinstimmen
 *
 * Alle Anforderungen werden in Echtzeit mit grünem Haken angezeigt —
 * das gibt dem Benutzer sofortiges Feedback ohne nervige Fehlermeldungen.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

/* ── Passwort-Anforderungen ──────────────────────────────────── */
// Wiederverwendbare Regeln für Anzeige + Validierung
const passwordRules = [
  { key: 'length',  label: 'Mindestens 8 Zeichen',     test: (v: string) => v.length >= 8 },
  { key: 'upper',   label: 'Mindestens 1 Großbuchstabe', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'number',  label: 'Mindestens 1 Zahl',          test: (v: string) => /\d/.test(v) },
];

/* ── Validierungsschema ──────────────────────────────────────── */
const registerSchema = z
  .object({
    username: z
      .string()
      .min(2,  'Name mindestens 2 Zeichen')
      .max(50, 'Name maximal 50 Zeichen')
      .regex(/^[a-zA-ZÄäÖöÜüß\s\-'.]+$/, 'Name enthält ungültige Zeichen'),
    email: z
      .string()
      .min(1, 'E-Mail ist erforderlich')
      .email('Ungültige E-Mail-Adresse'),
    password: z
      .string()
      .min(8,  'Mindestens 8 Zeichen')
      .regex(/[A-Z]/, 'Mindestens 1 Großbuchstabe')
      .regex(/\d/,    'Mindestens 1 Zahl'),
    confirmPassword: z.string(),
  })
  // Passwörter müssen übereinstimmen — Cross-field-Validierung
  .refine((data) => data.password === data.confirmPassword, {
    message:  'Passwörter stimmen nicht überein',
    path:     ['confirmPassword'], // Fehler dem confirmPassword-Feld zuweisen
  });

type RegisterForm = z.infer<typeof registerSchema>;

/* ── Register-Seite ──────────────────────────────────────────── */
export default function Register() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError]       = useState<string | null>(null);
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  const {
    register,
    handleSubmit,
    watch, // Aktuellen Feldwert beobachten — für Passwort-Anforderungsanzeige
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange', // Validierung bei jeder Änderung — sofortiges Feedback
  });

  // Passwort-Wert beobachten für die Anforderungs-Checkliste
  const passwordValue = watch('password', '');

  async function onSubmit(data: RegisterForm) {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.username);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      setServerError(message);
    }
  }

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-8">
      <div className="w-full max-w-sm">

        {/* ── Logo + Überschrift ────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 bg-[var(--accent)] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-[var(--shadow-md)]">
            <svg viewBox="0 0 20 20" fill="var(--accent-inv)" className="w-5 h-5" aria-hidden="true">
              <path d="M9 4.804A7.968 7.968 0 0 0 5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0 1 5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0 1 15 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0 0 15 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 1 1-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-[1.125rem] font-semibold tracking-tight text-[var(--text)]">
            Konto erstellen
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-3)] mt-1">
            Starte deine Lernreise heute
          </p>
        </div>

        {/* ── Formular ─────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          {/* Name */}
          <div>
            <label htmlFor="username" className="input-label">Dein Name</label>
            <input
              id="username"
              type="text"
              autoComplete="name"
              placeholder="Max Mustermann"
              className="input"
              aria-invalid={!!errors.username}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* E-Mail */}
          <div>
            <label htmlFor="email" className="input-label">E-Mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="deine@email.de"
              className="input"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Passwort */}
          <div>
            <label htmlFor="password" className="input-label">Passwort</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="input pr-10"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Passwort-Anforderungs-Checkliste */}
            {passwordValue.length > 0 && (
              <ul className="mt-2 space-y-1">
                {passwordRules.map((rule) => {
                  const met = rule.test(passwordValue); // Regel erfüllt?
                  return (
                    <li
                      key={rule.key}
                      className={`flex items-center gap-1.5 text-[0.6875rem] transition-colors ${
                        met ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'
                      }`}
                    >
                      {/* Haken wenn erfüllt, Kreis wenn nicht */}
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
            <label htmlFor="confirmPassword" className="input-label">
              Passwort bestätigen
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="input pr-10"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                aria-label={showConfirm ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* DSGVO-Hinweis */}
          <p className="text-[0.6875rem] text-[var(--text-3)] leading-relaxed">
            Mit der Registrierung stimmst du unseren{' '}
            <Link to="/agb" className="text-[var(--accent)] hover:underline">AGB</Link>
            {' '}und unserer{' '}
            <Link to="/datenschutz" className="text-[var(--accent)] hover:underline">Datenschutzerklärung</Link>
            {' '}zu.
          </p>

          {/* Server-Fehler */}
          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-[0.8125rem] text-red-600" role="alert">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center py-2.5 text-[0.875rem]"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728 2.121 2.121m6.486 6.486 2.121 2.121" />
                </svg>
                Konto wird erstellt…
              </>
            ) : (
              'Konto erstellen'
            )}
          </button>
        </form>

        {/* Login-Link */}
        <p className="text-center text-[0.8125rem] text-[var(--text-3)] mt-6">
          Bereits registriert?{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">
            Jetzt anmelden
          </Link>
        </p>

      </div>
    </div>
  );
}
