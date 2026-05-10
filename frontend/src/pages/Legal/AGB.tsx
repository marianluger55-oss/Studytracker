/*
 * pages/Legal/AGB.tsx
 * ─────────────────────────────────────────────────────────────
 * Allgemeine Geschäftsbedingungen.
 * Auch bei kostenlosen Apps empfohlen um Nutzungsbedingungen
 * klar zu definieren.
 * ─────────────────────────────────────────────────────────────
 */

const sections = [
  {
    title: '§ 1 Geltungsbereich',
    text:  'Diese Nutzungsbedingungen gelten für die Nutzung der Web-App StudyTracker. Mit der Nutzung der App erklärst du dich mit diesen Bedingungen einverstanden.',
  },
  {
    title: '§ 2 Leistungsbeschreibung',
    text:  'StudyTracker ist eine kostenlose Web-App zur persönlichen Lernzeit-Erfassung. Die App wird ohne Gewähr auf ununterbrochene Verfügbarkeit bereitgestellt.',
  },
  {
    title: '§ 3 Nutzerpflichten',
    text:  'Die App darf nur für den privaten, nicht-kommerziellen Gebrauch verwendet werden. Eine Weitergabe von Zugangsdaten oder ein missbräuchlicher Einsatz ist untersagt.',
  },
  {
    title: '§ 4 Haftungsbeschränkung',
    text:  'Für den Verlust lokal gespeicherter Daten (z. B. durch Browser-Cache-Löschung) übernehmen wir keine Haftung. Wir empfehlen regelmäßige Exporte über die Einstellungsseite.',
  },
  {
    title: '§ 5 Änderungen der AGB',
    text:  'Wir behalten uns das Recht vor, diese AGB jederzeit zu ändern. Änderungen werden auf dieser Seite veröffentlicht.',
  },
  {
    title: '§ 6 Anwendbares Recht',
    text:  'Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Betreibers.',
  },
];

export default function AGB() {
  return (
    <div className="space-y-5 max-w-xl">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">AGB</h1>
        <p className="page-subtitle">Allgemeine Geschäftsbedingungen</p>
      </div>

      {/* ── Paragraphen ── */}
      {sections.map((s) => (
        <div key={s.title} className="card">
          <p className="card-title">{s.title}</p>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">{s.text}</p>
        </div>
      ))}

      {/* ── Stand ── */}
      <p className="text-xs text-[var(--text-3)]">Stand: April 2026</p>
    </div>
  );
}
