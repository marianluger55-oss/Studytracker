/*
 * components/ui/CookieConsent.tsx
 * ─────────────────────────────────────────────────────────────
 * DSGVO-konformer Cookie-Consent-Banner.
 * Erscheint beim ersten Besuch und speichert die Entscheidung
 * in localStorage — wird danach nie wieder gezeigt.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/* localStorage-Key für die gespeicherte Entscheidung */
const CONSENT_KEY = 'cookie-consent';

export default function CookieConsent() {
  /* null = noch nicht entschieden, 'accepted'/'declined' = gespeichert */
  const [visible, setVisible] = useState(false);

  /* Beim Laden prüfen ob bereits eine Entscheidung gespeichert ist */
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  /* Entscheidung speichern und Banner schließen */
  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
          role="dialog"
          aria-label="Cookie-Einstellungen"
        >
          <div className="card p-4 shadow-2xl">
            <p className="text-[0.8125rem] font-semibold text-[var(--text)] mb-1">
              Cookies & Datenschutz
            </p>
            <p className="text-[0.75rem] text-[var(--text-3)] leading-relaxed mb-3">
              Wir verwenden nur technisch notwendige Cookies (Session-Token).
              Keine Tracking- oder Werbe-Cookies.{' '}
              <Link
                to="/datenschutz"
                className="text-[var(--accent)] hover:underline"
                onClick={() => setVisible(false)}
              >
                Datenschutzerklärung
              </Link>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={accept}
                className="btn-primary py-1.5 text-xs flex-1"
              >
                Akzeptieren
              </button>
              <button
                type="button"
                onClick={decline}
                className="btn-ghost py-1.5 text-xs flex-1"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
