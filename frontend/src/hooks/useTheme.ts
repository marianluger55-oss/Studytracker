/*
 * hooks/useTheme.ts
 * ─────────────────────────────────────────────────────────────
 * Ein benutzerdefinierter React-Hook, der das Hell-/Dunkel-Theme verwaltet.
 *
 * "Hook" = eine wiederverwendbare Funktion, die React-Funktionen
 *          (wie useEffect) nutzen kann und aus jeder Komponente aufgerufen werden kann.
 *
 * Was dieser Hook tut:
 *  1. Liest das aktuelle Theme aus dem Settings-Store
 *  2. Setzt die "dark"-CSS-Klasse auf <body>, wann immer sich das Theme ändert
 *  3. Gibt { isDark, toggle } zurück, damit Komponenten das Theme lesen und ändern können
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';              // React-Hook für Nebeneffekte
import { useSettingsStore } from '../store/settingsStore'; // Unser Settings-Store

export function useTheme() {
  // Aktuelle Einstellungen aus dem Store lesen (und neu rendern wenn sie sich ändern)
  const { settings, updateSettings } = useSettingsStore();
  const isDark = settings.theme === 'dark'; // true wenn Theme dunkel ist, false wenn hell

  // ── CSS-Klasse auf <body> synchronisieren ─────────────────────
  // useEffect läuft *nach* dem Rendern der Komponente.
  // Das zweite Argument [isDark] bedeutet: "Diesen Effekt neu ausführen, wenn isDark sich ändert".
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');    // "dark"-Klasse hinzufügen → CSS-Variablen wechseln zu Dunkelwerten
    } else {
      document.body.classList.remove('dark'); // Klasse entfernen → CSS-Variablen kehren zu Hellwerten zurück
    }
  }, [isDark]); // Abhängigkeitsarray: nur neu ausführen wenn isDark sich ändert

  // ── toggle-Funktion ───────────────────────────────────────────
  // Wechselt das Theme von dunkel → hell oder hell → dunkel.
  const toggle = () => updateSettings({ theme: isDark ? 'light' : 'dark' });

  // Die zwei Dinge zurückgeben, die Komponenten brauchen: aktueller Zustand + Änderungsfunktion
  return { isDark, toggle };
}
