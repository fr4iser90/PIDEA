# ToDo: Chat-IDE UI/UX & Features

## Architektur & Extension-System
- [1] Jede Extension muss unabhängig und sauber gekapselt funktionieren (keine Abhängigkeiten untereinander)
- [1] Extensions sollen über einen Extension-Market installierbar/entfernbar sein (UI für Extension-Management)
- [1] Klare Extension-API/Schnittstelle für Erweiterungen (z.B. Hooks, Events, UI-Integration)
- [2] Sandbox/Isolation für Extensions (keine Side-Effects auf andere Extensions oder Core)
- [3] Extension-Entwickler-Doku & Beispiel-Templates

## File Handling & Upload
- [1] File-Upload-Pipeline integrieren (Dateien in den Chat einfügen)
- [2] Hochgeladene Dateien als Link/Preview im Chat anzeigen
- [1] Modal mit Dateibaum (Tree-View) für das gesamte Projektverzeichnis (wie in der IDE, nicht nur Uploads)
- [2] Markdown- und Code-Preview für Dateien (ggf. mit Editierfunktion)

## Multi-Session & Multi-IDE
- [2] Tabs für verschiedene Sessions/IDEs (Session-Management)
- [3] Mehrere Debug-Server auf unterschiedlichen Ports starten und verbinden
- [2] Einfaches Wechseln/Hoppen zwischen Sessions/IDEs

## Dokumenten-Management
- [2] Modal/Tree-View für eigene Dokumente und Projektdateien (z.B. Markdown, Notizen, Quellcode, etc.)
- [3] Sortier- und Filterfunktionen für Dokumente/Projektdateien
- [2] Schneller Zugriff auf zuletzt geöffnete/geänderte Dateien

## Chat & UI/UX
- [1] Bestes Chat-IDE-Feeling (Look & Feel wie moderne IDEs)
- [1] Verbesserte Eingabefelder (Auto-Resize, Markdown, Snippets, etc.)
- [1] Smart Scroll & Flicker-Free Chat
- [2] Label/Markierung für Code-Änderungen (falls möglich)
- [2] Modal für Datei- und Dokumentenübersicht (Projektstruktur)
- [2] Drag & Drop für Dateien in den Chat
- [2] Kontextmenüs für Chatnachrichten (z.B. Copy, Edit, Delete)
- [2] Verbesserte Navigation (Shortcuts, Quick-Open, etc.)

## Weitere Ideen (Single-User, lokal auf IDE/Projekt)
- [3] Chat-zu-Task-Conversion: Chatnachrichten in Aufgaben/Tickets umwandeln (z.B. für Issue-Tracker)
- [3] Voice/Video-Chat: Optionaler Call direkt im Workspace
- [2] Plugin-System: Erweiterungen/Integrationen (z.B. Linter, Formatter, Test-Runner) nachladbar
- [2] API/Backend-Explorer: Endpunkte testen, Datenbank-Viewer, direkt im UI
- [2] History/Timeline: Verlauf aller Änderungen, Chat- und Dateiaktionen, Undo/Redo für alles
- [2] Integrierte Doku/Help: Markdown-Viewer für Projektdokumentation, API-Docs, Chat-Befehle
- [3] Customizable Layout: Panels/Modals andocken, verschieben, ausblenden (wie in VSCode)
- [2] Quick File Search: Fuzzy-Suche über alle Projektdateien, inkl. Vorschau
- [2] Terminal-Integration: Web-Terminal im UI, direkt im Projektkontext
- [2] Command Palette: Schnelle Aktionen/Kommandos (wie in modernen IDEs, z.B. "Datei öffnen", "Formatieren", "Suchen")
- [2] Notification-System: Hinweise zu Build-Status, neuen Nachrichten, Fehlern, etc.
- [2] Theme-Support: Light/Dark-Mode, eigene Farbschemen, Editor- und Chat-Themes
- [2] Integrierte Git-Controls: Git-Status, Commits, Branches, Diffs direkt im UI (inkl. Inline-Diff-Ansicht) 