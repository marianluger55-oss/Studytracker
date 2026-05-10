/*
 * pages/Legal/Impressum.tsx
 * ─────────────────────────────────────────────────────────────
 * Gesetzlich vorgeschriebenes Impressum (§ 5 TMG).
 * Pflichtangaben für alle gewerblichen Websites in Deutschland.
 * ─────────────────────────────────────────────────────────────
 */

export default function Impressum() {
  return (
    <div className="space-y-6 max-w-xl">
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
  );
}
