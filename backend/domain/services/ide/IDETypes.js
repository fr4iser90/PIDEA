/**
 * IDETypes - Standardized IDE type definitions
 * Provides constants and utilities for IDE type management
 */
class IDETypes {
  // Standard IDE types
  static CURSOR = 'cursor';
  static VSCODE = 'vscode';
  static WINDSURF = 'windsurf';
  static JETBRAINS = 'jetbrains';
  static SUBLIME = 'sublime';

  // IDE type metadata
  static METADATA = {
    [IDETypes.CURSOR]: {
      name: 'Cursor',
      displayName: 'Cursor IDE',
      description: 'AI-powered code editor',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'cursor',
      detectionPatterns: ['cursor', 'Cursor'],
      // Cursor-specific chat selectors
      chatSelectors: {
        input: '.aislash-editor-input[contenteditable="true"]',
        inputContainer: '.aislash-editor-container',
        userMessages: 'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]',
        aiMessages: 'span.anysphere-markdown-container-root',
        messagesContainer: '.chat-messages-container',
        chatContainer: '.aislash-container',
        isActive: '.aislash-container',
        isInputReady: '.aislash-editor-input[contenteditable="true"]',
        
        // Enhanced code block detection selectors
        codeBlocks: '.composer-code-block-container',
        codeBlockContent: '.composer-code-block-content',
        codeBlockHeader: '.composer-code-block-header',
        codeBlockFilename: '.composer-code-block-filename',
        codeBlockLanguage: '.composer-code-block-file-info .javascript-lang-file-icon',
        monacoEditor: '.monaco-editor',
        codeLines: '.view-lines .view-line',
        syntaxTokens: '.mtk1, .mtk4, .mtk14, .mtk18',
        codeBlockApplyButton: '.anysphere-text-button:has-text("Apply")',
        
        // Inline code detection
        inlineCode: 'code:not(pre code)',
        codeSpans: 'span[class*="code"]',
        
        // Syntax highlighting classes
        syntaxClasses: {
          keyword: '.mtk1',
          string: '.mtk4',
          comment: '.mtk14',
          function: '.mtk18'
        }
      }
    },
    [IDETypes.VSCODE]: {
      name: 'VSCode',
      displayName: 'Visual Studio Code',
      description: 'Lightweight code editor',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'code',
      detectionPatterns: ['vscode', 'VSCode', 'code'],
      // VSCode-specific chat selectors (Copilot)
      chatSelectors: {
        input: 'textarea[data-testid="chat-input"], textarea[placeholder*="Copilot"], .chat-input-textarea',
        inputContainer: '.chat-input-container, .chat-editor-container',
        userMessages: '.interactive-item-container.interactive-request .value .rendered-markdown',
        aiMessages: '.interactive-item-container.interactive-response .value .rendered-markdown',
        messagesContainer: '.monaco-list-rows',
        chatContainer: '.chat-container, .interactive-session',
        isActive: '.chat-container, .interactive-session',
        isInputReady: 'textarea[data-testid="chat-input"]:not([disabled])',
        // VSCode-specific message rows
        messageRows: '.monaco-list-row',
        userMessageRow: '.monaco-list-row .interactive-request',
        aiMessageRow: '.monaco-list-row .interactive-response'
      }
    },
    [IDETypes.WINDSURF]: {
      name: 'Windsurf',
      displayName: 'Windsurf IDE',
      description: 'Modern development environment',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'windsurf',
      detectionPatterns: ['windsurf', 'Windsurf'],
      // Windsurf-specific chat selectors
      chatSelectors: {
        input: '[data-testid="chat-input"]',
        inputContainer: '[data-testid="chat-container"]',
        userMessages: '[data-testid="user-message"]',
        aiMessages: '[data-testid="ai-message"]',
        messagesContainer: '[data-testid="chat-messages"]',
        chatContainer: '[data-testid="chat-panel"]',
        isActive: '[data-testid="chat-panel"]',
        isInputReady: '[data-testid="chat-input"]:not([disabled])'
      }
    },
    [IDETypes.JETBRAINS]: {
      name: 'JetBrains',
      displayName: 'JetBrains IDEs',
      description: 'Professional development tools',
      supportedFeatures: ['refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.java', '.py', '.php'],
      startupCommand: 'idea',
      detectionPatterns: ['jetbrains', 'JetBrains', 'idea', 'IntelliJ'],
      // JetBrains-specific chat selectors (if available)
      chatSelectors: {
        input: '.chat-input, textarea[placeholder*="chat"]',
        inputContainer: '.chat-container',
        userMessages: '.chat-message.user, .user-message',
        aiMessages: '.chat-message.assistant, .ai-message',
        messagesContainer: '.chat-messages',
        chatContainer: '.chat-panel, .ai-chat',
        isActive: '.chat-panel, .ai-chat',
        isInputReady: '.chat-input:not([disabled])'
      }
    },
    [IDETypes.SUBLIME]: {
      name: 'Sublime',
      displayName: 'Sublime Text',
      description: 'Fast text editor',
      supportedFeatures: ['refactoring', 'terminal', 'git'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'subl',
      detectionPatterns: ['sublime', 'Sublime'],
      // Sublime-specific chat selectors (if available)
      chatSelectors: {
        input: '.chat-input, textarea[placeholder*="chat"]',
        inputContainer: '.chat-container',
        userMessages: '.chat-message.user, .user-message',
        aiMessages: '.chat-message.assistant, .ai-message',
        messagesContainer: '.chat-messages',
        chatContainer: '.chat-panel, .ai-chat',
        isActive: '.chat-panel, .ai-chat',
        isInputReady: '.chat-input:not([disabled])'
      }
    }
  };

  /**
   * Get all available IDE types
   * @returns {Array<string>} Array of IDE type constants
   */
  static getAllTypes() {
    return Object.values(IDETypes).filter(value => typeof value === 'string');
  }

  /**
   * Check if IDE type is valid
   * @param {string} type - IDE type to validate
   * @returns {boolean} True if valid
   */
  static isValid(type) {
    return IDETypes.getAllTypes().includes(type);
  }

  /**
   * Get metadata for IDE type
   * @param {string} type - IDE type
   * @returns {Object|null} IDE metadata
   */
  static getMetadata(type) {
    return IDETypes.METADATA[type] || null;
  }

  /**
   * Get supported features for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Supported features
   */
  static getSupportedFeatures(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.supportedFeatures : [];
  }

  /**
   * Check if IDE type supports a specific feature
   * @param {string} type - IDE type
   * @param {string} feature - Feature to check
   * @returns {boolean} True if feature is supported
   */
  static supportsFeature(type, feature) {
    const features = IDETypes.getSupportedFeatures(type);
    return features.includes(feature);
  }

  /**
   * Get detection patterns for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Detection patterns
   */
  static getDetectionPatterns(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.detectionPatterns : [];
  }

  /**
   * Get startup command for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Startup command
   */
  static getStartupCommand(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.startupCommand : null;
  }

  /**
   * Get display name for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Display name
   */
  static getDisplayName(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.displayName : null;
  }

  /**
   * Get description for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Description
   */
  static getDescription(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.description : null;
  }

  /**
   * Get supported file extensions for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Supported file extensions
   */
  static getSupportedFileExtensions(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.fileExtensions : [];
  }

  /**
   * Check if IDE type supports file extension
   * @param {string} type - IDE type
   * @param {string} extension - File extension to check
   * @returns {boolean} True if extension is supported
   */
  static supportsFileExtension(type, extension) {
    const extensions = IDETypes.getSupportedFileExtensions(type);
    return extensions.includes(extension);
  }

  /**
   * Get chat selectors for IDE type
   * @param {string} type - IDE type
   * @returns {Object|null} Chat selectors
   */
  static getChatSelectors(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.chatSelectors : null;
  }

  /**
   * Check if IDE type has chat support
   * @param {string} type - IDE type
   * @returns {boolean} True if chat is supported
   */
  static hasChatSupport(type) {
    const features = IDETypes.getSupportedFeatures(type);
    return features.includes('chat');
  }
}

module.exports = IDETypes; 