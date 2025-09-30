# Selector Versioning System – Phase 3: SelectorVersionManager

## Overview
Create a simple SelectorVersionManager service that handles version-based selector loading, integrates with IDE version detection, and provides fallback mechanisms. This phase completes the versioning system by connecting all components together.

## Objectives
- [ ] Create simple SelectorVersionManager service
- [ ] Implement version-based selector loading
- [ ] Add fallback to latest version if specific version not found
- [ ] Update IDESelectorManager to use versioned selectors

## Deliverables

### Core Services
- [ ] File: `backend/domain/services/ide/SelectorVersionManager.js` - Main version management service
- [ ] File: `backend/domain/services/ide/IDESelectorManager.js` - Updated to use SelectorVersionManager

### Testing
- [ ] File: `tests/unit/ide/SelectorVersionManager.test.js` - Unit tests for version manager
- [ ] File: `tests/integration/ide/IDESelectorManager.test.js` - Integration tests

## Dependencies
- Requires: Phase 1 (IDE Version Detection), Phase 2 (IDETypes Restructure) completion
- Blocks: None

## Estimated Time
1 hour

## Success Criteria
- [ ] SelectorVersionManager service implemented and tested
- [ ] Version-based selector loading working
- [ ] Fallback mechanisms functional
- [ ] IDESelectorManager updated to use versioned selectors
- [ ] Unit tests pass with 90% coverage

## Implementation Details

### 1. SelectorVersionManager Service
```javascript
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
        // Fallback to latest version
        const latestVersion = this.ideTypes.getLatestVersion(ideType);
        if (latestVersion) {
          selectors = this.ideTypes.getSelectorsForVersion(ideType, latestVersion);
          this.logger.warn(`Version ${targetVersion} not found for ${ideType}, using latest version ${latestVersion}`);
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
      // For now, return the latest version
      const latestVersion = this.ideTypes.getLatestVersion(ideType);
      return latestVersion || 'unknown';
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
```

### 2. IDESelectorManager Update
```javascript
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
      // For backward compatibility, use the latest version
      const latestVersion = IDETypes.getLatestVersion(ideType);
      const selectors = IDETypes.getSelectorsForVersion(ideType, latestVersion);
      
      if (selectors) {
        logger.info(`Retrieved selectors for ${ideType} IDE latest version ${latestVersion}`);
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
   * Validate if selectors exist for an IDE type
   * @param {string} ideType - The IDE type to validate
   * @returns {boolean} True if selectors exist
   */
  static hasSelectors(ideType) {
    try {
      const latestVersion = IDETypes.getLatestVersion(ideType);
      return IDETypes.hasVersion(ideType, latestVersion);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available IDE types with selectors
   * @returns {Array} Array of IDE types that have selectors
   */
  static getAvailableIDETypes() {
    return IDETypes.getAllTypes().filter(type => this.hasSelectors(type));
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
   * Get latest version for IDE type
   * @param {string} ideType - IDE type
   * @returns {string|null} Latest version
   */
  static getLatestVersion(ideType) {
    return IDETypes.getLatestVersion(ideType);
  }
}

module.exports = IDESelectorManager;
```

### 3. Integration with Existing Code
```javascript
// Update IDEAutomationService to use versioned selectors
async getIDEContext() {
  const activePort = this.ideManager.getActivePort();
  const ideType = this.ideManager.getIDEType(activePort) || IDETypes.CURSOR;
  const workspacePath = this.ideManager.getWorkspacePath(activePort);
  
  // Get version-specific selectors
  const selectors = await this.selectorManager.getSelectors(ideType);
  
  return {
    port: activePort,
    ideType: ideType,
    workspacePath: workspacePath,
    selectors: selectors
  };
}
```

## Testing Strategy
- Unit tests for SelectorVersionManager
- Integration tests for IDESelectorManager
- Test version detection and fallback mechanisms
- Test caching functionality
- Test error handling

## Risk Mitigation
- Comprehensive fallback mechanisms
- Caching for performance
- Error handling and logging
- Backward compatibility maintained
- Thorough testing of all scenarios
