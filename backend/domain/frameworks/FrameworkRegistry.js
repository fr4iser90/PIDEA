
/**
 * Framework Registry - Domain Layer
 * Manages framework configurations and provides framework validation
 * Implements IStandardRegistry interface for consistent patterns
 */

// Removed file system imports - domain layer should not handle file operations
const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../constants/Categories');
const IStandardRegistry = require('../interfaces/IStandardRegistry');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class FrameworkRegistry {
  constructor() {
    this.frameworks = new Map();
    this.configs = new Map();
    this.categories = new Map();
  }

  /**
   * Register a framework with its configuration
   * @param {string} name - Framework name
   * @param {Object} config - Framework configuration
   * @param {string} category - Framework category
   */
  async registerFramework(name, config, category = null) {
    try {
      // Use default category if not provided
      const finalCategory = category || getDefaultCategory('framework');
      
      // Validate category
      if (!isValidCategory(finalCategory)) {
        throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
      }
      
      // Validate framework configuration
      this.validateFrameworkConfig(config);
      
      // Store framework configuration
      this.frameworks.set(name, {
        name,
        config,
        category: finalCategory,
        registeredAt: new Date(),
        status: 'active',
        metadata: {
          type: 'framework',
          category: finalCategory,
          version: config.version || '1.0.0'
        }
      });

      // Add to category
      if (!this.categories.has(finalCategory)) {
        this.categories.set(finalCategory, new Set());
      }
      this.categories.get(finalCategory).add(name);

      logger.info(`✅ Framework "${name}" registered successfully in category "${finalCategory}"`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to register framework "${name}":`, error.message);
      throw error;
    }
  }

  /**
   * Load framework configurations from provided configs
   * Note: File system operations moved to infrastructure layer
   * @param {Array} configs - Array of framework configurations
   */
  async loadFrameworkConfigs(configs = []) {
    try {
      for (const config of configs) {
        try {
          const frameworkName = config.name;
          const category = config.category || 'general';
          
          await this.registerFramework(frameworkName, config, category);
          this.configs.set(frameworkName, config);
        } catch (error) {
          logger.error(`❌ Failed to load config "${config.name}":`, error.message);
        }
      }

      logger.info(`📦 Loaded ${this.frameworks.size} framework configurations`);
    } catch (error) {
      logger.error('❌ Failed to load framework configs:', error.message);
      throw error;
    }
  }

  /**
   * Get framework by name
   * @param {string} name - Framework name
   */
  getFramework(name) {
    const framework = this.frameworks.get(name);
    if (!framework) {
      throw new Error(`Framework "${name}" not found`);
    }
    return framework;
  }

  /**
   * Get all frameworks in a category
   * @param {string} category - Framework category
   */
  getFrameworksByCategory(category) {
    const frameworkNames = this.categories.get(category) || new Set();
    return Array.from(frameworkNames).map(name => this.getFramework(name));
  }

  /**
   * Get all registered frameworks
   */
  getAllFrameworks() {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Update framework configuration
   * @param {string} name - Framework name
   * @param {Object} newConfig - New configuration
   */
  async updateFramework(name, newConfig) {
    const framework = this.getFramework(name);
    
    // Validate new configuration
    this.validateFrameworkConfig(newConfig);
    
    // Update framework
    framework.config = { ...framework.config, ...newConfig };
    framework.updatedAt = new Date();
    
    logger.info(`✅ Framework "${name}" updated successfully`);
    return framework;
  }

  /**
   * Remove framework
   * @param {string} name - Framework name
   */
  removeFramework(name) {
    const framework = this.getFramework(name);
    
    // Remove from frameworks map
    this.frameworks.delete(name);
    
    // Remove from category
    const category = framework.category;
    if (this.categories.has(category)) {
      this.categories.get(category).delete(name);
      
      // Remove empty category
      if (this.categories.get(category).size === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remove config file reference
    this.configs.delete(name);
    
    logger.info(`🗑️ Framework "${name}" removed successfully`);
    return true;
  }

  /**
   * Validate framework configuration
   * @param {Object} config - Framework configuration
   */
  validateFrameworkConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Framework configuration must be an object');
    }

    if (!config.name) {
      throw new Error('Framework configuration must have a "name" property');
    }

    if (!config.version) {
      throw new Error('Framework configuration must have a "version" property');
    }

    if (!config.description) {
      throw new Error('Framework configuration must have a "description" property');
    }

    // Domain layer only validates metadata - steps validation moved to infrastructure layer
    // Steps validation is now handled by FrameworkValidator in infrastructure layer

    return true;
  }

  /**
   * Check if framework exists
   * @param {string} name - Framework name
   */
  hasFramework(name) {
    return this.frameworks.has(name);
  }

  /**
   * Get framework status
   * @param {string} name - Framework name
   */
  getFrameworkStatus(name) {
    const framework = this.getFramework(name);
    return framework.status;
  }

  /**
   * Set framework status
   * @param {string} name - Framework name
   * @param {string} status - New status
   */
  setFrameworkStatus(name, status) {
    const framework = this.getFramework(name);
    framework.status = status;
    framework.updatedAt = new Date();
    
    logger.info(`✅ Framework "${name}" status set to "${status}"`);
    return framework;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalFrameworks: this.frameworks.size,
      categories: this.categories.size,
      activeFrameworks: Array.from(this.frameworks.values()).filter(f => f.status === 'active').length,
      inactiveFrameworks: Array.from(this.frameworks.values()).filter(f => f.status === 'inactive').length
    };
  }

  // ==================== IStandardRegistry Interface Implementation ====================

  /**
   * Get component by category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @returns {Array} Components in category
   */
  static getByCategory(category) {
    const instance = new FrameworkRegistry();
    return instance.getFrameworksByCategory(category);
  }

  /**
   * Build component from category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @param {string} name - Component name
   * @param {Object} params - Component parameters
   * @returns {Object|null} Component instance
   */
  static buildFromCategory(category, name, params = {}) {
    const instance = new FrameworkRegistry();
    const frameworks = instance.getFrameworksByCategory(category);
    return frameworks.find(f => f.name === name) || null;
  }

  /**
   * Register component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} config - Component configuration
   * @param {string} category - Component category
   * @param {Function} executor - Component executor (optional)
   * @returns {Promise<boolean>} Registration success
   */
  static async register(name, config, category, executor = null) {
    const instance = new FrameworkRegistry();
    return await instance.registerFramework(name, config, category);
  }

  /**
   * Execute component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    const instance = new FrameworkRegistry();
    const framework = instance.getFramework(name);
    
    // Framework execution logic would go here
    return {
      success: true,
      framework: framework.name,
      category: framework.category,
      context,
      options
    };
  }

  /**
   * Get all categories (IStandardRegistry interface)
   * @returns {Array} All available categories
   */
  static getCategories() {
    const instance = new FrameworkRegistry();
    return instance.getCategories();
  }

  /**
   * Get component by name (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  static get(name) {
    const instance = new FrameworkRegistry();
    return instance.getFramework(name);
  }

  /**
   * Check if component exists (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    const instance = new FrameworkRegistry();
    return instance.hasFramework(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new FrameworkRegistry();
    return instance.removeFramework(name);
  }

  /**
   * Validate component configuration (IStandardRegistry interface)
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    const instance = new FrameworkRegistry();
    try {
      instance.validateFrameworkConfig(config);
      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }

  /**
   * Get component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component metadata
   */
  static getMetadata(name) {
    const instance = new FrameworkRegistry();
    const framework = instance.getFramework(name);
    return framework.metadata || {};
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new FrameworkRegistry();
    const framework = instance.getFramework(name);
    framework.metadata = { ...framework.metadata, ...metadata };
    framework.updatedAt = new Date();
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    // Framework execution history would be implemented here
    return [];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new FrameworkRegistry();
    instance.frameworks.clear();
    instance.categories.clear();
    instance.configs.clear();
    return true;
  }

  /**
   * Get framework count
   */
  getFrameworkCount() {
    return this.frameworks.size;
  }

  /**
   * Get category count
   */
  getCategoryCount() {
    return this.categories.size;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new FrameworkRegistry();
    return {
      frameworks: Array.from(instance.frameworks.entries()),
      categories: Array.from(instance.categories.entries()),
      configs: Array.from(instance.configs.entries())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new FrameworkRegistry();
    
    if (data.frameworks) {
      data.frameworks.forEach(([name, framework]) => {
        instance.frameworks.set(name, framework);
      });
    }
    
    if (data.categories) {
      data.categories.forEach(([category, names]) => {
        instance.categories.set(category, new Set(names));
      });
    }
    
    if (data.configs) {
      data.configs.forEach(([name, configPath]) => {
        instance.configs.set(name, configPath);
      });
    }
    
    return true;
  }
}

module.exports = FrameworkRegistry; 