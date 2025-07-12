/**
 * Step Registry - Domain Layer
 * Manages atomic steps and provides step validation
 */

const path = require('path');
const fs = require('fs').promises;

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
  async registerStep(name, config, category = 'general', executor = null) {
    try {
      // Validate step configuration
      this.validateStepConfig(config);
      
      // Store step configuration
      this.steps.set(name, {
        name,
        config,
        category,
        executor,
        registeredAt: new Date(),
        status: 'active',
        executionCount: 0,
        lastExecuted: null
      });

      // Add to category
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category).add(name);

      // Store executor if provided
      if (executor && typeof executor === 'function') {
        this.executors.set(name, executor);
      }

      console.log(`✅ Step "${name}" registered successfully in category "${category}"`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to register step "${name}":`, error.message);
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
        console.log('📁 Creating categories directory...');
        await fs.mkdir(categoriesDir, { recursive: true });
        return;
      }

      const categories = await fs.readdir(categoriesDir);
      
      for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryStats = await fs.stat(categoryPath);
        
        if (categoryStats.isDirectory()) {
          await this.loadStepsFromCategory(category, categoryPath);
        }
      }

      console.log(`📦 Loaded ${this.steps.size} steps from categories`);
    } catch (error) {
      console.error('❌ Failed to load steps from categories:', error.message);
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
          console.error(`❌ Failed to load step "${file}" from category "${category}":`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to load category "${category}":`, error.message);
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
      console.log(`🚀 Executing step "${name}"...`);
      const startTime = Date.now();
      
      const result = await executor(context, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update step statistics
      step.executionCount++;
      step.lastExecuted = new Date();
      step.lastDuration = duration;

      console.log(`✅ Step "${name}" executed successfully in ${duration}ms`);
      return {
        success: true,
        result,
        duration,
        step: step.name,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Failed to execute step "${name}":`, error.message);
      
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
    
    console.log(`✅ Step "${name}" updated successfully`);
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
    
    console.log(`🗑️ Step "${name}" removed successfully`);
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
    
    console.log(`✅ Step "${name}" status set to "${status}"`);
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
}

module.exports = StepRegistry; 