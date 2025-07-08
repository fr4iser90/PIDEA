// VSCode DOM Selectors for PIDEA Integration
// This file contains all the selectors needed for VSCode automation

const VSCodeSelectors = {
  // Core Workbench
  workbench: '.monaco-workbench',
  titlebar: '.monaco-workbench .part.titlebar',
  sidebar: '.monaco-workbench .part.sidebar',
  editor: '.monaco-workbench .part.editor',
  statusbar: '.monaco-workbench .part.statusbar',
  panel: '.monaco-workbench .part.panel',

  // Titlebar
  title: '.monaco-workbench .part.titlebar .title',
  titleText: '.monaco-workbench .part.titlebar .title .title-text',

  // Sidebar
  sidebarComposite: '.part.sidebar .composite',
  sidebarTabs: '.composite-bar .action-item',
  sidebarContent: '.composite-parts .composite-part',

  // Viewlet Tabs
  explorerTab: '.action-item[data-id="workbench.view.explorer"]',
  searchTab: '.action-item[data-id="workbench.view.search"]',
  scmTab: '.action-item[data-id="workbench.view.scm"]',
  extensionsTab: '.action-item[data-id="workbench.view.extensions"]',
  debugTab: '.action-item[data-id="workbench.view.debug"]',

  // File Explorer
  explorerViewlet: '.explorer-viewlet',
  explorerContent: '.explorer-viewlet-content',
  explorerItems: '.explorer-item',
  explorerItemLabel: '.explorer-item-label',
  explorerItemName: '.explorer-item-label .label-name',
  explorerItemIcon: '.explorer-item .codicon',
  explorerFolderIcon: '.explorer-item .codicon-folder',
  explorerFileIcon: '.explorer-item .codicon-file',
  explorerExpanded: '.explorer-item.expanded',
  explorerSelected: '.explorer-item.selected',

  // Editor
  editorContainer: '.monaco-editor',
  editorTabs: '.tabs-container .tab',
  editorTabLabel: '.tab .tab-label-text',
  editorTabClose: '.tab .tab-close-button',
  editorTabActive: '.tabs-container .tab.active',
  editorTabDirty: '.tabs-container .tab.dirty',
  editorBackground: '.monaco-editor-background',
  editorScrollable: '.monaco-scrollable-element',
  editorMargin: '.margin .margin-view-overlays',

  // Search
  searchViewlet: '.search-viewlet',
  searchInput: '.search-input',
  searchButton: '.search-button',
  searchResults: '.search-results',
  searchResult: '.search-result',
  searchResultFile: '.search-result-file .file-name',
  searchResultMatch: '.search-result-match .match-line',

  // Source Control
  scmViewlet: '.scm-viewlet',
  scmProvider: '.scm-provider',
  scmProviderName: '.scm-provider-name',
  scmResourceGroup: '.scm-resource-group',
  scmResource: '.scm-resource',
  scmResourceName: '.scm-resource-name',
  scmResourceStatus: '.scm-resource-status',

  // Extensions
  extensionsViewlet: '.extensions-viewlet',
  extensionsList: '.extensions-list',
  extension: '.extension',
  extensionName: '.extension-name',
  extensionDescription: '.extension-description',

  // Status Bar
  statusBar: '.monaco-workbench .part.statusbar',
  statusBarItems: '.statusbar-item',

  // Terminal
  terminal: '.terminal',
  terminalContainer: '.terminal-container',
  terminalTab: '.terminal-tab',
  terminalInput: '.terminal-input',

  // Notifications
  notifications: '.notifications-center',
  notification: '.notification',
  notificationMessage: '.notification-message',

  // Context Menus
  contextMenu: '.context-view',
  contextMenuItem: '.context-menu-item',

  // Command Palette
  commandPalette: '.quick-input-widget',
  commandInput: '.quick-input-widget input',

  // Find Widget
  findWidget: '.find-widget',
  findInput: '.find-widget .find-input',
  replaceInput: '.find-widget .replace-input',

  // Extension-specific selectors
  extensions: {
    // GitHub Copilot
    copilot: {
      chatContainer: '.copilot-chat-container',
      chatInput: '.copilot-chat-input',
      sendButton: '.copilot-chat-send-button',
      messages: '.copilot-chat-message',
      suggestions: '.copilot-suggestion'
    },

    // ChatGPT
    chatgpt: {
      chatContainer: '.chatgpt-container',
      chatInput: '.chatgpt-input',
      sendButton: '.chatgpt-send-button',
      messages: '.chatgpt-message',
      sidebar: '.chatgpt-sidebar'
    },

    // CodeGPT
    codegpt: {
      chatContainer: '.codegpt-container',
      chatInput: '.codegpt-input',
      sendButton: '.codegpt-send-button',
      messages: '.codegpt-message',
      panel: '.codegpt-panel'
    }
  },

  // Utility selectors
  utility: {
    loading: '.loading',
    error: '.error',
    warning: '.warning',
    info: '.info',
    success: '.success',
    disabled: '[disabled]',
    hidden: '[style*="display: none"]',
    visible: ':not([style*="display: none"])'
  }
};

