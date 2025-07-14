const IDETypes = require('../ide/IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class ChatHistoryExtractor {
  constructor(browserManager, ideType = IDETypes.CURSOR) {
    this.browserManager = browserManager;
    this.ideType = ideType;
    this.selectors = IDETypes.getChatSelectors(ideType);
    
    if (!this.selectors) {
      logger.warn(`No chat selectors found for IDE type: ${ideType}`);
    }
  }

  async extractChatHistory() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No IDE page available');
      }

      if (!this.selectors) {
        throw new Error(`No chat selectors available for IDE type: ${this.ideType}`);
      }

      // For VS Code, we need to navigate to the actual application window
      // Only if we're on DevTools page
      if (this.ideType === IDETypes.VSCODE) {
        const pageTitle = await page.title();
        if (pageTitle === 'DevTools') {
          await this.navigateToVSCodeApp(page);
        }
      }

      // Wait for messages to load
      await page.waitForTimeout(1000);

      // Use IDE-specific extraction logic
      const allMessages = await this.extractMessagesByIDEType(page);

      return allMessages;
    } catch (error) {
      logger.error(`Error extracting chat history from ${this.ideType}:`, error);
      return [];
    }
  }

  /**
   * Navigate to the actual VS Code application window
   * @param {Page} page - Playwright page object
   */
  async navigateToVSCodeApp(page) {
    try {
      logger.info('[VSCode] Navigating to VS Code app...');
      
      // Get all targets (pages) available
      const targets = await this.browserManager.browser.targets();
      logger.info('[VSCode] Available targets:', targets.length);
      
      // Find the VS Code application target (not DevTools)
      let vscodeTarget = null;
      for (const target of targets) {
        const url = target.url();
        logger.info('[VSCode] Target URL:', url);
        
        // Skip DevTools targets
        if (url.includes('devtools://') || url.includes('chrome-devtools://')) {
          continue;
        }
        
        // Look for VS Code application target
        if (url.includes('file://') || url.includes('vscode://') || url === 'about:blank') {
          vscodeTarget = target;
          break;
        }
      }
      
      if (vscodeTarget) {
        logger.info('[VSCode] Found VS Code app target, navigating...');
        const newPage = await vscodeTarget.page();
        if (newPage) {
          // Update the browser manager to use the new page
          this.browserManager.currentPage = newPage;
          logger.info('[VSCode] Successfully navigated to VS Code app');
          return;
        }
      }
      
      logger.info('[VSCode] No VS Code app target found, staying on current page');
    } catch (error) {
      logger.error('[VSCode] Error navigating to VS Code app:', error);
    }
  }

  /**
   * Extract messages using IDE-specific logic
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractMessagesByIDEType(page) {
    switch (this.ideType) {
      case IDETypes.CURSOR:
        return await this.extractCursorMessages(page);
      case IDETypes.VSCODE:
        return await this.extractVSCodeMessages(page);
      case IDETypes.WINDSURF:
        return await this.extractWindsurfMessages(page);
      default:
        return await this.extractGenericMessages(page);
    }
  }

  /**
   * Extract messages from Cursor IDE
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractCursorMessages(page) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Find all User messages
      const userElements = document.querySelectorAll(selectors.userMessages);
      userElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'user',
            type: text.includes('```') ? 'code' : 'text',
            content: text.trim(),
            element: element,
            index: index
          });
        }
      });
      
      // Find all AI messages
      const aiElements = document.querySelectorAll(selectors.aiMessages);
      aiElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'ai',
            type: text.includes('```') ? 'code' : 'text',
            content: text.trim(),
            element: element,
            index: index
          });
        }
      });
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, this.selectors);
  }

  /**
   * Extract messages from VSCode IDE (Copilot)
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractVSCodeMessages(page) {
    logger.info('[VSCode] extractVSCodeMessages called');
    let result;
    try {
      result = await page.evaluate((selectors) => {
        const debug = {
          selectors,
          messageRowsCount: 0,
          userRows: 0,
          aiRows: 0,
          firstRowsHtml: [],
          userFound: [],
          aiFound: [],
          // Enhanced debugging
          allMonacoRows: 0,
          allInteractiveItems: 0,
          allChatContainers: 0,
          pageTitle: document.title,
          bodyClasses: document.body.className,
          sampleBodyHTML: document.body.innerHTML.substring(0, 500)
        };
        const messages = [];
        
        // Check for various possible selectors
        const allMonacoRows = document.querySelectorAll('.monaco-list-row');
        const allInteractiveItems = document.querySelectorAll('.interactive-item-container');
        const allChatContainers = document.querySelectorAll('.chat-container, .interactive-session');
        
        debug.allMonacoRows = allMonacoRows.length;
        debug.allInteractiveItems = allInteractiveItems.length;
        debug.allChatContainers = allChatContainers.length;
        
        // Try the original selectors
        const messageRows = document.querySelectorAll(selectors.messageRows || '.monaco-list-row');
        debug.messageRowsCount = messageRows.length;
        
        messageRows.forEach((row, index) => {
          if (index < 3) debug.firstRowsHtml.push(row.outerHTML.substring(0, 300));
          // User
          const userContainer = row.querySelector('.interactive-request');
          if (userContainer) {
            debug.userRows++;
            debug.userFound.push(index);
            const contentElement = userContainer.querySelector('.value .rendered-markdown');
            if (contentElement) {
              const text = contentElement.innerText || contentElement.textContent || '';
              if (text.trim()) {
                messages.push({
                  sender: 'user',
                  type: text.includes('```') ? 'code' : 'text',
                  content: text.trim(),
                  index: index
                });
              }
            }
          }
          // AI
          const aiContainer = row.querySelector('.interactive-response');
          if (aiContainer) {
            debug.aiRows++;
            debug.aiFound.push(index);
            const contentElement = aiContainer.querySelector('.value .rendered-markdown');
            if (contentElement) {
              const text = contentElement.innerText || contentElement.textContent || '';
              if (text.trim()) {
                messages.push({
                  sender: 'ai',
                  type: text.includes('```') ? 'code' : 'text',
                  content: text.trim(),
                  index: index
                });
              }
            }
          }
        });
        
        return { debug, messages };
      }, this.selectors);
    } catch (error) {
      logger.error('[VSCode] page.evaluate error:', error);
      result = { debug: { error: error.message }, messages: [] };
    }
    logger.debug('[VSCode] Debug:', JSON.stringify(result.debug, null, 2));
    return result.messages;
  }

  /**
   * Extract messages from Windsurf IDE
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractWindsurfMessages(page) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Find all User messages
      const userElements = document.querySelectorAll(selectors.userMessages);
      userElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'user',
            type: text.includes('```') ? 'code' : 'text',
            content: text.trim(),
            element: element,
            index: index
          });
        }
      });
      
      // Find all AI messages
      const aiElements = document.querySelectorAll(selectors.aiMessages);
      aiElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'ai',
            type: text.includes('```') ? 'code' : 'text',
            content: text.trim(),
            element: element,
            index: index
          });
        }
      });
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, this.selectors);
  }

  /**
   * Extract messages using generic selectors
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractGenericMessages(page) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Try to find user messages
      if (selectors.userMessages) {
        const userElements = document.querySelectorAll(selectors.userMessages);
        userElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              sender: 'user',
              type: text.includes('```') ? 'code' : 'text',
              content: text.trim(),
              element: element,
              index: index
            });
          }
        });
      }
      
      // Try to find AI messages
      if (selectors.aiMessages) {
        const aiElements = document.querySelectorAll(selectors.aiMessages);
        aiElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              sender: 'ai',
              type: text.includes('```') ? 'code' : 'text',
              content: text.trim(),
              element: element,
              index: index
            });
          }
        });
      }
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, this.selectors);
  }

  /**
   * Get IDE type
   * @returns {string} IDE type
   */
  getIDEType() {
    return this.ideType;
  }

  /**
   * Get current selectors
   * @returns {Object} Current selectors
   */
  getSelectors() {
    return this.selectors;
  }
}

module.exports = ChatHistoryExtractor;
