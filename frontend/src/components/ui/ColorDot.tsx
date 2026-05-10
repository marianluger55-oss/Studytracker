/*
 * components/ui/ColorDot.tsx
 * ─────────────────────────────────────────────────────────────
 * Ein kleiner ausgefüllter Kreis, der die Farbe einer Kategorie anzeigt.
 * Wird neben Sessionsnamen in Listen verwendet.
 *
 * Warum useEffect + ref statt style={{ backgroundColor }}?
 * Unser Linter verbietet Inline-Style-Props in JSX.
 * Die Lösung: eine Referenz zum DOM-Element holen und die
 * CSS-Eigenschaft direkt in JavaScript setzen, nachdem die Komponente gemountet wurde.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';

interface ColorDotProps {
  color: string;       // Beliebige gültige CSS-Farbe, z. B. "#3b82f6"
  size?: string;       // Tailwind-Größenklassen, Standard ist "w-2 h-2"
}

export default function ColorDot({ color, size = 'w-2 h-2' }: ColorDotProps) {
  // "ref" ist eine Referenz auf das tatsächliche DOM-<div>-Element.
  // React erstellt das Element und gibt uns dann diesen Zugriff darauf.
  const ref = useRef<HTMLDivElement>(null);

  // Nachdem die Komponente gerendert hat (oder wann immer "color" sich ändert),
  // die Hintergrundfarbe direkt am echten DOM-Element setzen.
  // Das vermeidet die Verwendung des style={}-Props in JSX.
  useEffect(() => {
    if (!ref.current) return; // Sicherheitscheck: nicht ausführen wenn Element noch nicht existiert
    ref.current.style.setProperty('background-color', color);
  }, [color]); // Neu ausführen wenn sich die color-Prop ändert

  // Ein kleines abgerundetes div rendern.
  // "ref={ref}" verbindet dieses Element mit unserer ref-Variable oben.
  return <div ref={ref} className={`${size} rounded-full flex-shrink-0`} />;
}
