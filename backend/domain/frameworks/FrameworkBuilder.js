/**
 * Framework Builder - Domain Layer
 * Builds framework instances from configurations and handles framework customization
 */

const path = require('path');

class FrameworkBuilder {
  constructor(frameworkRegistry) {
    this.registry = frameworkRegistry;
    this.buildCache = new Map();
  }

  /**
   * Build a framework instance from configuration
   * @param {string} frameworkName - Name of the framework to build
   * @param {Object} options - Build options
   */
  async buildFramework(frameworkName, options = {}) {
    try {
      // Get framework configuration from registry
      const framework = this.registry.getFramework(frameworkName);
      
      // Check cache first
      const cacheKey = this.getCacheKey(frameworkName, options);
      if (this.buildCache.has(cacheKey)) {
        console.log(`📦 Using cached framework instance for "${frameworkName}"`);
        return this.buildCache.get(cacheKey);
      }

      // Validate build options
      this.validateBuildOptions(options);

      // Build framework instance
      const instance = await this.createFrameworkInstance(framework, options);

      // Cache the instance
      this.buildCache.set(cacheKey, instance);

      console.log(`🔨 Framework "${frameworkName}" built successfully`);
      return instance;
    } catch (error) {
      console.error(`❌ Failed to build framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Create framework instance from configuration
   * @param {Object} framework - Framework configuration
   * @param {Object} options - Build options
   */
  async createFrameworkInstance(framework, options) {
    const { config } = framework;
    
    // Create base instance
    const instance = {
      name: config.name,
      version: config.version,
      description: config.description,
      category: framework.category,
      steps: [],
      dependencies: config.dependencies || [],
      settings: { ...config.settings, ...options.settings },
      metadata: {
        builtAt: new Date(),
        buildOptions: options,
        originalConfig: config
      }
    };

    // Build steps
    if (config.steps && Array.isArray(config.steps)) {
      instance.steps = await this.buildSteps(config.steps, options);
    }

    // Add custom properties
    if (config.properties) {
      Object.assign(instance, config.properties);
    }

    // Validate instance
    this.validateFrameworkInstance(instance);

    return instance;
  }

  /**
   * Build steps for the framework
   * @param {Array} stepConfigs - Step configurations
   * @param {Object} options - Build options
   */
  async buildSteps(stepConfigs, options) {
    const steps = [];

    for (const stepConfig of stepConfigs) {
      try {
        const step = await this.buildStep(stepConfig, options);
        steps.push(step);
      } catch (error) {
        console.error(`❌ Failed to build step "${stepConfig.name}":`, error.message);
        
        // Continue with other steps if this one fails
        if (options.continueOnError !== false) {
          continue;
        } else {
          throw error;
        }
      }
    }

    return steps;
  }

  /**
   * Build individual step
   * @param {Object} stepConfig - Step configuration
   * @param {Object} options - Build options
   */
  async buildStep(stepConfig, options) {
    const step = {
      name: stepConfig.name,
      type: stepConfig.type,
      description: stepConfig.description,
      order: stepConfig.order || 0,
      required: stepConfig.required !== false,
      settings: { ...stepConfig.settings, ...options.stepSettings?.[stepConfig.name] },
      dependencies: stepConfig.dependencies || [],
      metadata: {
        config: stepConfig
      }
    };

    // Add step-specific properties
    if (stepConfig.properties) {
      Object.assign(step, stepConfig.properties);
    }

    return step;
  }

  /**
   * Validate build options
   * @param {Object} options - Build options
   */
  validateBuildOptions(options) {
    if (options.settings && typeof options.settings !== 'object') {
      throw new Error('Build options settings must be an object');
    }

    if (options.stepSettings && typeof options.stepSettings !== 'object') {
      throw new Error('Build options stepSettings must be an object');
    }

    if (options.continueOnError !== undefined && typeof options.continueOnError !== 'boolean') {
      throw new Error('Build options continueOnError must be a boolean');
    }

    return true;
  }

  /**
   * Validate framework instance
   * @param {Object} instance - Framework instance
   */
  validateFrameworkInstance(instance) {
    if (!instance.name) {
      throw new Error('Framework instance must have a name');
    }

    if (!instance.version) {
      throw new Error('Framework instance must have a version');
    }

    if (!instance.steps || !Array.isArray(instance.steps)) {
      throw new Error('Framework instance must have a steps array');
    }

    // Validate steps
    for (const step of instance.steps) {
      if (!step.name) {
        throw new Error('All steps must have a name');
      }

      if (!step.type) {
        throw new Error(`Step "${step.name}" must have a type`);
      }
    }

    return true;
  }

  /**
   * Get cache key for framework build
   * @param {string} frameworkName - Framework name
   * @param {Object} options - Build options
   */
  getCacheKey(frameworkName, options) {
    const optionsHash = JSON.stringify(options);
    return `${frameworkName}:${optionsHash}`;
  }

  /**
   * Clear build cache
   * @param {string} frameworkName - Optional framework name to clear specific cache
   */
  clearCache(frameworkName = null) {
    if (frameworkName) {
      // Clear cache for specific framework
      const keysToDelete = Array.from(this.buildCache.keys())
        .filter(key => key.startsWith(frameworkName + ':'));
      
      keysToDelete.forEach(key => this.buildCache.delete(key));
      console.log(`🗑️ Cleared cache for framework "${frameworkName}"`);
    } else {
      // Clear all cache
      this.buildCache.clear();
      console.log('🗑️ Cleared all framework build cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalCached: this.buildCache.size,
      frameworks: Array.from(this.buildCache.keys()).map(key => key.split(':')[0])
    };
  }

  /**
   * Build multiple frameworks
   * @param {Array} frameworkNames - Array of framework names
   * @param {Object} options - Build options
   */
  async buildMultipleFrameworks(frameworkNames, options = {}) {
    const results = {
      successful: [],
      failed: []
    };

    for (const frameworkName of frameworkNames) {
      try {
        const instance = await this.buildFramework(frameworkName, options);
        results.successful.push({
          name: frameworkName,
          instance
        });
      } catch (error) {
        results.failed.push({
          name: frameworkName,
          error: error.message
        });

        if (options.continueOnError !== false) {
          console.error(`❌ Failed to build framework "${frameworkName}":`, error.message);
          continue;
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Customize framework with additional options
   * @param {Object} instance - Framework instance
   * @param {Object} customizations - Customization options
   */
  customizeFramework(instance, customizations) {
    const customized = { ...instance };

    // Apply customizations
    if (customizations.settings) {
      customized.settings = { ...customized.settings, ...customizations.settings };
    }

    if (customizations.steps) {
      customized.steps = customized.steps.map(step => {
        const stepCustomization = customizations.steps[step.name];
        if (stepCustomization) {
          return { ...step, ...stepCustomization };
        }
        return step;
      });
    }

    if (customizations.properties) {
      Object.assign(customized, customizations.properties);
    }

    // Update metadata
    customized.metadata.customizedAt = new Date();
    customized.metadata.customizations = customizations;

    return customized;
  }
}

module.exports = FrameworkBuilder; 