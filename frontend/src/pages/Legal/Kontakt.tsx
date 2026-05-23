/*
 * pages/Legal/Kontakt.tsx
 * ─────────────────────────────────────────────────────────────
 * Öffentliche Kontaktseite — kein Login erforderlich.
 * ─────────────────────────────────────────────────────────────
 */

export default function Kontakt() {
  return (
    <div className="space-y-5 max-w-xl">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Kontakt</h1>
        <p className="page-subtitle">So erreichst du uns</p>
      </div>

      {/* ── Kontaktdaten ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">Betreiber</p>
        <p className="font-medium text-[var(--text)]">Marian Luger</p>
        <p>
          E-Mail:{' '}
          <a
            href="mailto:marian.luger@icloud.com"
            className="text-[var(--accent)] hover:underline"
          >
            marian.luger@icloud.com
          </a>
        </p>
      </div>

      {/* ── Hinweis ── */}
      <div className="card">
        <p className="card-title">Antwortzeit</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Anfragen werden in der Regel innerhalb von 2–3 Werktagen beantwortet.
        </p>
      </div>

      {/* ── Stand ── */}
      <p className="text-xs text-[var(--text-3)]">Stand: Mai 2026</p>
    </div>
  );
}
