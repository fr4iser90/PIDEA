/**
 * 🤖 CURSOR IDE AUTOMATION
 * Generated: 2025-07-06T17:00:48.804Z
 */

const BrowserManager = require('../src/infrastructure/external/BrowserManager');
const IDEManager = require('../src/infrastructure/external/IDEManager');

class CursorIDE {
  constructor() {
    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.selectors = {
      chat: {
        newChat: '[aria-label*="New Chat"]',
        chatInput: '.aislash-editor-input',
        aiMessages: '.anysphere-markdown-container-root',
        settings: '[aria-label="Settings"]'
      },
      explorer: {
        fileExplorer: '.pane',
        newFile: '[aria-label*="New File"]',
        fileTree: '.monaco-list'
      },
      editor: {
        activeEditor: '.monaco-editor',
        editorTabs: '.tab'
      },
      terminal: {
        terminal: '.terminal-wrapper'
      },
      commands: {
        commandPalette: '.quick-input-widget',
        quickOpen: '.quick-input-widget'
      },
      search: {
        globalSearch: '.search-view'
      },
      panels: {
        debugPanel: '.debug-view',
        problemsPanel: '.markers-panel',
        outputPanel: '.output-panel',
        extensionsPanel: '.extensions-view'
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

  async openSettings() {
    await this.page.click(this.selectors.chat.settings);
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

  async createNewFolder(folderName) {
    await this.page.click(this.selectors.explorer.newFolder);
    await this.page.keyboard.type(folderName);
    await this.page.keyboard.press('Enter');
  }

  async getActiveEditor() {
    return await this.page.locator(this.selectors.editor.activeEditor);
  }

  async closeTab() {
    await this.page.click(this.selectors.editor.tabCloseButton);
  }

  async openTerminal() {
    await this.page.keyboard.press('Control+Shift+`');
    await this.page.waitForSelector(this.selectors.terminal.terminal);
  }

  async runTerminalCommand(command) {
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }

  async openCommandPalette() {
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForSelector(this.selectors.commands.commandPalette);
  }

  async openQuickOpen() {
    await this.page.keyboard.press('Control+P');
    await this.page.waitForSelector(this.selectors.commands.quickOpen);
  }

  async openGlobalSearch() {
    await this.page.keyboard.press('Control+Shift+F');
    await this.page.waitForSelector(this.selectors.search.globalSearch);
  }

  async search(query) {
    await this.openGlobalSearch();
    await this.page.fill(this.selectors.search.searchInput, query);
    await this.page.keyboard.press('Enter');
  }

  async openDebugPanel() {
    await this.page.keyboard.press('Control+Shift+D');
    await this.page.waitForSelector(this.selectors.panels.debugPanel);
  }

  async openProblemsPanel() {
    await this.page.keyboard.press('Control+Shift+M');
    await this.page.waitForSelector(this.selectors.panels.problemsPanel);
  }

  async openOutputPanel() {
    await this.page.keyboard.press('Control+Shift+U');
    await this.page.waitForSelector(this.selectors.panels.outputPanel);
  }

  async openExtensionsPanel() {
    await this.page.keyboard.press('Control+Shift+X');
    await this.page.waitForSelector(this.selectors.panels.extensionsPanel);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    await this.browserManager.disconnect();
  }
}

module.exports = { CursorIDE };