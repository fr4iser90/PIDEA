const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3000;

// WebSocket connections for live reload
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[WebSocket] Client connected');
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WebSocket] Client disconnected');
  });
});

// Function to notify all clients to reload
function notifyReload() {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'reload' }));
    }
  });
}

app.use(express.json({ limit: '2mb' }));

// Serve static files with cache busting for development
app.use('/web', express.static(path.join(__dirname, 'web'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

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
    
    // Extrahiere alle Nachrichten in chronologischer Reihenfolge
    let allMessages = [];
    
    try {
      // Versuche alle Chat-Nachrichten-Container zu finden
      const messageContainers = await page.$$eval('*', (elements) => {
        const containers = [];
        
        elements.forEach((element) => {
          // Suche nach verschiedenen Chat-Container-Selektoren
          const isChatContainer = 
            element.classList.contains('aislash-editor-chat-container') ||
            element.classList.contains('chat-container') ||
            element.getAttribute('data-testid') === 'chat-container' ||
            element.querySelector('.aislash-editor-chat-container') ||
            element.querySelector('.chat-container');
            
          if (isChatContainer) {
            containers.push(element);
          }
        });
        
        return containers;
      });
      
      if (messageContainers.length > 0) {
        // Verwende den ersten gefundenen Container
        const chatContainer = messageContainers[0];
        
        // Extrahiere alle Nachrichten in der Reihenfolge, wie sie im DOM stehen
        allMessages = await page.evaluate((container) => {
          const messages = [];
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
          );
          
          let node;
          while (node = walker.nextNode()) {
            // Prüfe ob es eine User-Nachricht ist
            if (node.matches && node.matches('div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]')) {
              const text = node.innerText || node.textContent || '';
              if (text.trim()) {
                messages.push({
                  type: 'user',
                  content: text.trim(),
                  element: node
                });
              }
            }
            // Prüfe ob es eine AI-Nachricht ist
            else if (node.matches && (node.matches('span.anysphere-markdown-container-root') || 
                     node.querySelector('span.anysphere-markdown-container-root'))) {
              const text = node.innerText || node.textContent || '';
              if (text.trim()) {
                messages.push({
                  type: 'ai',
                  content: text.trim(),
                  element: node
                });
              }
            }
          }
          
          return messages;
        }, chatContainer);
        
      } else {
        // Fallback: Extrahiere alle Nachrichten auf der Seite und sortiere sie
        allMessages = await page.evaluate(() => {
          const messages = [];
          
          // Finde alle User-Nachrichten
          const userElements = document.querySelectorAll('div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]');
          userElements.forEach((element, index) => {
            const text = element.innerText || element.textContent || '';
            if (text.trim()) {
              messages.push({
                type: 'user',
                content: text.trim(),
                element: element,
                index: index
              });
            }
          });
          
          // Finde alle AI-Nachrichten
          const aiElements = document.querySelectorAll('span.anysphere-markdown-container-root');
          aiElements.forEach((element, index) => {
            const text = element.innerText || element.textContent || '';
            if (text.trim()) {
              messages.push({
                type: 'ai',
                content: text.trim(),
                element: element,
                index: index
              });
            }
          });
          
          // Sortiere basierend auf DOM-Position (top-Wert)
          messages.sort((a, b) => {
            const aRect = a.element.getBoundingClientRect();
            const bRect = b.element.getBoundingClientRect();
            return aRect.top - bRect.top;
          });
          
          return messages.map(msg => ({
            type: msg.type,
            content: msg.content
          }));
        });
      }
      
      console.log(`[GET /chat-history] Gefunden: ${allMessages.length} Nachrichten in chronologischer Reihenfolge`);
      
    } catch (e) {
      console.log('[GET /chat-history] Fehler beim Extrahieren der Nachrichten:', e.message);
      // Fallback zu separater Extraktion
      const userMessages = await page.$$eval(userMessageSelector, nodes => 
        nodes.map(n => ({
          text: n.innerText || n.textContent || '',
          html: n.innerHTML || '',
          className: n.className || '',
          tagName: n.tagName || ''
        }))
      );
      
      const aiMessages = await page.$$eval(aiMessageSelector, nodes => 
        nodes.map(n => ({
          text: n.innerText || n.textContent || '',
          html: n.innerHTML || '',
          className: n.className || '',
          tagName: n.tagName || ''
        }))
      );
      
      // User-Nachrichten hinzufügen
      userMessages.forEach(msg => {
        if (msg.text && msg.text.trim().length > 0) {
          let cleanText = msg.text.trim();
          cleanText = cleanText.replace(/<[^>]*>/g, '');
          cleanText = cleanText.replace(/\s+/g, ' ').trim();
          
          if (cleanText && cleanText.length > 0) {
            allMessages.push({
              type: 'user',
              content: cleanText
            });
          }
        }
      });
      
      // AI-Nachrichten hinzufügen
      aiMessages.forEach(msg => {
        if (msg.text && msg.text.trim().length > 0) {
          allMessages.push({
            type: 'ai',
            content: msg.text.trim()
          });
        }
      });
    }
    
    // Nachrichten verarbeiten
    const processedMessages = allMessages.map(msg => ({
      type: msg.type,
      content: msg.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    })).filter(msg => msg.content.length > 0);
    
    // Entferne Duplikate basierend auf Inhalt
    const uniqueMessages = processedMessages.filter((msg, index, arr) => 
      arr.findIndex(m => m.content === msg.content) === index
    );
    
    // Nur loggen wenn sich die Nachrichten geändert haben
    const messagesChanged = JSON.stringify(uniqueMessages) !== JSON.stringify(lastLoggedMessages);
    
    if (messagesChanged) {
      const userCount = uniqueMessages.filter(m => m.type === 'user').length;
      const aiCount = uniqueMessages.filter(m => m.type === 'ai').length;
      console.log(`[GET /chat-history] Gefunden: ${userCount} User, ${aiCount} AI Nachrichten`);
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

server.listen(port, () => {
  console.log(`Cursor Chat Agent running at http://localhost:${port}/`);
  console.log('Web-UI: http://localhost:3000/');
}); 