/*
 * pages/Legal/Impressum.tsx
 * ─────────────────────────────────────────────────────────────
 * Gesetzlich vorgeschriebenes Impressum (§ 5 TMG).
 * Pflichtangaben für alle gewerblichen Websites in Deutschland.
 * ─────────────────────────────────────────────────────────────
 */

export default function Impressum() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
    <div className="max-w-xl mx-auto space-y-6">
      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text)] transition-colors mb-2">
        ← Zurück zur Startseite
      </a>
      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Impressum</h1>
        <p className="page-subtitle">Angaben gemäß § 5 TMG</p>
      </div>

      {/* ── Betreiber ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">Betreiber</p>
        <p className="font-medium text-[var(--text)]">Marian Luger</p>
        <p>Graben bei Haag 1</p>
        <p>3233 Kilb</p>
        <p>Österreich</p>
      </div>

      {/* ── Kontakt ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">Kontakt</p>
        <p>
          E-Mail:{" "}
          <span className="text-[var(--text)]">marian.luger@icloud.com</span>
        </p>
      </div>

      {/* ── Haftungsausschluss ── */}
      <div className="card">
        <p className="card-title">Haftungsausschluss</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch
          keine Gewähr übernommen werden.
        </p>
      </div>
    </div>
    </div>
  );
}
