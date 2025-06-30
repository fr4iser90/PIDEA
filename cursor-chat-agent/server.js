const express = require('express');
const { chromium } = require('playwright');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'web')));

let browser, page;

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
      // AI responses - verschiedene mögliche Selektoren
      '.aislash-editor-message',
      '.aislash-editor-response',
      '.aislash-editor-content',
      '[data-testid="chat-message"]',
      '.chat-message',
      '.message-content',
      // Allgemeinere Selektoren für Chat-Inhalte
      '[role="log"] > div',
      '.chat-container > div',
      '.conversation-item'
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
          console.log(`[GET /chat-history] Gefunden mit ${selector}:`, messages.length, 'Nachrichten');
          allMessages = allMessages.concat(messages);
        }
      } catch (e) {
        // Ignoriere Selektoren die nicht funktionieren
        console.log(`[GET /chat-history] Selector ${selector} nicht gefunden`);
      }
    }
    
    // Entferne leere Nachrichten und Duplikate
    const uniqueMessages = allMessages
      .filter(msg => msg.text && msg.text.trim().length > 0)
      .filter((msg, index, arr) => 
        arr.findIndex(m => m.text === msg.text) === index
      )
      .map(msg => msg.text.trim());
    
    console.log(`[GET /chat-history] Verlauf gesendet (${uniqueMessages.length} Nachrichten)`);
    console.log('[GET /chat-history] Nachrichten:', uniqueMessages);
    
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