# DOM-Analyzer Script

## Überblick
Das DOM-Analyzer Script (`dom-analyzer.js`) analysiert automatisch alle DOM-Source Dateien und extrahiert alle verfügbaren CSS-Selektoren für Chat-Features.

## Features
- 🔍 **Automatische Selektor-Extraktion** aus allen `*-dom-source.md` Dateien
- 🎯 **Feature-Kategorisierung** (New Chat, Chat History, Chat Input, etc.)
- 📊 **Optimierte Selektoren** mit Prioritäts-Ranking
- 📋 **Vollständige Statistiken** über alle gefundenen Elemente
- 📄 **JSON-Output** für weitere Verarbeitung

## Installation
```bash
# jsdom dependency installieren
npm install

# Oder manuell:
npm install jsdom@^23.0.1
```

## Ausführung
```bash
# Via npm script (empfohlen)
npm run analyze-dom

# Oder direkt
node scripts/dom-analyzer.js
```

### **Automatische Datei-Auswahl:**
- ✅ **Bevorzugt**: `all-cursor-dom-source.md` (komplettes DOM)
- 🔄 **Fallback**: Einzelne `*-dom-source.md` Dateien falls all-* nicht existiert

## Output
Das Script erstellt: `output/dom-analysis-results.json`

### Output-Struktur:
```json
{
  "meta": {
    "generatedAt": "2024-12-19T...",
    "script": "dom-analyzer.js",
    "stats": { ... }
  },
  "optimizedSelectors": {
    "newChat": "a.action-label[aria-label*=\"New Chat\"]",
    "chatHistory": "a.action-label[aria-label*=\"Chat History\"]",
    "chatInput": ".aislash-editor-input[contenteditable=\"true\"]",
    "userMessages": ".aislash-editor-input-readonly[contenteditable=\"false\"]",
    "aiMessages": ".anysphere-markdown-container-root",
    // ... weitere Selektoren
  },
  "detailedFeatures": {
    // Detaillierte Informationen pro Feature
  },
  "allElements": [
    // Erste 100 Elemente mit allen Selektoren
  ]
}
```

## Erkannte Features
Das Script erkennt automatisch folgende Chat-Features:

### Chat Actions
- **newChat** - "New Chat" Button (Ctrl+N)
- **chatHistory** - "Chat History" Button (Ctrl+Alt+')
- **settings** - Settings Button
- **moreActions** - "More Actions" / Ellipsis Button
- **backgroundAgents** - "Background Agents" Button

### Chat Input/Output
- **chatInput** - Chat-Eingabefeld
- **userMessages** - User-Nachrichten
- **aiMessages** - AI-Antworten
- **sendButton** - Send/Submit Button

### Chat UI
- **chatTabs** - Chat-Tabs
- **chatContainer** - Chat-Container

## Verwendung der Ergebnisse

### 1. Selektoren in Code verwenden:
```javascript
const results = require('../output/dom-analysis-results.json');
const newChatSelector = results.optimizedSelectors.newChat;

// In Playwright verwenden
await page.click(newChatSelector);
```

### 2. Selektoren-Datei generieren:
```javascript
// Erstelle cursor/selectors.js aus den Ergebnissen
const selectors = results.optimizedSelectors;
export const CURSOR_SELECTORS = selectors;
```

### 3. Tests generieren:
```javascript
// Automatische Tests für alle Features
Object.entries(results.optimizedSelectors).forEach(([feature, selector]) => {
  test(`${feature} should be found`, async () => {
    const element = await page.$(selector);
    expect(element).toBeTruthy();
  });
});
```

## Debugging
Falls das Script Fehler zeigt:

1. **Prüfe DOM-Source Dateien:**
   ```bash
   ls docs/ides/cursor/*-dom-source.md
   ```

2. **HTML-Struktur validieren:**
   - Öffne eine DOM-Source Datei
   - Prüfe ob sie gültiges HTML enthält

3. **Output überprüfen:**
   ```bash
   cat output/dom-analysis-results.json | jq '.meta.stats'
   ```

## Erweitern
Um neue Features zu erkennen, erweitere die `extractFeatures()` Methode:

```javascript
// In dom-analyzer.js
extractFeatures(document, sourceFile) {
  const features = {
    // Bestehende Features...
    
    // Neues Feature hinzufügen:
    newFeature: this.findElements(document, [
      '.your-selector',
      '[aria-label*="Your Label"]'
    ]),
  };
}
```

## Troubleshooting
- **Keine Dateien gefunden:** Prüfe Pfad zu `docs/ides/cursor/`
- **HTML Parse-Fehler:** Prüfe HTML-Syntax in DOM-Source Dateien
- **Leere Ergebnisse:** Prüfe ob HTML in DOM-Source Dateien vorhanden 

# DOM Analysis Scripts

## Current Coverage Status ✅

**31/43 Features erfolgreich erkannt** (72% Abdeckung)

### ✅ Bereits erfasste Bereiche:
- **Chat System:** 9 Features (komplett)
- **File Explorer:** 5 Features (komplett) 
- **Editor:** 5 Features (komplett)
- **Git Integration:** 4 Features (komplett)
- **Terminal & Debug:** 5 Features (komplett)
- **Status & AI:** 3 Features (komplett)

## 🎯 Fehlende Features sammeln

### Features die nur in bestimmten Zuständen sichtbar sind:

#### 1. **Command Palette & Quick Actions**
```bash
# Öffne Command Palette und sammle DOM:
Ctrl+Shift+P → DOM sammeln
Ctrl+P → DOM sammeln  
Ctrl+G → DOM sammeln
```

#### 2. **Extensions Panel** 
```bash
# Extensions-Seitenleiste öffnen:
Ctrl+Shift+X → DOM sammeln
```

#### 3. **Search Panel**
```bash
# Global Search öffnen:
Ctrl+Shift+F → DOM sammeln
```

#### 4. **Debug Panel aktiv**
```bash
# Debug-Seitenleiste + Debug-Session:
Ctrl+Shift+D → Breakpoint setzen → F5 → DOM sammeln
```

#### 5. **Problems & Output Panels**
```bash
# Panels öffnen:
Ctrl+Shift+M (Problems) → DOM sammeln
Ctrl+Shift+U (Output) → DOM sammeln
```

## 📋 DOM-Sammlung Checkliste

### Phase 1: Standard-Zustände ✅
- [x] Normal IDE-Ansicht
- [x] Chat aktiv
- [x] File Explorer geöffnet
- [x] Editor mit Tabs
- [x] Terminal geöffnet

### Phase 2: Erweiterte Zustände 🎯
- [ ] Command Palette geöffnet
- [ ] Quick Open geöffnet
- [ ] Extensions Panel aktiv
- [ ] Search Panel aktiv
- [ ] Debug Session aktiv
- [ ] Problems Panel geöffnet
- [ ] Output Panel geöffnet
- [ ] Settings UI geöffnet

### Phase 3: Kontextmenüs 🎯
- [ ] File Context Menu (Rechtsklick)
- [ ] Editor Context Menu
- [ ] Git Context Menu
- [ ] Extension Context Menu

## 🚀 Vollständige Automatisierung erreichen

### Empfohlene Sammlungsreihenfolge:
1. **Command Palette States** (höchste Priorität)
2. **Extensions Management** 
3. **Debug & Problems**
4. **Kontextmenüs**
5. **Settings & Preferences**

### Nach jeder Sammlung:
```bash
npm run analyze-dom
```

## 📊 Ziel: 100% Coverage
**Aktuell: 31/43 Features (72%)**
**Ziel: 43/43 Features (100%)** 