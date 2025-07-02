class ChatHistoryExtractor {
  constructor(browserManager) {
    this.browserManager = browserManager;
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
      console.error('[ChatHistoryExtractor] Error extracting chat history:', error);
      return [];
    }
  }
}

module.exports = ChatHistoryExtractor;
