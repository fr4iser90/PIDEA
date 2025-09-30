/**
 * SelectorCollectionBot - Automated selector collection service
 * Integrates DOM collection and selector generation functionality from scripts
 */

const Logger = require('@logging/Logger');
const logger = new Logger('SelectorCollectionBot');

class SelectorCollectionBot {
  constructor(dependencies = {}) {
    this.selectorCollector = dependencies.selectorCollector;
    this.selectorVersionManager = dependencies.selectorVersionManager;
    this.ideTypesUpdater = dependencies.ideTypesUpdater;
    this.logger = dependencies.logger || logger;
    this.collectionCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Collect selectors for IDE type and version
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collected selectors
   */
  async collectSelectors(ideType, version, port) {
    try {
      this.logger.info(`Collecting selectors for ${ideType} version ${version} on port ${port}`);
      
      // Check cache first
      const cacheKey = `${ideType}:${version}`;
      const cached = this.collectionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`Using cached selectors for ${ideType} version ${version}`);
        return cached.selectors;
      }

      // Collect selectors using SelectorCollector
      const collectedSelectors = await this.selectorCollector.collectSelectors(port);
      
      if (!collectedSelectors || Object.keys(collectedSelectors).length === 0) {
        throw new Error(`No selectors collected for ${ideType} version ${version}`);
      }

      // Validate collected selectors
      const validatedSelectors = await this.validateSelectors(collectedSelectors);
      
      // Categorize selectors
      const categorizedSelectors = await this.categorizeSelectors(validatedSelectors);

      // Cache the result
      this.collectionCache.set(cacheKey, {
        selectors: categorizedSelectors,
        timestamp: Date.now()
      });

      this.logger.info(`Successfully collected ${Object.keys(categorizedSelectors).length} selector categories for ${ideType} version ${version}`);
      return categorizedSelectors;

    } catch (error) {
      this.logger.error(`Selector collection failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate collected selectors
   * @param {Object} selectors - Raw selectors
   * @returns {Promise<Object>} Validated selectors
   */
  async validateSelectors(selectors) {
    try {
      const validated = {};

      for (const [key, value] of Object.entries(selectors)) {
        // Skip invalid selectors
        if (!value || typeof value !== 'string') {
          this.logger.warn(`Skipping invalid selector for ${key}: ${value}`);
          continue;
        }

        // Validate selector syntax (basic check)
        if (this.isValidSelector(value)) {
          validated[key] = value;
        } else {
          this.logger.warn(`Invalid selector syntax for ${key}: ${value}`);
        }
      }

      this.logger.info(`Validated ${Object.keys(validated).length} selectors`);
      return validated;

    } catch (error) {
      this.logger.error('Selector validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if selector syntax is valid
   * @param {string} selector - Selector string
   * @returns {boolean} True if valid
   */
  isValidSelector(selector) {
    try {
      // Basic validation - check for common selector patterns
      if (!selector || selector.trim().length === 0) {
        return false;
      }

      // Check for dangerous patterns
      const dangerousPatterns = [
        '<script',
        'javascript:',
        'onerror=',
        'onclick='
      ];

      for (const pattern of dangerousPatterns) {
        if (selector.toLowerCase().includes(pattern)) {
          return false;
        }
      }

      // Valid selector patterns
      const validPatterns = [
        /^[.#][\w-]+/,           // Class or ID selector
        /^\w+/,                   // Element selector
        /^\[[\w-]+(=|~=|\|=|\^=|\$=|\*=)?/,  // Attribute selector
        /^:[\w-]+/                // Pseudo-class
      ];

      return validPatterns.some(pattern => pattern.test(selector));

    } catch (error) {
      this.logger.error('Selector validation error:', error.message);
      return false;
    }
  }

  /**
   * Categorize selectors by component type
   * @param {Object} selectors - Validated selectors
   * @returns {Promise<Object>} Categorized selectors
   */
  async categorizeSelectors(selectors) {
    try {
      const categories = {
        chat: {},
        editor: {},
        explorer: {},
        terminal: {},
        search: {},
        git: {},
        commands: {},
        panels: {},
        other: {}
      };

      // Categorization rules based on selector patterns
      const categoryRules = {
        chat: ['chat', 'message', 'conversation', 'ai', 'assistant', 'aislash'],
        editor: ['editor', 'monaco', 'view-line', 'code'],
        explorer: ['explorer', 'file', 'tree', 'pane'],
        terminal: ['terminal', 'xterm', 'console'],
        search: ['search', 'find', 'query'],
        git: ['git', 'scm', 'source-control', 'commit'],
        commands: ['command', 'palette', 'quick-open'],
        panels: ['panel', 'sidebar', 'activitybar', 'statusbar']
      };

      for (const [key, value] of Object.entries(selectors)) {
        let categorized = false;

        // Try to categorize based on rules
        for (const [category, patterns] of Object.entries(categoryRules)) {
          if (patterns.some(pattern => key.toLowerCase().includes(pattern) || value.toLowerCase().includes(pattern))) {
            categories[category][key] = value;
            categorized = true;
            break;
          }
        }

        // If not categorized, put in 'other'
        if (!categorized) {
          categories.other[key] = value;
        }
      }

      // Remove empty categories
      const result = {};
      for (const [category, items] of Object.entries(categories)) {
        if (Object.keys(items).length > 0) {
          result[category] = items;
        }
      }

      this.logger.info(`Categorized selectors into ${Object.keys(result).length} categories`);
      return result;

    } catch (error) {
      this.logger.error('Selector categorization failed:', error.message);
      throw error;
    }
  }

  /**
   * Save selectors to version manager
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to save
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveSelectors(ideType, version, selectors) {
    try {
      this.logger.info(`Saving selectors for ${ideType} version ${version}`);

      // Validate input
      if (!ideType || !version || !selectors) {
        throw new Error('Invalid input: ideType, version, and selectors are required');
      }

      // Format selectors for storage
      const formattedSelectors = {
        chatSelectors: selectors.chat || {},
        editorSelectors: selectors.editor || {},
        explorerSelectors: selectors.explorer || {},
        terminalSelectors: selectors.terminal || {},
        searchSelectors: selectors.search || {},
        gitSelectors: selectors.git || {},
        commandSelectors: selectors.commands || {},
        panelSelectors: selectors.panels || {},
        otherSelectors: selectors.other || {},
        metadata: {
          version,
          collectedAt: new Date().toISOString(),
          totalSelectors: Object.values(selectors).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
        }
      };

      // Save to IDETypes.js using IDETypesUpdater
      if (this.ideTypesUpdater) {
        const updateResult = await this.ideTypesUpdater.updateVersion(ideType, version, selectors);
        this.logger.info(`Successfully updated IDETypes.js with ${ideType} version ${version}`);
        return updateResult;
      } else {
        this.logger.warn(`IDETypesUpdater not available, selectors not saved to IDETypes.js for ${ideType} version ${version}`);
        return {
          success: false,
          error: 'IDETypesUpdater not available',
          message: 'Selectors formatted but not saved to IDETypes.js'
        };
      }

    } catch (error) {
      this.logger.error(`Failed to save selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Test selectors against IDE
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to test
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Test results
   */
  async testSelectors(ideType, version, selectors, port) {
    try {
      this.logger.info(`Testing selectors for ${ideType} version ${version}`);

      const results = {
        ideType,
        version,
        port,
        tested: 0,
        passed: 0,
        failed: 0,
        details: {}
      };

      // Test each selector category
      for (const [category, categorySelectors] of Object.entries(selectors)) {
        results.details[category] = {
          total: Object.keys(categorySelectors).length,
          passed: 0,
          failed: 0,
          selectors: {}
        };

        for (const [key, selector] of Object.entries(categorySelectors)) {
          results.tested++;
          
          // In actual implementation, this would test against the IDE
          // For now, we just validate the selector format
          const isValid = this.isValidSelector(selector);
          
          if (isValid) {
            results.passed++;
            results.details[category].passed++;
            results.details[category].selectors[key] = {
              selector,
              status: 'passed'
            };
          } else {
            results.failed++;
            results.details[category].failed++;
            results.details[category].selectors[key] = {
              selector,
              status: 'failed',
              error: 'Invalid selector format'
            };
          }
        }
      }

      this.logger.info(`Selector testing completed: ${results.passed}/${results.tested} passed`);
      return results;

    } catch (error) {
      this.logger.error(`Selector testing failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear collection cache
   */
  clearCache() {
    this.collectionCache.clear();
    this.logger.info('Selector collection cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.collectionCache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.collectionCache.keys()).map(key => {
        const entry = this.collectionCache.get(key);
        return {
          key,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp,
          categories: Object.keys(entry.selectors).length
        };
      })
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      cache: this.getCacheStats(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SelectorCollectionBot;
