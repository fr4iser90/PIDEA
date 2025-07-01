/**
 * 🎯 CURSOR IDE SELECTORS
 * Auto-generated: 2025-07-01T12:32:32.792Z
 */

export const CURSOR_SELECTORS = {
  chat: {
    newChat: '[aria-label="New Chat (Ctrl+N)
[Alt] New Tab (Ctrl+T)"]',
    chatHistory: '[aria-label="Show Chat History (Ctrl+Alt+')"]',
    chatInput: '.aislash-editor-input',
    userMessages: 'div.composer-human-message',
    aiMessages: 'span.anysphere-markdown-container-root',
    settings: '[aria-label="Settings"]'
  },
  explorer: {
    fileExplorer: 'div.pane',
    fileTree: 'div.monaco-list',
    newFile: '[aria-label="New File..."]'
  },
  editor: {
    activeEditor: 'div.monaco-editor',
    editorContent: 'div.view-lines'
  },
  terminal: {
    terminal: 'div.pane-body',
    newTerminal: '[aria-label="New Terminal (Ctrl+Shift+`)
[Alt] Split Terminal (Ctrl+Shift+5)"]'
  }
};

module.exports = { CURSOR_SELECTORS };