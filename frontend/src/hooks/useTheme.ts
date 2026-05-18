/*
 * hooks/useTheme.ts
 * ─────────────────────────────────────────────────────────────
 * Theme-Hook — liest das aktuelle Theme aus dem Settings-Store
 * und hält die "dark"-CSS-Klasse auf <body> synchron.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function useTheme() {
  /* Aktuelles Theme aus dem Store lesen */
  const { settings, updateSettings } = useSettingsStore();
  const isDark = settings.theme === 'dark';

  /* <body class="dark"> mit dem Store-Wert synchron halten */
  useEffect(() => {
    /* Klasse setzen oder entfernen je nach gespeichertem Theme */
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);

  /* Toggle: wechselt zwischen dunkel und hell */
  const toggle = () => updateSettings({ theme: isDark ? 'light' : 'dark' });

  return { isDark, toggle };
}
