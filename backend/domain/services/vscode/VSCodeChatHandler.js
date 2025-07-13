const ChatMessageHandler = require('../chat/ChatMessageHandler');
const { logger } = require('@infrastructure/logging/Logger');


class VSCodeChatHandler extends ChatMessageHandler {
  constructor(browserManager) {
    super(browserManager);
    this.extensionSelectors = {
      githubCopilot: {
        chatInput: [
          '.copilot-chat-input',
          '.copilot-chat-input textarea',
          '.copilot-chat-input input',
          '.ced-chat-session-detail textarea',
          '.ced-chat-session-detail input',
          '.ced-chat-session-detail-6d1b1917-3 textarea',
          '.ced-chat-session-detail-6d1b1917-4 textarea',
          '.monaco-workbench textarea',
          '.monaco-workbench input',
          '.chat-input',
          '.chat-input textarea',
          '.chat-input input'
        ],
        sendButton: [
          '.copilot-chat-send-button',
          '.copilot-chat button[type="submit"]',
          '.copilot-chat button:has-text("Send")',
          '.chat-send-button',
          '.chat button[type="submit"]',
          '.chat button:has-text("Send")',
          'button[aria-label*="Send"]',
          'button[title*="Send"]'
        ],
        chatContainer: [
          '.copilot-chat-container',
          '.copilot-chat',
          '.ced-chat-session-detail',
          '.chat'
        ],
        messages: [
          '.copilot-chat-message',
          '.ced-chat-session-detail-6d1b1917-3',
          '.ced-chat-session-detail-6d1b1917-4',
          '.chat-message'
        ]
      },
      chatGPT: {
        chatInput: [
          '.chatgpt-input',
          '.chatgpt-input textarea',
          '.chatgpt-input input'
        ],
        sendButton: [
          '.chatgpt-send-button',
          '.chatgpt button[type="submit"]',
          '.chatgpt button:has-text("Send")'
        ],
        chatContainer: [
          '.chatgpt-container',
          '.chatgpt'
        ],
        messages: [
          '.chatgpt-message'
        ]
      },
      codeGPT: {
        chatInput: [
          '.codegpt-input',
          '.codegpt-input textarea',
          '.codegpt-input input'
        ],
        sendButton: [
          '.codegpt-send-button',
          '.codegpt button[type="submit"]',
          '.codegpt button:has-text("Send")'
        ],
        chatContainer: [
          '.codegpt-container',
          '.codegpt'
        ],
        messages: [
          '.codegpt-message'
        ]
      }
    };
  }

