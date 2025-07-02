// Cursor IDE Chat Agent (API-Bridge)
// This script sets up a simple Express server to handle chat requests and interact with Cursor IDE.
// Initially, it uses a placeholder for file-based access to Cursor IDE chat data.
// This is a prototype to be refined based on further research into Cursor IDE's internals.
// NOTE: Cursor IDE is likely an Electron app similar to VSCode, so chat data may be stored in local storage,
// IndexedDB, or SQLite databases within app data directories (e.g., ~/.config/Cursor).
// Current challenge: Identifying the exact method to access chat functionality (file, API, or UI automation).
// Next steps: Investigate Cursor IDE's Electron app structure, internal APIs, or extension mechanisms.

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Serve static files from web directory
app.use('/web', express.static(path.join(__dirname, 'web')));

// Import BrowserManager for file operations
const BrowserManager = require('./src/infrastructure/external/BrowserManager');
const browserManager = new BrowserManager();

// Test route first
app.get('/api/test', (req, res) => {
  console.log('[API] Test route called');
  res.json({ message: 'Test route working!' });
});

// Code Explorer API routes - direct implementation like chat
app.get('/api/files', async (req, res) => {
  try {
    console.log('[API] Getting file tree...');
    const files = await browserManager.getFileExplorerTree();
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('[API] Error getting file tree:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/files/:path(*)', async (req, res) => {
  try {
    const { path } = req.params;
    console.log(`[API] Getting file content for: ${path}`);
    
    const opened = await browserManager.openFile(path);
    if (!opened) {
      return res.status(404).json({
        success: false,
        error: 'File not found or could not be opened'
      });
    }

    const content = await browserManager.getCurrentFileContent();
    res.json({
      success: true,
      data: {
        path,
        content,
        opened
      }
    });
  } catch (error) {
    console.error('[API] Error getting file content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Placeholder path for Cursor IDE chat data (to be determined)
const CHAT_DATA_PATH = '/home/fr4iser/.cursor/chat-data.json'; // Hypothetical path, needs to be confirmed

// Endpoint to send a chat message to Cursor IDE
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received chat message: ${message}`);

    // TODO: Implement actual interaction with Cursor IDE
    // For now, simulate writing the message to a file (placeholder)
    const chatEntry = {
      timestamp: new Date().toISOString(),
      message: message,
      response: 'Placeholder response from Cursor IDE (to be implemented)'
    };

    // Read existing chat data (if any)
    let chatData = [];
    try {
      const data = await fs.readFile(CHAT_DATA_PATH, 'utf8');
      chatData = JSON.parse(data);
    } catch (err) {
      // If file doesn't exist, start with an empty array
      console.log('Chat data file not found, creating new.');
    }

    // Append new chat entry
    chatData.push(chatEntry);

    // Write updated chat data back to file
    await fs.writeFile(CHAT_DATA_PATH, JSON.stringify(chatData, null, 2), 'utf8');

    // Return the simulated response
    res.json({ response: chatEntry.response });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to retrieve chat logs or history
app.get('/logs', async (req, res) => {
  try {
    // TODO: Implement actual log retrieval from Cursor IDE
    // For now, read from the placeholder file
    let chatData = [];
    try {
      const data = await fs.readFile(CHAT_DATA_PATH, 'utf8');
      chatData = JSON.parse(data);
    } catch (err) {
      return res.json({ logs: [] });
    }

    res.json({ logs: chatData });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to receive chat updates from the extension
app.post('/chat-update', (req, res) => {
  const { chatContent } = req.body;
  if (chatContent) {
    console.log('Received chat update from extension:', chatContent);
    res.status(200).send('Update received');
  } else {
    res.status(400).send('No chat content received');
  }
});

// Endpoint to receive chat history from the extension
app.post('/chat-history', async (req, res) => {
  const { chat } = req.body;
  if (chat) {
    await fs.writeFile('/tmp/received-chat.json', chat, 'utf8');
    res.status(200).send('Chat history received');
  } else {
    res.status(400).send('No chat data received');
  }
});

// Endpoint to retrieve chat history from the extension
app.get('/api/chat/history', async (req, res) => {
  try {
    const data = await fs.readFile('/tmp/received-chat.json', 'utf8');
    res.type('application/json').send(data);
  } catch (e) {
    res.status(404).send('No chat history');
  }
});

// Root endpoint to provide information about the agent
app.get('/', (req, res) => {
  res.json({
    status: 'Cursor Chat Agent is running',
    message: 'This is a prototype agent for interacting with Cursor IDE chat. Use POST /chat to send messages and GET /logs to retrieve chat history. Actual integration with Cursor IDE is not yet implemented.',
    endpoints: {
      chat: 'POST /api/chat - Send a message to Cursor IDE (placeholder)',
      logs: 'GET /logs - Retrieve chat logs (placeholder)',
      chatUpdate: 'POST /chat-update - Receives chat updates from the extension',
      chatHistory: 'GET /api/chat/history - Retrieve chat history'
    }
  });
});

// Start the server
app.listen(port, '127.0.0.1', () => {
  console.log(`Cursor Chat Agent running at http://127.0.0.1:${port}/`);
  console.log('Note: This is a prototype. Interaction with Cursor IDE is not yet implemented.');
  console.log('Please update CHAT_DATA_PATH and interaction logic based on Cursor IDE internals.');
});
