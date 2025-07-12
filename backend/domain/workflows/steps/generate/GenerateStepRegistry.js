/**
 * GenerateStepRegistry - Registry for generate workflow steps
 * 
 * This registry provides centralized management of generate workflow steps,
 * including registration, lookup, lifecycle management, and metadata tracking.
 * It follows the registry pattern and integrates with the unified workflow system.
 */
const GenerateStepFactory = require('./GenerateStepFactory');

/**
 * Generate step registry
 */
class GenerateStepRegistry {
  /**
   * Create a new generate step registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    this.steps = new Map();
    this.stepTypes = new Map();
    this.stepMetadata = new Map();
    this.stepStatistics = new Map();
    this.factory = new GenerateStepFactory(options.factory || {});
    this.options = {
      enableStatistics: options.enableStatistics !== false,
      maxSteps: options.maxSteps || 100,
      enableValidation: options.enableValidation !== false,
      autoRegisterDefaults: options.autoRegisterDefaults !== false,
      ...options
    };

    // Auto-register default steps if enabled
    if (this.options.autoRegisterDefaults) {
      this.registerDefaultSteps();
    }
  }

  /**
   * Register generate step
   * @param {string} type - Step type
   * @param {Function} stepClass - Step class constructor
   * @param {Object} metadata - Step metadata
   * @returns {boolean} True if registration successful
   */
  registerStep(type, stepClass, metadata = {}) {
    try {
      // Validate inputs
      if (!type || typeof type !== 'string') {
        throw new Error('Step type must be a non-empty string');
      }

      if (!stepClass || typeof stepClass !== 'function') {
        throw new Error('Step class must be a function');
      }

      // Check registry capacity
      if (this.steps.size >= this.options.maxSteps) {
        throw new Error(`Registry capacity exceeded (max: ${this.options.maxSteps})`);
      }

      // Validate step class if enabled
      if (this.options.enableValidation) {
        this.validateStepClass(stepClass);
      }

      // Register step
      this.steps.set(type, stepClass);
      this.stepTypes.set(type, stepClass.name);
      
      // Store metadata
      const fullMetadata = {
        ...metadata,
        registeredAt: new Date(),
        type,
        className: stepClass.name
      };
      this.stepMetadata.set(type, fullMetadata);

      // Initialize statistics
      if (this.options.enableStatistics) {
        this.stepStatistics.set(type, {
          instantiations: 0,
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          lastExecuted: null,
          averageDuration: 0
        });
      }

      return true;

    } catch (error) {
      console.error('Generate step registration failed:', error.message);
      return false;
    }
  }

  /**
   * Get generate step class
   * @param {string} type - Step type
   * @returns {Function|null} Step class
   */
  getStepClass(type) {
    return this.steps.get(type) || null;
  }

  /**
   * Create generate step instance
   * @param {string} type - Step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep|null} Step instance
   */
  createStep(type, options = {}) {
    const stepClass = this.getStepClass(type);
    if (!stepClass) {
      return null;
    }

    try {
      const step = new stepClass(options);
      
      // Update statistics
      if (this.options.enableStatistics) {
        const stats = this.stepStatistics.get(type);
        if (stats) {
          stats.instantiations++;
        }
      }

      return step;
    } catch (error) {
      console.error(`Failed to create generate step ${type}:`, error.message);
      return null;
    }
  }

  /**
   * Check if step type is registered
   * @param {string} type - Step type
   * @returns {boolean} True if registered
   */
  hasStep(type) {
    return this.steps.has(type);
  }

  /**
   * Get all registered step types
   * @returns {Array<string>} Registered step types
   */
  getRegisteredTypes() {
    return Array.from(this.steps.keys());
  }

  /**
   * Get step metadata
   * @param {string} type - Step type
   * @returns {Object|null} Step metadata
   */
  getStepMetadata(type) {
    return this.stepMetadata.get(type) || null;
  }

  /**
   * Get step statistics
   * @param {string} type - Step type
   * @returns {Object|null} Step statistics
   */
  getStepStatistics(type) {
    return this.stepStatistics.get(type) || null;
  }

