/*
 * pages/Legal/Datenschutz.tsx
 * ─────────────────────────────────────────────────────────────
 * Datenschutzerklärung gemäß DSGVO / GDPR.
 * ─────────────────────────────────────────────────────────────
 */

export default function Datenschutz() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
    <div className="max-w-xl mx-auto space-y-5">
      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text)] transition-colors mb-2">
        ← Zurück zur Startseite
      </a>

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Datenschutz</h1>
        <p className="page-subtitle">Datenschutzerklärung gemäß DSGVO</p>
      </div>

      {/* ── 1. Verantwortlicher ── */}
      <div className="card space-y-1 text-sm text-[var(--text-2)]">
        <p className="card-title">1. Verantwortlicher</p>
        <p>
          Verantwortlicher im Sinne der DSGVO (Art. 4 Nr. 7):
        </p>
        <p className="font-medium text-[var(--text)]">Marian Luger</p>
        <p>Graben bei Haag 1, 3233 Kilb, Österreich</p>
        <p>
          E-Mail:{' '}
          <a href="mailto:marian.luger@icloud.com" className="text-[var(--accent)] hover:underline">
            marian.luger@icloud.com
          </a>
        </p>
      </div>

      {/* ── 2. Welche Daten wir verarbeiten ── */}
      <div className="card">
        <p className="card-title">2. Welche Daten wir verarbeiten</p>
        <div className="space-y-3 text-sm text-[var(--text-2)] leading-relaxed">
          <div>
            <p className="font-medium text-[var(--text)] mb-0.5">Registrierungsdaten</p>
            <p>Bei der Erstellung eines Kontos speichern wir deinen Benutzernamen, deine E-Mail-Adresse und ein verschlüsseltes Passwort (bcrypt-Hash, nie im Klartext).</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)] mb-0.5">Lern- und Nutzungsdaten</p>
            <p>Alle von dir erfassten Lernsessions (Startzeit, Dauer, Kategorie), Kategorien, Ziele und App-Einstellungen werden auf unserem Server in einer PostgreSQL-Datenbank gespeichert.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)] mb-0.5">Authentifizierungs-Cookie</p>
            <p>Nach dem Login wird ein HTTP-only Refresh-Token als Cookie gesetzt. Dieser Cookie ist nicht durch JavaScript auslesbar, enthält keine personenbezogenen Daten und dient ausschließlich der sicheren Sitzungsverwaltung.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)] mb-0.5">Server-Logs</p>
            <p>Bei jedem Zugriff auf unsere API kann die IP-Adresse im Server-Log erfasst werden. Diese Daten werden für maximal 7 Tage zur Fehlerdiagnose aufbewahrt.</p>
          </div>
        </div>
      </div>

      {/* ── 3. Zweck und Rechtsgrundlage ── */}
      <div className="card">
        <p className="card-title">3. Zweck und Rechtsgrundlage</p>
        <div className="space-y-3 text-sm text-[var(--text-2)] leading-relaxed">
          <p>
            Die Verarbeitung deiner Daten erfolgt zur Erbringung des Dienstes StudyTracker (Darstellung deines persönlichen Lernfortschritts) auf Grundlage von{' '}
            <span className="text-[var(--text)]">Art. 6 Abs. 1 lit. b DSGVO</span> (Vertragserfüllung).
          </p>
          <p>
            Für technisch nicht notwendige Cookies (z. B. bei zukünftigen Analysen) holen wir deine ausdrückliche Einwilligung gemäß{' '}
            <span className="text-[var(--text)]">Art. 6 Abs. 1 lit. a DSGVO</span> ein.
          </p>
          <p>
            Eine Weitergabe deiner Daten an Dritte findet nicht statt.
          </p>
        </div>
      </div>

      {/* ── 4. Speicherdauer ── */}
      <div className="card">
        <p className="card-title">4. Speicherdauer</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Deine Daten werden so lange gespeichert, wie dein Konto aktiv ist. Nach einer
          Konto-Löschung werden alle personenbezogenen Daten innerhalb von 30 Tagen
          endgültig gelöscht. Server-Logs werden nach spätestens 7 Tagen automatisch
          überschrieben.
        </p>
      </div>

      {/* ── 5. Cookies ── */}
      <div className="card">
        <p className="card-title">5. Cookies</p>
        <div className="space-y-2 text-sm text-[var(--text-2)] leading-relaxed">
          <p>Wir verwenden ausschließlich technisch notwendige Cookies:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              <span className="text-[var(--text)]">refresh_token</span> — HTTP-only, Secure,
              SameSite=Strict. Gültigkeit: 7 Tage. Dient zur automatischen Anmeldung
              ohne Passworteingabe.
            </li>
          </ul>
          <p>
            Es werden keine Tracking-Cookies, Werbe-Cookies oder Cookies von Drittanbietern
            gesetzt.
          </p>
        </div>
      </div>

      {/* ── 6. Deine Rechte ── */}
      <div className="card">
        <p className="card-title">6. Deine Rechte (Art. 15–21 DSGVO)</p>
        <ul className="mt-1 space-y-1.5 text-sm text-[var(--text-2)] leading-relaxed list-disc list-inside pl-1">
          <li><span className="text-[var(--text)]">Auskunft</span> — du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen</li>
          <li><span className="text-[var(--text)]">Berichtigung</span> — unrichtige Daten können korrigiert werden</li>
          <li><span className="text-[var(--text)]">Löschung</span> — du kannst die Löschung deines Kontos und aller Daten verlangen</li>
          <li><span className="text-[var(--text)]">Einschränkung</span> — du kannst die Verarbeitung einschränken lassen</li>
          <li><span className="text-[var(--text)]">Datenportabilität</span> — Export deiner Daten über die Einstellungsseite</li>
          <li><span className="text-[var(--text)]">Widerspruch</span> — du kannst der Verarbeitung widersprechen</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--text-2)]">
          Anfragen richtest du an:{' '}
          <a href="mailto:marian.luger@icloud.com" className="text-[var(--accent)] hover:underline">
            marian.luger@icloud.com
          </a>
        </p>
      </div>

      {/* ── 7. Beschwerderecht ── */}
      <div className="card">
        <p className="card-title">7. Beschwerderecht bei der Aufsichtsbehörde</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Du hast das Recht, dich bei der zuständigen Datenschutzbehörde zu beschweren.
          In Österreich ist dies die{' '}
          <a
            href="https://www.dsb.gv.at"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            Datenschutzbehörde (DSB)
          </a>
          , Barichgasse 40–42, 1030 Wien.
        </p>
      </div>

      {/* ── 8. Änderungen ── */}
      <div className="card">
        <p className="card-title">8. Änderungen dieser Erklärung</p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen.
          Die jeweils aktuelle Version ist unter{' '}
          <a href="/datenschutz" className="text-[var(--accent)] hover:underline">
            /datenschutz
          </a>{' '}
          abrufbar. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.
        </p>
      </div>

      {/* ── Stand ── */}
      <p className="text-xs text-[var(--text-3)]">Stand: Mai 2026</p>
    </div>
    </div>
  );
}
