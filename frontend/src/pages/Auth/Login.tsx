/*
 * pages/Auth/Login.tsx
 * ─────────────────────────────────────────────────────────────
 * Login-Seite — E-Mail + Passwort Formular.
 *
 * Verwendet:
 *  - React Hook Form: Formular-State und Validierung ohne Boilerplate
 *  - Zod: Schema-basierte Validierung mit präzisen Fehlermeldungen
 *  - @hookform/resolvers: Verbindet RHF mit Zod
 *  - useAuth: Kapselt die Login-Logik (API-Call + Redirect)
 *
 * UX-Prinzipien:
 *  - Fehler direkt unter dem fehlerhaften Feld (nicht oben)
 *  - Server-Fehler separat in einer Fehlerbox
 *  - Button disabled + Ladetext während des Logins
 *  - Passwort-Toggle für bessere Usability
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';          // Formular-Verwaltung
import { zodResolver } from '@hookform/resolvers/zod'; // Zod-Integration
import { z } from 'zod';                             // Validierungsschema
import { useAuth } from '../../hooks/useAuth';

/* ── Validierungsschema ──────────────────────────────────────── */
// Zod prüft die Eingaben bevor sie ans Backend gesendet werden.
// Fehler werden automatisch dem richtigen Feld zugeordnet.
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')       // Nicht leer
    .email('Ungültige E-Mail-Adresse'),       // Muss gültige E-Mail sein
  password: z
    .string()
    .min(1, 'Passwort ist erforderlich'),     // Nicht leer (Details prüft Backend)
});

// TypeScript-Typ aus dem Schema ableiten — kein doppeltes Tippen
type LoginForm = z.infer<typeof loginSchema>;

/* ── Login-Seite ─────────────────────────────────────────────── */
export default function Login() {
  const { login } = useAuth(); // Login-Aktion aus dem Auth-Hook

  // Fehler vom Server (z. B. "Ungültige Anmeldedaten")
  const [serverError, setServerError] = useState<string | null>(null);

  // Passwort-Sichtbarkeit umschalten
  const [showPassword, setShowPassword] = useState(false);

  /* ── React Hook Form Setup ──────────────────────────────────── */
  const {
    register,       // Verbindet Inputs mit dem Formular
    handleSubmit,   // Validiert vor dem Absenden
    formState: { errors, isSubmitting }, // Fehler und Lade-Status
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema), // Zod als Validator
    defaultValues: { email: '', password: '' },
  });

  /* ── Submit Handler ─────────────────────────────────────────── */
  async function onSubmit(data: LoginForm) {
    setServerError(null); // Alten Fehler löschen
    try {
      await login(data.email, data.password); // useAuth kümmert sich um Redirect
    } catch (err: unknown) {
      // Axios-Fehler haben err.response.data.error
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
      setServerError(message);
    }
  }

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    // Volle Seite, zentriert, Hintergrundfarbe aus Design-System
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">

        {/* ── App-Logo + Begrüßung ─────────────────────────── */}
        <div className="text-center mb-8">
          {/* Logo-Icon: Buch-Symbol in Petrol */}
          <div className="w-11 h-11 bg-[var(--accent)] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-[var(--shadow-md)]">
            <svg
              viewBox="0 0 20 20"
              fill="var(--accent-inv)"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M9 4.804A7.968 7.968 0 0 0 5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0 1 5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0 1 15 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0 0 15 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 1 1-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-[1.125rem] font-semibold tracking-tight text-[var(--text)]">
            Willkommen zurück
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-3)] mt-1">
            Melde dich an, um weiterzulernen
          </p>
        </div>

        {/* ── Formular ─────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          {/* E-Mail-Feld */}
          <div>
            <label htmlFor="email" className="input-label">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="deine@email.de"
              className="input"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {/* Fehlermeldung direkt unter dem Feld */}
            {errors.email && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Passwort-Feld */}
          <div>
            <div className="flex items-center justify-between mb-[0.3rem]">
              <label htmlFor="password" className="input-label" style={{ marginBottom: 0 }}>
                Passwort
              </label>
              {/* "Passwort vergessen" Link */}
              <Link
                to="/forgot-password"
                className="text-[0.6875rem] text-[var(--accent)] hover:underline"
              >
                Vergessen?
              </Link>
            </div>
            {/* Passwort-Input mit Sichtbarkeits-Toggle */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input pr-10" // pr-10: Platz für den Toggle-Button
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {/* Auge-Icon zum Umschalten */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? (
                  // Auge mit Strich (verborgen)
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                    <path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 0 1-8.516-1.199A10.004 10.004 0 0 1 2.4 11.5a1.651 1.651 0 0 1 0-1.185 10.003 10.003 0 0 1 4.552-5.002l1.415 1.415a4 4 0 0 0 2.38 7.201Z" />
                  </svg>
                ) : (
                  // Offenes Auge (sichtbar)
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Server-Fehlermeldung */}
          {serverError && (
            <div
              className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-[0.8125rem] text-red-600 dark:text-red-400"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {/* Submit-Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center py-2.5 text-[0.875rem] mt-2"
          >
            {isSubmitting ? (
              <>
                {/* Ladeanimation */}
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728 2.121 2.121m6.486 6.486 2.121 2.121"
                  />
                </svg>
                Wird angemeldet…
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* ── Registrierungs-Link ───────────────────────────── */}
        <p className="text-center text-[0.8125rem] text-[var(--text-3)] mt-6">
          Noch kein Konto?{' '}
          <Link
            to="/register"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Jetzt registrieren
          </Link>
        </p>

      </div>
    </div>
  );
}
