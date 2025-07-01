class CursorIDEService {
  constructor(browserManager, ideManager) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
  }

  async sendMessage(message) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      const inputSelector = '.aislash-editor-input[contenteditable="true"]';
      await page.focus(inputSelector);
      await page.fill(inputSelector, message);
      await page.keyboard.press('Enter');
    } catch (error) {
      console.error('[CursorIDEService] Error sending message:', error.message);
      throw error;
    }
  }

  async extractChatHistory() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      // Wait for messages to load
      await page.waitForTimeout(1000);

      const userMessageSelector = 'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]';
      const aiMessageSelector = 'span.anysphere-markdown-container-root';

      // Extract all messages in chronological order
      const allMessages = await page.evaluate(() => {
        const messages = [];
        
        // Find all User messages
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
        
        // Find all AI messages
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
        
        // Sort based on DOM position (top value)
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

      return allMessages;
    } catch (error) {
      console.error('[CursorIDEService] Error extracting chat history:', error);
      return [];
    }
  }

  async isConnected() {
    try {
      const page = await this.browserManager.getPage();
      return page !== null;
    } catch (error) {
      return false;
    }
  }

  async switchToSession(session) {
    if (!session.idePort) {
      throw new Error('Session has no IDE port assigned');
    }

    const activeIDE = await this.ideManager.getActiveIDE();
    if (activeIDE && activeIDE.port === session.idePort) {
      return; // Already connected to the right IDE
    }

    await this.ideManager.switchToIDE(session.idePort);
    await this.browserManager.switchToPort(session.idePort);
  }

  async getAvailableIDEs() {
    return await this.ideManager.getAvailableIDEs();
  }

  async startNewIDE(workspacePath = null) {
    return await this.ideManager.startNewIDE(workspacePath);
  }

  async stopIDE(port) {
    return await this.ideManager.stopIDE(port);
  }

  getActivePort() {
    return this.ideManager.getActivePort();
  }
}

module.exports = CursorIDEService; 