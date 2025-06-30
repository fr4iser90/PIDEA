# Layout-Plan: Cursor Chat Web (Modern, Fokus: Chat)

---

## 1. Struktur (Panels & Bereiche)

### A. Header (oben, fixiert)
- App-Name, Status, User/Settings, Theme-Switcher

### B. (Optional) Sidebar (links, schmal, ein-/ausblendbar)
- Projektstruktur/Dateien (Tree-View), aber minimiert, nie im Fokus
- Öffnet als Drawer/Overlay, nicht dauerhaft sichtbar

### C. Main Area (zentral, 80% Breite, Fokus)
- **Chatverlauf** (zentral, groß, modern, Markdown/Code-Highlighting)
- **Eingabefeld** (unten, auto-resize, modern, Senden per Enter)
- **Datei-Upload-Button** (rechts neben Eingabe)
- **Drag & Drop** für Dateien

### D. (Optional) Drawer/Modal
- Für Dateibaum, Doku, Extensions, öffnet über den Chat, niemals daneben

---

## 2. Umschaltlogik & Navigation

- **Sidebar/Drawer:** Projektstruktur/Dateien nur als Overlay/Drawer
- **Chat immer im Mittelpunkt:** Kein Editor/Preview als Hauptpanel
- **(Optional) Modale Overlays:** Für Doku, Extensions, etc.

---

## 3. Responsive & Modern

- **Flexbox/Grid** für alle Bereiche
- Sidebar/Drawer auf Mobile als Overlay
- Main-Content = Chat, immer im Fokus

---

## 4. UX-Details

- **Drag & Drop** für Dateien in Chat
- **Kontextmenüs** für Nachrichten
- **Quick-Open/Command Palette** (optional)
- **Theme-Switcher (Dark/Light)**
- **Smart Scroll, Auto-Resize für Eingabefelder**
- **Copy-Buttons für Codeblöcke** 