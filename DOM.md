# KOMPLETTE DOM-ANALYSE CURSOR CHAT

## ECHTER DOM-OUTPUT (vom User)

### User-Nachricht (dein Input):
```html
<div class="aislash-editor-input-readonly" contenteditable="false" data-lexical-editor="true">
  <p dir="ltr">
    <span data-lexical-text="true">DEIN TEXT</span>
  </p>
</div>
```

### KI-Nachricht (AI/Assistant):
```html
<div tabindex="0" data-message-index="7" class=" hide-if-empty" id="bubble-682d7e84b828">
  <div class="" style="background-color: transparent;">
    <div>
      <span class="anysphere-markdown-container-root" style="user-select: text; font-size: 1em; line-height: 1.5;">
        <section id="markdown-section-c605e5a7-5bfc-4f36-a45f-682d7e84b828-0" class="markdown-section" data-markdown-raw="" data-section-index="0">
          <!-- KI-Text hier -->
        </section>
      </span>
    </div>
  </div>
</div>
```

## DOM-STRUKTUR ANALYSE

### 1. USER-NACHRICHTEN
**Container:** `div.composer-human-message`
**Input-Feld:** `div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]`
**Text-Inhalt:** `span[data-lexical-text="true"]`

**Vollständige Struktur:**
```html
<div tabindex="0" data-message-index="6" class=" hide-if-empty" id="bubble-0ed6e38299ed">
  <div class="" style="background-color: transparent;">
    <div style="display: flex; align-items: flex-start; justify-content: flex-end; gap: 8px; width: 100%;">
      <div style="display: flex; flex-direction: column; align-items: flex-end; width: 100%;">
        <div class="composer-human-message" style="cursor: pointer; background-color: var(--vscode-input-background); outline: none;">
          <div class="p-2 box-border w-full flex flex-col gap-1.5">
            <!-- Context Pills (Dateien, etc.) -->
            <div tabindex="0" style="display: flex; flex-direction: column; gap: 4px; outline: none; overflow: hidden; color: var(--vscode-input-placeholderForeground);">
              <!-- File pills hier -->
            </div>
            <!-- USER INPUT HIER -->
            <div style="max-height: 240px; mask-image: none;">
              <div aria-autocomplete="none" autocapitalize="off" class="aislash-editor-input-readonly" contenteditable="false" spellcheck="false" data-lexical-editor="true" style="resize: none; grid-area: 1 / 1 / 1 / 1; overflow: hidden; line-height: 1.5; font-family: inherit; font-size: 12px; color: var(--vscode-input-foreground); background-color: transparent; display: block; outline: none; scrollbar-width: none; box-sizing: border-box; border: none; overflow-wrap: break-word; word-break: break-word; padding: 0px; user-select: text; white-space: pre-wrap;">
                <p dir="ltr">
                  <span data-lexical-text="true">DEIN TEXT</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 2. KI-NACHRICHTEN
**Container:** `div[data-message-index]` mit `class=" hide-if-empty"`
**Content:** `span.anysphere-markdown-container-root`
**Sections:** `section.markdown-section`

**Vollständige Struktur:**
```html
<div tabindex="0" data-message-index="7" class=" hide-if-empty" id="bubble-682d7e84b828" style="display: block; outline: none; padding: 0.4rem 18px; opacity: 1; position: relative;">
  <div class="" style="background-color: transparent;">
    <div>
      <span class="anysphere-markdown-container-root" style="user-select: text; font-size: 1em; line-height: 1.5;">
        <section id="markdown-section-c605e5a7-5bfc-4f36-a45f-682d7e84b828-0" class="markdown-section" data-markdown-raw="" data-section-index="0">
          <!-- KI-Text mit Markdown-Formatierung -->
        </section>
        <section id="markdown-section-c605e5a7-5bfc-4f36-a45f-682d7e84b828-1" class="markdown-section" data-markdown-raw="" data-section-index="1">
          <!-- Weitere Sections für komplexe Antworten -->
        </section>
      </span>
    </div>
  </div>
