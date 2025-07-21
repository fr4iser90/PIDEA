# SEND MESSAGE FUNKTIONEN - ANALYSE & PLAN

## 🚨 AKTUELLE PROBLEME

### 1. INFINITE LOOP DETECTED
```
[ide_send_message] 📤 Sending message to IDE for project pidea
[StepRegistry] 🚀 Executing step "IDESendMessageStep"...
[ide_send_message] 📤 Sending message to IDE for project pidea
[StepRegistry] 🚀 Executing step "IDESendMessageStep"...
```
**URSACHE:** `CursorIDEService.sendMessage()` ruft `IDESendMessageStep` auf → INFINITE LOOP!

### 2. DUPLIKATE FUNKTIONEN
- `SendMessageHandler` ❌ (GELÖSCHT)
- `IDESendMessageStepEnhanced` ❌ (GELÖSCHT) 
- `IDESendMessageStep` ✅ (RICHTIG)
- `CursorIDEService.sendMessage()` ❌ (INFINITE LOOP)

## 📋 FUNKTIONEN ANALYSE

### ❌ FALSCH - LÖSCHEN/REPAIREN:

#### 1. `SendMessageHandler` 
- **STATUS:** GELÖSCHT ✅
- **PROBLEM:** Duplikat von Step-basierter Architektur
- **DATEI:** `backend/application/handlers/categories/management/SendMessageHandler.js`

#### 2. `IDESendMessageStepEnhanced`
- **STATUS:** GELÖSCHT ✅  
- **PROBLEM:** Duplikat von `IDESendMessageStep`
- **DATEI:** `backend/domain/steps/categories/chat/ide_send_message_enhanced.js`

#### 3. `CursorIDEService.sendMessage()` 
- **STATUS:** INFINITE LOOP ❌
- **PROBLEM:** Ruft `stepRegistry.executeStep('IDESendMessageStep')` auf
- **DATEI:** `backend/domain/services/CursorIDEService.js:60-80`
- **LÖSUNG:** Direkt `browserManager.typeMessage()` verwenden

### ✅ RICHTIG - BEHALTEN:

#### 1. `IDESendMessageStep`
- **STATUS:** HAUPTFUNKTION ✅
- **DATEI:** `backend/domain/steps/categories/chat/ide_send_message.js`
- **FUNKTION:** Step-basierte Chat-Nachrichten an IDE senden
- **SERVICES:** `cursorIDEService.sendMessage()`

#### 2. `browserManager.typeMessage()`
- **STATUS:** UNTERLIEGENDE FUNKTION ✅
- **DATEI:** `backend/infrastructure/external/BrowserManager.js`
- **FUNKTION:** Direkte Monaco Editor Interaktion
- **METHODE:** Playwright-basiert

## 🔧 REPARATUR PLAN

### SCHRITT 1: Fix CursorIDEService
**PROBLEM:** `CursorIDEService.sendMessage()` → `IDESendMessageStep` → `cursorIDEService.sendMessage()` → INFINITE LOOP

**LÖSUNG:** 
```javascript
// ALT (INFINITE LOOP):
const result = await stepRegistry.executeStep('IDESendMessageStep', stepData);

// NEU (DIREKT):
const result = await this.browserManager.typeMessage(message, true);
```

### SCHRITT 2: Service Registrierung prüfen
**PROBLEM:** `cursorIDEService` ist registriert aber verursacht Loop

**LÖSUNG:** 
- `CursorIDEService.sendMessage()` soll `browserManager.typeMessage()` verwenden
- `IDESendMessageStep` soll `cursorIDEService.sendMessage()` verwenden
- KEINE KREUZAUFRUFE!

### SCHRITT 3: Flow korrigieren
```
Chat API → IDESendMessageStep → cursorIDEService.sendMessage() → browserManager.typeMessage()
```

**NICHT:**
```
Chat API → IDESendMessageStep → cursorIDEService.sendMessage() → IDESendMessageStep (LOOP!)
```

## 🎯 ZIEL ARCHITEKTUR

### EINZIGE RICHTIGE FUNKTIONEN:
1. **`IDESendMessageStep`** - Haupt-Step für Chat → IDE
2. **`browserManager.typeMessage()`** - Unterliegende Browser-Interaktion
3. **`CursorIDEService.sendMessage()`** - Direkte Browser-Interaktion (FIXED)

### ENTFERNT:
- ❌ `SendMessageHandler` 
- ❌ `IDESendMessageStepEnhanced`
- ❌ Infinite Loop in `CursorIDEService`

## 🚀 NÄCHSTE SCHRITTE

1. **Fix `CursorIDEService.sendMessage()`** - Entferne Step-Aufruf
2. **Test Chat API** - Verifiziere keine Infinite Loops
3. **Cleanup** - Entferne alle Referenzen auf gelöschte Handler
4. **Validation** - Teste kompletten Chat → IDE Flow

## 📊 STATUS

- ✅ Duplikate gelöscht
- ❌ Infinite Loop behoben
- ✅ Plan erstellt
- ⏳ Implementation pending 