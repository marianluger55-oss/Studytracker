/*
 * pages/Categories/Categories.tsx
 * ─────────────────────────────────────────────────────────────
 * Verwaltung der Lernfächer (Kategorien).
 *
 * Was diese Seite kann:
 *  - Neues Fach mit einem Namen und einer Farbe erstellen
 *  - Bestehendes Fach löschen (zweistufige Bestätigung: erst "Löschen?", dann "Ja")
 *  - Pro Fach die gesammelte Lernzeit anzeigen
 *  - Unten: relativer Balken der Zeitverteilung pro Fach
 *
 * Datenfluss:
 *  - useCategories(): TanStack Query Hook — lädt Daten aus Backend, stellt Mutations bereit
 *  - Lokaler State (useState): Formularfelder, Formular-Sichtbarkeit, Lösch-Bestätigung
 * ─────────────────────────────────────────────────────────────
 */

// useState: React-Hook — verwaltet lokalen Zustand innerhalb der Komponente
// Lokale States: Namenseingabe, ausgewählte Farbe, Formular-Sichtbarkeit, Lösch-ID
import { useState } from 'react';

// useCategories: TanStack Query Hook — holt Kategorien aus Backend und stellt Mutations bereit
// DEFAULT_COLORS: Array von 8 vordefinierten Hex-Farben zur Auswahl
import { useCategories } from '../../hooks/useCategories';
import { DEFAULT_COLORS } from '../../store/categoryStore';

// Kleine UI-Bausteine
import ColorDot    from '../../components/ui/ColorDot';    // Kleiner gefüllter Kreis in einer Farbe
import ColorSwatch from '../../components/ui/ColorSwatch'; // Klickbarer Farbauswahl-Kreis mit Ring-Hervorhebung
import ProgressBar from '../../components/ui/ProgressBar'; // Horizontaler Fortschrittsbalken