  /**
   * Update step statistics
   * @param {string} type - Step type
   * @param {Object} executionData - Execution data
   */
  updateStatistics(type, executionData) {
    if (!this.options.enableStatistics) {
      return;
    }

    const stats = this.stepStatistics.get(type);
    if (!stats) {
      return;
    }

    stats.executions++;
    stats.lastExecuted = new Date();

    if (executionData.success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (executionData.duration) {
      stats.totalDuration += executionData.duration;
      stats.averageDuration = stats.totalDuration / stats.executions;
    }
  }

  /**
   * Unregister step
   * @param {string} type - Step type
   * @returns {boolean} True if unregistration successful
   */
  unregisterStep(type) {
    if (!this.steps.has(type)) {
      return false;
    }

    this.steps.delete(type);
    this.stepTypes.delete(type);
    this.stepMetadata.delete(type);
    this.stepStatistics.delete(type);

    return true;
  }

  /**
   * Clear all steps
   */
  clear() {
    this.steps.clear();
    this.stepTypes.clear();
    this.stepMetadata.clear();
    this.stepStatistics.clear();
  }

  /**
   * Get registry size
   * @returns {number} Number of registered steps
   */
  getSize() {
    return this.steps.size;
  }

  /**
   * Register default generate steps
   */
  registerDefaultSteps() {
    // Import step classes
    const GenerateScriptStep = require('./GenerateScriptStep');
    const GenerateScriptsStep = require('./GenerateScriptsStep');
    const GenerateDocumentationStep = require('./GenerateDocumentationStep');
    const GenerateTestsStep = require('./GenerateTestsStep');
    const GenerateConfigsStep = require('./GenerateConfigsStep');

    // Register steps
    this.registerStep('script', GenerateScriptStep, {
      description: 'Single script generation step',
      category: 'generate',
      complexity: 'medium'
    });

    this.registerStep('scripts', GenerateScriptsStep, {
      description: 'Multiple scripts generation step',
      category: 'generate',
      complexity: 'high'
    });

    this.registerStep('documentation', GenerateDocumentationStep, {
      description: 'Documentation generation step',
      category: 'generate',
      complexity: 'medium'
    });

    this.registerStep('tests', GenerateTestsStep, {
      description: 'Test generation step',
      category: 'generate',
      complexity: 'medium'
    });

    this.registerStep('configs', GenerateConfigsStep, {
      description: 'Configuration generation step',
      category: 'generate',
      complexity: 'medium'
    });
  }

  /**
   * Validate step class
   * @param {Function} stepClass - Step class to validate
   * @throws {Error} If validation fails
   */
  validateStepClass(stepClass) {
    // Check if it's a constructor function
    if (typeof stepClass !== 'function') {
      throw new Error('Step class must be a constructor function');
    }

    // Check if it has required methods (basic validation)
    const prototype = stepClass.prototype;
    const requiredMethods = ['executeStep', 'validate', 'getMetadata'];

    for (const method of requiredMethods) {
      if (typeof prototype[method] !== 'function') {
        throw new Error(`Step class must implement ${method} method`);
      }
    }
  }

  /**
   * Get registry summary
   * @returns {Object} Registry summary
   */
  getSummary() {
    const types = this.getRegisteredTypes();
    const totalExecutions = types.reduce((total, type) => {
      const stats = this.getStepStatistics(type);
      return total + (stats ? stats.executions : 0);
    }, 0);

    const totalSuccesses = types.reduce((total, type) => {
      const stats = this.getStepStatistics(type);
      return total + (stats ? stats.successes : 0);
    }, 0);

    return {
      totalSteps: this.getSize(),
      registeredTypes: types,
      totalExecutions,
      totalSuccesses,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0
    };
  }

  /**
   * Get registry metadata
   * @returns {Object} Registry metadata
   */
  getMetadata() {
    return {
      name: 'GenerateStepRegistry',
      description: 'Registry for generate workflow steps',
      version: '1.0.0',
      size: this.getSize(),
      maxCapacity: this.options.maxSteps,
      options: this.options,
      summary: this.getSummary()
    };
  }

  /**
   * Set registry options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    
    // Update factory options if provided
    if (options.factory) {
      this.factory.setOptions(options.factory);
    }
  }

  /**
   * Get factory instance
   * @returns {GenerateStepFactory} Step factory
   */
  getFactory() {
    return this.factory;
  }

  /**
   * Clone registry
   * @returns {GenerateStepRegistry} Cloned registry
   */
  clone() {
    const clonedRegistry = new GenerateStepRegistry(this.options);
    
    // Copy registered steps
    for (const [type, stepClass] of this.steps) {
      clonedRegistry.registerStep(type, stepClass, this.getStepMetadata(type));
    }

    // Copy statistics
    if (this.options.enableStatistics) {
      for (const [type, stats] of this.stepStatistics) {
        clonedRegistry.stepStatistics.set(type, { ...stats });
      }
    }

    return clonedRegistry;
  }
}

module.exports = GenerateStepRegistry; 