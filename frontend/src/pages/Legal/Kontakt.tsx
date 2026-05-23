/*
 * pages/Legal/Kontakt.tsx
 * ─────────────────────────────────────────────────────────────
 * Öffentliche Kontakt- und Impressumsseite — kein Login erforderlich.
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

      {/* ── Antwortzeit ── */}
      <div className="card">
        <p className="card-title">Antwortzeit</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Anfragen werden in der Regel innerhalb von 2–3 Werktagen beantwortet.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════
          IMPRESSUM
          ════════════════════════════════════════════════════════ */}

      {/* ── Impressum-Header ── */}
      <div className="pt-4">
        <h2 className="page-title text-xl">Impressum</h2>
        <p className="page-subtitle">Angaben gemäß § 5 TMG</p>
      </div>

      {/* ── Betreiber ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">Betreiber & Verantwortlicher</p>
        <p className="font-medium text-[var(--text)]">Marian Luger</p>
        <p>Graben bei Haag 1</p>
        <p>3233 Kilb</p>
        <p>Österreich</p>
        <p className="pt-1">
          E-Mail:{' '}
          <a
            href="mailto:marian.luger@icloud.com"
            className="text-[var(--accent)] hover:underline"
          >
            marian.luger@icloud.com
          </a>
        </p>
      </div>

      {/* ── Verantwortlich für den Inhalt ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</p>
        <p className="font-medium text-[var(--text)]">Marian Luger</p>
        <p>Graben bei Haag 1, 3233 Kilb, Österreich</p>
      </div>

      {/* ── Haftung für Inhalte ── */}
      <div className="card">
        <p className="card-title">Haftung für Inhalte</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine
          Gewähr übernommen werden. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG
          für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
          verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
          nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
      </div>

      {/* ── Haftung für Links ── */}
      <div className="card">
        <p className="card-title">Haftung für Links</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte
          wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
          keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
          jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten
          Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
          überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
          erkennbar.
        </p>
      </div>

      {/* ── Urheberrecht ── */}
      <div className="card">
        <p className="card-title">Urheberrecht</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
          unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
          Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
          Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors
          bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten,
          nicht kommerziellen Gebrauch gestattet.
        </p>
      </div>

      {/* ── Datenschutz ── */}
      <div className="card">
        <p className="card-title">Datenschutz</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Ausführliche Informationen zur Verarbeitung deiner personenbezogenen Daten
          findest du in unserer{' '}
          <a href="/datenschutz" className="text-[var(--accent)] hover:underline">
            Datenschutzerklärung
          </a>
          .
        </p>
      </div>

      {/* ── Online-Streitbeilegung ── */}
      <div className="card">
        <p className="card-title">Online-Streitbeilegung (OS)</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung
          (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>

      {/* ── Stand ── */}
      <p className="text-xs text-[var(--text-3)]">Stand: Mai 2026</p>
    </div>
  );
}