  async sendMessage(message, options = {}) {
    const { extensionType = 'githubCopilot', ...otherOptions } = options;
    
    try {
      logger.log('[VSCodeChatHandler] Sending message to VSCode with extension:', extensionType);
      
      // Get fresh page reference in case it changed
      let page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      // Check if we need to navigate to VS Code app (only if on DevTools page)
      const pageTitle = await page.title();
      if (pageTitle === 'DevTools') {
        logger.log('[VSCodeChatHandler] On DevTools page, navigating to VS Code app...');
        await this.navigateToVSCodeApp();
        // Get fresh page reference after navigation
        page = await this.browserManager.getPage();
        if (!page) {
          throw new Error('No browser page available after navigation');
        }
      }

      const selectors = this.extensionSelectors[extensionType];
      if (!selectors) {
        throw new Error(`Unsupported extension type: ${extensionType}`);
      }

      // Wait for VSCode to be ready (with retry logic)
      let vscodeReady = false;
      for (let i = 0; i < 3; i++) {
        try {
          // Try multiple selectors for VS Code
          const selectors = ['.monaco-workbench', 'body', 'html'];
          for (const selector of selectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              vscodeReady = true;
              logger.log(`[VSCodeChatHandler] VSCode ready with selector: ${selector}`);
              break;
            } catch (e) {
              continue;
            }
          }
          if (vscodeReady) break;
        } catch (e) {
          logger.debug(`[VSCodeChatHandler] VSCode not ready, attempt ${i + 1}/3`);
          if (i === 2) {
            logger.debug('[VSCodeChatHandler] VSCode not ready after 3 attempts, continuing anyway...');
          }
        }
      }

      // Find chat input using multiple selectors
      let chatInput = null;
      const allSelectors = [
        ...selectors.chatInput,
        // Additional VS Code chat input selectors
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Type"]',
        'textarea[placeholder*="chat"]',
        '.chat-input textarea',
        '.chat-editor textarea',
        '.monaco-editor textarea',
        'textarea.inputarea',
        'textarea[data-mprt="7"]'
      ];
      
      for (const selector of allSelectors) {
        try {
          chatInput = await page.$(selector);
          if (chatInput) {
            logger.log(`[VSCodeChatHandler] Found chat input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatInput) {
        logger.log('[VSCodeChatHandler] No chat input found, trying to find any textarea...');
        // Try to find any textarea as fallback
        const allTextareas = await page.$$('textarea');
        if (allTextareas.length > 0) {
          chatInput = allTextareas[0];
          logger.log(`[VSCodeChatHandler] Using fallback textarea (${allTextareas.length} found)`);
        } else {
          throw new Error(`Could not find chat input for ${extensionType}`);
        }
      }

      // First, try to ensure chat panel is open and visible
      logger.log('[VSCodeChatHandler] Ensuring chat panel is open...');
      await this.ensureChatPanelOpen(page);
      
      // Clear existing text and type the message with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastUsedSelector = null;
      
      // Store the selector that worked for chat input
      for (const selector of allSelectors) {
        try {
          const testInput = await page.$(selector);
          if (testInput) {
            lastUsedSelector = selector;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      while (retryCount < maxRetries) {
        try {
          // Try multiple strategies to interact with the input
          logger.debug(`[VSCodeChatHandler] Attempting to type message (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Strategy 1: Try clicking and typing
          try {
            await chatInput.click({ timeout: 5000 });
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await chatInput.type(message, { delay: 100 });
            logger.log('[VSCodeChatHandler] Successfully typed message using click strategy');
            break; // Success, exit retry loop
          } catch (clickError) {
            logger.log('[VSCodeChatHandler] Click strategy failed, trying focus strategy...');
            
            // Strategy 2: Try focusing and typing
            try {
              await chatInput.focus();
              await page.keyboard.down('Control');
              await page.keyboard.press('KeyA');
              await page.keyboard.up('Control');
              await page.keyboard.press('Backspace');
              await page.keyboard.type(message);
              logger.log('[VSCodeChatHandler] Successfully typed message using focus strategy');
              break; // Success, exit retry loop
            } catch (focusError) {
              logger.log('[VSCodeChatHandler] Focus strategy failed, trying fill strategy...');
              
              // Strategy 3: Try fill method
              try {
                await chatInput.fill(message);
                logger.log('[VSCodeChatHandler] Successfully typed message using fill strategy');
                break; // Success, exit retry loop
              } catch (fillError) {
                logger.log('[VSCodeChatHandler] Fill strategy failed, trying evaluate strategy...');
                
                // Strategy 4: Try JavaScript evaluation
                try {
                  await page.evaluate((selector, text) => {
                    const element = document.querySelector(selector);
                    if (element) {
                      element.value = text;
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }, lastUsedSelector, message);
                  logger.log('[VSCodeChatHandler] Successfully typed message using evaluate strategy');
                  break; // Success, exit retry loop
                } catch (evalError) {
                  throw new Error(`All typing strategies failed: ${evalError.message}`);
                }
              }
            }
          }
        } catch (error) {
          retryCount++;
          logger.debug(`[VSCodeChatHandler] Error typing message (attempt ${retryCount}/${maxRetries}):`, error.message);
          
          if (error.message.includes('Target page, context or browser has been closed')) {
            if (retryCount < maxRetries) {
              logger.log('[VSCodeChatHandler] Page was closed, getting fresh page reference...');
              // Get fresh page reference
              page = await this.browserManager.getPage();
              if (!page) {
                throw new Error('No browser page available after page closure');
              }
              // Re-find chat input using the last working selector
              if (lastUsedSelector) {
                chatInput = await page.$(lastUsedSelector);
                if (!chatInput) {
                  throw new Error('Chat input not found after page refresh');
                }
              } else {
                throw new Error('No selector available for chat input after page refresh');
              }
              continue;
            }
          }
          
          if (retryCount >= maxRetries) {
            throw error;
          }
        }
      }

      // Send message by pressing Enter (simpler and more reliable than clicking buttons)
      logger.log('[VSCodeChatHandler] Sending message by pressing Enter...');
      await page.keyboard.press('Enter');
      
      logger.log('[VSCodeChatHandler] Message sent successfully');
      
      return {
        success: true,
        message: 'Message sent to VSCode successfully',
        extensionType,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error sending message:', error);
      throw new Error(`Failed to send message to VSCode: ${error.message}`);
    }
  }

  async extractChatHistory(options = {}) {
    const { extensionType = 'githubCopilot' } = options;
    
    try {
      logger.log('[VSCodeChatHandler] Extracting chat history from VSCode with extension:', extensionType);
      
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      const selectors = this.extensionSelectors[extensionType];
      if (!selectors) {
        throw new Error(`Unsupported extension type: ${extensionType}`);
      }

      // Wait for VSCode to be ready
      await page.waitForSelector('.monaco-workbench', { timeout: 10000 });

      // Find chat container using multiple selectors
      let chatContainer = null;
      for (const selector of selectors.chatContainer) {
        try {
          chatContainer = await page.$(selector);
          if (chatContainer) {
            logger.log(`[VSCodeChatHandler] Found chat container with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatContainer) {
        logger.log('[VSCodeChatHandler] No chat container found, returning empty history');
        return [];
      }
      
      // Extract messages using multiple selectors
      let messages = [];
      for (const selector of selectors.messages) {
        try {
          const messageElements = await page.$$(selector);
          if (messageElements.length > 0) {
            logger.log(`[VSCodeChatHandler] Found ${messageElements.length} messages with selector: ${selector}`);
            
            messages = await page.evaluate((sel) => {
              const elements = document.querySelectorAll(sel);
              return Array.from(elements).map((element, index) => ({
                id: index,
                content: element.textContent || element.innerText,
                timestamp: new Date().toISOString(),
                element: element.outerHTML
              }));
            }, selector);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      logger.log('[VSCodeChatHandler] Extracted', messages.length, 'messages');
      
      return messages;
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error extracting chat history:', error);
      throw new Error(`Failed to extract chat history from VSCode: ${error.message}`);
    }
  }

  async isExtensionAvailable(extensionType) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return false;
      }

      const selectors = this.extensionSelectors[extensionType];
      if (!selectors) {
        return false;
      }

      // Check if any of the chat input selectors exist
      for (const selector of selectors.chatInput) {
        try {
          const element = await page.$(selector);
          if (element !== null) {
            logger.log(`[VSCodeChatHandler] Extension ${extensionType} available with selector: ${selector}`);
            return true;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error checking extension availability:', error);
      return false;
    }
  }

  async getAvailableExtensions() {
    const availableExtensions = [];
    
    for (const extensionType of Object.keys(this.extensionSelectors)) {
      const isAvailable = await this.isExtensionAvailable(extensionType);
      if (isAvailable) {
        availableExtensions.push(extensionType);
      }
    }
    
    return availableExtensions;
  }

  async switchToExtension(extensionType) {
    try {
      logger.log('[VSCodeChatHandler] Switching to extension:', extensionType);
      
      const isAvailable = await this.isExtensionAvailable(extensionType);
      if (!isAvailable) {
        throw new Error(`Extension ${extensionType} is not available`);
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      const selectors = this.extensionSelectors[extensionType];
      await page.click(selectors.chatInput);
      
      logger.log('[VSCodeChatHandler] Successfully switched to extension:', extensionType);
      
      return {
        success: true,
        extensionType,
        message: `Switched to ${extensionType} successfully`
      };
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error switching to extension:', error);
      throw new Error(`Failed to switch to extension ${extensionType}: ${error.message}`);
    }
  }

  async getActiveExtension() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return null;
      }

      for (const [extensionType, selectors] of Object.entries(this.extensionSelectors)) {
        const isFocused = await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element === document.activeElement;
        }, selectors.chatInput);
        
        if (isFocused) {
          return extensionType;
        }
      }
      
      return null;
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error getting active extension:', error);
      return null;
    }
  }

  /**
   * Ensure the chat panel is open and visible
   * @param {Page} page - Playwright page object
   */
  async ensureChatPanelOpen(page) {
    try {
      logger.log('[VSCodeChatHandler] Checking if chat panel is open...');
      
      // Check if chat panel is already visible
      const chatContainer = await page.$('.chat-container, .interactive-session, .copilot-chat');
      if (chatContainer) {
        const isVisible = await chatContainer.isVisible();
        if (isVisible) {
          logger.log('[VSCodeChatHandler] Chat panel is already open and visible');
          return;
        }
      }
      
      logger.log('[VSCodeChatHandler] Chat panel not visible, trying to open it...');
      
      // Try to open chat panel using keyboard shortcuts
      try {
        // Try Ctrl+Shift+I (common VS Code chat shortcut)
        await page.keyboard.down('Control');
        await page.keyboard.down('Shift');
        await page.keyboard.press('KeyI');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Control');
        await page.waitForTimeout(1000);
        
        // Check if chat panel opened
        const chatPanel = await page.$('.chat-container, .interactive-session, .copilot-chat');
        if (chatPanel && await chatPanel.isVisible()) {
          logger.log('[VSCodeChatHandler] Chat panel opened using Ctrl+Shift+I');
          return;
        }
      } catch (e) {
        logger.log('[VSCodeChatHandler] Ctrl+Shift+I failed, trying alternative shortcuts...');
      }
      
      // Try alternative shortcuts
      const shortcuts = [
        { key: 'KeyC', description: 'Ctrl+Shift+C' },
        { key: 'KeyP', description: 'Ctrl+Shift+P' },
        { key: 'KeyA', description: 'Ctrl+Shift+A' }
      ];
      
      for (const shortcut of shortcuts) {
        try {
          await page.keyboard.down('Control');
          await page.keyboard.down('Shift');
          await page.keyboard.press(shortcut.key);
          await page.keyboard.up('Shift');
          await page.keyboard.up('Control');
          await page.waitForTimeout(1000);
          
          // Check if chat panel opened
          const chatPanel = await page.$('.chat-container, .interactive-session, .copilot-chat');
          if (chatPanel && await chatPanel.isVisible()) {
            logger.log(`[VSCodeChatHandler] Chat panel opened using ${shortcut.description}`);
            return;
          }
        } catch (e) {
          logger.log(`[VSCodeChatHandler] ${shortcut.description} failed`);
        }
      }
      
      // Try clicking on chat-related UI elements
      const chatButtons = [
        '.codicon-comment',
        '.codicon-lightbulb',
        '.codicon-symbol-color',
        '[aria-label*="Chat"]',
        '[aria-label*="Copilot"]',
        '[title*="Chat"]',
        '[title*="Copilot"]'
      ];
      
      for (const buttonSelector of chatButtons) {
        try {
          const button = await page.$(buttonSelector);
          if (button && await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(1000);
            
            // Check if chat panel opened
            const chatPanel = await page.$('.chat-container, .interactive-session, .copilot-chat');
            if (chatPanel && await chatPanel.isVisible()) {
              logger.log(`[VSCodeChatHandler] Chat panel opened by clicking ${buttonSelector}`);
              return;
            }
          }
        } catch (e) {
          // Continue to next button
        }
      }
      
      logger.log('[VSCodeChatHandler] Could not open chat panel, continuing anyway...');
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error ensuring chat panel is open:', error);
      // Don't throw error, just log it and continue
    }
  }

  /**
   * Navigate to the actual VS Code application window
   */
  async navigateToVSCodeApp() {
    try {
      logger.log('[VSCodeChatHandler] Navigating to VS Code app...');
      
      // Get all targets (pages) available
      const targets = await this.browserManager.browser.targets();
      logger.log('[VSCodeChatHandler] Available targets:', targets.length);
      
      // Find the VS Code application target (not DevTools)
      let vscodeTarget = null;
      for (const target of targets) {
        const url = target.url();
        logger.log('[VSCodeChatHandler] Target URL:', url);
        
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
        logger.log('[VSCodeChatHandler] Found VS Code app target, navigating...');
        const newPage = await vscodeTarget.page();
        if (newPage) {
          // Update the browser manager to use the new page
          this.browserManager.page = newPage;
          logger.log('[VSCodeChatHandler] Successfully navigated to VS Code app');
          return;
        }
      }
      
      logger.log('[VSCodeChatHandler] No VS Code app target found, staying on current page');
      
    } catch (error) {
      logger.error('[VSCodeChatHandler] Error navigating to VS Code app:', error);
      // Don't throw error, just log it and continue with current page
    }
  }
}

module.exports = VSCodeChatHandler; 