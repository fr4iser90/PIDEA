
/**
 * Step Registry - Domain Layer
 * Manages atomic steps and provides step validation
 * Implements IStandardRegistry interface for consistent patterns
 */

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../constants/Categories');
const IStandardRegistry = require('../interfaces/IStandardRegistry');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class StepRegistry {
  constructor() {
    this.steps = new Map();
    this.categories = new Map();
    this.executors = new Map();
  }

  /**
   * Register an atomic step
   * @param {string} name - Step name
   * @param {Object} config - Step configuration
   * @param {string} category - Step category
   * @param {Function} executor - Step execution function
   */
  async registerStep(name, config, category = null, executor = null) {
    try {
      // Use default category if not provided
      const finalCategory = category || getDefaultCategory('step');
      
      // Validate category
      if (!isValidCategory(finalCategory)) {
        throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
      }
      
      // Validate step configuration
      this.validateStepConfig(config);
      
      // Store step configuration
      this.steps.set(name, {
        name,
        config,
        category: finalCategory,
        executor,
        registeredAt: new Date(),
        status: 'active',
        executionCount: 0,
        lastExecuted: null,
        metadata: {
          type: 'step',
          category: finalCategory,
          version: config.version || '1.0.0'
        }
      });

      // Add to category
      if (!this.categories.has(finalCategory)) {
        this.categories.set(finalCategory, new Set());
      }
      this.categories.get(finalCategory).add(name);

      // Store executor if provided
      if (executor && typeof executor === 'function') {
        this.executors.set(name, executor);
      }

      logger.log(`✅ Step "${name}" registered successfully in category "${finalCategory}"`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to register step "${name}":`, error.message);
      throw error;
    }
  }

  /**
   * Load steps from categories directory
   */
  async loadStepsFromCategories() {
    try {
      const categoriesDir = path.join(__dirname, 'categories');
      
      // Check if categories directory exists
      try {
        await fs.access(categoriesDir);
      } catch {
        logger.log('📁 Categories directory not found, trying alternative path...');
        // Try alternative path for development
        const altCategoriesDir = path.join(process.cwd(), 'domain', 'steps', 'categories');
        try {
          await fs.access(altCategoriesDir);
          logger.log('📁 Found categories in alternative path');
          const categories = await fs.readdir(altCategoriesDir);
          
          for (const category of categories) {
            const categoryPath = path.join(altCategoriesDir, category);
            const categoryStats = await fs.stat(categoryPath);
            
            if (categoryStats.isDirectory()) {
              await this.loadStepsFromCategory(category, categoryPath);
            }
          }
          
          logger.log(`📦 Loaded ${this.steps.size} steps from alternative categories path`);
          return;
        } catch {
          logger.log('📁 Creating categories directory...');
          await fs.mkdir(categoriesDir, { recursive: true });
          return;
        }
      }

      const categories = await fs.readdir(categoriesDir);
      
      for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryStats = await fs.stat(categoryPath);
        
        if (categoryStats.isDirectory()) {
          await this.loadStepsFromCategory(category, categoryPath);
        }
      }

      logger.log(`📦 Loaded ${this.steps.size} steps from categories`);
    } catch (error) {
      logger.error('❌ Failed to load steps from categories:', error.message);
      throw error;
    }
  }

  /**
   * Load steps from a specific category directory
   * @param {string} category - Category name
   * @param {string} categoryPath - Category directory path
   */
  async loadStepsFromCategory(category, categoryPath) {
    try {
      const files = await fs.readdir(categoryPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));

      for (const file of jsFiles) {
        try {
          const stepPath = path.join(categoryPath, file);
          const stepModule = require(stepPath);
          
          const config = stepModule.config || {};
          const executor = stepModule.execute || null;
          const stepName = config.name || path.basename(file, '.js');
          
          await this.registerStep(stepName, config, category, executor);
        } catch (error) {
          logger.error(`❌ Failed to load step "${file}" from category "${category}":`, error.message);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to load category "${category}":`, error.message);
    }
  }

  /**
   * Get step by name
   * @param {string} name - Step name
   */
  getStep(name) {
    const step = this.steps.get(name);
    if (!step) {
      throw new Error(`Step "${name}" not found`);
    }
    return step;
  }

  /**
   * Get all steps in a category
   * @param {string} category - Step category
   */
  getStepsByCategory(category) {
    const stepNames = this.categories.get(category) || new Set();
    return Array.from(stepNames).map(name => this.getStep(name));
  }

  /**
   * Get all registered steps
   */
  getAllSteps() {
    return Array.from(this.steps.values());
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Execute a step
   * @param {string} name - Step name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   */
  async executeStep(name, context = {}, options = {}) {
    try {
      const step = this.getStep(name);
      
      if (step.status !== 'active') {
        throw new Error(`Step "${name}" is not active (status: ${step.status})`);
      }

      // Get executor
      const executor = this.executors.get(name);
      if (!executor) {
        throw new Error(`No executor found for step "${name}"`);
      }

      // Execute step
      logger.log(`🚀 Executing step "${name}"...`);
      const startTime = Date.now();
      
      const result = await executor(context, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update step statistics
      step.executionCount++;
      step.lastExecuted = new Date();
      step.lastDuration = duration;

      logger.log(`✅ Step "${name}" executed successfully in ${duration}ms`);
      return {
        success: true,
        result,
        duration,
        step: step.name,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`❌ Failed to execute step "${name}":`, error.message);
      
      // Update step statistics
      const step = this.steps.get(name);
      if (step) {
        step.executionCount++;
        step.lastExecuted = new Date();
        step.lastError = error.message;
      }

      return {
        success: false,
        error: error.message,
        step: name,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute multiple steps
   * @param {Array} stepNames - Array of step names
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   */
  async executeSteps(stepNames, context = {}, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: stepNames.length
    };

    for (const stepName of stepNames) {
      try {
        const result = await this.executeStep(stepName, context, options);
        
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }

        // Stop on first failure if configured
        if (!result.success && options.stopOnError) {
          break;
        }
      } catch (error) {
        results.failed.push({
          success: false,
          error: error.message,
          step: stepName,
          timestamp: new Date()
        });

        if (options.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Update step configuration
   * @param {string} name - Step name
   * @param {Object} newConfig - New configuration
   */
  async updateStep(name, newConfig) {
    const step = this.getStep(name);
    
    // Validate new configuration
    this.validateStepConfig(newConfig);
    
    // Update step
    step.config = { ...step.config, ...newConfig };
    step.updatedAt = new Date();
    
    logger.log(`✅ Step "${name}" updated successfully`);
    return step;
  }

  /**
   * Remove step
   * @param {string} name - Step name
   */
  removeStep(name) {
    const step = this.getStep(name);
    
    // Remove from steps map
    this.steps.delete(name);
    
    // Remove from category
    const category = step.category;
    if (this.categories.has(category)) {
      this.categories.get(category).delete(name);
      
      // Remove empty category
      if (this.categories.get(category).size === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remove executor
    this.executors.delete(name);
    
    logger.log(`🗑️ Step "${name}" removed successfully`);
    return true;
  }

  /**
   * Validate step configuration
   * @param {Object} config - Step configuration
   */
  validateStepConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Step configuration must be an object');
    }

    if (!config.name) {
      throw new Error('Step configuration must have a "name" property');
    }

    if (!config.description) {
      throw new Error('Step configuration must have a "description" property');
    }

    if (!config.type) {
      throw new Error('Step configuration must have a "type" property');
    }

    return true;
  }

  /**
   * Check if step exists
   * @param {string} name - Step name
   */
  hasStep(name) {
    return this.steps.has(name);
  }

  /**
   * Get step status
   * @param {string} name - Step name
   */
  getStepStatus(name) {
    const step = this.getStep(name);
    return step.status;
  }

  /**
   * Set step status
   * @param {string} name - Step name
   * @param {string} status - New status
   */
  setStepStatus(name, status) {
    const step = this.getStep(name);
    step.status = status;
    step.updatedAt = new Date();
    
    logger.log(`✅ Step "${name}" status set to "${status}"`);
    return step;
  }

  /**
   * Get step statistics
   * @param {string} name - Step name
   */
  getStepStats(name) {
    const step = this.getStep(name);
    return {
      name: step.name,
      category: step.category,
      executionCount: step.executionCount,
      lastExecuted: step.lastExecuted,
      lastDuration: step.lastDuration,
      lastError: step.lastError,
      status: step.status
    };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalSteps: this.steps.size,
      categories: this.categories.size,
      activeSteps: Array.from(this.steps.values()).filter(s => s.status === 'active').length,
      inactiveSteps: Array.from(this.steps.values()).filter(s => s.status === 'inactive').length,
      totalExecutions: Array.from(this.steps.values()).reduce((sum, step) => sum + step.executionCount, 0)
    };
  }

  // ==================== IStandardRegistry Interface Implementation ====================

  /**
   * Get component by category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @returns {Array} Components in category
   */
  static getByCategory(category) {
    const instance = new StepRegistry();
    return instance.getStepsByCategory(category);
  }

  /**
   * Build component from category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @param {string} name - Component name
   * @param {Object} params - Component parameters
   * @returns {Object|null} Component instance
   */
  static buildFromCategory(category, name, params = {}) {
    const instance = new StepRegistry();
    const steps = instance.getStepsByCategory(category);
    return steps.find(s => s.name === name) || null;
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
    const instance = new StepRegistry();
    return await instance.registerStep(name, config, category, executor);
  }

  /**
   * Execute component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    const instance = new StepRegistry();
    return await instance.executeStep(name, context, options);
  }

  /**
   * Get all categories (IStandardRegistry interface)
   * @returns {Array} All available categories
   */
  static getCategories() {
    const instance = new StepRegistry();
    return instance.getCategories();
  }

  /**
   * Get component by name (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  static get(name) {
    const instance = new StepRegistry();
    return instance.getStep(name);
  }

  /**
   * Check if component exists (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    const instance = new StepRegistry();
    return instance.hasStep(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new StepRegistry();
    return instance.removeStep(name);
  }

  /**
   * Validate component configuration (IStandardRegistry interface)
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    const instance = new StepRegistry();
    try {
      instance.validateStepConfig(config);
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
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    return step.metadata || {};
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    step.metadata = { ...step.metadata, ...metadata };
    step.updatedAt = new Date();
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    return [{
      step: step.name,
      executionCount: step.executionCount,
      lastExecuted: step.lastExecuted,
      lastDuration: step.lastDuration,
      lastError: step.lastError
    }];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new StepRegistry();
    instance.steps.clear();
    instance.categories.clear();
    instance.executors.clear();
    return true;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new StepRegistry();
    return {
      steps: Array.from(instance.steps.entries()),
      categories: Array.from(instance.categories.entries()),
      executors: Array.from(instance.executors.keys())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new StepRegistry();
    
    if (data.steps) {
      data.steps.forEach(([name, step]) => {
        instance.steps.set(name, step);
      });
    }
    
    if (data.categories) {
      data.categories.forEach(([category, names]) => {
        instance.categories.set(category, new Set(names));
      });
    }
    
    if (data.executors) {
      data.executors.forEach(name => {
        // Note: Executors would need to be re-registered
        logger.warn(`Executor for step "${name}" needs to be re-registered`);
      });
    }
    
    return true;
  }
}

module.exports = StepRegistry; 