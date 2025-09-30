/**
 * SelectorVersionManager - Manages version-based selector loading
 * Provides unified access to version-specific selectors with fallback mechanisms
 */

const IDETypes = require('./IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('SelectorVersionManager');

class SelectorVersionManager {
  constructor(dependencies = {}) {
    this.ideTypes = dependencies.ideTypes || IDETypes;
    this.versionCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.logger = dependencies.logger || logger;
  }

  /**
   * Get selectors for specific IDE type and version
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version (optional)
   * @returns {Promise<Object>} Version-specific selectors
   */
  async getSelectors(ideType, version = null) {
    try {
      // Check cache first
      const cacheKey = `${ideType}:${version || 'latest'}`;
      const cached = this.versionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`Using cached selectors for ${ideType} version ${version || 'latest'}`);
        return cached.selectors;
      }

      let targetVersion = version;
      
      // If no version specified, try to detect current IDE version
      if (!targetVersion) {
        targetVersion = await this.detectIDEVersion(ideType);
        this.logger.info(`Detected IDE version: ${ideType} ${targetVersion}`);
      }

      // Try to get version-specific selectors
      let selectors = this.ideTypes.getSelectorsForVersion(ideType, targetVersion);
      
      if (selectors) {
        this.logger.info(`Retrieved selectors for ${ideType} version ${targetVersion}`);
      } else {
      // Fallback to fallback version
      const fallbackVersion = this.ideTypes.getFallbackVersion(ideType);
      if (fallbackVersion) {
        selectors = this.ideTypes.getSelectorsForVersion(ideType, fallbackVersion);
        this.logger.warn(`Version ${targetVersion} not found for ${ideType}, using fallback version ${fallbackVersion}`);
      }
      }

      if (!selectors) {
        // Final fallback to hardcoded selectors
        const metadata = this.ideTypes.getMetadata(ideType);
        selectors = metadata?.chatSelectors;
        this.logger.warn(`No versioned selectors found for ${ideType}, using fallback selectors`);
      }

      if (!selectors) {
        // Ultimate fallback
        selectors = this.getFallbackSelectors();
        this.logger.warn(`Using generic fallback selectors for ${ideType}`);
      }

      // Cache the result
      this.versionCache.set(cacheKey, {
        selectors: selectors,
        timestamp: Date.now()
      });

      return selectors;

    } catch (error) {
      this.logger.error(`Error getting selectors for ${ideType} version ${version}:`, error.message);
      return this.getFallbackSelectors();
    }
  }

  /**
   * Detect IDE version (placeholder - would integrate with actual IDE detection)
   * @param {string} ideType - IDE type
   * @returns {Promise<string>} Detected version
   */
  async detectIDEVersion(ideType) {
    try {
      // This would integrate with the actual IDE version detection
      // For now, return the fallback version
      const fallbackVersion = this.ideTypes.getFallbackVersion(ideType);
      return fallbackVersion || 'unknown';
    } catch (error) {
      this.logger.error(`Error detecting version for ${ideType}:`, error.message);
      return 'unknown';
    }
  }

  /**
   * Get available versions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Available versions
   */
  getAvailableVersions(ideType) {
    return this.ideTypes.getAvailableVersions(ideType);
  }

  /**
   * Check if version exists for IDE type
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @returns {boolean} True if version exists
   */
  hasVersion(ideType, version) {
    return this.ideTypes.hasVersion(ideType, version);
  }

  /**
   * Get fallback selectors for unknown or unsupported IDEs
   * @returns {Object} Generic fallback selectors
   */
  getFallbackSelectors() {
    return {
      input: 'input[type="text"], textarea, [contenteditable="true"]',
      inputContainer: '.input-container, .chat-input, .message-input',
      userMessages: '.user-message, .human-message, .request-message',
      aiMessages: '.ai-message, .assistant-message, .response-message',
      messagesContainer: '.messages, .chat-messages, .conversation',
      chatContainer: '.chat, .conversation, .messages',
      isActive: '.chat, .conversation, .messages',
      isInputReady: 'input:not([disabled]), textarea:not([disabled]), [contenteditable="true"]:not([disabled])',
      codeBlocks: 'pre, .code-block, .code',
      codeBlockContent: 'code, .code-content',
      inlineCode: 'code:not(pre code)',
      syntaxClasses: {
        keyword: '.keyword, .kw',
        string: '.string, .str',
        comment: '.comment, .cmt',
        function: '.function, .fn'
      }
    };
  }

  /**
   * Clear version cache
   */
  clearCache() {
    this.versionCache.clear();
    this.logger.info('Version cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.versionCache.size,
      keys: Array.from(this.versionCache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

module.exports = SelectorVersionManager;
