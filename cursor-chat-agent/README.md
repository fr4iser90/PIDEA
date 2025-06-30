# Cursor Chat Agent – Technische Gesamtdokumentation

## Ziel

Ein System, das es ermöglicht, den Chat von Cursor IDE vollständig remote zu bedienen (lesen & schreiben), ohne Fremd-LLMs, abgesichert über VPN, steuerbar per Android-App oder Web-UI. Die Lösung funktioniert auf allen gängigen Betriebssystemen und benötigt keine internen Cursor-APIs oder Extensions.

**WICHTIG:**
- **Primär:** Wir setzen auf Node.js, Express und Playwright, um den Chat per DOM-Automation zu steuern (Nachrichten schreiben und lesen direkt im UI von Cursor IDE).
- **Fallback:** pyautogui/pytesseract (Python) wird nur implementiert, falls DOM-Automation nicht mehr möglich ist.

---

## Architekturübersicht

```
[Android-App / Web-UI]
        |
        | REST/WebSocket
        v
[API-Bridge (Agent, Node.js + Playwright) auf PC]
        |
        | DOM-Automation (Playwright)
        v
[Cursor IDE (lokal)]
```

- **Android-App/Web-UI:** Chat-Frontend für den Nutzer
- **API-Bridge (Agent):** Vermittelt zwischen App und Cursor IDE, steuert Chat per Playwright (DOM)
- **Cursor IDE:** Lokale Entwicklungsumgebung mit Chatfunktion
- **VPN:** (WireGuard) schützt die Verbindung, keine Ports offen im Internet

---

## Komponenten & Techstacks

### 1. API-Bridge (Agent)
- **Node.js:**
  - Express (REST-API)
  - Playwright (UI-Automation, DOM-Zugriff)
- **(Fallback, nur falls nötig) Python:**
  - Flask oder FastAPI (REST-API)
  - pyautogui (UI-Steuerung)
  - pytesseract (OCR für Chat-Auslese)
  - Pillow (Bildverarbeitung)

### 2. Mobile/Web-Client
- **React Native** (Android/iOS)
- **Flutter** (Android/iOS)
- **PWA** (React/Vue, läuft im Browser)

### 3. VPN
- **WireGuard** (empfohlen, stabil, performant)

---

## Detaillierte Workflows

### Playwright (Node.js, DOM-Automation)

1. **Nachricht senden:**
   - App sendet POST `/chat` an Agent mit Text.
   - Agent verbindet sich per Playwright mit Cursor IDE (Debug-Port), findet das Chatfeld im DOM, setzt Text, triggert Senden.
2. **Chat lesen:**
   - App fragt GET `/chat-history` ab.
   - Agent liest Chatverlauf direkt aus DOM, gibt als JSON/Text zurück.

### (Nur Fallback) pyautogui + pytesseract (Python)

1. **Nachricht senden:**
   - App sendet POST `/chat` an Agent mit Text.
   - Agent fokussiert Cursor IDE, klickt ins Chatfeld, tippt Text, drückt Enter.
2. **Chat lesen:**
   - App fragt GET `/chat-history` ab.
   - Agent macht Screenshot vom Chatbereich, liest Text per OCR, gibt als JSON/Text zurück.

---

## Endpunkte (API-Bridge)

- `POST /chat` – Neue Nachricht an Cursor-Chat senden
- `GET /chat-history` – Aktuellen Chatverlauf abrufen
- (Optional) `GET /logs` – System-/Fehlerlogs abrufen

---

## Sicherheit

- **VPN (WireGuard):** Nur Geräte im VPN können Agent erreichen
- **API-Bridge:** Läuft nur auf localhost oder im VPN, keine öffentliche API
- **(Optional) Auth:** Token oder Basic Auth für zusätzliche Absicherung

---

## Vorteile & Nachteile der Techstacks

### Playwright (Node.js)
+ Sehr präzise, keine OCR nötig
+ Kann gezielt DOM-Elemente ansteuern
+ Schnell, stabil, wartbar
– Funktioniert nur, wenn Cursor IDE Remote-Debugging/DevTools-Zugriff erlaubt
– Komplexer im Setup

### (Fallback) pyautogui + pytesseract
+ Funktioniert überall, keine IDE-API nötig
+ Schnell aufgesetzt
– Muss Koordinaten/Bildanker für Chatfeld/Senden-Button kennen
– OCR kann Fehler machen
– UI-Änderungen können das System stören

---

## Beispiel-Architekturdiagramm (Text)

```
+-------------------+        REST/WebSocket        +-------------------+        Playwright (DOM)        +-------------+
|  Android/Web-App  | <-------------------------> |   API-Bridge      | <----------------------------> | Cursor IDE  |
+-------------------+                             +-------------------+                                +-------------+
```

---

## Umsetzungsschritte

1. **VPN einrichten (WireGuard)**
2. **API-Bridge (Agent, Node.js + Playwright) auf PC installieren**
   - Node.js: Express, Playwright
3. **DOM-Selektoren für Chatfeld/Senden-Button bestimmen**
4. **Mobile/Web-Client entwickeln**
   - Chat-UI, REST-API-Anbindung
5. **Testen & Iterieren**
6. **(Nur falls nötig) Fallback mit pyautogui/pytesseract implementieren**

---

## Hinweise
- Playwright ist der Standardweg, pyautogui/pytesseract nur als Notlösung.
- Keine Extension nötig, wenn UI-Automation genutzt wird.
- Backup von Cursor-Workspaces empfohlen, falls UI-Automation schiefgeht.

---

## Zusammenfassung

**Das System steuert den Cursor IDE Chat remote per DOM-Automation (Playwright). Nur wenn das nicht mehr möglich ist, wird auf UI-Automation mit pyautogui/pytesseract zurückgegriffen.**

---

## WICHTIG: KORREKTE DOM-SELECTOREN FÜR CHAT-NACHRICHTEN (User & KI)

**User-Message (dein Input):**
- Selector: `.aislash-editor-input-readonly[contenteditable="false"]`
- Erkennung:
  - `className` enthält `aislash-editor-input-readonly`
  - `tagName` ist `DIV`
  - `html` enthält `data-lexical-editor="true"`

**KI-Message (AI/Assistant):**
- ALLE anderen Selektoren aus der Liste, z.B.:
  - `.aislash-editor-message`
  - `.aislash-editor-response`
  - `.aislash-editor-content`
  - `[data-testid="chat-message"]`
  - `.chat-message`
  - `.message-content`
  - `div.hide-if-empty .message-content-animated`
  - `div.message-content-animated`
  - `span.anysphere-markdown-container-root`
  - `section.markdown-section`
  - `[role="log"] > div`
  - `.chat-container > div`
  - `.conversation-item`
  - `[data-testid="assistant-message"]`
  - `[data-testid="ai-message"]`
  - `.assistant-message`
  - `.ai-message`
  - `.bot-message`
  - `.cursor-message`
  - `.aislash-editor-message code`
  - `.aislash-editor-response code`
  - `.aislash-editor-content code`

**Label-Logik im Code:**
```js
if (
  msg.className && msg.className.includes('aislash-editor-input-readonly') &&
  msg.tagName && msg.tagName.toLowerCase() === 'div' &&
  msg.html && msg.html.includes('data-lexical-editor="true"')
) {
  return 'User: ' + text;
}
return 'KI: ' + text;
```

**Wenn KEINE KI-Nachrichten angezeigt werden, matched KEIN Selector auf die KI-Antworten im DOM! Dann Debug-Button im Web-UI nutzen und den DOM-Output posten!** 