// Helper functions for common operations
const VSCodeHelpers = {
  // Wait for VSCode to be ready
  async waitForVSCode(page, timeout = 10000) {
    await page.waitForSelector(VSCodeSelectors.workbench, { timeout });
  },

  // Wait for editor to be ready
  async waitForEditor(page, timeout = 10000) {
    await page.waitForSelector(VSCodeSelectors.editorContainer, { timeout });
  },

  // Wait for explorer to be ready
  async waitForExplorer(page, timeout = 10000) {
    await page.waitForSelector(VSCodeSelectors.explorerViewlet, { timeout });
  },

  // Switch to explorer viewlet
  async switchToExplorer(page) {
    await page.click(VSCodeSelectors.explorerTab);
    await this.waitForExplorer(page);
  },

  // Switch to search viewlet
  async switchToSearch(page) {
    await page.click(VSCodeSelectors.searchTab);
    await page.waitForSelector(VSCodeSelectors.searchViewlet, { timeout: 5000 });
  },

  // Open file in explorer
  async openFile(page, filename) {
    await this.switchToExplorer(page);
    await page.click(`${VSCodeSelectors.explorerItemName}:has-text("${filename}")`);
  },

  // Get active tab
  async getActiveTab(page) {
    return await page.evaluate((selector) => {
      const tab = document.querySelector(selector);
      return tab ? tab.textContent : null;
    }, VSCodeSelectors.editorTabActive);
  },

  // Get all open tabs
  async getOpenTabs(page) {
    return await page.evaluate((selector) => {
      const tabs = document.querySelectorAll(selector);
      return Array.from(tabs).map(tab => tab.textContent);
    }, VSCodeSelectors.editorTabLabel);
  },

  // Check if file is open
  async isFileOpen(page, filename) {
    const tabs = await this.getOpenTabs(page);
    return tabs.some(tab => tab.includes(filename));
  },

  // Get explorer files
  async getExplorerFiles(page) {
    return await page.evaluate((selector) => {
      const items = document.querySelectorAll(selector);
      return Array.from(items).map(item => item.textContent);
    }, VSCodeSelectors.explorerItemName);
  },

  // Check if extension is available
  async isExtensionAvailable(page, extensionType) {
    const selectors = VSCodeSelectors.extensions[extensionType];
    if (!selectors) return false;

    try {
      const element = await page.$(selectors.chatInput);
      return element !== null;
    } catch {
      return false;
    }
  },

  // Get available extensions
  async getAvailableExtensions(page) {
    const available = [];
    for (const [type, selectors] of Object.entries(VSCodeSelectors.extensions)) {
      const isAvailable = await this.isExtensionAvailable(page, type);
      if (isAvailable) {
        available.push(type);
      }
    }
    return available;
  },

  // Send message to extension
  async sendMessageToExtension(page, extensionType, message) {
    const selectors = VSCodeSelectors.extensions[extensionType];
    if (!selectors) {
      throw new Error(`Extension ${extensionType} not supported`);
    }

    await page.click(selectors.chatInput);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(selectors.chatInput, message);
    await page.click(selectors.sendButton);
  },

  // Get workspace name
  async getWorkspaceName(page) {
    return await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : null;
    }, VSCodeSelectors.titleText);
  },

  // Get status bar text
  async getStatusBarText(page) {
    return await page.evaluate((selector) => {
      const items = document.querySelectorAll(selector);
      return Array.from(items).map(item => item.textContent).join(' | ');
    }, VSCodeSelectors.statusBarItems);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VSCodeSelectors,
    VSCodeHelpers
  };
} else if (typeof window !== 'undefined') {
  window.VSCodeSelectors = VSCodeSelectors;
  window.VSCodeHelpers = VSCodeHelpers;
} 