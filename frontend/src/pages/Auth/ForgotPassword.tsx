import { useState }           from 'react';
import { Link }               from 'react-router-dom';
import { useForm }            from 'react-hook-form';
import { zodResolver }        from '@hookform/resolvers/zod';
import { z }                  from 'zod';
import apiClient              from '../../services/apiClient';

const schema = z.object({
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch {
      // Generischer Fehler — spezifische Fehler verraten User-Enumeration
      setServerError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    }
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
            Passwort vergessen?
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-3)] mt-1">
            Wir schicken dir einen Reset-Link
          </p>
        </div>

        {/* Erfolgsansicht */}
        {submitted ? (
          <div className="card text-center py-8">
            <div className="w-12 h-12 bg-[var(--bg-3)] rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-[var(--text)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text)] mb-2">E-Mail gesendet</p>
            <p className="text-[0.8125rem] text-[var(--text-3)] leading-relaxed px-4">
              Falls diese E-Mail-Adresse bei uns registriert ist, erhältst du in Kürze einen Link zum Zurücksetzen deines Passworts.
            </p>
            <p className="text-[0.75rem] text-[var(--text-3)] mt-4">
              Der Link ist <strong>1 Stunde</strong> gültig.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">E-Mail-Adresse</label>
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
                  Wird gesendet…
                </>
              ) : (
                'Reset-Link senden'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-[0.8125rem] text-[var(--text-3)] mt-6">
          <Link to="/login" className="text-[var(--accent)] hover:underline">
            ← Zurück zur Anmeldung
          </Link>
        </p>

      </div>
    </div>
  );
}
