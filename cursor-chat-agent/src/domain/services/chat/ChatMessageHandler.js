class ChatMessageHandler {
  constructor(browserManager) {
    this.browserManager = browserManager;
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
      console.error('[ChatMessageHandler] Error sending message:', error.message);
      throw error;
    }
  }
}

module.exports = ChatMessageHandler;
