/**
 * IDESelectorManager - Centralized IDE selector management
 * Provides unified access to IDE-specific selectors with fallback mechanisms
 */

const IDETypes = require('./IDETypes');
const SelectorVersionManager = require('./SelectorVersionManager');
const Logger = require('@logging/Logger');
const logger = new Logger('IDESelectorManager');

class IDESelectorManager {
  constructor(dependencies = {}) {
    this.versionManager = new SelectorVersionManager(dependencies);
    this.logger = dependencies.logger || logger;
  }

  /**
   * Get selectors for a specific IDE type and version
   * @param {string} ideType - The IDE type (cursor, vscode, windsurf)
   * @param {string} version - The IDE version (optional)
   * @returns {Promise<Object>} IDE-specific selectors
   */
  async getSelectors(ideType, version = null) {
    try {
      return await this.versionManager.getSelectors(ideType, version);
    } catch (error) {
      this.logger.error(`Error getting selectors for ${ideType}:`, error.message);
      return this.versionManager.getFallbackSelectors();
    }
  }

  /**
   * Get selectors for a specific IDE type (synchronous version for backward compatibility)
   * @param {string} ideType - The IDE type (cursor, vscode, windsurf)
   * @returns {Object} IDE-specific selectors
   */
  static getSelectors(ideType) {
    try {
      // For backward compatibility, use the fallback version
      const fallbackVersion = IDETypes.getFallbackVersion(ideType);
      const selectors = IDETypes.getSelectorsForVersion(ideType, fallbackVersion);
      
      if (selectors) {
        logger.info(`Retrieved selectors for ${ideType} IDE fallback version ${fallbackVersion}`);
        return selectors;
      }
      
      // Fallback to old structure
      const metadata = IDETypes.getMetadata(ideType);
      const fallbackSelectors = metadata?.chatSelectors;
      
      if (fallbackSelectors) {
        logger.warn(`Using fallback selectors for ${ideType} IDE`);
        return fallbackSelectors;
      } else {
        logger.warn(`No selectors found for ${ideType} IDE, using generic fallback`);
        return this.getFallbackSelectors();
      }
    } catch (error) {
      logger.error(`Error getting selectors for ${ideType}:`, error.message);
      return this.getFallbackSelectors();
    }
  }

  /**
   * Get fallback selectors for unknown or unsupported IDEs
   * @returns {Object} Generic fallback selectors
   */
  static getFallbackSelectors() {
    return {
      input: 'textarea[data-testid="chat-input"], textarea[placeholder*="chat"], [contenteditable="true"]',
      inputContainer: '.chat-input-container, .chat-editor-container',
      userMessages: '.user-message, .chat-message.user',
      aiMessages: '.ai-message, .chat-message.ai',
      messagesContainer: '.chat-container, .messages-container',
      chatContainer: '.chat-container, .chat-panel',
      isActive: '.chat-container, .chat-panel',
      isInputReady: 'textarea[data-testid="chat-input"]:not([disabled]), [contenteditable="true"]',
      sendButton: 'button[aria-label*="Send"], .send-button, button[title*="Send"]',
      codeBlocks: '.code-block, .code-container',
      codeBlockContent: '.code-content, .code-block-content',
      codeBlockHeader: '.code-header, .code-block-header',
      codeBlockFilename: '.code-filename, .code-block-filename',
      codeBlockLanguage: '.code-language, .code-block-language',
      monacoEditor: '.monaco-editor',
      codeLines: '.view-line, .view-lines .view-line',
      syntaxTokens: '.mtk1, .mtk4, .mtk14, .mtk18',
      codeBlockApplyButton: '.apply-button, .code-apply-button',
      inlineCode: 'code:not(pre code)',
      codeSpans: 'span[class*="code"]',
      syntaxClasses: {
        keyword: '.mtk1',
        string: '.mtk4',
        comment: '.mtk14',
        function: '.mtk18'
      }
    };
  }

  /**
   * Validate if selectors exist for an IDE type
   * @param {string} ideType - The IDE type to validate
   * @returns {boolean} True if selectors exist
   */
  static hasSelectors(ideType) {
    try {
      const fallbackVersion = IDETypes.getFallbackVersion(ideType);
      return IDETypes.hasVersion(ideType, fallbackVersion);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available IDE types with selectors
   * @returns {Array} Array of IDE types that have selectors
   */
  static getSupportedIDETypes() {
    const allTypes = IDETypes.getAllTypes();
    return allTypes.filter(type => this.hasSelectors(type));
  }

  /**
   * Get available versions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Available versions
   */
  static getAvailableVersions(ideType) {
    return IDETypes.getAvailableVersions(ideType);
  }

  /**
   * Get fallback version for IDE type
   * @param {string} ideType - IDE type
   * @returns {string|null} Fallback version
   */
  static getFallbackVersion(ideType) {
    return IDETypes.getFallbackVersion(ideType);
  }

  /**
   * Get selector for a specific element type
   * @param {string} ideType - The IDE type
   * @param {string} elementType - The element type (input, sendButton, etc.)
   * @returns {string|null} The selector or null if not found
   */
  static getSelector(ideType, elementType) {
    try {
      const selectors = this.getSelectors(ideType);
      return selectors[elementType] || null;
    } catch (error) {
      logger.error(`Error getting selector for ${elementType} in ${ideType}:`, error.message);
      return null;
    }
  }
}

module.exports = IDESelectorManager; 