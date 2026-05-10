import { useState }           from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm }            from 'react-hook-form';
import { zodResolver }        from '@hookform/resolvers/zod';
import { z }                  from 'zod';
import apiClient              from '../../services/apiClient';

const schema = z.object({
  password: z
    .string()
    .min(8,   'Mindestens 8 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
  confirmPassword: z.string().min(1, 'Passwort bestätigen'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path:    ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') ?? '';

  const [serverError, setServerError]   = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess]           = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Ungültiger / fehlender Token — sofort Hinweis zeigen
  if (!token || token.length !== 128) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm font-medium text-[var(--text)] mb-2">Ungültiger Reset-Link</p>
          <p className="text-[0.8125rem] text-[var(--text-3)] mb-5">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
          </p>
          <Link to="/forgot-password" className="btn-primary">
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccess(true);
      // Nach 3 Sekunden zur Login-Seite
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an.';
      setServerError(message);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-sm card text-center py-8">
          <div className="w-12 h-12 bg-[var(--bg-3)] rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-[var(--text)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text)] mb-2">Passwort geändert!</p>
          <p className="text-[0.8125rem] text-[var(--text-3)]">
            Du wirst in Kürze zur Anmeldung weitergeleitet…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 bg-[var(--accent)] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-[var(--shadow-md)]">
            <svg viewBox="0 0 20 20" fill="var(--accent-inv)" className="w-5 h-5" aria-hidden="true">
              <path d="M9 4.804A7.968 7.968 0 0 0 5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0 1 5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0 1 15 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0 0 15 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 1 1-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-[1.125rem] font-semibold tracking-tight text-[var(--text)]">
            Neues Passwort setzen
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-3)] mt-1">
            Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Zahl
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          {/* Neues Passwort */}
          <div>
            <label htmlFor="password" className="input-label">Neues Passwort</label>
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
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">{errors.password.message}</p>
            )}
          </div>

          {/* Passwort bestätigen */}
          <div>
            <label htmlFor="confirmPassword" className="input-label">Passwort bestätigen</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className="input"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-[0.75rem] text-red-500 mt-1" role="alert">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-[0.8125rem] text-red-600 dark:text-red-400" role="alert">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center py-2.5 text-[0.875rem] mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              'Passwort speichern'
            )}
          </button>
        </form>

        <p className="text-center text-[0.8125rem] text-[var(--text-3)] mt-6">
          <Link to="/login" className="text-[var(--accent)] hover:underline">
            ← Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </div>
  );
}
