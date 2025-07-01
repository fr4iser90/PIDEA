/**
 * Cursor IDE DOM Selectors
 * For programmatic interaction with Cursor IDE interface
 */

export const CURSOR_SELECTORS = {
  // Chat Interface
  chat: {
    // Input elements
    input: '.aislash-editor-input[contenteditable="true"]',
    inputContainer: '.aislash-editor-container',
    
    // Message elements
    userMessages: 'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]',
    aiMessages: 'span.anysphere-markdown-container-root',
    messagesContainer: '.chat-messages-container',
    
    // Chat container
    chatContainer: '.aislash-container',
    
    // State indicators
    isActive: '.aislash-container',
    isInputReady: '.aislash-editor-input[contenteditable="true"]'
  },

  // Editor Interface  
  editor: {
    // Main editor
    codeArea: '.monaco-editor',
    editorContainer: '.editor-container',
    
    // Tabs
    tabContainer: '.tab-container',
    tabs: '.tab-container .tab',
    activeTab: '.tab-container .tab.active',
    tabCloseButton: '.tab .close-button',
    
    // File content
    fileContent: '.monaco-editor .view-lines',
    currentLine: '.monaco-editor .current-line',
    
    // Suggestions/Autocomplete
    suggestWidget: '.suggest-widget',
    suggestItems: '.suggest-widget .monaco-list-row'
  },

  // Sidebar Interface
  sidebar: {
    // File Explorer
    fileExplorer: '.file-explorer',
    fileTree: '.file-tree',
    fileItems: '.file-item',
    folderItems: '.folder-item',
    
    // Explorer actions
    refreshButton: '.file-explorer .refresh-button',
    newFileButton: '.file-explorer .new-file-button',
    newFolderButton: '.file-explorer .new-folder-button',
    
    // Search
    searchContainer: '.search-container',
    searchInput: '.search-input',
    searchResults: '.search-results',
    
    // Extensions
    extensionsPanel: '.extensions-panel',
    extensionItems: '.extension-item',
    
    // Sidebar toggle
    sidebarToggle: '.sidebar-toggle',
    sidebarContainer: '.sidebar-container'
  },

  // Command Palette
  commandPalette: {
    container: '.command-palette',
    input: '.command-palette-input',
    results: '.command-palette-results',
    resultItems: '.command-palette-result'
  },

  // Terminal
  terminal: {
    container: '.terminal-container',
    activeTerminal: '.terminal-container .active',
    terminalTabs: '.terminal-tabs .tab',
    terminalInput: '.terminal-input',
    terminalOutput: '.terminal-output'
  },

  // Status Bar
  statusBar: {
    container: '.status-bar',
    leftItems: '.status-bar .left',
    rightItems: '.status-bar .right',
    languageMode: '.status-bar .language-mode',
    gitBranch: '.status-bar .git-branch'
  },

  // Common UI Elements
  common: {
    // Buttons
    button: '.button',
    primaryButton: '.button.primary',
    secondaryButton: '.button.secondary',
    
    // Modals/Dialogs
    modal: '.modal',
    modalOverlay: '.modal-overlay',
    modalContent: '.modal-content',
    modalCloseButton: '.modal .close-button',
    
    // Loading states
    loading: '.loading',
    spinner: '.spinner',
    
    // Notifications
    notification: '.notification',
    notificationContainer: '.notification-container'
  }
};

// Helper functions for common operations
export const CURSOR_HELPERS = {
  /**
   * Wait for chat input to be ready
   */
  waitForChatReady: async (page, timeout = 5000) => {
    await page.waitForSelector(CURSOR_SELECTORS.chat.input, {
      state: 'visible',
      timeout
    });
  },

  /**
   * Send message to chat
   */
  sendChatMessage: async (page, message) => {
    await page.focus(CURSOR_SELECTORS.chat.input);
    await page.fill(CURSOR_SELECTORS.chat.input, message);
    await page.keyboard.press('Enter');
  },

  /**
   * Extract all chat messages
   */
  extractChatHistory: async (page) => {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // User messages
      document.querySelectorAll(selectors.chat.userMessages).forEach(el => {
        messages.push({
          type: 'user',
          content: el.innerText.trim(),
          element: el
        });
      });
      
      // AI messages
      document.querySelectorAll(selectors.chat.aiMessages).forEach(el => {
        messages.push({
          type: 'ai',
          content: el.innerText.trim(),
          element: el
        });
      });
      
      // Sort by DOM position
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        type: msg.type,
        content: msg.content
      }));
    }, CURSOR_SELECTORS);
  },

  /**
   * Open file in editor
   */
  openFile: async (page, fileName) => {
    // Implementation depends on how files are opened
    // This could be through file explorer click or command palette
  },

  /**
   * Check if chat is active/available
   */
  isChatActive: async (page) => {
    try {
      await page.waitForSelector(CURSOR_SELECTORS.chat.chatContainer, {
        state: 'visible',
        timeout: 1000
      });
      return true;
    } catch {
      return false;
    }
  }
};

// Export default for convenience
export default CURSOR_SELECTORS; 