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
    
    // KORREKTE DOM-SELECTORS basierend auf aktueller Cursor-Version
    const userMessageSelector = 'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]';
    const aiMessageSelector = 'span.anysphere-markdown-container-root';
    
    let userMessages = [];
    let aiMessages = [];
    
    // User-Nachrichten extrahieren
    try {
      userMessages = await page.$$eval(userMessageSelector, nodes => 
        nodes.map(n => ({
          text: n.innerText || n.textContent || '',
          html: n.innerHTML || '',
          className: n.className || '',
          tagName: n.tagName || ''
        }))
      );
      console.log(`[GET /chat-history] User-Selector gefunden: ${userMessages.length} Elemente`);
      if (userMessages.length > 0) {
        console.log('[GET /chat-history] User-Elemente:', userMessages);
      }
    } catch (e) {
      console.log('[GET /chat-history] User-Selector nicht gefunden:', e.message);
    }
    
    // AI-Nachrichten extrahieren
    try {
      aiMessages = await page.$$eval(aiMessageSelector, nodes => 
        nodes.map(n => ({
          text: n.innerText || n.textContent || '',
          html: n.innerHTML || '',
          className: n.className || '',
          tagName: n.tagName || ''
        }))
      );
    } catch (e) {
      console.log('[GET /chat-history] AI-Selector nicht gefunden:', e.message);
    }
    
    // Nachrichten verarbeiten und labeln
    const processedMessages = [];
    
    // User-Nachrichten hinzufügen
    userMessages.forEach(msg => {
      if (msg.text && msg.text.trim().length > 0) {
        // Entferne Console Logs und HTML Tags
        let cleanText = msg.text.trim();
        cleanText = cleanText.replace(/\[Web\].*?localhost:\d+:\d+:\d+/g, '');
        cleanText = cleanText.replace(/\[Web\].*?Array\(\d+\).*?/g, '');
        cleanText = cleanText.replace(/\[Web\].*?Chatverlauf geändert.*?/g, '');
        cleanText = cleanText.replace(/\[Web\].*?Sende Nachricht.*?/g, '');
        cleanText = cleanText.replace(/<[^>]*>/g, '');
        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        
        if (cleanText && cleanText.length > 0) {
          processedMessages.push({
            type: 'user',
            content: `User: ${cleanText}`
          });
        }
      }
    });
    
    // AI-Nachrichten hinzufügen
    aiMessages.forEach(msg => {
      if (msg.text && msg.text.trim().length > 0) {
        processedMessages.push({
          type: 'ai',
          content: msg.text.trim()
        });
      }
    });
    
    // Entferne Duplikate basierend auf Inhalt
    const uniqueMessages = processedMessages.filter((msg, index, arr) => 
      arr.findIndex(m => m.content === msg.content) === index
    );
    
    // Nur loggen wenn sich die Nachrichten geändert haben
    const messagesChanged = JSON.stringify(uniqueMessages) !== JSON.stringify(lastLoggedMessages);
    
    if (messagesChanged) {
      console.log(`[GET /chat-history] Gefunden: ${userMessages.length} User, ${aiMessages.length} AI Nachrichten`);
      console.log(`[GET /chat-history] Verarbeitet: ${uniqueMessages.length} eindeutige Nachrichten`);
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