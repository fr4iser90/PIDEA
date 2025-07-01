# Detailed Plan: User App Preview Integration (Playwright DOM-Based)

---

## 1. Current Architecture Analysis

### Existing Components:
- **PreviewComponent**: Already exists with `setContent()`, `show()`, `hide()` methods
- **AppController**: Has `showPreview()`, `updatePreviewContent()` methods
- **BrowserManager**: Controls IDE via Playwright CDP connection
- **CursorIDEService**: Manages IDE interactions via DOM manipulation
- **IDEManager**: Manages IDE detection and port management
- **EventBus**: Used for component communication

### Current DOM Access Patterns:
- **Terminal Output**: `.terminal-output` selector (from selectors.js)
- **Chat Messages**: DOM-based extraction via `extractChatHistory()`
- **File Explorer**: DOM-based tree extraction via `getFileExplorerTree()`
- **IDE Control**: Direct DOM manipulation via Playwright

---

## 2. Backend Implementation (DOM-Based Terminal Monitoring)

### A) Add Terminal Output Monitoring to CursorIDEService
```javascript
// In CursorIDEService.js - Add new method
async monitorTerminalOutput() {
  try {
    const page = await this.browserManager.getPage();
    if (!page) {
      throw new Error('No Cursor IDE page available');
    }

    // Monitor terminal output for dev server URLs
    const terminalOutput = await page.evaluate(() => {
      const terminalElement = document.querySelector('.terminal-output');
      if (!terminalElement) return null;
      
      return terminalElement.innerText || terminalElement.textContent || '';
    });

    if (terminalOutput) {
      const userAppUrl = this.extractUserAppUrl(terminalOutput);
      if (userAppUrl) {
        // Emit event via EventBus
        this.eventBus.emit('userAppDetected', { url: userAppUrl });
        return userAppUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[CursorIDEService] Error monitoring terminal:', error);
    return null;
  }
}

extractUserAppUrl(terminalOutput) {
  // Parse common dev server patterns
  const patterns = [
    /Local:\s*(http:\/\/localhost:\d+)/i,
    /Server running on\s*(http:\/\/localhost:\d+)/i,
    /Local:\s*(http:\/\/127\.0\.0\.1:\d+)/i,
    /(http:\/\/localhost:\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = terminalOutput.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Add periodic monitoring
async startTerminalMonitoring() {
  setInterval(async () => {
    await this.monitorTerminalOutput();
  }, 2000); // Check every 2 seconds
}
```

### B) Add Restart App Command to CursorIDEService
```javascript
// In CursorIDEService.js - Add new method
async restartUserApp() {
  try {
    const page = await this.browserManager.getPage();
    if (!page) {
      throw new Error('No Cursor IDE page available');
    }

    // Focus terminal and send restart command
    await page.focus('.terminal-input');
    await page.fill('.terminal-input', 'npm run dev');
    await page.keyboard.press('Enter');
    
    // Monitor for new URL
    setTimeout(async () => {
      await this.monitorTerminalOutput();
    }, 3000);
    
  } catch (error) {
    console.error('[CursorIDEService] Error restarting app:', error);
    throw error;
  }
}
```

---

## 3. Frontend Implementation

### A) Extend PreviewComponent
```javascript
// Add to PreviewComponent.js
setIframe(url) {
  const iframeHTML = `<iframe src="${url}" style="width:100%;height:100%;border:0;" allow="clipboard-write; clipboard-read; geolocation; microphone; camera"></iframe>`;
  this.setContent(iframeHTML);
  this.currentIframeUrl = url;
}

// Add restart button to header
addRestartButton() {
  const restartBtn = document.createElement('button');
  restartBtn.className = 'preview-btn';
  restartBtn.innerHTML = '<span class="btn-icon">🔄</span>';
  restartBtn.title = 'Restart App';
  restartBtn.addEventListener('click', () => this.restartApp());
  
  // Insert before close button
  const actions = this.header.querySelector('.preview-actions');
  actions.insertBefore(restartBtn, actions.lastElementChild);
}

async restartApp() {
  if (this.currentIframeUrl) {
    // Send restart command via API
    this.emit('restartApp', { url: this.currentIframeUrl });
  }
}
```

