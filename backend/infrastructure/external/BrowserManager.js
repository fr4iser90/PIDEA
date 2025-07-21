const { chromium } = require('playwright');
const Logger = require('@logging/Logger');
const logger = new Logger('BrowserManager');


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
      logger.info(`Connecting to Cursor IDE on port ${this.currentPort}...`);
      
      // Disconnect existing connection if switching ports
      if (this.browser && port) {
        await this.disconnect();
      }
      
          // Always use localhost since we're using network_mode: "host"
    const host = '127.0.0.1';
      this.browser = await chromium.connectOverCDP(`http://${host}:${this.currentPort}`);
      const contexts = this.browser.contexts();
      this.page = contexts[0].pages()[0];
      
      if (!this.page) {
        throw new Error('No page found in Cursor IDE');
      }

      logger.info(`Successfully connected to Cursor IDE on port ${this.currentPort}`);
      return this.page;

    } catch (error) {
      logger.error(`Connection failed on port ${this.currentPort}:`, error.message);
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
        logger.info('Page was closed, reconnecting...');
        this.page = null;
        await this.connect();
      }
      
      return this.page;
    } catch (error) {
      logger.error('Error getting page:', error.message);
      return null;
    }
  }

  async switchToPort(port) {
    logger.info(`Switching to port ${port}...`);
    this.currentPort = port;
    await this.connect(port);
  }

  async connectToPort(port) {
    logger.info(`Connecting to port ${port}...`);
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
            logger.warn('WARN: Root-Ordner ohne Pfad, setze path auf name:', name);
          }
          if (!path) {
            path = name;
            logger.warn('WARN: Leerer Pfad für', name, ariaLabel);
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
      logger.error('Error reading file explorer tree:', error.message);
      return [];
    }
  }

  async openFile(filePath) {
    try {
      logger.info('openFile aufgerufen mit:', filePath);
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
      logger.debug('Available files in explorer:', debugInfo);
      
      // Find the file in the explorer and click it
      const fileName = filePath.split('/').pop();
      logger.info('Looking for file name:', fileName);
      
      // Try multiple selector strategies
      const rows = await page.$$('.explorer-folders-view .monaco-list-row');
      let found = false;
      
      for (const row of rows) {
        const ariaLabel = await row.getAttribute('aria-label');
        const title = await row.getAttribute('title');
        const textContent = await row.evaluate(el => el.textContent?.trim());
        
        logger.info('Checking row:', { ariaLabel, title, textContent });
        
        // Check if this row matches our file
        if (ariaLabel && ariaLabel.includes(fileName) || 
            title && title.includes(fileName) || 
            textContent && textContent.includes(fileName)) {
          logger.info('Found matching file, clicking:', { ariaLabel, title, textContent });
          await row.click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        logger.error('File not found. Available files:', debugInfo);
        throw new Error(`File not found in explorer: ${filePath}`);
      }
      
      // Wait for the editor tab with the file name to be active
      const tabSelector = `.tab[aria-label*="${fileName}"]`;
      try {
        await page.waitForSelector(tabSelector, { timeout: 5000 });
        logger.info('Editor-Tab gefunden für:', filePath);
      } catch (e) {
        logger.warn('WARN: Editor-Tab NICHT gefunden für:', filePath);
      }
      
      // Wait for the file to open in the editor
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });
      logger.info(`Opened file: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Error opening file ${filePath}:`, error.message);
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
      
      logger.info('getCurrentFileContent: LOG:', result.log);
      logger.info('getCurrentFileContent: Content length:', result.content ? result.content.length : 0);
      return result.content;
    } catch (error) {
      logger.error('Error reading file content:', error.message);
      return '';
    }
  }

  async getFileContent(filePath) {
    try {
      logger.info('getFileContent aufgerufen mit:', filePath);
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
      logger.info('Dateiinhalt geladen für:', filePath);
      return content;
    } catch (error) {
      logger.error(`Error getting file content for ${filePath}:`, error.message);
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
      logger.error('Error getting current file info:', error.message);
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
        logger.info('Refreshed file explorer');
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Error refreshing explorer:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Disconnected from Cursor IDE');
    }
  }

  async reconnect() {
    logger.info('Reconnecting to Cursor IDE...');
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

      logger.info('Clicking New Chat button...');

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
            logger.info(`Found New Chat button with selector: ${selector}`);
            await button.click();
            buttonFound = true;
            break;
          }
        } catch (e) {
          logger.info(`Selector ${selector} not found, trying next...`);
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
              logger.info(`Found add-two button with aria-label: ${ariaLabel}`);
              await button.click();
              buttonFound = true;
              break;
            }
            
            // Also check by text content
            if (ariaLabel && (ariaLabel.includes('New Chat') || ariaLabel.includes('New Tab')) ||
                title && (title.includes('New Chat') || title.includes('New Tab')) ||
                textContent && (textContent.includes('New Chat') || textContent.includes('New Tab'))) {
              logger.info(`Found New Chat button by text: ${ariaLabel || title || textContent}`);
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
        logger.info('No New Chat modal detected, continuing immediately.');
      }
      
      logger.info('Successfully clicked New Chat button and handled modal');
      return true;

    } catch (error) {
      logger.error('Error clicking New Chat button:', error.message);
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
      logger.info('Handling New Chat modal...');
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
            logger.info(`Clicking New Chat modal button: ${text || ariaLabel}`);
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
            logger.info(`Clicking any modal button: ${text || ariaLabel}`);
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
      logger.info('New Chat modal handled (or no modal found)');
    } catch (error) {
      logger.info(`New Chat modal handling failed: ${error.message}`);
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
        throw new Error('No connection to IDE');
      }

      logger.info(`Typing message: ${message}`);

      // Determine IDE type based on current port
      const currentPort = this.getCurrentPort();
      let ideType = 'cursor'; // default
      
      if (currentPort >= 9222 && currentPort <= 9231) {
        ideType = 'cursor';
      } else if (currentPort >= 9232 && currentPort <= 9241) {
        ideType = 'vscode';
      } else if (currentPort >= 9242 && currentPort <= 9251) {
        ideType = 'windsurf';
      }
      
      logger.info(`Detected IDE type: ${ideType} on port ${currentPort}`);

      // Get IDE-specific selectors
      const IDETypes = require('@services/ide/IDETypes');
      const ideMetadata = IDETypes.getMetadata(ideType);
      const chatSelectors = ideMetadata?.chatSelectors;
      
      if (!chatSelectors) {
        throw new Error(`No chat selectors found for IDE type: ${ideType}`);
      }

      // Wait for chat input to be ready
      await page.waitForTimeout(1000);

      // Use IDE-specific input selectors
      const inputSelectors = [
        chatSelectors.input,
        chatSelectors.inputContainer + ' textarea',
        chatSelectors.inputContainer + ' [contenteditable="true"]'
      ];

      let chatInput = null;
      for (const selector of inputSelectors) {
        try {
          chatInput = await page.$(selector);
          if (chatInput) {
            logger.info(`Found chat input with selector: ${selector} (${ideType})`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatInput) {
        throw new Error(`Chat input not found for ${ideType} IDE`);
      }

      logger.info(`About to click chat input...`);
      // Click the input to focus it
      await chatInput.click();
      logger.info(`Clicked chat input to focus`);

      // Clear existing content and type the message
      await chatInput.fill('');
      logger.info(`Cleared chat input`);
      await chatInput.type(message);
      logger.info(`Message typed: ${message}`);

      if (send) {
        logger.info(`Looking for send button...`);
        
        // Use IDE-specific send method
        if (ideType === 'cursor') {
          // Cursor uses Enter key to send
          await chatInput.press('Enter');
          logger.info(`Message sent via Enter key (Cursor): ${message}`);
        } else if (ideType === 'vscode') {
          // VSCode might have a send button
          const sendSelectors = [
            '.codicon-send',
            '.action-label[aria-label*="Send"]',
            '.chat-execute-toolbar .codicon-send',
            '.monaco-action-bar .codicon-send',
            'button[aria-label*="Send"]',
            '.send-button',
            'button[title*="Send"]',
            '[data-testid="send-button"]'
          ];

          let sendButton = null;
          for (const selector of sendSelectors) {
            try {
              sendButton = await page.$(selector);
              if (sendButton) {
                logger.info(`Found VSCode send button with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          if (sendButton) {
            await sendButton.click();
            logger.info(`Message sent via VSCode send button: ${message}`);
          } else {
            // Fallback: Press Enter to send
            await chatInput.press('Enter');
            logger.info(`Message sent via Enter key (VSCode fallback): ${message}`);
          }
        } else {
          // Generic fallback for other IDEs
          await chatInput.press('Enter');
          logger.info(`Message sent via Enter key (${ideType}): ${message}`);
        }
      }

      return true;

    } catch (error) {
      logger.error('Error typing message:', error.message);
      logger.error('Error stack:', error.stack);
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
          logger.info('Message sent in new chat:', message);
        } else {
          logger.warn('Failed to send message in new chat');
        }
      }

      return true;

    } catch (error) {
      logger.error('Error creating new chat:', error.message);
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
      logger.error('Health check failed:', error.message);
      // Reset connection on health check failure
      this.browser = null;
      this.page = null;
      return false;
    }
  }
}

module.exports = BrowserManager; 