/**
 * 🤖 CURSOR IDE AUTOMATION
 * Generated: 2025-07-01T12:32:32.792Z
 */

const BrowserManager = require('../src/infrastructure/external/BrowserManager');
const IDEManager = require('../src/infrastructure/external/IDEManager');

class CursorIDE {
  constructor() {
    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.selectors = {
      chat: {
        newChat: '[aria-label="New Chat (Ctrl+N)
[Alt] New Tab (Ctrl+T)"]',
        chatInput: '.aislash-editor-input',
        aiMessages: 'span.anysphere-markdown-container-root'
      },
      explorer: {
        fileExplorer: 'div.pane',
        newFile: '[aria-label="New File..."]'
      },
      editor: {
        activeEditor: 'div.monaco-editor'
      },
      terminal: {
        terminal: 'div.pane-body'
      }
    };
  }

  async initialize() {
    await this.ideManager.initialize();
    const activePort = this.ideManager.getActivePort();
    await this.browserManager.connect(activePort);
    this.page = await this.browserManager.getPage();
    return this;
  }

  async startNewChat() {
    await this.page.click(this.selectors.chat.newChat);
    await this.page.waitForSelector(this.selectors.chat.chatInput);
  }

  async sendChatMessage(message) {
    await this.page.fill(this.selectors.chat.chatInput, message);
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector(this.selectors.chat.aiMessages);
  }

  async openFileExplorer() {
    await this.page.keyboard.press('Control+Shift+E');
    await this.page.waitForSelector(this.selectors.explorer.fileExplorer);
  }

  async createNewFile(fileName) {
    await this.page.click(this.selectors.explorer.newFile);
    await this.page.keyboard.type(fileName);
    await this.page.keyboard.press('Enter');
  }

  async openTerminal() {
    await this.page.keyboard.press('Control+Shift+`');
    await this.page.waitForSelector(this.selectors.terminal.terminal);
  }

  async disconnect() {
    await this.browserManager.disconnect();
  }
}

module.exports = { CursorIDE };