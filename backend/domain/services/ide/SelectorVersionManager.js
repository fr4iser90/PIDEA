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
    this.versionDetectionService = dependencies.versionDetectionService;
    this.selectorCollectionBot = dependencies.selectorCollectionBot;
  }

  /**
   * Get selectors for specific IDE type and version
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version (REQUIRED - no fallbacks!)
   * @returns {Promise<Object>} Version-specific selectors
   * @throws {Error} If version not found - NO FALLBACKS!
   */
  async getSelectors(ideType, version = null) {
    try {
      // Version is REQUIRED - no fallbacks allowed
      if (!version) {
        throw new Error(`Version is required for ${ideType}. No fallbacks allowed. Please specify exact version.`);
      }

      // Check cache first
      const cacheKey = `${ideType}:${version}`;
      const cached = this.versionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`Using cached selectors for ${ideType} version ${version}`);
        return cached.selectors;
      }

      // Get version-specific selectors - NO FALLBACKS
      const selectors = this.ideTypes.getSelectorsForVersion(ideType, version);
      
      this.logger.info(`Retrieved selectors for ${ideType} version ${version}`);

      // Cache the result
      this.versionCache.set(cacheKey, {
        selectors: selectors,
        timestamp: Date.now()
      });

      return selectors;

    } catch (error) {
      this.logger.error(`Error getting selectors for ${ideType} version ${version}:`, error.message);
      throw error; // Re-throw - NO FALLBACKS!
    }
  }

  /**
   * Detect IDE version (integrated with VersionDetectionService)
   * @param {string} ideType - IDE type
   * @param {number} port - IDE port (REQUIRED)
   * @returns {Promise<string>} Detected version
   * @throws {Error} If version detection fails - NO FALLBACKS!
   */
  async detectIDEVersion(ideType, port = null) {
    try {
      // Port is REQUIRED for version detection
      if (!port) {
        throw new Error(`Port is required for version detection of ${ideType}. No fallbacks allowed.`);
      }

      // Try to use VersionDetectionService if available
      if (this.versionDetectionService) {
        const result = await this.versionDetectionService.detectVersion(port, ideType);
        if (result && result.currentVersion) {
          return result.currentVersion;
        }
        throw new Error(`VersionDetectionService failed to detect version for ${ideType} on port ${port}`);
      }
      
      // No fallback - throw error
      throw new Error(`VersionDetectionService not available for ${ideType} on port ${port}. No fallbacks allowed.`);
    } catch (error) {
      this.logger.error(`Error detecting version for ${ideType} on port ${port}:`, error.message);
      throw error; // Re-throw - NO FALLBACKS!
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
   * Collect selectors for new version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collected selectors
   */
  async collectSelectorsForVersion(ideType, version, port) {
    try {
      this.logger.info(`Collecting selectors for ${ideType} version ${version} on port ${port}`);
      
      if (!this.selectorCollectionBot) {
        throw new Error('SelectorCollectionBot not available');
      }

      // Collect selectors using the bot
      const collectedSelectors = await this.selectorCollectionBot.collectSelectors(ideType, version, port);
      
      // Test the collected selectors
      const testResults = await this.selectorCollectionBot.testSelectors(ideType, version, collectedSelectors, port);
      
      if (testResults.failed > testResults.passed) {
        this.logger.warn(`Selector collection quality is low: ${testResults.passed}/${testResults.tested} passed`);
      }

      // Save the selectors
      await this.selectorCollectionBot.saveSelectors(ideType, version, collectedSelectors);
      
      this.logger.info(`Successfully collected and saved selectors for ${ideType} version ${version}`);
      return {
        selectors: collectedSelectors,
        testResults,
        success: true
      };

    } catch (error) {
      this.logger.error(`Selector collection failed for ${ideType} version ${version}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
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
