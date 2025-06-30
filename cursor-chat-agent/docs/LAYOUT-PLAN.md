# Layout-Plan: Cursor IDE Webschnittstelle

---

## 1. Struktur (Panels & Bereiche)

### A. Header (oben, fixiert)
- App-Name, Status, User/Settings, Theme-Switcher

### B. Sidebar (links, ein-/ausblendbar)
- Tabs/Buttons für:
  - **Projektstruktur (Tree-View)**
  - **Extensions**
  - **Dokumente**
- Tree-View zeigt das gesamte Projekt (wie in IDE)
- Extensions als eigene Sektion

### C. Main Area (zentral, flexibel)
- **Tabs für offene Dateien/Sessions** (wie VSCode)
- **Editor-Panel** (Code-Editor, Markdown-Editor, Preview)
- **Preview-Panel** (Markdown/Code gerendert, ggf. Split-View)
- **Umschaltbar:** Editor ↔ Preview ↔ Chat

### D. Chat-Panel (unten, immer sichtbar oder ein-/ausklappbar)
- Chatverlauf, Eingabefeld, Senden-Button, Drag & Drop für Dateien
- Smart Scroll, Auto-Resize, Kontextmenüs

---

## 2. Umschaltlogik & Navigation

- **Sidebar-Tabs:** Wechsel zwischen Projektstruktur, Extensions, Dokumenten
- **Main-Tabs:** Wechsel zwischen offenen Dateien/Sessions
- **Split-View:** Optional Editor + Preview nebeneinander
- **Chat immer erreichbar:** Entweder als Dock unten oder als Overlay/Drawer

---

## 3. Responsive & Modern

- **Flexbox/Grid** für alle Bereiche
- Sidebar auf Mobile als Drawer
- Main-Content im Fokus, Chat als Slide-Up/Overlay

---

## 4. UX-Details

- **Drag & Drop** für Dateien in Chat/Editor
- **Kontextmenüs** für Nachrichten und Dateien
- **Quick-Open/Command Palette**
- **Theme-Switcher (Dark/Light)**
- **Smart Scroll, Auto-Resize für Eingabefelder** 