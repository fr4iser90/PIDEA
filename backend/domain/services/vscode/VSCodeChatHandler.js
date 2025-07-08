const ChatMessageHandler = require('../chat/ChatMessageHandler');

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
      console.log('[VSCodeChatHandler] Sending message to VSCode with extension:', extensionType);
      
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

      // Find chat input using multiple selectors
      let chatInput = null;
      for (const selector of selectors.chatInput) {
        try {
          chatInput = await page.$(selector);
          if (chatInput) {
            console.log(`[VSCodeChatHandler] Found chat input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatInput) {
        throw new Error(`Could not find chat input for ${extensionType}`);
      }

      // Clear existing text and type the message
      await chatInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await chatInput.type(message);

      // Find and click send button
      let sendButton = null;
      for (const selector of selectors.sendButton) {
        try {
          sendButton = await page.$(selector);
          if (sendButton) {
            console.log(`[VSCodeChatHandler] Found send button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!sendButton) {
        // Try pressing Enter as fallback
        console.log('[VSCodeChatHandler] No send button found, trying Enter key...');
        await page.keyboard.press('Enter');
      } else {
        await sendButton.click();
      }
      
      console.log('[VSCodeChatHandler] Message sent successfully');
      
      return {
        success: true,
        message: 'Message sent to VSCode successfully',
        extensionType,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[VSCodeChatHandler] Error sending message:', error);
      throw new Error(`Failed to send message to VSCode: ${error.message}`);
    }
  }

  async extractChatHistory(options = {}) {
    const { extensionType = 'githubCopilot' } = options;
    
    try {
      console.log('[VSCodeChatHandler] Extracting chat history from VSCode with extension:', extensionType);
      
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
            console.log(`[VSCodeChatHandler] Found chat container with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!chatContainer) {
        console.log('[VSCodeChatHandler] No chat container found, returning empty history');
        return [];
      }
      
      // Extract messages using multiple selectors
      let messages = [];
      for (const selector of selectors.messages) {
        try {
          const messageElements = await page.$$(selector);
          if (messageElements.length > 0) {
            console.log(`[VSCodeChatHandler] Found ${messageElements.length} messages with selector: ${selector}`);
            
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
      
      console.log('[VSCodeChatHandler] Extracted', messages.length, 'messages');
      
      return messages;
      
    } catch (error) {
      console.error('[VSCodeChatHandler] Error extracting chat history:', error);
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
            console.log(`[VSCodeChatHandler] Extension ${extensionType} available with selector: ${selector}`);
            return true;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('[VSCodeChatHandler] Error checking extension availability:', error);
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
      console.log('[VSCodeChatHandler] Switching to extension:', extensionType);
      
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
      
      console.log('[VSCodeChatHandler] Successfully switched to extension:', extensionType);
      
      return {
        success: true,
        extensionType,
        message: `Switched to ${extensionType} successfully`
      };
      
    } catch (error) {
      console.error('[VSCodeChatHandler] Error switching to extension:', error);
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
      console.error('[VSCodeChatHandler] Error getting active extension:', error);
      return null;
    }
  }
}

module.exports = VSCodeChatHandler; 