/*
 * store/settingsStore.ts
 * ─────────────────────────────────────────────────────────────
 * Persistierte Benutzereinstellungen (Theme, Timer, Benachrichtigungen).
 *
 * "persist" speichert den State in localStorage — Einstellungen bleiben
 * auch nach dem Schließen des Browsers erhalten.
 *
 * "updateSettings" verwendet Partial<Settings>:
 *  → Man übergibt nur die Felder die sich ändern.
 *  → Alle anderen Felder bleiben unberührt.
 * ─────────────────────────────────────────────────────────────
 */

import { create }  from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

/* ── Store-Interface ─────────────────────────────────────────── */
interface SettingsStore {
  settings:       Settings;
  updateSettings: (partial: Partial<Settings>) => void; // Felder einzeln aktualisieren
  resetSettings:  () => void;                           // Auf Standardwerte zurücksetzen
}

/* ── Standardeinstellungen ───────────────────────────────────── */
const defaultSettings: Settings = {
  theme:                 'light',
  pomodoroLength:        25,   // Standard Pomodoro: 25 Min
  shortBreak:            5,    // Kurze Pause: 5 Min
  longBreak:             15,   // Lange Pause: 15 Min
  username:              'Student',
  email:                 '',
  autoStartBreaks:       false, // Pausen nicht automatisch starten
  autoStartPomodoros:    false, // Nächsten Pomodoro nicht automatisch starten
  longBreakInterval:     4,     // Alle 4 Pomodoros: lange Pause
  notificationsEnabled:  false, // Browser-Benachrichtigungen aus (Benutzer muss zustimmen)
  soundEnabled:          true,  // Ton standardmäßig an
};

/* ── Store erstellen ─────────────────────────────────────────── */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      // Nur die übergebenen Felder überschreiben, Rest beibehalten
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      // Alles auf Standard zurücksetzen (z. B. nach Account-Löschung)
      resetSettings: () =>
        set({ settings: defaultSettings }),
    }),
    { name: 'study-settings' } // localStorage-Schlüssel
  )
);
