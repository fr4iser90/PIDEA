const ChatMessageHandler = require('../chat/ChatMessageHandler');

class VSCodeChatHandler extends ChatMessageHandler {
  constructor(browserManager) {
    super(browserManager);
    this.extensionSelectors = {
      githubCopilot: {
        chatInput: '.copilot-chat-input',
        sendButton: '.copilot-chat-send-button',
        chatContainer: '.copilot-chat-container',
        messages: '.copilot-chat-message'
      },
      chatGPT: {
        chatInput: '.chatgpt-input',
        sendButton: '.chatgpt-send-button',
        chatContainer: '.chatgpt-container',
        messages: '.chatgpt-message'
      },
      codeGPT: {
        chatInput: '.codegpt-input',
        sendButton: '.codegpt-send-button',
        chatContainer: '.codegpt-container',
        messages: '.codegpt-message'
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

      await page.waitForSelector(selectors.chatInput, { timeout: 10000 });
      
      await page.click(selectors.chatInput);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      await page.type(selectors.chatInput, message);
      await page.click(selectors.sendButton);
      
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

      await page.waitForSelector(selectors.chatContainer, { timeout: 10000 });
      
      const messages = await page.evaluate((selector) => {
        const messageElements = document.querySelectorAll(selector);
        return Array.from(messageElements).map((element, index) => ({
          id: index,
          content: element.textContent || element.innerText,
          timestamp: new Date().toISOString(),
          element: element.outerHTML
        }));
      }, selectors.messages);
      
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

      const element = await page.$(selectors.chatInput);
      return element !== null;
      
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