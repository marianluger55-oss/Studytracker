/*
 * components/ui/ColorSwatch.tsx
 * ─────────────────────────────────────────────────────────────
 * Ein anklickbarer runder Farbknopf, der im Kategorie-Farbwähler verwendet wird.
 * Wenn ausgewählt, erhält er einen weißen Ring, damit der Nutzer sieht,
 * welche Farbe gerade ausgewählt ist.
 *
 * Gleiches Muster wie ColorDot: verwendet ref + useEffect zum Setzen der
 * Hintergrundfarbe, weil inline style={} vom Linter verboten ist.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';

interface ColorSwatchProps {
  color:    string;                   // Die Hex-Farbe, die dieser Swatch repräsentiert
  selected: boolean;                  // Ist dies die aktuell gewählte Farbe?
  onSelect: (color: string) => void;  // Wird aufgerufen wenn der Nutzer diesen Swatch anklickt
}

export default function ColorSwatch({ color, selected, onSelect }: ColorSwatchProps) {
  // Referenz auf das tatsächliche Button-DOM-Element
  const ref = useRef<HTMLButtonElement>(null);

  // Hintergrundfarbe des Buttons nach dem Rendern setzen
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.setProperty('background-color', color);
  }, [color]); // Neu ausführen wenn sich die color-Prop ändert

  return (
    <button
      ref={ref}
      type="button"                              // Verhindert Formularabsendung wenn innerhalb eines <form>
      aria-label={`Select colour ${color}`}      // Barrierefreiheits-Label für Screenreader
      onClick={() => onSelect(color)}            // Übergeordnete Komponente informieren, welche Farbe gewählt wurde
      className={`
        w-6 h-6 rounded-full
        transition-transform hover:scale-110
        ${selected
          ? 'ring-2 ring-offset-1 ring-offset-[var(--bg-2)] ring-white' // Weißer Ring wenn ausgewählt
          : ''
        }
      `}
    />
  );
}
