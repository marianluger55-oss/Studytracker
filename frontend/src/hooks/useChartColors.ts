/*
 * hooks/useChartColors.ts
 * ─────────────────────────────────────────────────────────────
 * Gibt die richtigen Chart.js-Farben für das aktuelle Theme zurück.
 *
 * Warum wird das gebraucht?
 * Chart.js ist eine JavaScript-Bibliothek — sie zeichnet auf einem <canvas>-
 * Element und kann keine CSS-Variablen lesen. Deshalb müssen wir ihr die
 * genauen Hex-Farbstrings manuell übergeben, je nachdem ob wir im Dunkel-
 * oder Hellmodus sind.
 *
 * Jede Komponente, die ein Diagramm rendert, importiert und ruft diesen Hook auf.
 * ─────────────────────────────────────────────────────────────
 */

import { useSettingsStore } from '../store/settingsStore';

export function useChartColors() {
  // Theme aus dem Store lesen. Wenn das Theme sich ändert, rendert jede Komponente
  // die diesen Hook verwendet automatisch mit neuen Farben neu.
  const theme = useSettingsStore((s) => s.settings.theme);
  const dark  = theme === 'dark'; // true = Dunkelmodus

  return {
    // ── Farbe 3: Petrol ───────────────────────────────────────────
    // Primäre Balkenfarbe — Petrol-Akzent
    primary:        dark ? '#5CA89E' : '#2B6E6A',

    // Abgeschwächte Petrol-Balken (nicht hervorgehoben)
    primaryFaded:   dark ? 'rgba(92,168,158,0.18)' : 'rgba(43,110,106,0.14)',

    // ── Farbe 2: Ebony-Ton ────────────────────────────────────────
    // Sekundäre Balkenfarbe (Monatsübersicht)
    secondary:      dark ? '#47474A' : '#96908A',

    // Abgeschwächte Sekundärfarbe
    secondaryFaded: dark ? 'rgba(71,71,74,0.5)' : 'rgba(150,144,138,0.25)',

    // ── Farbe 1: Pergament-Töne für Raster/Achsen ─────────────────
    // Horizontale Gitterlinien
    grid:           dark ? '#212520' : '#E7E3D8',

    // Achsenbeschriftungen
    tick:           dark ? '#47474A' : '#96908A',

    // Randfarbe zwischen Donut-Segmenten
    border:         dark ? '#191C19' : '#FAF8F2',

    // Tooltip-Hintergrund
    tooltipBg:      dark ? '#212520' : '#FAF8F2',
  };
}
