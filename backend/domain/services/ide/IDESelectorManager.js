/**
 * IDESelectorManager - Centralized IDE selector management
 * Provides unified access to IDE-specific selectors with fallback mechanisms
 */

const IDETypes = require('./IDETypes');
const SelectorVersionManager = require('./SelectorVersionManager');
const JSONSelectorManager = require('./JSONSelectorManager');
const Logger = require('@logging/Logger');
const logger = new Logger('IDESelectorManager');

class IDESelectorManager {
  constructor(dependencies = {}) {
    this.versionManager = new SelectorVersionManager(dependencies);
    this.jsonSelectorManager = new JSONSelectorManager(dependencies);
    this.logger = dependencies.logger || logger;
    this.selectorCollectionBot = dependencies.selectorCollectionBot;
  }

  /**
   * Get selectors for a specific IDE type and version
   * @param {string} ideType - The IDE type (cursor, vscode, windsurf)
   * @param {string} version - The IDE version (REQUIRED - no fallbacks!)
   * @returns {Promise<Object>} IDE-specific selectors
   * @throws {Error} If version not found - NO FALLBACKS!
   */
  async getSelectors(ideType, version = null) {
    if (!version) {
      throw new Error(`Version is required for ${ideType}. No fallbacks allowed. Please specify exact version.`);
    }

    try {
      // Try JSON files first (new system)
      return await this.jsonSelectorManager.getSelectors(ideType, version);
    } catch (error) {
      this.logger.error(`Error getting selectors for ${ideType} version ${version}:`, error.message);
      throw error; // Re-throw - NO FALLBACKS!
    }
  }

  /**
   * Get selectors for a specific IDE type and version (synchronous version)
   * @param {string} ideType - The IDE type (cursor, vscode, windsurf)
   * @param {string} version - The IDE version (REQUIRED - no fallbacks!)
   * @returns {Object} IDE-specific selectors
   * @throws {Error} If version not found - NO FALLBACKS!
   */
  static getSelectors(ideType, version) {
    try {
      // Version is REQUIRED - no fallbacks allowed
      if (!version) {
        throw new Error(`Version is required for ${ideType}. No fallbacks allowed. Please specify exact version.`);
      }

      // For static access, we still use IDETypes for now (backward compatibility)
      // In the future, this could be refactored to use JSON files directly
      const selectors = IDETypes.getSelectorsForVersion(ideType, version);
      logger.info(`Retrieved selectors for ${ideType} version ${version}`);
      return selectors;
    } catch (error) {
      logger.error(`Error getting selectors for ${ideType} version ${version}:`, error.message);
      throw error; // Re-throw - NO FALLBACKS!
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
   * @returns {Promise<Array<string>>} Available versions
   */
  async getAvailableVersions(ideType) {
    try {
      return await this.jsonSelectorManager.getAvailableVersions(ideType);
    } catch (error) {
      this.logger.error(`Error getting available versions for ${ideType}:`, error.message);
      // Fallback to IDETypes for backward compatibility
      return IDETypes.getAvailableVersions(ideType);
    }
  }

  /**
   * Get available versions for IDE type (static version)
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
   * Collect selectors for new IDE version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collection result
   */
  async collectSelectorsForVersion(ideType, version, port) {
    try {
      this.logger.info(`Collecting selectors for ${ideType} version ${version} on port ${port}`);
      
      if (!this.selectorCollectionBot) {
        throw new Error('SelectorCollectionBot not available');
      }

      // Use the version manager's collection method
      const result = await this.versionManager.collectSelectorsForVersion(ideType, version, port);
      
      if (result.success) {
        this.logger.info(`Successfully collected selectors for ${ideType} version ${version}`);
      } else {
        this.logger.error(`Selector collection failed for ${ideType} version ${version}: ${result.error}`);
      }

      return result;

    } catch (error) {
      this.logger.error(`Error collecting selectors for ${ideType} version ${version}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test selectors for IDE version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to test
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Test results
   */
  async testSelectorsForVersion(ideType, version, selectors, port) {
    try {
      if (!this.selectorCollectionBot) {
        throw new Error('SelectorCollectionBot not available');
      }

      return await this.selectorCollectionBot.testSelectors(ideType, version, selectors, port);

    } catch (error) {
      this.logger.error(`Error testing selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Get selector for a specific element type
   * @param {string} ideType - The IDE type
   * @param {string} elementType - The element type (input, sendButton, etc.)
   * @returns {string|null} The selector or null if not found
   */
  static getSelector(ideType, elementType, version = null) {
    try {
      if (!version) {
        throw new Error(`Version is required for ${ideType}. No fallbacks allowed.`);
      }
      const selectors = this.getSelectors(ideType, version);
      return selectors[elementType] || null;
    } catch (error) {
      logger.error(`Error getting selector for ${elementType} in ${ideType}:`, error.message);
      return null;
    }
  }
}

module.exports = IDESelectorManager; 