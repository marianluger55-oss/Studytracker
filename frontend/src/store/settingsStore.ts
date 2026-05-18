/*
 * store/settingsStore.ts
 * ─────────────────────────────────────────────────────────────
 * Persistierte Benutzereinstellungen (Theme, Timer, Benachrichtigungen).
 *
 * "persist" speichert den State in localStorage — Einstellungen bleiben
 * auch nach dem Schließen des Browsers erhalten.
 *
 * Migration: ältere Installationen haben theme: 'light' gespeichert.
 * Der folgende Block korrigiert das in localStorage BEVOR Zustand liest,
 * damit der Store von Anfang an mit 'dark' hydratiert wird.
 * ─────────────────────────────────────────────────────────────
 */

import { create }  from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

/* ── One-Time Migration: 'light' → 'dark' in localStorage ───── */
/* Läuft synchron bevor create() den Store hydratiert, damit Zustand
   beim Lesen aus localStorage bereits 'dark' vorfindet.            */
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('study-settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { settings?: { theme?: string } } };
      if (parsed?.state?.settings?.theme === 'light') {
        parsed.state.settings.theme = 'dark';
        localStorage.setItem('study-settings', JSON.stringify(parsed));
      }
    }
  } catch {
    /* Korruptes localStorage-Eintrag — ignorieren, Store nutzt Defaults */
  }
}

/* ── Store-Interface ─────────────────────────────────────────── */
interface SettingsStore {
  settings:       Settings;
  updateSettings: (partial: Partial<Settings>) => void; /* Felder einzeln aktualisieren */
  resetSettings:  () => void;                           /* Auf Standardwerte zurücksetzen */
}

/* ── Standardeinstellungen ───────────────────────────────────── */
const defaultSettings: Settings = {
  theme:                 'dark',   /* Dark-Mode ist Standard */
  pomodoroLength:        25,       /* Standard Pomodoro: 25 Min */
  shortBreak:            5,        /* Kurze Pause: 5 Min */
  longBreak:             15,       /* Lange Pause: 15 Min */
  username:              'Student',
  email:                 '',
  autoStartBreaks:       false,    /* Pausen nicht automatisch starten */
  autoStartPomodoros:    false,    /* Nächsten Pomodoro nicht automatisch starten */
  longBreakInterval:     4,        /* Alle 4 Pomodoros: lange Pause */
  notificationsEnabled:  false,    /* Browser-Benachrichtigungen aus */
  soundEnabled:          true,     /* Ton standardmäßig an */
};

/* ── Store erstellen ─────────────────────────────────────────── */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      /* Nur die übergebenen Felder überschreiben, Rest beibehalten */
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      /* Alles auf Standard zurücksetzen (z. B. nach Account-Löschung) */
      resetSettings: () =>
        set({ settings: defaultSettings }),
    }),
    { name: 'study-settings' } /* localStorage-Schlüssel */
  )
);
