# Session Management Features - Hot Reload & Sessions

## 1. Hot Reload für Framework-Projekte

### Ziel
- Immer aktuelle Preview und Live-Feedback bei Änderungen im Projekt (z.B. React, Vue, Angular, Svelte, Next.js, etc.)
- Verhindert veraltete Vorschauen und beschleunigt den Entwicklungs-Workflow

### Anforderungen
- **Hot Reload/Live Reload** für alle unterstützten Frameworks aktivieren (z.B. via Webpack, Vite, Next.js, Nuxt, etc.)
- **Preview-Panel** zeigt immer den aktuellen Stand nach jeder Änderung
- **Automatische Erkennung**: Wenn Hot Reload nicht aktiv, Hinweis/Fehlermeldung anzeigen
- **Fallback**: Manuelles Reload-Icon im Preview-Panel

### Umsetzung
- Beim Start/Wechsel eines Projekts Hot-Reload-Status prüfen
- Bei fehlendem Hot Reload: User-Hinweis und ggf. Setup-Anleitung anzeigen
- Preview-Panel immer mit Hot-Reload-Endpoint verbinden

---

## 2. Fehler-Reset & Reject-Strategie

### Ziel
- Wenn ein KI-Task/Chat-Flow "schief läuft" (z.B. Fehler, Missverständnis, Endlosschleife), muss ein vollständiger Reset/Abbruch möglich sein

### Anforderungen
- **"All Reject"-Button**: Bricht aktuellen Task/Chat ab, setzt Status zurück
- **UI-Feedback**: Klarer Hinweis, dass alles resettet wurde
- **Automatischer Kontext-Reset**: Alle temporären Daten, Prompts, File-Kontexte werden verworfen
- **Optional**: Fehlergrund/Log anzeigen

### Umsetzung
- Reject-Button im Chat-Panel und ggf. im Status-Badge
- Nach Reset: Chat-Input und File-Kontext wieder leer, Status auf "Bereit"
- Optional: Undo/Redo für versehentliche Resets

---

## 3. Chat-Session-Management (IDE-gebunden)

### Ziel
- Mehrere, unabhängige Chat-Sessions pro IDE/Projekt-Port
- Chats schließen, neue Chats starten, alte Chats laden
- Sessions sind an IDE/Port gebunden (z.B. 9222, 9223)

### Anforderungen
- **Session-Liste** im Sidebar/Panel (mit Port/IDE-Label)
- **Neue Session** starten (Button)
- **Session schließen** (mit Bestätigung)
- **Alte Sessions laden** (History, ggf. mit Zeitstempel/Name)
- **Session-Status**: Aktiv, inaktiv, geschlossen
- **DOM-Elemente** für alle Aktionen vorhanden (für Automatisierung/Testing)

### Umsetzung
- Session-Objekte mit eindeutiger ID, Port/IDE-Zuordnung, Status
- UI: Session-Liste, Aktions-Buttons (Neu, Schließen, Laden)
- Beim Wechsel der IDE/Port: Nur zugehörige Sessions anzeigen
- Optional: Session-Export/Import (z.B. als JSON)

---

## Komponenten-Checkliste
- [ ] Hot-Reload-Status-Erkennung & Preview-Panel-Integration
- [ ] Fallback-Reload-Button im Preview
- [ ] Fehler-Reset/All-Reject-Button mit UI-Feedback
- [ ] Session-Liste (IDE/Port-gebunden)
- [ ] Neue Session starten
- [ ] Session schließen (mit Bestätigung)
- [ ] Alte Sessions laden (History)
- [ ] DOM-Elemente für alle Aktionen

---

## Zielbild
Ein System, das Hot Reload für alle Framework-Projekte sicherstellt, jederzeit aktuelle Previews bietet, Fehler/Abbrüche sauber resettet und ein vollständiges, IDE-gebundenes Chat-Session-Management ermöglicht – alles konsistent und automatisierbar. 