export default function Categories() {

  // categories: Array aller Fächer aus dem Store (vom Backend befüllt)
  // createCategory: Mutation — POST /api/categories
  // deleteCategory: Mutation — DELETE /api/categories/:id
  // isLoading: true während initiales Laden vom Backend
  // isCreating: true während Erstellen-Mutation läuft
  const { categories, createCategory, deleteCategory, isLoading, isCreating } = useCategories();

  // ── Lokaler Formular-State ──────────────────────────────────

  // name: aktueller Wert des Namenseingabefeldes — "" = leer
  const [name, setName] = useState('');

  // color: aktuell ausgewählte Farbe im Farbwähler
  // Startwert: erste Farbe aus DEFAULT_COLORS (z. B. "#3B82F6" Blau)
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  // showForm: steuert ob das "Neues Fach"-Formular sichtbar ist
  // false = ausgeblendet, true = eingeblendet (beim Klick auf "Fach hinzufügen")
  const [showForm, setShowForm] = useState(false);

  // toDelete: ID des Fachs das gelöscht werden soll (number), oder null wenn kein Löschvorgang läuft
  // Wenn toDelete === cat.id: zeige "Ja"/"Nein"-Bestätigungsbuttons für dieses Fach
  const [toDelete, setToDelete] = useState<number | null>(null);

  // saveError: Fehlermeldung wenn Backend-Aufruf scheitert
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Hinzufügen-Handler ────────────────────────────────────────

  // Wird aufgerufen wenn "Hinzufügen" geklickt oder Enter gedrückt wird
  const handleAdd = async () => {
    // name.trim(): entfernt führende und nachfolgende Leerzeichen
    // Wenn der Name leer oder nur Leerzeichen → nichts tun
    if (!name.trim()) return;

    setSaveError(null); // Alte Fehlermeldung löschen
    try {
      // createCategory: POST /api/categories — speichert im Backend
      await createCategory({ name: name.trim(), color });

      setName('');               // Eingabefeld leeren für die nächste Eingabe
      setColor(DEFAULT_COLORS[0]); // Farbe auf Standard-Blau zurücksetzen
      setShowForm(false);        // Formular nach dem Hinzufügen ausblenden
    } catch {
      setSaveError('Fach konnte nicht erstellt werden. Bitte prüfe deine Verbindung.');
    }
  };

  // ── Löschen-Handler ───────────────────────────────────────────

  const handleDelete = async (id: number) => {
    setSaveError(null);
    try {
      // deleteCategory: DELETE /api/categories/:id
      await deleteCategory(id);
      setToDelete(null); // Bestätigungsmodus beenden
    } catch {
      setSaveError('Fach konnte nicht gelöscht werden.');
      setToDelete(null);
    }
  };

  // Gesamte Lernminuten über ALLE Fächer — für die Prozentberechnung der Zeitanteile
  // reduce(a, c): a = Akkumulator (startet bei 0), c = aktuelles Element
  // ?? 0: wenn totalMinutes null oder undefined ist → 0 verwenden
  const totalMins = categories.reduce((a, c) => a + (c.totalMinutes ?? 0), 0);

  // ── JSX / Ausgabe ─────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Kopfzeile ────────────────────────────────────────── */}
      {/* flex items-end justify-between: Titel links, Button rechts, beide an der Unterkante */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">Fächer</h1>
          <p className="page-subtitle">Verwalte deine Lernbereiche.</p>
        </div>

        {/* Toggle-Button: beim Klick wechselt showForm zwischen true und false */}
        {/* (v) => !v: Arrow-Funktion die den aktuellen Wert v negiert */}
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {/* Plus-Icon: horizontale + vertikale Linie */}
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path d="M6 1v10M1 6h10" strokeLinecap="round" /> {/* Senkrechte + waagerechte Linie */}
          </svg>
          Fach hinzufügen
        </button>
      </div>

      {/* ── Hinzufügen-Formular ───────────────────────────────── */}
      {/* Nur rendern wenn showForm true ist (konditionelles Rendering mit &&) */}
      {showForm && (
        // card-accent: Karte mit etwas kräftigerem Rahmen — hebt das Formular hervor
        <div className="card card-accent">
          <p className="card-title">Neues Fach</p>

          {/* flex flex-wrap gap-3 items-end: Felder nebeneinander, umbrechen bei Platzmangel */}
          {/* items-end: alle Felder an der Unterkante ausrichten (Button fluchtet mit Eingabe) */}
          <div className="flex flex-wrap gap-3 items-end">

            {/* Namenseingabe-Block */}
            {/* flex-1: nimmt so viel Platz wie möglich ein */}
            {/* min-w-[160px]: mindestens 160px breit damit es nicht zu schmal wird */}
            <div className="flex-1 min-w-[160px]">
              {/* htmlFor="cat-name" verknüpft Label mit Input (Klick auf Label fokussiert Input) */}
              <label className="input-label" htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                value={name}                             // Gesteuerter Wert aus lokalem State
                onChange={(e) => setName(e.target.value)} // Jeden Tastendruck in State schreiben
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} // Enter-Taste = Formular absenden
                placeholder="z. B. Mathematik"           // Hinweistext wenn Feld leer ist
                className="input"                         // Eingabefeld-Stil aus index.css
              />
            </div>

            {/* Farbwähler-Block */}
            <div>
              <label className="input-label">Farbe</label>
              {/* flex gap-1.5: acht Farbkreise nebeneinander mit kleinem Abstand */}
              <div className="flex gap-1.5">
                {/* DEFAULT_COLORS.map: für jede der 8 Farben einen ColorSwatch-Button rendern */}
                {DEFAULT_COLORS.map((col) => (
                  <ColorSwatch
                    key={col}              // col ist der Hex-String (z. B. "#3B82F6") — eindeutig
                    color={col}            // Welche Farbe dieser Swatch hat
                    selected={color === col} // true wenn dies die aktuell ausgewählte Farbe ist
                    onSelect={setColor}    // Beim Klick: diese Farbe als ausgewählt setzen
                  />
                ))}
              </div>
            </div>

            {/* Aktion-Buttons am Ende der Zeile */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isCreating || !name.trim()} // Deaktiviert während Backend-Aufruf läuft
              className="btn-primary"
            >
              {/* Spinner während Backend-Aufruf, sonst normaler Text */}
              {isCreating ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : null}
              {isCreating ? 'Speichert…' : 'Hinzufügen'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Abbrechen</button>
          </div>

          {/* Fehlermeldung wenn Backend-Aufruf scheitert */}
          {saveError && (
            <p className="mt-3 text-sm text-red-500">{saveError}</p>
          )}
        </div>
      )}

      {/* ── Fehlermeldung außerhalb Formular (z. B. beim Löschen) ── */}
      {saveError && !showForm && (
        <p className="text-sm text-red-500">{saveError}</p>
      )}

      {/* ── Fächertabelle ─────────────────────────────────────── */}
      {/* p-0: Standard-Padding der card-Klasse aufheben (Tabelle soll bis zum Rand gehen)     */}
      {/* overflow-hidden: rundet die Ecken auch für den Tabelleninhalt ab                     */}
      {/* overflow-x-auto: auf Mobile horizontal scrollbar wenn Inhalt breiter als Screen ist  */}
      <div className="card p-0 overflow-x-auto">
      {/* min-w-[400px]: Mindestbreite der Tabelle — verhindert zu enges Quetschen auf Mobile  */}
      <div className="min-w-[400px]">

        {/* Tabellen-Kopfzeile — mit Hintergrund-Farbe für Abgrenzung */}
        {/* grid-cols-4: 4 Spalten (Name nimmt 2, Zeit nimmt 1, Aktion nimmt 1) */}
        <div className="grid grid-cols-4 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--text-3)] font-medium uppercase tracking-widest">
          {/* col-span-2: belegt 2 der 4 Spalten */}
          <span className="col-span-2">Fach</span>
          <span className="text-right">Lernzeit</span>
          <span className="text-right">Aktion</span>
        </div>

        {/* Lade-Zustand: Backend-Daten werden noch geholt */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-[var(--text-3)]">
            Lädt…
          </div>
        ) : categories.length === 0 ? (
          // Leerer Zustand: wird angezeigt wenn noch keine Fächer angelegt wurden
          // empty-state: CSS-Klasse aus index.css — zentrierter Hinweistext
          <div className="empty-state py-10">
            <p className="empty-state-sub">Noch keine Fächer — füge oben eines hinzu.</p>
          </div>
        ) : (
          // Fächerliste — ein Eintrag pro Kategorie
          <div>
            {categories.map((cat) => {
              // Lernminuten für dieses Fach — ?? 0 = Fallback wenn noch keine Sessions
              const mins = cat.totalMinutes ?? 0;

              // Prozentwert dieser Kategorie an der Gesamtlernzeit
              // toFixed(0): rundet auf ganze Prozent, z. B. 33.33 → "33"
              const pct = totalMins > 0 ? ((mins / totalMins) * 100).toFixed(0) : '0';

              return (
                // key={cat.id}: eindeutiger React-Key
                // last:border-0: letzte Zeile ohne unteren Rahmen (Tailwind-Modifier)
                // hover:bg-[var(--bg-3)]: dezenter Hover-Effekt
                <div
                  key={cat.id}
                  className="grid grid-cols-4 px-5 py-3.5 items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-3)] transition-colors"
                >
                  {/* Spalten 1–2: Farbpunkt + Fachname + Prozentwert */}
                  <div className="col-span-2 flex items-center gap-3">
                    {/* ColorDot: kleiner gefüllter Kreis in der Kategorie-Farbe */}
                    <ColorDot color={cat.color} size="w-2.5 h-2.5" />
                    <span className="text-sm font-medium text-[var(--text)]">{cat.name}</span>
                    {/* Prozentwert dezent hinter dem Namen */}
                    <span className="text-xs text-[var(--text-3)]">{pct}%</span>
                  </div>

                  {/* Spalte 3: Formatierte Lernzeit */}
                  {/* text-right: rechtsbündig unter der "Lernzeit"-Spaltenüberschrift */}
                  <div className="text-right text-sm text-[var(--text-2)]">
                    {/* Wenn ≥ 60 Minuten → "Xh Ym"-Format, sonst nur "Xm" */}
                    {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
                  </div>

                  {/* Spalte 4: Löschen-Button oder Bestätigungsdialog */}
                  <div className="text-right">

                    {/* toDelete === cat.id: Zeige Bestätigung NUR für das angeklickte Fach */}
                    {toDelete === cat.id ? (

                      // Bestätigungsschritt — erscheint nach dem ersten Klick auf den Papierkorb
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-[var(--text-3)]">Löschen?</span>

                        {/* "Ja"-Button: ruft Backend auf und setzt toDelete zurück */}
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id)} // Backend-Delete aufrufen
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Ja
                        </button>

                        {/* "Nein"-Button: Löschvorgang abbrechen */}
                        <button
                          type="button"
                          onClick={() => setToDelete(null)} // toDelete → null = zurück zum Normal-Zustand
                          className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-3)] transition-colors"
                        >
                          Nein
                        </button>
                      </div>

                    ) : (
                      // Normalzustand: Papierkorb-Icon als Lösch-Auslöser
                      // Erster Klick → setzt toDelete auf cat.id → zeigt Bestätigungsdialog
                      <button
                        type="button"
                        aria-label={`${cat.name} löschen`} // Für Screenreader zugänglich
                        onClick={() => setToDelete(cat.id)} // Lösch-Bestätigung starten
                        className="p-1.5 text-[var(--text-3)] hover:text-red-400 rounded transition-colors"
                      >
                        {/* Papierkorb-Icon aus SVG-Pfad */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>{/* min-w-[400px] */}
      </div>{/* card overflow-x-auto */}

      {/* ── Zeitverteilungsbalken ──────────────────────────────── */}
      {/* Nur anzeigen wenn insgesamt irgendwelche Minuten aufgezeichnet wurden */}
      {totalMins > 0 && (
        <div className="card">
          <p className="card-title">Zeit nach Fach</p>
          <div className="space-y-3">
            {categories.map((cat) => {
              const mins = cat.totalMinutes ?? 0; // Minuten für dieses Fach

              // Prozentwert relativ zur Gesamtlernzeit (0–100)
              // 0 wenn totalMins = 0 (Division durch 0 verhindern)
              const pct = totalMins > 0 ? (mins / totalMins) * 100 : 0;

              return (
                <div key={cat.id}>
                  {/* Label-Zeile: Fachname links, Minutenzahl rechts */}
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-2)]">{cat.name}</span>
                    <span className="text-[var(--text-3)]">
                      {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
                    </span>
                  </div>

                  {/* thin: dünner Balken (3px) — color: Balken-Farbe entspricht der Kategorie-Farbe */}
                  {/* pct: wie viel Prozent der Gesamt-Lernzeit auf dieses Fach entfällt */}
                  <ProgressBar value={pct} color={cat.color} thin />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
