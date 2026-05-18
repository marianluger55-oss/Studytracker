/*
 * hooks/useChartColors.ts
 * ─────────────────────────────────────────────────────────────
 * Gibt die richtigen Chart.js-Farben für das aktuelle Theme zurück.
 * Chart.js zeichnet auf <canvas> und kann keine CSS-Variablen lesen —
 * deshalb müssen wir die Farbstrings manuell übergeben.
 *
 * Beide Themes nutzen jetzt die Pink/Violett-Palette:
 *  Dark:  leuchtende Töne auf dunklem Grund
 *  Light: kräftige Töne auf hellem Lavendel-Weiß
 * ─────────────────────────────────────────────────────────────
 */

import { useSettingsStore } from '../store/settingsStore';

export function useChartColors() {
  /* Theme aus dem Store — re-rendert bei Wechsel automatisch */
  const theme = useSettingsStore((s) => s.settings.theme);
  const dark  = theme === 'dark';

  return {
    /* Hauptbalken — Pink */
    primary:        dark ? 'rgba(244,114,182,0.85)' : 'rgba(236,72,153,0.80)',

    /* Abgeschwächte Hauptbalken */
    primaryFaded:   dark ? 'rgba(139,92,246,0.28)'  : 'rgba(167,139,250,0.30)',

    /* Sekundärbalken — Violett/Indigo */
    secondary:      dark ? 'rgba(192,132,252,0.85)' : 'rgba(147,51,234,0.80)',

    /* Abgeschwächte Sekundärbalken */
    secondaryFaded: dark ? 'rgba(129,140,248,0.28)' : 'rgba(129,140,248,0.25)',

    /* Horizontale Gitterlinien */
    grid:           dark ? 'rgba(255,255,255,0.06)'  : 'rgba(139,92,246,0.10)',

    /* Achsenbeschriftungen */
    tick:           dark ? 'rgba(255,255,255,0.35)'  : 'rgba(76,61,114,0.70)',

    /* Rand zwischen Donut-Segmenten */
    border:         dark ? '#050508'                  : '#ffffff',

    /* Tooltip-Hintergrund */
    tooltipBg:      dark ? 'rgba(10,10,18,0.95)'     : 'rgba(255,255,255,0.97)',
  };
}
