/**
 * ServiceFactory - DDD Conform Service Factory with Intelligent Service Creation
 * Implements Fail-Fast Pattern for service creation with comprehensive validation
 * and intelligent dependency resolution following Domain-Driven Design principles
 */
const { EventEmitter } = require("events");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceFactory extends EventEmitter {
  constructor(serviceContainer, options = {}) {
    super();

    this.container = serviceContainer;
    this.logger = options.logger || new ServiceLogger("ServiceFactory");

    // Configuration options
    this.enableFailFast = options.enableFailFast !== false;
    this.enableValidation = options.enableValidation !== false;
    this.enableIntelligentCreation = options.enableIntelligentCreation !== false;
    this.maxRetryAttempts = options.maxRetryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second

    // Service creation tracking
    this.serviceDefinitions = new Map(); // Service definitions
    this.serviceInstances = new Map(); // Created service instances
    this.creationHistory = new Map(); // Service creation history
    this.validationRules = new Map(); // Service validation rules

    // Factory metrics
    this.metrics = {
      totalCreations: 0,
      successfulCreations: 0,
      failedCreations: 0,
      validationFailures: 0,
      retryAttempts: 0,
      averageCreationTime: 0,
      lastCreationTime: null,
    };

    // Service categories for intelligent creation
    this.serviceCategories = {
      infrastructure: ["database", "cache", "queue", "storage"],
      domain: ["entity", "valueObject", "aggregate", "repository"],
      application: ["service", "handler", "command", "query"],
      presentation: ["controller", "middleware", "router"],
      external: ["api", "client", "adapter", "gateway"],
    };

    this.logger.info("ServiceFactory initialized with Fail-Fast pattern");
  }

  /**
   * Register a service definition with validation rules
   * @param {string} serviceName - Name of the service
   * @param {Function} factory - Factory function
   * @param {Object} definition - Service definition
   */
  registerServiceDefinition(serviceName, factory, definition = {}) {
    const serviceDefinition = {
      name: serviceName,
      factory,
      category: definition.category || this.detectServiceCategory(serviceName),
      dependencies: definition.dependencies || [],
      validation: definition.validation || {},
      lifecycle: definition.lifecycle || {},
      metadata: definition.metadata || {},
      singleton: definition.singleton !== false,
      failFast: definition.failFast !== false,
      registeredAt: Date.now(),
    };

    this.serviceDefinitions.set(serviceName, serviceDefinition);

    // Register validation rules
    if (this.enableValidation && serviceDefinition.validation) {
      this.registerValidationRules(serviceName, serviceDefinition.validation);
    }

    this.logger.debug(`Registered service definition: ${serviceName} (${serviceDefinition.category})`);
    this.emit("serviceDefinitionRegistered", serviceDefinition);

    return this;
  }

  /**
   * Create a service instance with Fail-Fast pattern
   * @param {string} serviceName - Name of the service to create
   * @param {Object} options - Creation options
   * @returns {any} Service instance
   */
  async createService(serviceName, options = {}) {
    const startTime = Date.now();

    try {
      // Validate service definition exists
      const definition = this.serviceDefinitions.get(serviceName);
      if (!definition) {
        throw new Error(`Service definition not found: ${serviceName}`);
      }

      // Check if service already exists (for singletons)
      if (definition.singleton && this.serviceInstances.has(serviceName)) {
        this.logger.debug(`Returning existing singleton instance: ${serviceName}`);
        return this.serviceInstances.get(serviceName);
      }

      // Validate dependencies before creation
      if (this.enableValidation) {
        await this.validateDependencies(serviceName, definition);
      }

      // Create service instance
      const service = await this.createServiceInstance(serviceName, definition, options);

      // Validate created service
      if (this.enableValidation) {
        await this.validateServiceInstance(serviceName, service, definition);
      }

      // Store instance if singleton
      if (definition.singleton) {
        this.serviceInstances.set(serviceName, service);
      }

      // Record creation history
      this.recordCreationHistory(serviceName, {
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        options,
      });

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);

      this.logger.debug(`Successfully created service: ${serviceName} in ${Date.now() - startTime}ms`);
      this.emit("serviceCreated", { serviceName, service, duration: Date.now() - startTime });

      return service;
    } catch (error) {
      // Fail-Fast: Don't retry if failFast is enabled
      if (definition && definition.failFast) {
        this.logger.error(`Fail-Fast: Service creation failed for ${serviceName}:`, error.message);
        throw error;
      }

      // Retry logic for non-fail-fast services
      return await this.retryServiceCreation(serviceName, options, error, startTime);
    }
  }

  /**
   * Create service instance with intelligent dependency resolution
   * @param {string} serviceName - Name of the service
   * @param {Object} definition - Service definition
   * @param {Object} options - Creation options
   * @returns {any} Service instance
   */
  async createServiceInstance(serviceName, definition, options) {
    // Resolve dependencies intelligently
    const dependencies = await this.resolveDependenciesIntelligently(serviceName, definition);

    // Create service instance
    const service = definition.factory(...dependencies);

    // Execute lifecycle hooks
    if (definition.lifecycle && definition.lifecycle.onCreated) {
      try {
        await definition.lifecycle.onCreated(service);
        this.logger.debug(`Executed onCreated lifecycle hook for: ${serviceName}`);
      } catch (error) {
        this.logger.warn(`Lifecycle hook onCreated failed for ${serviceName}:`, error.message);
        throw new Error(`Service creation failed due to lifecycle hook error: ${error.message}`);
      }
    }

    return service;
  }

  /**
   * Resolve dependencies intelligently
   * @param {string} serviceName - Name of the service
   * @param {Object} definition - Service definition
   * @returns {Array} Resolved dependencies
   */
  async resolveDependenciesIntelligently(serviceName, definition) {
    const dependencies = [];

    for (const dependency of definition.dependencies) {
      try {
        // Try to resolve from container first
        const resolvedDependency = this.container.resolve(dependency);
        dependencies.push(resolvedDependency);
        this.logger.debug(`Resolved dependency ${dependency} for ${serviceName}`);
      } catch (error) {
        // If not found in container, try to create it
        if (this.serviceDefinitions.has(dependency)) {
          const createdDependency = await this.createService(dependency);
          dependencies.push(createdDependency);
          this.logger.debug(`Created dependency ${dependency} for ${serviceName}`);
        } else {
          throw new Error(`Dependency ${dependency} not found for service ${serviceName}`);
        }
      }
    }

    return dependencies;
  }

  /**
   * Validate dependencies before service creation
   * @param {string} serviceName - Name of the service
   * @param {Object} definition - Service definition
   */
  async validateDependencies(serviceName, definition) {
    for (const dependency of definition.dependencies) {
      // Check if dependency exists in container or can be created
      const existsInContainer = this.container.factories.has(dependency);
      const canBeCreated = this.serviceDefinitions.has(dependency);

      if (!existsInContainer && !canBeCreated) {
        throw new Error(`Dependency ${dependency} not available for service ${serviceName}`);
      }

      // Validate dependency if it has validation rules
      if (this.validationRules.has(dependency)) {
        const validationRules = this.validationRules.get(dependency);
        await this.executeValidationRules(dependency, validationRules);
      }
    }
  }

  /**
   * Validate created service instance
   * @param {string} serviceName - Name of the service
   * @param {any} service - Service instance
   * @param {Object} definition - Service definition
   */
  async validateServiceInstance(serviceName, service, definition) {
    if (!definition.validation || Object.keys(definition.validation).length === 0) {
      return;
    }

    // Validate service properties
    if (definition.validation.properties) {
      for (const [property, rules] of Object.entries(definition.validation.properties)) {
        if (!service.hasOwnProperty(property)) {
          throw new Error(`Service ${serviceName} missing required property: ${property}`);
        }

        if (rules.type && typeof service[property] !== rules.type) {
          throw new Error(`Service ${serviceName} property ${property} has wrong type: expected ${rules.type}, got ${typeof service[property]}`);
        }

        if (rules.required && (service[property] === null || service[property] === undefined)) {
          throw new Error(`Service ${serviceName} property ${property} is required but is null/undefined`);
        }
      }
    }

    // Validate service methods
    if (definition.validation.methods) {
      for (const method of definition.validation.methods) {
        if (typeof service[method] !== "function") {
          throw new Error(`Service ${serviceName} missing required method: ${method}`);
        }
      }
    }

    // Execute custom validation
    if (definition.validation.custom && typeof definition.validation.custom === "function") {
      const validationResult = await definition.validation.custom(service);
      if (!validationResult) {
        throw new Error(`Service ${serviceName} failed custom validation`);
      }
    }
  }

  /**
   * Retry service creation with exponential backoff
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Creation options
   * @param {Error} originalError - Original error
   * @param {number} startTime - Start time
   * @returns {any} Service instance
   */
  async retryServiceCreation(serviceName, options, originalError, startTime) {
    let lastError = originalError;

    for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        this.metrics.retryAttempts++;
        this.logger.debug(`Retry attempt ${attempt} for service creation: ${serviceName}`);

        // Wait before retry
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }

        // Attempt to create service again
        const service = await this.createServiceInstance(
          serviceName,
          this.serviceDefinitions.get(serviceName),
          options
        );

        // Record successful retry
        this.recordCreationHistory(serviceName, {
          success: true,
          duration: Date.now() - startTime,
          retryAttempt: attempt,
          timestamp: new Date(),
          options,
        });

        this.updateMetrics(true, Date.now() - startTime);

        this.logger.info(`Service creation succeeded on retry ${attempt} for: ${serviceName}`);
        this.emit("serviceCreated", { serviceName, service, retryAttempt: attempt });

        return service;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Retry attempt ${attempt} failed for ${serviceName}:`, error.message);
      }
    }

    // All retries failed
    this.recordCreationHistory(serviceName, {
      success: false,
      duration: Date.now() - startTime,
      retryAttempts: this.maxRetryAttempts,
      error: lastError.message,
      timestamp: new Date(),
      options,
    });

    this.updateMetrics(false, Date.now() - startTime);

    this.logger.error(`Service creation failed after ${this.maxRetryAttempts} retries for: ${serviceName}`);
    this.emit("serviceCreationFailed", { serviceName, error: lastError, retryAttempts: this.maxRetryAttempts });

    throw lastError;
  }

  /**
   * Detect service category based on name and patterns
   * @param {string} serviceName - Name of the service
   * @returns {string} Detected category
   */
  detectServiceCategory(serviceName) {
    const lowerName = serviceName.toLowerCase();

    for (const [category, patterns] of Object.entries(this.serviceCategories)) {
      if (patterns.some(pattern => lowerName.includes(pattern))) {
        return category;
      }
    }

    return "unknown";
  }

  /**
   * Register validation rules for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} validation - Validation rules
   */
  registerValidationRules(serviceName, validation) {
    this.validationRules.set(serviceName, validation);
    this.logger.debug(`Registered validation rules for: ${serviceName}`);
  }

  /**
   * Execute validation rules
   * @param {string} serviceName - Name of the service
   * @param {Object} validationRules - Validation rules
   */
  async executeValidationRules(serviceName, validationRules) {
    // Implementation for executing validation rules
    // This would contain the actual validation logic
    this.logger.debug(`Executing validation rules for: ${serviceName}`);
  }

  /**
   * Record service creation history
   * @param {string} serviceName - Name of the service
   * @param {Object} history - Creation history
   */
  recordCreationHistory(serviceName, history) {
    if (!this.creationHistory.has(serviceName)) {
      this.creationHistory.set(serviceName, []);
    }

    const historyArray = this.creationHistory.get(serviceName);
    historyArray.push(history);

    // Keep only last 100 entries
    if (historyArray.length > 100) {
      historyArray.shift();
    }
  }

  /**
   * Update factory metrics
   * @param {boolean} success - Whether creation was successful
   * @param {number} duration - Creation duration
   */
  updateMetrics(success, duration) {
    this.metrics.totalCreations++;
    this.metrics.lastCreationTime = new Date();

    if (success) {
      this.metrics.successfulCreations++;
    } else {
      this.metrics.failedCreations++;
    }

    this.metrics.averageCreationTime = 
      (this.metrics.averageCreationTime + duration) / 2;
  }

  /**
   * Get service creation statistics
   * @param {string} serviceName - Optional specific service
   * @returns {Object} Creation statistics
   */
  getCreationStats(serviceName = null) {
    if (serviceName) {
      const history = this.creationHistory.get(serviceName) || [];
      const definition = this.serviceDefinitions.get(serviceName);

      return {
        serviceName,
        definition,
        totalCreations: history.length,
        successfulCreations: history.filter(h => h.success).length,
        failedCreations: history.filter(h => !h.success).length,
        averageDuration: history.reduce((sum, h) => sum + h.duration, 0) / history.length || 0,
        lastCreation: history[history.length - 1] || null,
        history: history.slice(-10), // Last 10 entries
      };
    }

    return {
      totalServices: this.serviceDefinitions.size,
      totalCreations: this.metrics.totalCreations,
      successfulCreations: this.metrics.successfulCreations,
      failedCreations: this.metrics.failedCreations,
      successRate: this.metrics.totalCreations > 0 
        ? (this.metrics.successfulCreations / this.metrics.totalCreations) * 100 
        : 0,
      averageCreationTime: this.metrics.averageCreationTime,
      retryAttempts: this.metrics.retryAttempts,
    };
  }

  /**
   * Get all service definitions
   * @returns {Map} Service definitions
   */
  getServiceDefinitions() {
    return new Map(this.serviceDefinitions);
  }

  /**
   * Get service instance if exists
   * @param {string} serviceName - Name of the service
   * @returns {any} Service instance or null
   */
  getServiceInstance(serviceName) {
    return this.serviceInstances.get(serviceName) || null;
  }

  /**
   * Check if service definition exists
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if definition exists
   */
  hasServiceDefinition(serviceName) {
    return this.serviceDefinitions.has(serviceName);
  }

  /**
   * Shutdown service factory
   */
  async shutdown() {
    this.logger.info("Shutting down ServiceFactory...");

    // Execute lifecycle hooks for all instances
    for (const [serviceName, service] of this.serviceInstances) {
      const definition = this.serviceDefinitions.get(serviceName);
      if (definition && definition.lifecycle && definition.lifecycle.onDestroy) {
        try {
          await definition.lifecycle.onDestroy(service);
          this.logger.debug(`Executed onDestroy lifecycle hook for: ${serviceName}`);
        } catch (error) {
          this.logger.warn(`Lifecycle hook onDestroy failed for ${serviceName}:`, error.message);
        }
      }
    }

    // Clear all data
    this.serviceDefinitions.clear();
    this.serviceInstances.clear();
    this.creationHistory.clear();
    this.validationRules.clear();

    this.logger.info("ServiceFactory shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = ServiceFactory;
