/**
 * 🎯 CURSOR IDE SELECTORS
 * Auto-generated: 2025-07-06T17:00:48.803Z
 */

export const CURSOR_SELECTORS = {
  chat: {
    newChat: '[aria-label*="New Chat"]',
    chatHistory: '[aria-label*="Chat History"]',
    chatInput: '.aislash-editor-input',
    userMessages: '.composer-human-message',
    aiMessages: '.anysphere-markdown-container-root',
    settings: '[aria-label="Settings"]',
    moreActions: 'span.codicon',
    backgroundAgents: '[aria-label*="Background Agents"]'
  },
  explorer: {
    fileExplorer: '.pane',
    fileTree: '.monaco-list',
    newFile: '[aria-label*="New File"]',
    newFolder: '[aria-label*="New Folder"]',
    folderToggle: '.codicon-chevron-right'
  },
  editor: {
    activeEditor: '.monaco-editor',
    editorContent: '.view-lines',
    editorTabs: '.tab',
    tabCloseButton: '.codicon-close',
    splitEditor: '[aria-label*="Split Editor"]'
  },
  search: {
    globalSearch: '.search-view',
    searchInput: '.monaco-inputbox',
    searchResults: '.monaco-tree-row'
  },
  git: {
    gitSourceControl: '.pane',
    gitChanges: '.monaco-list-row',
    commitInput: '.monaco-inputbox',
    commitButton: '[aria-label*="Commit"]'
  },
  terminal: {
    terminal: '.terminal-wrapper',
    newTerminal: '[aria-label*="New Terminal"]'
  },
  commands: {
    commandPalette: '.quick-input-widget',
    quickOpen: '.quick-input-widget'
  },
  panels: {
    debugPanel: '.debug-view',
    problemsPanel: '.markers-panel',
    outputPanel: '.output-panel',
    extensionsPanel: '.extensions-view'
  }
};

module.exports = { CURSOR_SELECTORS };