### B) Update AppController
```javascript
// Add to AppController.js - setupEventListeners()
this.eventBus.on('userAppDetected', (data) => {
  this.handleUserAppUrl(data);
});

// Add new method
handleUserAppUrl(data) {
  if (this.previewComponent && data.url) {
    this.previewComponent.setIframe(data.url);
    this.previewComponent.show();
  }
}

// Add to setupPreviewEvents()
this.previewComponent.container.addEventListener('preview:restartApp', (e) => {
  this.handleAppRestart(e.detail);
});

async handleAppRestart(data) {
  try {
    const response = await fetch('/api/ide/restart-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url })
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to restart app:', error);
    this.showError('Failed to restart app');
  }
}
```

---

## 4. API Endpoints

### A) Add to IDEController.js
```javascript
// New endpoint for app restart
app.post('/api/ide/restart-app', async (req, res) => {
  try {
    await this.cursorIDEService.restartUserApp();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint to get current user app URL
app.get('/api/ide/user-app-url', async (req, res) => {
  try {
    const url = await this.cursorIDEService.monitorTerminalOutput();
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 5. Implementation Checklist

### Backend Tasks:
- [ ] **CursorIDEService**: Add `monitorTerminalOutput()` method
- [ ] **CursorIDEService**: Add `extractUserAppUrl()` method
- [ ] **CursorIDEService**: Add `startTerminalMonitoring()` method
- [ ] **CursorIDEService**: Add `restartUserApp()` method
- [ ] **IDEController**: Add `/api/ide/restart-app` endpoint
- [ ] **IDEController**: Add `/api/ide/user-app-url` endpoint
- [ ] **Application.js**: Start terminal monitoring on initialization

### Frontend Tasks:
- [ ] **PreviewComponent**: Add `setIframe(url)` method
- [ ] **PreviewComponent**: Add restart button to header
- [ ] **PreviewComponent**: Add `restartApp()` method
- [ ] **AppController**: Add `handleUserAppUrl(data)` method
- [ ] **AppController**: Add `handleAppRestart(data)` method
- [ ] **AppController**: Add EventBus listener for `userAppDetected`

### Integration Tasks:
- [ ] **DOM Access**: Test terminal output extraction
- [ ] **URL Detection**: Verify dev server URL parsing
- [ ] **Preview Display**: Test iframe rendering
- [ ] **Restart Functionality**: Test app restart via terminal

---

## 6. Technical Constraints

### What Stays Unchanged:
- **Sidebar**: No modifications to sidebar components
- **IDE Ports**: No changes to IDE port detection (9222-9231)
- **Existing Preview**: Modal, fullscreen, and layout functionality preserved
- **EventBus**: Uses existing event system
- **WebSocket**: Only used for existing chat updates, not for user app detection

### What Gets Added:
- **Iframe Support**: New `setIframe()` method in PreviewComponent
- **DOM Monitoring**: Terminal output monitoring via Playwright
- **Restart Button**: Optional button in preview header
- **EventBus Events**: New `userAppDetected` event type

---

## 7. Example Flow

1. **User starts dev server** in IDE (`npm run dev`)
2. **CursorIDEService monitors** terminal output via DOM
3. **URL extraction** parses terminal text for dev server URL
4. **EventBus emits** `userAppDetected` event
5. **AppController receives** event and calls `handleUserAppUrl()`
6. **PreviewComponent.setIframe()** renders user app in iframe
7. **PreviewComponent.show()** displays the preview
8. **(Optional) User clicks restart** → API → CursorIDEService → Terminal command → New URL → Updated iframe

---

**This plan uses Playwright DOM manipulation instead of WebSocket for IDE control.**
Each step corresponds to existing patterns in the codebase using BrowserManager and CursorIDEService.