</div>
```

## RICHTIGE SELECTOREN (basierend auf ECHTEM DOM)

### USER-Nachricht:
```css
.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]
```

### KI-Nachricht:
```css
/* Alle anderen Chat-Elemente */
div[data-message-index].hide-if-empty
span.anysphere-markdown-container-root
section.markdown-section
```

## PLAYWRIGHT SELECTOREN

### Sammle ALLE Chat-Elemente:
```javascript
const allMessages = await page.$$eval(`
  div[data-message-index], 
  .aislash-editor-input-readonly, 
  .aislash-editor-message, 
  .aislash-editor-response, 
  span.anysphere-markdown-container-root,
  section.markdown-section
`, elements => {
  return elements.map(el => ({
    text: el.textContent?.trim() || '',
    className: el.className || '',
    contenteditable: el.getAttribute('contenteditable'),
    dataLexicalEditor: el.getAttribute('data-lexical-editor'),
    tagName: el.tagName,
    html: el.outerHTML,
    messageIndex: el.getAttribute('data-message-index'),
    id: el.id
  }));
});
```

## LABEL-LOGIK

```javascript
const labeledMessages = allMessages
  .filter(msg => msg.text && msg.text.trim().length > 0)
  .map(msg => {
    // Prüfe User-Selector
    if (
      msg.className && msg.className.includes('aislash-editor-input-readonly') &&
      msg.contenteditable === 'false' &&
      msg.dataLexicalEditor === 'true'
    ) {
      return `User: ${msg.text}`;
    } else {
      return `KI: ${msg.text}`;
    }
  });
```

## DOM-ELEMENTE HIERARCHIE

```
Cursor Chat Container
├── Load older messages button
├── Message Bubbles (div[data-message-index])
│   ├── User Messages
│   │   ├── composer-human-message
│   │   │   ├── Context pills (Dateien, etc.)
│   │   │   └── aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]
│   │   │       └── p dir="ltr"
│   │   │           └── span[data-lexical-text="true"] (DEIN TEXT)
│   │   └── Action buttons (Copy, etc.)
│   └── AI Messages
│       ├── anysphere-markdown-container-root
│       │   └── markdown-section[data-section-index]
│       │       └── Formatted KI-Text
│       └── Action buttons (Copy, etc.)
└── Input area (für neue Nachrichten)
```

## WICHTIGE ERKENNTNISSE

1. **User-Nachrichten** haben IMMER:
   - `class="aislash-editor-input-readonly"`
   - `contenteditable="false"`
   - `data-lexical-editor="true"`

2. **KI-Nachrichten** haben IMMER:
   - `span.anysphere-markdown-container-root`
   - `section.markdown-section`
   - KEINE der User-Attribute

3. **Beide Typen** sind in `div[data-message-index]` Containern

4. **Text-Extraktion:**
   - User: `span[data-lexical-text="true"]`
   - KI: `section.markdown-section` (mit Markdown-Formatierung)

## DEBUGGING-INFO

### User-Nachricht erkannt wenn:
```javascript
element.className.includes('aislash-editor-input-readonly') &&
element.getAttribute('contenteditable') === 'false' &&
element.getAttribute('data-lexical-editor') === 'true'
```

### KI-Nachricht erkannt wenn:
```javascript
!element.className.includes('aislash-editor-input-readonly') ||
element.getAttribute('contenteditable') !== 'false' ||
element.getAttribute('data-lexical-editor') !== 'true'
```

## FAZIT

**RICHTIGE SELECTOREN:**
- **User:** `.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]`
- **KI:** ALLES andere

**RICHTIGE LOGIK:**
- Prüfe User-Selector → Wenn matched → User
- Sonst → KI

**Das ist die EINZIG richtige Lösung für deinen Cursor-Chat!**