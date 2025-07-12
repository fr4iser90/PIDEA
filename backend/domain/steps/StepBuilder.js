/**
 * Step Builder - Domain Layer
 * Builds step instances from configurations and handles step customization
 */

const path = require('path');

class StepBuilder {
  constructor(stepRegistry) {
    this.registry = stepRegistry;
    this.buildCache = new Map();
  }

  /**
   * Build a step instance from configuration
   * @param {string} stepName - Name of the step to build
   * @param {Object} options - Build options
   */
  async buildStep(stepName, options = {}) {
    try {
      // Get step configuration from registry
      const step = this.registry.getStep(stepName);
      
      // Check cache first
      const cacheKey = this.getCacheKey(stepName, options);
      if (this.buildCache.has(cacheKey)) {
        console.log(`📦 Using cached step instance for "${stepName}"`);
        return this.buildCache.get(cacheKey);
      }

      // Validate build options
      this.validateBuildOptions(options);

      // Build step instance
      const instance = await this.createStepInstance(step, options);

      // Cache the instance
      this.buildCache.set(cacheKey, instance);

      console.log(`🔨 Step "${stepName}" built successfully`);
      return instance;
    } catch (error) {
      console.error(`❌ Failed to build step "${stepName}":`, error.message);
      throw error;
    }
  }

  /**
   * Build a step instance from config object (static method for direct use)
   * @param {Object} config - Step configuration
   * @param {Object} context - Execution context
   */
  static build(config, context = {}) {
    try {
      // Create a simple step instance from config
      const instance = {
        name: config.name,
        type: config.type,
        description: config.description,
        category: config.category,
        order: config.order || 0,
        required: config.required !== false,
        dependencies: config.dependencies || [],
        settings: config.settings || {},
        metadata: {
          builtAt: new Date(),
          buildContext: context,
          originalConfig: config
        }
      };

      // Validate instance
      if (!instance.name) {
        throw new Error('Step config must have a name');
      }

      if (!instance.type) {
        throw new Error('Step config must have a type');
      }

      if (!instance.description) {
        throw new Error('Step config must have a description');
      }

      console.log(`🔨 Step "${instance.name}" built from config`);
      return instance;
    } catch (error) {
      console.error(`❌ Failed to build step from config:`, error.message);
      throw error;
    }
  }

  /**
   * Create step instance from configuration
   * @param {Object} step - Step configuration
   * @param {Object} options - Build options
   */
  async createStepInstance(step, options) {
    const { config } = step;
    
    // Create base instance
    const instance = {
      name: config.name,
      type: config.type,
      description: config.description,
      category: step.category,
      order: config.order || 0,
      required: config.required !== false,
      dependencies: config.dependencies || [],
      settings: { ...config.settings, ...options.settings },
      executor: step.executor,
      metadata: {
        builtAt: new Date(),
        buildOptions: options,
        originalConfig: config,
        registryStep: step
      }
    };

    // Add custom properties
    if (config.properties) {
      Object.assign(instance, config.properties);
    }

    // Validate instance
    this.validateStepInstance(instance);

    return instance;
  }

  /**
   * Build multiple steps
   * @param {Array} stepNames - Array of step names
   * @param {Object} options - Build options
   */
  async buildSteps(stepNames, options = {}) {
    const instances = [];

    for (const stepName of stepNames) {
      try {
        const instance = await this.buildStep(stepName, options);
        instances.push(instance);
      } catch (error) {
        console.error(`❌ Failed to build step "${stepName}":`, error.message);
        
        // Continue with other steps if this one fails
        if (options.continueOnError !== false) {
          continue;
        } else {
          throw error;
        }
      }
    }

    // Sort by order
    instances.sort((a, b) => a.order - b.order);

    return instances;
  }

  /**
   * Build steps by category
   * @param {string} category - Step category
   * @param {Object} options - Build options
   */
  async buildStepsByCategory(category, options = {}) {
    const steps = this.registry.getStepsByCategory(category);
    const stepNames = steps.map(step => step.name);
    return await this.buildSteps(stepNames, options);
  }

  /**
   * Validate build options
   * @param {Object} options - Build options
   */
  validateBuildOptions(options) {
    if (options.settings && typeof options.settings !== 'object') {
      throw new Error('Build options settings must be an object');
    }

    if (options.continueOnError !== undefined && typeof options.continueOnError !== 'boolean') {
      throw new Error('Build options continueOnError must be a boolean');
    }

    return true;
  }

