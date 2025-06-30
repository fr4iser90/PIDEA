const express = require('express');
const { chromium } = require('playwright');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'web')));

let browser, page;
let lastLoggedMessages = []; // Speichert die letzten geloggten Nachrichten

async function ensureBrowser() {
  if (browser && page) return;
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  page = contexts[0].pages()[0];
  if (!page) throw new Error('No page found in Cursor IDE');
}

app.post('/chat', async (req, res) => {
  try {
    await ensureBrowser();
    const { message } = req.body;
    console.log(`[POST /chat] empfangen:`, message);
    if (!message) return res.status(400).json({ error: 'No message provided' });
    // Finde das Chat-Eingabefeld
    const inputSelector = '.aislash-editor-input[contenteditable="true"]';
    await page.focus(inputSelector);
    await page.fill(inputSelector, '');
    await page.type(inputSelector, message);
    await page.keyboard.press('Enter');
    console.log(`[POST /chat] gesendet an Cursor IDE:`, message);
    res.json({ status: 'sent' });
  } catch (e) {
    console.error(`[POST /chat] Fehler:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/chat-history', async (req, res) => {
  try {
    await ensureBrowser();
    
    // Warte kurz, damit neue Nachrichten geladen werden können
    await page.waitForTimeout(1000);
    
    // Suche nach allen Chat-Nachrichten (User und AI)
    const messageSelectors = [
      // User messages
      '.aislash-editor-input-readonly[contenteditable="false"]',
      // AI responses - bisherige und NEU: echte DOM-Selektoren
      '.aislash-editor-message',
      '.aislash-editor-response',
      '.aislash-editor-content',
      '[data-testid="chat-message"]',
      '.chat-message',
      '.message-content',
      // --- NEU: Cursor IDE AI-Antworten laut DOM-Analyse ---
      'div.hide-if-empty .message-content-animated',
      'div.message-content-animated',
      'span.anysphere-markdown-container-root',
      'section.markdown-section',
      // ---
      // Allgemeinere Selektoren für Chat-Inhalte
      '[role="log"] > div',
      '.chat-container > div',
      '.conversation-item',
      // Weitere mögliche AI Selektoren
      '[data-testid="assistant-message"]',
      '[data-testid="ai-message"]',
      '.assistant-message',
      '.ai-message',
      '.bot-message',
      '.cursor-message',
      // Code Snippets und Antworten
      '.aislash-editor-message code',
      '.aislash-editor-response code',
      '.aislash-editor-content code'
    ];
    
    let allMessages = [];
    
    for (const selector of messageSelectors) {
      try {
        const messages = await page.$$eval(selector, nodes => 
          nodes.map(n => ({
            text: n.innerText || n.textContent || '',
            html: n.innerHTML || '',
            className: n.className || '',
            tagName: n.tagName || ''
          }))
        );
        
        if (messages.length > 0) {
          allMessages = allMessages.concat(messages);
        }
      } catch (e) {
        // Ignoriere Selektoren die nicht funktionieren
      }
    }
    
    // Entferne leere Nachrichten und Duplikate
    const uniqueMessages = allMessages
      .filter(msg => msg.text && msg.text.trim().length > 0)
      .filter((msg, index, arr) => 
        arr.findIndex(m => m.text === msg.text) === index
      )
      .map(msg => msg.text.trim());
    
    // Nur loggen wenn sich die Nachrichten geändert haben
    const messagesChanged = JSON.stringify(uniqueMessages) !== JSON.stringify(lastLoggedMessages);
    
    if (messagesChanged) {
      console.log(`[GET /chat-history] Gefunden mit .aislash-editor-input-readonly[contenteditable="false"]:`, uniqueMessages.length, 'Nachrichten');
      console.log(`[GET /chat-history] Verlauf gesendet (${uniqueMessages.length} Nachrichten)`);
      console.log('[GET /chat-history] Nachrichten:', uniqueMessages);
      lastLoggedMessages = [...uniqueMessages]; // Kopie speichern
    }
    
    res.json({ messages: uniqueMessages });
  } catch (e) {
    console.error(`[GET /chat-history] Fehler:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Cursor Chat Agent running at http://localhost:${port}/`);
  console.log('Web-UI: http://localhost:3000/');
}); 