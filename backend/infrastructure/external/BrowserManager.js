const { chromium } = require('playwright');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isConnecting = false;
    this.currentPort = null; // Will be set dynamically
  }

  async connect(port = null) {
    if (port) {
      this.currentPort = port;
    }

    if (this.browser && this.page && !port) {
      return this.page;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.page;
    }

    this.isConnecting = true;

    try {
      console.log(`[BrowserManager] Connecting to Cursor IDE on port ${this.currentPort}...`);
      
      // Disconnect existing connection if switching ports
      if (this.browser && port) {
        await this.disconnect();
      }
      
      this.browser = await chromium.connectOverCDP(`http://127.0.0.1:${this.currentPort}`);
      const contexts = this.browser.contexts();
      this.page = contexts[0].pages()[0];
      
      if (!this.page) {
        throw new Error('No page found in Cursor IDE');
      }

      console.log(`[BrowserManager] Successfully connected to Cursor IDE on port ${this.currentPort}`);
      return this.page;

    } catch (error) {
      console.error(`[BrowserManager] Connection failed on port ${this.currentPort}:`, error.message);
      this.browser = null;
      this.page = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async getPage() {
    try {
      if (!this.page || !this.browser) {
        await this.connect();
      }
      
      // Check if page is still valid
      if (this.page && this.page.isClosed && this.page.isClosed()) {
        console.log('[BrowserManager] Page was closed, reconnecting...');
        this.page = null;
        await this.connect();
      }
      
      return this.page;
    } catch (error) {
      console.error('[BrowserManager] Error getting page:', error.message);
      return null;
    }
  }

  async switchToPort(port) {
    console.log(`[BrowserManager] Switching to port ${port}...`);
    this.currentPort = port;
    await this.connect(port);
  }

  getCurrentPort() {
    return this.currentPort;
  }

  // File Explorer Methods
  async getFileExplorerTree() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Try multiple selectors for the explorer
      const selectors = [
        '.explorer-folders-view',
        '.monaco-list.list_id_2',
        '[data-keybinding-context="16"]',
        '.monaco-list[role="tree"]'
      ];

      let explorerFound = false;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          explorerFound = true;
          break;
        } catch (e) {}
      }
      if (!explorerFound) return [];

      // Extract the file tree structure as a flat list
      const flatFiles = await page.evaluate(() => {
        const selectors = [
          '.explorer-folders-view .monaco-list-row',
          '.monaco-list.list_id_2 .monaco-list-row',
          '[data-keybinding-context="16"] .monaco-list-row',
          '.monaco-list[role="tree"] .monaco-list-row'
        ];
        let treeItems = [];
        for (const selector of selectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            treeItems = Array.from(items);
            break;
          }
        }
        return treeItems.map(item => {
          const labelElement = item.querySelector('.label-name');
          if (!labelElement) return null;
          const name = labelElement.textContent.trim();
          const ariaLabel = item.getAttribute('aria-label');
          const ariaLevel = parseInt(item.getAttribute('aria-level') || '1');
          const ariaExpanded = item.getAttribute('aria-expanded') === 'true';
          const isSelected = item.classList.contains('selected');
          const isDirectory = item.querySelector('.codicon-tree-item-expanded') !== null;
          let path = '';
          if (ariaLabel) {
            const pathMatch = ariaLabel.match(/~\/Documents\/Git\/PIDEA\/(.+)/);
            if (pathMatch) {
              path = pathMatch[1];
            }
          }
          // Fallback: Wenn path leer ist und Root-Ordner, setze ihn auf den Namen
          if (!path && isDirectory && ariaLevel === 1) {
            path = name;
            console.warn('[BrowserManager] WARN: Root-Ordner ohne Pfad, setze path auf name:', name);
          }
          if (!path) {
            path = name;
            console.warn('[BrowserManager] WARN: Leerer Pfad für', name, ariaLabel);
          }
          return {
            name,
            path,
            type: isDirectory ? 'directory' : 'file',
            level: ariaLevel,
            expanded: ariaExpanded,
            selected: isSelected
          };
        }).filter(Boolean);
      });

      // Build tree from flat list
      function buildTree(flatList) {
        const root = [];
        const pathMap = {};
        flatList.forEach(item => {
          item.children = [];
          pathMap[item.path] = item;
        });
        flatList.forEach(item => {
          const parentPath = item.path.split('/').slice(0, -1).join('/');
          if (parentPath && pathMap[parentPath]) {
            pathMap[parentPath].children.push(item);
          } else {
            root.push(item);
          }
        });
        return root;
      }
      return buildTree(flatFiles);
    } catch (error) {
      console.error('[BrowserManager] Error reading file explorer tree:', error.message);
      return [];
    }
  }

  async openFile(filePath) {
    try {
      console.log('[BrowserManager] openFile aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      
      // Debug: Log all available files in explorer
      const debugInfo = await page.evaluate(() => {
        const rows = document.querySelectorAll('.explorer-folders-view .monaco-list-row');
        const files = [];
        rows.forEach(row => {
          const ariaLabel = row.getAttribute('aria-label');
          const title = row.getAttribute('title');
          const textContent = row.textContent?.trim();
          files.push({ ariaLabel, title, textContent });
        });
        return files;
      });
      console.log('[BrowserManager] Available files in explorer:', debugInfo);
      
      // Find the file in the explorer and click it
      const fileName = filePath.split('/').pop();
      console.log('[BrowserManager] Looking for file name:', fileName);
      
      // Try multiple selector strategies
      const rows = await page.$$('.explorer-folders-view .monaco-list-row');
      let found = false;
      
      for (const row of rows) {
        const ariaLabel = await row.getAttribute('aria-label');
        const title = await row.getAttribute('title');
        const textContent = await row.evaluate(el => el.textContent?.trim());
        
        console.log('[BrowserManager] Checking row:', { ariaLabel, title, textContent });
        
        // Check if this row matches our file
        if (ariaLabel && ariaLabel.includes(fileName) || 
            title && title.includes(fileName) || 
            textContent && textContent.includes(fileName)) {
          console.log('[BrowserManager] Found matching file, clicking:', { ariaLabel, title, textContent });
          await row.click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error('[BrowserManager] File not found. Available files:', debugInfo);
        throw new Error(`File not found in explorer: ${filePath}`);
      }
      
      // Wait for the editor tab with the file name to be active
      const tabSelector = `.tab[aria-label*="${fileName}"]`;
      try {
        await page.waitForSelector(tabSelector, { timeout: 5000 });
        console.log('[BrowserManager] Editor-Tab gefunden für:', filePath);
      } catch (e) {
        console.warn('[BrowserManager] WARN: Editor-Tab NICHT gefunden für:', filePath);
      }
      
      // Wait for the file to open in the editor
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });
      console.log(`[BrowserManager] Opened file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[BrowserManager] Error opening file ${filePath}:`, error.message);
      return false;
    }
  }

  async getCurrentFileContent() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });
      
      const result = await page.evaluate(() => {
        // Find the active tab and get its file name
        const activeTab = document.querySelector('.tab.active, .tab.active-modified');
        let fileName = '';
        if (activeTab) {
          fileName = activeTab.getAttribute('aria-label') || '';
        }
        let log = `[getCurrentFileContent] Active tab: ${fileName}.`;
        let content = '';
        
        // Primary approach: Use Monaco API to get full content
        if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
          const allEditors = window.monaco.editor.getEditors();
          log += ` Monaco-API: ${allEditors.length} Editor-Objekte.`;
          
          // Try to find the active editor or editor with matching file
          let targetEditor = null;
          
          // First try to find editor with matching file name
          for (const editor of allEditors) {
            try {
              const model = editor.getModel && editor.getModel();
              if (model && model.uri && model.uri.path && fileName && model.uri.path.endsWith(fileName)) {
                targetEditor = editor;
                log += ` Editor mit passendem Dateinamen gefunden: ${fileName}`;
                break;
              }
            } catch (e) {
              log += ` Error checking Monaco editor: ${e.message}.`;
            }
          }
          
          // If no matching editor found, try to get the active/focused editor
          if (!targetEditor) {
            for (const editor of allEditors) {
              try {
                if (editor.hasFocus && editor.hasFocus()) {
                  targetEditor = editor;
                  log += ' Aktiver Editor gefunden.';
                  break;
                }
              } catch (e) {
                log += ` Error checking editor focus: ${e.message}.`;
              }
            }
          }
          
          // If still no editor found, try the first available editor
          if (!targetEditor && allEditors.length > 0) {
            targetEditor = allEditors[0];
            log += ' Ersten verfügbaren Editor verwendet.';
          }
          
          // Get content from the target editor
          if (targetEditor) {
            try {
              content = targetEditor.getValue();
              log += ` Vollständiger Inhalt aus Monaco Editor geholt (${content.length} Zeichen).`;
            } catch (e) {
              log += ` Error getting value from editor: ${e.message}.`;
            }
          }
        }
        
        // Fallback: Try to get content from DOM if Monaco API fails
        if (!content) {
          const editors = document.querySelectorAll('.monaco-editor');
          log += ` Fallback: ${editors.length} .monaco-editor instances gefunden.`;
          
          // Try contenteditable elements
          for (const editor of editors) {
            const contentEditable = editor.querySelector('[contenteditable="true"]');
            if (contentEditable && contentEditable.textContent) {
              content = contentEditable.textContent;
              log += ' Inhalt aus contenteditable geholt (nur sichtbare Zeilen).';
              break;
            }
          }
          
          // Try textarea elements
          if (!content) {
            for (const editor of editors) {
              const textarea = editor.querySelector('textarea');
              if (textarea && textarea.value) {
                content = textarea.value;
                log += ' Inhalt aus textarea geholt.';
                break;
              }
            }
          }
          
          // Last resort: Try view-line elements (only visible lines)
          if (!content) {
            for (const editor of editors) {
              const textElements = editor.querySelectorAll('.view-line');
              if (textElements.length > 0) {
                content = Array.from(textElements)
                  .map(el => el.textContent || '')
                  .join('\n');
                log += ` Inhalt aus view-line Elementen geholt (nur ${textElements.length} sichtbare Zeilen).`;
                break;
              }
            }
          }
        }
        
        if (!content) {
          log += ' Kein Inhalt gefunden!';
        }
        
        return { content, log };
      });
      
      console.log('[BrowserManager] getCurrentFileContent: LOG:', result.log);
      console.log('[BrowserManager] getCurrentFileContent: Inhalt (erster Teil):', result.content ? result.content.slice(0, 200) : '<leer>');
      return result.content;
    } catch (error) {
      console.error('[BrowserManager] Error reading file content:', error.message);
      return '';
    }
  }

  async getFileContent(filePath) {
    try {
      console.log('[BrowserManager] getFileContent aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      // First, open the file in the editor
      const opened = await this.openFile(filePath);
      if (!opened) {
        throw new Error(`Failed to open file: ${filePath}`);
      }
      // Wait a bit for the file to load
      await page.waitForTimeout(1000);
      // Get the content from the editor
      const content = await this.getCurrentFileContent();
      console.log('[BrowserManager] Dateiinhalt geladen für:', filePath);
      return content;
    } catch (error) {
      console.error(`[BrowserManager] Error getting file content for ${filePath}:`, error.message);
      throw error;
    }
  }

  async getCurrentFileInfo() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Get the current file tab information
      const fileInfo = await page.evaluate(() => {
        const activeTab = document.querySelector('.tab.active, .tab.active-modified');
        if (!activeTab) return null;

        const tabTitle = activeTab.querySelector('.tab-title')?.textContent?.trim();
        const tabPath = activeTab.getAttribute('data-resource-uri');
        
        return {
          name: tabTitle,
          path: tabPath,
          isModified: activeTab.classList.contains('active-modified')
        };
      });

      return fileInfo;

    } catch (error) {
      console.error('[BrowserManager] Error getting current file info:', error.message);
      return null;
    }
  }

  async refreshExplorer() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Click the refresh button in the explorer
      const refreshButton = await page.$('.explorer-folders-view .codicon-refresh');
      if (refreshButton) {
        await refreshButton.click();
        console.log('[BrowserManager] Refreshed file explorer');
        return true;
      }

      return false;

    } catch (error) {
      console.error('[BrowserManager] Error refreshing explorer:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[BrowserManager] Disconnected from Cursor IDE');
    }
  }

  async reconnect() {
    console.log('[BrowserManager] Reconnecting to Cursor IDE...');
    await this.disconnect();
    return await this.connect(this.currentPort);
  }

  /**
   * Click the "New Chat" button in the IDE to create a new chat session
   * @returns {Promise<boolean>} Success status
   */
  async clickNewChat() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      console.log('[BrowserManager] Clicking New Chat button...');

      // Try multiple selectors for the New Chat button
      const selectors = [
        'a.action-label.codicon.codicon-add-two[aria-label*="New Chat"]',
        'a.action-label.codicon.codicon-add-two[aria-label*="New Tab"]',
        'a.action-label.codicon.codicon-add-two[role="button"]',
        '.action-label.codicon.codicon-add-two[role="button"]',
        '[aria-label*="New Chat"]',
        '[aria-label*="New Tab"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]',
        'button[aria-label*="New Chat"]',
        'a[aria-label*="New Chat"]',
        '.new-chat-button',
        '[data-testid*="new-chat"]',
        '.codicon-add',
        '[aria-label*="Add"]',
        'button[title*="New"]',
        'a[title*="New"]'
      ];

      let buttonFound = false;
      for (const selector of selectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`[BrowserManager] Found New Chat button with selector: ${selector}`);
            await button.click();
            buttonFound = true;
            break;
          }
        } catch (e) {
          console.log(`[BrowserManager] Selector ${selector} not found, trying next...`);
        }
      }

      if (!buttonFound) {
        // Fallback: Try to find by text content
        const allButtons = await page.$$('a.action-label, .action-label, button, a[role="button"]');
        for (const button of allButtons) {
          try {
            const ariaLabel = await button.getAttribute('aria-label');
            const title = await button.getAttribute('title');
            const textContent = await button.evaluate(el => el.textContent?.trim());
            const className = await button.getAttribute('class');
            
            // Check if this is the add-two button (New Chat/Tab)
            if (className && className.includes('codicon-add-two')) {
              console.log(`[BrowserManager] Found add-two button with aria-label: ${ariaLabel}`);
              await button.click();
              buttonFound = true;
              break;
            }
            
            // Also check by text content
            if (ariaLabel && (ariaLabel.includes('New Chat') || ariaLabel.includes('New Tab')) ||
                title && (title.includes('New Chat') || title.includes('New Tab')) ||
                textContent && (textContent.includes('New Chat') || textContent.includes('New Tab'))) {
              console.log(`[BrowserManager] Found New Chat button by text: ${ariaLabel || title || textContent}`);
              await button.click();
              buttonFound = true;
              break;
            }
          } catch (e) {
            // Continue to next button
          }
        }
      }

      if (!buttonFound) {
        throw new Error('New Chat button not found in IDE');
      }

      // Wait for potential modal to appear (shorter)
      await page.waitForTimeout(300);
      
      // Optimized: Only handle modal if it exists
      const modal = await page.$('.monaco-dialog, [role="dialog"], .modal-dialog');
      if (modal) {
        await this.handleNewChatModal(page, modal);
      } else {
        console.log('[BrowserManager] No New Chat modal detected, continuing immediately.');
      }
      
      console.log('[BrowserManager] Successfully clicked New Chat button and handled modal');
      return true;

    } catch (error) {
      console.error('[BrowserManager] Error clicking New Chat button:', error.message);
      return false;
    }
  }

  /**
   * Handle the New Chat modal that appears after clicking New Chat button
   * @param {Page} page - Playwright page object
   * @param {ElementHandle} modal - The modal element (if found)
   */
  async handleNewChatModal(page, modal) {
    try {
      console.log('[BrowserManager] Handling New Chat modal...');
      // Look for buttons in the New Chat modal only
      const modalSelectors = [
        // Common modal buttons
        'button[role="button"]',
        '.monaco-button',
        '.action-label',
        '.codicon',
        '[aria-label*="button"]',
        // Specific New Chat modal buttons
        'button:has-text("OK")',
        'button:has-text("Continue")',
        'button:has-text("Start")',
        'button:has-text("Create")',
        'button:has-text("Begin")',
        'button:has-text("Yes")',
        'button:has-text("No")',
        'button:has-text("Cancel")',
        // Aria-label based
        '[aria-label*="OK"]',
        '[aria-label*="Continue"]',
        '[aria-label*="Start"]',
        '[aria-label*="Create"]',
        '[aria-label*="Begin"]',
        '[aria-label*="Yes"]',
        '[aria-label*="No"]',
        '[aria-label*="Cancel"]'
      ];

      for (const selector of modalSelectors) {
        try {
          const element = await modal.$(selector);
          if (element) {
            const text = await element.textContent();
            const ariaLabel = await element.getAttribute('aria-label');
            // Skip close/cancel buttons, prefer action buttons
            if (text?.includes('Cancel') || ariaLabel?.includes('Cancel') ||
                text?.includes('Close') || ariaLabel?.includes('Close')) {
              continue;
            }
            console.log(`[BrowserManager] Clicking New Chat modal button: ${text || ariaLabel}`);
            await element.click();
            await page.waitForTimeout(200);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      // If no action button found, try any button
      for (const selector of modalSelectors) {
        try {
          const element = await modal.$(selector);
          if (element) {
            const text = await element.textContent();
            const ariaLabel = await element.getAttribute('aria-label');
            console.log(`[BrowserManager] Clicking any modal button: ${text || ariaLabel}`);
            await element.click();
            await page.waitForTimeout(200);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      // Last resort: try Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      console.log('[BrowserManager] New Chat modal handled (or no modal found)');
    } catch (error) {
      console.log(`[BrowserManager] New Chat modal handling failed: ${error.message}`);
    }
  }

  /**
   * Type a message into the chat input and optionally send it
   * @param {string} message - Message to type
   * @param {boolean} send - Whether to send the message after typing
   * @returns {Promise<boolean>} Success status
   */
  async typeMessage(message, send = true) {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      console.log(`[BrowserManager] Typing message: ${message}`);

      // Wait for chat input to be ready
      await page.waitForTimeout(1000);

      // Try multiple selectors for the chat input
      const inputSelectors = [
        '.chat-input',
        '.monaco-editor[data-testid="chat-input"]',
        'textarea[placeholder*="chat"]',
        'textarea[placeholder*="message"]',
        '.monaco-editor textarea',
        '[contenteditable="true"][role="textbox"]',
        '.chat-input textarea'
      ];

      let chatInput = null;
      for (const selector of inputSelectors) {
        try {
          chatInput = await page.$(selector);
          if (chatInput) {
            console.log(`[BrowserManager] Found chat input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatInput) {
        throw new Error('Chat input not found');
      }

      // Click the input to focus it
      await chatInput.click();
      await page.waitForTimeout(500);

      // Clear existing content and type the message
      await chatInput.fill('');
      await chatInput.type(message);
      console.log(`[BrowserManager] Message typed: ${message}`);

      if (send) {
        // Find and click send button
        const sendSelectors = [
          'button[aria-label*="Send"]',
          '.send-button',
          '.codicon-send',
          'button[title*="Send"]',
          '[data-testid="send-button"]'
        ];

        let sendButton = null;
        for (const selector of sendSelectors) {
          try {
            sendButton = await page.$(selector);
            if (sendButton) {
              console.log(`[BrowserManager] Found send button with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (sendButton) {
          await sendButton.click();
          console.log(`[BrowserManager] Message sent: ${message}`);
        } else {
          // Fallback: Press Enter to send
          await chatInput.press('Enter');
          console.log(`[BrowserManager] Message sent via Enter key: ${message}`);
        }
      }

      return true;

    } catch (error) {
      console.error('[BrowserManager] Error typing message:', error.message);
      return false;
    }
  }

  /**
   * Create a new chat and optionally send a message
   * @param {string} message - Optional message to send after creating chat
   * @returns {Promise<boolean>} Success status
   */
  async createNewChat(message = null) {
    try {
      const success = await this.clickNewChat();
      if (!success) {
        throw new Error('Failed to click New Chat button');
      }

      if (message) {
        // Wait for chat input to be ready (longer wait since modal handling might take time)
        await this.page.waitForTimeout(300);
        
        // Use the improved typeMessage method
        const messageSent = await this.typeMessage(message, true);
        if (messageSent) {
          console.log('[BrowserManager] Message sent in new chat:', message);
        } else {
          console.warn('[BrowserManager] Failed to send message in new chat');
        }
      }

      return true;

    } catch (error) {
      console.error('[BrowserManager] Error creating new chat:', error.message);
      return false;
    }
  }

  isConnected() {
    return this.browser !== null && this.page !== null;
  }

  async healthCheck() {
    try {
      const page = await this.getPage();
      // Simple health check - try to get page title
      await page.title();
      return true;
    } catch (error) {
      console.error('[BrowserManager] Health check failed:', error.message);
      // Reset connection on health check failure
      this.browser = null;
      this.page = null;
      return false;
    }
  }
}

module.exports = BrowserManager; 