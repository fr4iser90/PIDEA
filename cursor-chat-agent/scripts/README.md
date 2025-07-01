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