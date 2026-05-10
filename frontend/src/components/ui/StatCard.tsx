/*
 * components/ui/StatCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Kompakte Kennzahl-Kachel für Dashboard und Statistiken.
 *
 * Aufbau:
 *   Label  — kleines Uppercase-Label oben
 *   Value  — große, fette Hauptzahl
 *   Sub    — optionaler Hinweistext darunter
 *
 * Kein Icon — die Zahl selbst ist die visuelle Aussage.
 * ─────────────────────────────────────────────────────────────
 */

interface StatCardProps {
  label: string;  // Kleine Beschriftung, z. B. "Heute"
  value: string;  // Hauptwert, z. B. "1h 30m"
  sub?:  string;  // Optionaler dezenter Hinweistext, z. B. "Lernzeit"
}

// icon-Prop wurde entfernt — Icons machen die Kacheln schwerer als nötig
export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    // stat-card: CSS-Klasse aus index.css — Karte mit Rahmen, Schatten, Innenabstand
    <div className="stat-card">

      {/* stat-label: kleine Uppercase-Beschriftung in dezenter Farbe */}
      <p className="stat-label">{label}</p>

      {/* stat-value: große, enge Zahl — Hauptaussage der Kachel */}
      {/* truncate: Text wird abgeschnitten statt umzubrechen wenn zu lang */}
      <p className="stat-value truncate">{value}</p>

      {/* Optionaler Untertext — nur rendern wenn die sub-Prop übergeben wurde */}
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}
