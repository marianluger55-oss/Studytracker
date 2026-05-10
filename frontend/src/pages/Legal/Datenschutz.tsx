/*
 * pages/Legal/Datenschutz.tsx
 * ─────────────────────────────────────────────────────────────
 * Datenschutzerklärung gemäß DSGVO / GDPR.
 * Pflichtangabe für alle Websites die personenbezogene Daten
 * verarbeiten — gilt auch für lokale Speicherung (localStorage).
 * ─────────────────────────────────────────────────────────────
 */

/* ── Abschnittsdaten — außerhalb der Komponente da statisch ── */
const sections = [
  {
    title: '1. Verantwortlicher',
    text:  'Verantwortlicher im Sinne der DSGVO ist: Vorname Nachname, Musterstraße 1, 12345 Musterstadt. E-Mail: deine@email.de',
  },
  {
    title: '2. Welche Daten wir speichern',
    text:  'StudyTracker speichert ausschließlich Daten lokal in deinem Browser (localStorage). Es werden keine Daten an externe Server übertragen, solange du nicht eingeloggt bist. Gespeichert werden: Lernsessions (Dauer, Startzeit, Fach), Kategorien, Ziele und App-Einstellungen.',
  },
  {
    title: '3. Zweck der Datenverarbeitung',
    text:  'Die gespeicherten Daten dienen ausschließlich der Darstellung deines persönlichen Lernfortschritts innerhalb der App. Eine Weitergabe an Dritte findet nicht statt.',
  },
  {
    title: '4. Deine Rechte',
    text:  'Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner gespeicherten Daten. Du kannst alle lokalen Daten jederzeit über die Einstellungen exportieren oder über die Browserfunktion (localStorage leeren) löschen.',
  },
  {
    title: '5. Cookies',
    text:  'Diese App verwendet keine Tracking-Cookies. Der localStorage wird ausschließlich für App-Funktionen genutzt.',
  },
  {
    title: '6. Änderungen',
    text:  'Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils aktuelle Version ist auf dieser Seite abrufbar.',
  },
];

export default function Datenschutz() {
  return (
    <div className="space-y-5 max-w-xl">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Datenschutz</h1>
        <p className="page-subtitle">Datenschutzerklärung gemäß DSGVO</p>
      </div>

      {/* ── Abschnitte ── */}
      {sections.map((s) => (
        <div key={s.title} className="card">
          {/* Abschnittstitel als card-title */}
          <p className="card-title">{s.title}</p>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">{s.text}</p>
        </div>
      ))}

      {/* ── Stand ── */}
      <p className="text-xs text-[var(--text-3)]">Stand: April 2026</p>
    </div>
  );
}
