/*
 * components/ui/ProgressBar.tsx
 * ─────────────────────────────────────────────────────────────
 * Ein horizontaler Fortschrittsbalken.
 *
 * Wie er funktioniert:
 *  - Das äußere div (progress-track) ist der graue Hintergrundbalken.
 *  - Das innere div (progress-fill) ist die farbige Füllung.
 *  - Die Breite und Farbe der Füllung werden durch zwei CSS-Custom-Properties
 *    (--progress-w und --progress-color) gesteuert, die wir per JavaScript
 *    über eine ref setzen, weil der Linter style={} verbietet.
 *
 * Das CSS in index.css liest diese Variablen:
 *    .progress-fill { width: var(--progress-w); background-color: var(--progress-color); }
 *
 * Wenn keine Farbe übergeben wird, wird --progress-color entfernt und das CSS
 * fällt auf var(--accent) zurück, die automatisch ans Theme angepasst wird.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';

interface ProgressBarProps {
  value:      number;  // 0–100, der zu füllende Prozentsatz
  color?:     string;  // Optionale Hex-Farbüberschreibung, z. B. "#3b82f6"
  thin?:      boolean; // Wenn true, wird ein dünnerer Balken verwendet (4px statt 7px)
  showLabel?: boolean; // Wenn true, wird "Fortschritt X%" Text über dem Balken angezeigt
}

export default function ProgressBar({
  value,
  color,
  thin      = false,
  showLabel = false,
}: ProgressBarProps) {
  // Wert auf 0 bis 100 begrenzen, damit der Balken nie überläuft
  const clamped = Math.min(100, Math.max(0, value));

  // Referenz zum Wrapper-div — wird genutzt um CSS-Custom-Properties zu setzen
  const ref = useRef<HTMLDivElement>(null);

  // Nach dem Rendern (und wann immer sich value oder color ändert) die CSS-Variablen aktualisieren
  useEffect(() => {
    if (!ref.current) return;

    // Füllbreite als Prozentwert setzen, z. B. "65%"
    ref.current.style.setProperty('--progress-w', `${clamped}%`);

    if (color) {
      // Wenn eine Farbe übergeben wurde, als Füllfarbe setzen
      ref.current.style.setProperty('--progress-color', color);
    } else {
      // Wenn keine Farbe, Variable entfernen damit der CSS-Fallback (var(--accent)) greift
      ref.current.style.removeProperty('--progress-color');
    }
  }, [clamped, color]); // Neu ausführen wenn sich value oder color ändert

  return (
    // Dieses div ist der "Anker" für die CSS-Custom-Properties
    <div ref={ref}>

      {/* Optionale Beschriftungszeile über dem Balken */}
      {showLabel && (
        <div className="flex justify-between text-xs text-3 mb-1.5">
          <span>Progress</span>
          <span className="text-primary font-medium">{clamped.toFixed(0)}%</span>
        </div>
      )}

      {/* Die graue Schiene (Hintergrund) */}
      <div className={`progress-track ${thin ? 'progress-thin' : 'progress-normal'}`}>
        {/* Die farbige Füllung — Breite und Farbe kommen aus den oben gesetzten CSS-Variablen */}
        <div className="progress-fill" />
      </div>
    </div>
  );
}
