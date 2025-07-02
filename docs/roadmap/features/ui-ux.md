# UI/UX Improvements & Consistency Plan

## Aktueller Zustand & Analyse

### 1. Inkonsistenzen & Schwächen
- **Fehlende Rahmen und Schatten**: Das Chat-Panel und andere UI-Elemente wirken "flach" und grenzen sich nicht klar voneinander ab.
- **Unterschiedliche Abstände & Padding**: Manche Komponenten haben zu wenig/zu viel Abstand, was das Layout unruhig macht.
- **Fehlende visuelle Hierarchie**: Wichtige Bereiche (Chat, Sidebar, Panels) heben sich nicht klar hervor.
- **Responsivität**: Das Layout ist nicht überall optimal responsiv, z.B. bei Panel-Umschaltungen oder im Fullscreen-Modus.
- **Farbschema & Kontraste**: Teilweise zu wenig Kontrast zwischen Panels, Buttons und Hintergrund.
- **Button-Design**: Buttons und Controls sind nicht überall einheitlich (Größe, Radius, Shadow, Hover).
- **Panel-Header**: Header und Tabs wirken teils "angeklebt" und nicht abgesetzt.
- **Fehlende Micro-Interactions**: Keine/kaum Hover-, Focus- oder Active-States.
- **Scrollbar-Design**: Standard-Scrollbars, keine Custom-Scrollbars für Panels.
- **Mobile/Tablet**: Keine optimierte Ansicht für kleinere Screens.

### 2. Positive Aspekte
- **Split View & Panel-Layout**: Grundstruktur ist klar und logisch.
- **Schnell-Prompts & Controls**: Funktionalität ist gut zugänglich.
- **Dark Mode**: Grundsätzlich vorhanden und angenehm.

---

## Verbesserungsmaßnahmen

### 1. Rahmen & Schatten (Card-Design)
- **Panels, Chatbox, Sidebar, Prompts** als "Cards" mit abgerundeten Ecken, Schatten (z.B. `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`), klaren Rahmen (`border: 1px solid #23272e`)
- **Abgrenzung** zwischen Chat, Sidebar, Info-Panel durch Schatten und Abstand

### 2. Konsistente Abstände & Padding
- **Globales Spacing-System** (z.B. 8px/16px/24px)
- **Einheitliches Padding** für alle Panels, Buttons, Inputs
- **Panels**: Mindestens 16px Innenabstand

### 3. Visuelle Hierarchie
- **Panel-Header** mit stärkerem Hintergrund, Schatten unten, größere Schrift
- **Tabs**: Aktiver Tab farblich und mit Shadow hervorheben
- **Wichtige Aktionen** (z.B. Senden-Button) farblich hervorheben

### 4. Responsivität
- **Flexbox/Grid** für alle Haupt-Layouts
- **Panels stapeln** sich untereinander auf kleinen Screens
- **Sidebar und Info-Panel** als Drawer/Offcanvas auf Mobile
- **Minimale Breiten** für Panels, damit nichts "zusammenfällt"

### 5. Farbschema & Kontraste
- **Primärfarben**: Einheitlich für Buttons, Links, aktive Tabs
- **Panels**: Unterschiedliche, aber harmonische Hintergründe (z.B. leicht abgedunkelt)
- **Hover/Active**: Deutliche Farbänderung

### 6. Buttons & Controls
- **Einheitliche Größe, Radius, Shadow**
- **Hover-, Focus-, Active-States**
- **Icons** konsistent verwenden (z.B. Material Icons, Feather)

### 7. Panel-Header & Tabs
- **Header** mit Schatten unten, abgesetztem Hintergrund
- **Tabs**: Abgerundet, aktiver Tab mit Shadow und kräftiger Farbe

### 8. Micro-Interactions
- **Transitions** für Hover, Focus, Panel-Öffnen
- **Button-Feedback** (z.B. leichtes "Drücken")

### 9. Custom Scrollbars
- **Panels**: Eigene Scrollbars (dünn, abgerundet, farblich angepasst)

### 10. Mobile/Tablet-Optimierung
- **Panels als Drawer**
- **Buttons größer**
- **Touch-Optimierung** (Abstände, keine zu kleinen Click-Flächen)

---

## Beispiel: CSS-Designsystem (Ausschnitt)

```css
:root {
  --color-bg: #181a20;
  --color-panel: #23272e;
  --color-border: #2c313a;
  --color-shadow: 0 2px 8px rgba(0,0,0,0.08);
  --color-primary: #3b82f6;
  --color-accent: #f59e42;
  --radius: 10px;
  --padding: 16px;
}

.panel {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--color-shadow);
  padding: var(--padding);
  margin-bottom: 16px;
}

.button {
  background: var(--color-primary);
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
}
.button:hover {
  background: #2563eb;
  transform: translateY(-2px) scale(1.03);
}

.tab {
  background: transparent;
  border-radius: 8px 8px 0 0;
  padding: 8px 20px;
  font-weight: 600;
  transition: background 0.2s;
}
.tab.active {
  background: var(--color-panel);
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  color: var(--color-primary);
}

::-webkit-scrollbar {
  width: 8px;
  background: #23272e;
}
::-webkit-scrollbar-thumb {
  background: #3b4252;
  border-radius: 8px;
}
```

---

## Komponenten-Checkliste für Redesign
- [ ] Chat-Panel (Rahmen, Shadow, Padding, Responsiv)
- [ ] Sidebar (Rahmen, Shadow, Drawer auf Mobile)
- [ ] Info-Panel (Tabs, Header, Shadow)
- [ ] Schnell-Prompts (Button-Design, Abstand)
- [ ] Panel-Header (Abgesetzt, Shadow)
- [ ] Tabs (Abgerundet, aktiv hervorgehoben)
- [ ] Buttons (Konsistent, Hover, Focus, Active)
- [ ] Custom Scrollbars
- [ ] Micro-Interactions (Transitions, Feedback)
- [ ] Mobile-Ansicht (Drawer, größere Buttons)

---

## Umsetzungsempfehlung
1. **Designsystem als CSS-Variablen und Utility-Klassen anlegen**
2. **Alle Panels und Komponenten auf Card-Design umstellen**
3. **Responsives Layout mit Flexbox/Grid**
4. **Micro-Interactions und Custom Scrollbars implementieren**
5. **Mobile-Optimierung (Drawer, größere Click-Flächen)**
6. **Regelmäßige UI-Reviews für Konsistenz**

---

## Zielbild
Ein modernes, konsistentes, responsives UI mit klarer visueller Hierarchie, angenehmen Schatten, abgerundeten Panels, einheitlichen Buttons und optimaler Bedienbarkeit auf allen Geräten. 