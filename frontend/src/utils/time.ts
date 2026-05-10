/*
 * utils/time.ts
 * ─────────────────────────────────────────────────────────────
 * Reine Hilfsfunktionen für alle zeitbezogenen Berechnungen.
 * "Rein" bedeutet: keine Nebeneffekte, gleiche Eingabe ergibt immer gleiche Ausgabe.
 *
 * Diese Funktionen werden in Dashboard, Timer, Statistics und Goals verwendet.
 * ─────────────────────────────────────────────────────────────
 */

/* ── formatDuration ─────────────────────────────────────────── */
// Wandelt eine Anzahl von SEKUNDEN in einen lesbaren String um.
// Beispiel: 5400 → "1h 30m" | 90 → "1m 30s"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);         // Volle Stunden
  const m = Math.floor((seconds % 3600) / 60);  // Restliche Minuten nach Abzug der Stunden
  const s = seconds % 60;                        // Restliche Sekunden nach Abzug der Minuten

  if (h > 0) {
    // Wenn mindestens eine Stunde vorhanden ist, Format "Xh Ym" verwenden
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  // Ansonsten Format "Xm Ys" verwenden
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/* ── formatTimer ────────────────────────────────────────────── */
// Formatiert Sekunden als klassische HH:MM:SS-Uhrzeitanzeige.
// padStart(2, '0') fügt eine führende Null ein, wenn die Zahl einstellig ist:
// z. B. 7 → "07", 12 → "12"
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ── formatRelativeDate ─────────────────────────────────────── */
// Wandelt einen ISO-Datumsstring in eine freundliche Bezeichnung um,
// z. B. "Heute", "Gestern" oder "vor 5 Tagen".
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);        // ISO-String in ein Date-Objekt umwandeln
  const now  = new Date();
  // Differenz in Millisekunden berechnen, dann in ganze Tage umrechnen
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/* ── getWeekDays ────────────────────────────────────────────── */
// Gibt die letzten 7 Tagesabkürzungen bis einschließlich heute zurück.
// Wird als x-Achsen-Beschriftung im Wochenbalkendiagramm verwendet.
// Beispielergebnis: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
export function getWeekDays(): string[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {      // Beginnt 6 Tage zurück, zählt bis heute (i=0)
    const d = new Date();
    d.setDate(d.getDate() - i);        // i Tage zurückgehen
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' })); // z. B. "Mon"
  }
  return days;
}

/* ── getWeeklyMinutes ───────────────────────────────────────── */
// Gibt ein Array mit 7 Zahlen zurück, eine pro Tag der letzten 7 Tage.
// Jede Zahl ist die Gesamtlernzeit in Minuten an diesem Tag.
// Index 0 = vor 6 Tagen, Index 6 = heute.
// Wird als Datenwerte für das Wochenbalkendiagramm verwendet.
export function getWeeklyMinutes(
  sessions: { startTime: string; duration: number }[]
): number[] {
  const result = new Array(7).fill(0); // Startet mit [0, 0, 0, 0, 0, 0, 0]
  const now    = new Date();

  sessions.forEach((s) => {
    const date = new Date(s.startTime);
    // Wie viele Tage liegt diese Session zurück?
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diff >= 0 && diff < 7) {
      // "6 - diff" rechnet "Tage zurück" in einen vorwärtsgerichteten Array-Index um.
      // diff=0 (heute) → Index 6 (letzter Slot)
      // diff=6 (vor 6 Tagen) → Index 0 (erster Slot)
      result[6 - diff] += Math.floor(s.duration / 60); // Minuten addieren (nicht Sekunden)
    }
  });

  return result;
}

/* ── getTodayMinutes ────────────────────────────────────────── */
// Gibt die gesamten Lernminuten des heutigen Tages über alle Sessions zurück.
export function getTodayMinutes(
  sessions: { startTime: string; duration: number }[]
): number {
  const today = new Date().toDateString(); // z. B. "Sun Apr 12 2026"
  return sessions
    .filter((s) => new Date(s.startTime).toDateString() === today) // Nur heutige Sessions behalten
    .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);     // Deren Minuten summieren
}

/* ── getCurrentStreak ───────────────────────────────────────── */
// Zählt, wie viele aufeinanderfolgende Tage (bis heute) der Nutzer mindestens eine Session hatte.
// Beispiel: Sessions am Mo, Di, Mi und heute ist Mi → Streak = 3
export function getCurrentStreak(sessions: { startTime: string }[]): number {
  if (sessions.length === 0) return 0; // Keine Sessions = kein Streak

  // Alle eindeutigen Datumsangaben sammeln, an denen mindestens eine Session stattfand
  const sessionDates = new Set(
    sessions.map((s) => new Date(s.startTime).toDateString())
  );

  let streak    = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0); // Auf Beginn des heutigen Tages normalisieren

  // Tagesweise rückwärts gehen, solange jeder Tag eine Session hat
  while (sessionDates.has(checkDate.toDateString())) {
    streak++;                                    // Dieser Tag zählt
    checkDate.setDate(checkDate.getDate() - 1); // Einen weiteren Tag zurückgehen
  }

  return streak;
}
