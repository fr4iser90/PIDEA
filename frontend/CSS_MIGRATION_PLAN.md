# CSS Migration Plan - Alte CSS-Dateien zu SCSS

## 🎯 Ziel
Sichere Migration von alten CSS-Dateien zum neuen SCSS-System

## ⚠️ WICHTIG: Nicht sofort löschen!
Die alten CSS-Dateien werden noch von 70+ Komponenten verwendet.

## 📋 Migrationsschritte

### Phase 1: Komponenten-Migration (Empfohlen)
1. **Komponente für Komponente migrieren**
   - Alte CSS-Datei in SCSS-Komponente umwandeln
   - Import in Komponente ändern
   - Testen
   - Alte CSS-Datei löschen

### Phase 2: Batch-Migration (Fortgeschritten)
1. **Alle CSS-Dateien auf einmal migrieren**
   - Alle CSS-Imports in SCSS umwandeln
   - Alle Komponenten auf einmal aktualisieren
   - Komplettes Testing

### Phase 3: Cleanup
1. **CSS-Ordner löschen**
   - Nur nach vollständiger Migration
   - Backup erstellen
   - Finales Testing

## 🚀 Schnellstart (Empfohlen)

### Option A: Einzelne Komponente migrieren
```bash
# Beispiel: ChatComponent migrieren
1. Kopiere chat.css nach scss/components/_chat.scss
2. Konvertiere zu BEM-Methodik
3. Ändere Import in ChatComponent.jsx
4. Teste
5. Lösche alte chat.css
```

### Option B: Automatische Migration (Fortgeschritten)
```bash
# Alle CSS-Imports finden und ersetzen
npm run migrate-css-to-scss
```

## 📁 Betroffene Dateien

### Haupt-Imports (main.jsx)
- ✅ `@/scss/main.scss` - NEU, bereits aktiv
- ⚠️ `@/css/global/sidebar-left.css` - ALT, noch verwendet
- ⚠️ `@/css/global/sidebar-right.css` - ALT, noch verwendet  
- ⚠️ `@/css/panel/chat-panel.css` - ALT, noch verwendet

### Komponenten-Imports (70+ Dateien)
- Alle Komponenten in `/presentation/components/` verwenden noch alte CSS-Imports
- Diese müssen einzeln oder batch-migriert werden

## 🛡️ Sicherheitsmaßnahmen

1. **Backup erstellen**
   ```bash
   cp -r src/css src/css_backup
   ```

2. **Git Commit vor Migration**
   ```bash
   git add .
   git commit -m "Backup before CSS migration"
   ```

3. **Schrittweise Migration**
   - Immer nur eine Komponente auf einmal
   - Nach jeder Migration testen
   - Bei Problemen sofort rollback

## ✅ Nach Migration

1. **CSS-Ordner löschen**
   ```bash
   rm -rf src/css
   ```

2. **Build testen**
   ```bash
   npm run build
   npm run dev
   ```

3. **Linting prüfen**
   ```bash
   npm run lint:css
   ```

## 🎯 Empfehlung

**Starte mit einer einzelnen Komponente** (z.B. ChatComponent) und teste den Workflow, bevor du alle auf einmal migrierst.