  /**
   * Validate step instance
   * @param {Object} instance - Step instance
   */
  validateStepInstance(instance) {
    if (!instance.name) {
      throw new Error('Step instance must have a name');
    }

    if (!instance.type) {
      throw new Error('Step instance must have a type');
    }

    if (!instance.description) {
      throw new Error('Step instance must have a description');
    }

    if (typeof instance.order !== 'number') {
      throw new Error('Step instance must have a numeric order');
    }

    if (typeof instance.required !== 'boolean') {
      throw new Error('Step instance must have a boolean required property');
    }

    return true;
  }

  /**
   * Get cache key for step build
   * @param {string} stepName - Step name
   * @param {Object} options - Build options
   */
  getCacheKey(stepName, options) {
    const optionsHash = JSON.stringify(options);
    return `${stepName}:${optionsHash}`;
  }

  /**
   * Clear build cache
   * @param {string} stepName - Optional step name to clear specific cache
   */
  clearCache(stepName = null) {
    if (stepName) {
      // Clear cache for specific step
      const keysToDelete = Array.from(this.buildCache.keys())
        .filter(key => key.startsWith(stepName + ':'));
      
      keysToDelete.forEach(key => this.buildCache.delete(key));
      console.log(`🗑️ Cleared cache for step "${stepName}"`);
    } else {
      // Clear all cache
      this.buildCache.clear();
      console.log('🗑️ Cleared all step build cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalCached: this.buildCache.size,
      steps: Array.from(this.buildCache.keys()).map(key => key.split(':')[0])
    };
  }

  /**
   * Customize step with additional options
   * @param {Object} instance - Step instance
   * @param {Object} customizations - Customization options
   */
  customizeStep(instance, customizations) {
    const customized = { ...instance };

    // Apply customizations
    if (customizations.settings) {
      customized.settings = { ...customized.settings, ...customizations.settings };
    }

    if (customizations.properties) {
      Object.assign(customized, customizations.properties);
    }

    if (customizations.order !== undefined) {
      customized.order = customizations.order;
    }

    if (customizations.required !== undefined) {
      customized.required = customizations.required;
    }

    // Update metadata
    customized.metadata.customizedAt = new Date();
    customized.metadata.customizations = customizations;

    return customized;
  }

  /**
   * Create step chain from multiple steps
   * @param {Array} stepNames - Array of step names
   * @param {Object} options - Build options
   */
  async createStepChain(stepNames, options = {}) {
    const instances = await this.buildSteps(stepNames, options);
    
    // Create chain with dependencies
    const chain = {
      steps: instances,
      dependencies: this.resolveDependencies(instances),
      executionOrder: this.calculateExecutionOrder(instances),
      metadata: {
        createdAt: new Date(),
        totalSteps: instances.length,
        buildOptions: options
      }
    };

    return chain;
  }

  /**
   * Resolve dependencies between steps
   * @param {Array} instances - Step instances
   */
  resolveDependencies(instances) {
    const dependencies = new Map();

    for (const instance of instances) {
      const stepDeps = [];
      
      for (const dep of instance.dependencies) {
        const depInstance = instances.find(i => i.name === dep);
        if (depInstance) {
          stepDeps.push(depInstance);
        }
      }
      
      dependencies.set(instance.name, stepDeps);
    }

    return dependencies;
  }

  /**
   * Calculate execution order based on dependencies
   * @param {Array} instances - Step instances
   */
  calculateExecutionOrder(instances) {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (instance) => {
      if (visiting.has(instance.name)) {
        throw new Error(`Circular dependency detected involving step "${instance.name}"`);
      }

      if (visited.has(instance.name)) {
        return;
      }

      visiting.add(instance.name);

      // Visit dependencies first
      for (const dep of instance.dependencies) {
        const depInstance = instances.find(i => i.name === dep);
        if (depInstance) {
          visit(depInstance);
        }
      }

      visiting.delete(instance.name);
      visited.add(instance.name);
      order.push(instance);
    };

    // Sort by order first, then resolve dependencies
    const sortedInstances = [...instances].sort((a, b) => a.order - b.order);
    
    for (const instance of sortedInstances) {
      visit(instance);
    }

    return order;
  }

  /**
   * Validate step chain
   * @param {Object} chain - Step chain
   */
  validateStepChain(chain) {
    if (!chain.steps || !Array.isArray(chain.steps)) {
      throw new Error('Step chain must have a steps array');
    }

    if (chain.steps.length === 0) {
      throw new Error('Step chain cannot be empty');
    }

    // Check for circular dependencies
    try {
      this.calculateExecutionOrder(chain.steps);
    } catch (error) {
      throw new Error(`Invalid step chain: ${error.message}`);
    }

    return true;
  }
}

module.exports = StepBuilder; 