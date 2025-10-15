/**
 * LazyServiceLoader - On-demand service resolution with dependency tracking
 * Provides lazy loading capabilities for services to reduce startup time
 * and improve memory efficiency through on-demand instantiation
 */
const { EventEmitter } = require("events");
const ServiceLogger = require("@logging/ServiceLogger");

class LazyServiceLoader extends EventEmitter {
  constructor(serviceContainer, options = {}) {
    super();

    this.container = serviceContainer;
    this.logger = options.logger || new ServiceLogger("LazyServiceLoader");

    // Configuration options
    this.enableLazyLoading = options.enableLazyLoading !== false;
    this.maxResolutionDepth = options.maxResolutionDepth || 10;
    this.cacheResolvedServices = options.cacheResolvedServices !== false;
    this.enableMetrics = options.enableMetrics !== false;

    // Service tracking
    this.lazyServices = new Map(); // Services registered for lazy loading
    this.resolvedServices = new Map(); // Cache of resolved services
    this.resolutionStack = new Set(); // Track current resolution path
    this.dependencyGraph = new Map(); // Track service dependencies

    // Performance metrics
    this.metrics = {
      totalResolutions: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResolutionTime: 0,
      maxResolutionDepth: 0,
      circularDependencyDetections: 0,
      resolutionErrors: 0,
    };

    this.logger.info("LazyServiceLoader initialized");
  }

  /**
   * Register a service for lazy loading
   * @param {string} serviceName - Name of the service
   * @param {Function} factory - Factory function for service creation
   * @param {Array} dependencies - Service dependencies
   * @param {Object} options - Lazy loading options
   */
  registerLazyService(serviceName, factory, dependencies = [], options = {}) {
    if (!this.enableLazyLoading) {
      throw new Error(`Lazy loading is disabled. Enable it first with setLazyLoading(true)`);
    }

    const lazyServiceConfig = {
      factory,
      dependencies,
      singleton: options.singleton !== false,
      lifecycle: options.lifecycle || {},
      metadata: options.metadata || {},
      registeredAt: Date.now(),
    };

    this.lazyServices.set(serviceName, lazyServiceConfig);
    this.dependencyGraph.set(serviceName, dependencies);

    this.logger.debug(`Registered lazy service: ${serviceName} with dependencies: [${dependencies.join(", ")}]`);
    this.emit("serviceRegistered", { serviceName, dependencies });

    return this;
  }

  /**
   * Resolve a service with lazy loading
   * @param {string} serviceName - Name of the service to resolve
   * @returns {any} Service instance
   */
  resolve(serviceName) {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.cacheResolvedServices && this.resolvedServices.has(serviceName)) {
        this.metrics.cacheHits++;
        this.logger.debug(`Cache hit for service: ${serviceName}`);
        return this.resolvedServices.get(serviceName);
      }

      this.metrics.cacheMisses++;

      // Check for circular dependencies
      if (this.resolutionStack.has(serviceName)) {
        const cycle = Array.from(this.resolutionStack).concat([serviceName]);
        this.metrics.circularDependencyDetections++;
        this.logger.error(`Circular dependency detected: ${cycle.join(" -> ")}`);
        throw new Error(`Circular dependency detected: ${cycle.join(" -> ")}`);
      }

      // Check resolution depth
      if (this.resolutionStack.size >= this.maxResolutionDepth) {
        this.logger.error(`Maximum resolution depth exceeded: ${this.maxResolutionDepth}`);
        throw new Error(`Maximum resolution depth exceeded: ${this.maxResolutionDepth}`);
      }

      // Add to resolution stack
      this.resolutionStack.add(serviceName);

      // Resolve the service
      const service = this.resolveService(serviceName);

      // Remove from resolution stack
      this.resolutionStack.delete(serviceName);

      // Cache the resolved service if configured
      if (this.cacheResolvedServices) {
        this.resolvedServices.set(serviceName, service);
      }

      // Update metrics
      const resolutionTime = Date.now() - startTime;
      this.updateMetrics(resolutionTime, this.resolutionStack.size);

      this.logger.debug(`Resolved service: ${serviceName} in ${resolutionTime}ms`);
      this.emit("serviceResolved", { serviceName, resolutionTime });

      return service;
    } catch (error) {
      this.resolutionStack.delete(serviceName);
      this.metrics.resolutionErrors++;
      this.logger.error(`Failed to resolve service '${serviceName}':`, error.message);
      this.emit("serviceResolutionError", { serviceName, error });
      throw error;
    }
  }

  /**
   * Resolve a service by name
   * @param {string} serviceName - Name of the service
   * @returns {any} Service instance
   */
  resolveService(serviceName) {
    // Check if it's a lazy service
    if (this.lazyServices.has(serviceName)) {
      return this.resolveLazyService(serviceName);
    }

    // Fall back to container resolution
    return this.container.resolve(serviceName);
  }

  /**
   * Resolve a lazy service
   * @param {string} serviceName - Name of the lazy service
   * @returns {any} Service instance
   */
  resolveLazyService(serviceName) {
    const lazyConfig = this.lazyServices.get(serviceName);

    if (!lazyConfig) {
      throw new Error(`Lazy service not found: ${serviceName}`);
    }

    // Resolve dependencies first
    const resolvedDependencies = lazyConfig.dependencies.map((dep) => {
      this.logger.debug(`Resolving dependency: ${dep} for service: ${serviceName}`);
      return this.resolve(dep);
    });

    // Create service instance
    const service = lazyConfig.factory(...resolvedDependencies);

    // Execute lifecycle hooks if available
    if (lazyConfig.lifecycle && lazyConfig.lifecycle.onStart) {
      try {
        lazyConfig.lifecycle.onStart(service);
        this.logger.debug(`Executed onStart lifecycle hook for: ${serviceName}`);
      } catch (error) {
        this.logger.warn(`Lifecycle hook onStart failed for ${serviceName}:`, error.message);
      }
    }

    return service;
  }

  /**
   * Preload critical services
   * @param {Array} serviceNames - Names of services to preload
   * @returns {Promise<Object>} Preload results
   */
  async preloadServices(serviceNames) {
    const results = {
      successful: [],
      failed: [],
      totalTime: 0,
    };

    const startTime = Date.now();

    this.logger.info(`Preloading ${serviceNames.length} services...`);

    for (const serviceName of serviceNames) {
      try {
        const service = this.resolve(serviceName);
        results.successful.push(serviceName);
        this.logger.debug(`Preloaded service: ${serviceName}`);
      } catch (error) {
        results.failed.push({ serviceName, error: error.message });
        this.logger.error(`Failed to preload service ${serviceName}:`, error.message);
      }
    }

    results.totalTime = Date.now() - startTime;

    this.logger.info(`Preloading completed: ${results.successful.length} successful, ${results.failed.length} failed in ${results.totalTime}ms`);
    this.emit("servicesPreloaded", results);

    return results;
  }

  /**
   * Get service dependency information
   * @param {string} serviceName - Name of the service
   * @returns {Object} Dependency information
   */
  getServiceDependencies(serviceName) {
    const dependencies = this.dependencyGraph.get(serviceName) || [];
    const resolved = this.resolvedServices.has(serviceName);

    return {
      serviceName,
      dependencies,
      resolved,
      dependencyCount: dependencies.length,
      transitiveDependencies: this.getTransitiveDependencies(serviceName),
    };
  }

  /**
   * Get transitive dependencies for a service
   * @param {string} serviceName - Name of the service
   * @returns {Array} Transitive dependencies
   */
  getTransitiveDependencies(serviceName) {
    const visited = new Set();
    const transitive = new Set();

    const collectDependencies = (name) => {
      if (visited.has(name)) return;
      visited.add(name);

      const dependencies = this.dependencyGraph.get(name) || [];
      for (const dep of dependencies) {
        transitive.add(dep);
        collectDependencies(dep);
      }
    };

    collectDependencies(serviceName);
    return Array.from(transitive);
  }

  /**
   * Update performance metrics
   * @param {number} resolutionTime - Time taken to resolve service
   * @param {number} resolutionDepth - Current resolution depth
   */
  updateMetrics(resolutionTime, resolutionDepth) {
    this.metrics.totalResolutions++;
    this.metrics.averageResolutionTime = 
      (this.metrics.averageResolutionTime + resolutionTime) / 2;
    this.metrics.maxResolutionDepth = Math.max(this.metrics.maxResolutionDepth, resolutionDepth);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalResolutions > 0 
        ? (this.metrics.cacheHits / this.metrics.totalResolutions) * 100 
        : 0,
      lazyServicesCount: this.lazyServices.size,
      resolvedServicesCount: this.resolvedServices.size,
      dependencyGraphSize: this.dependencyGraph.size,
    };
  }

  /**
   * Clear service cache
   * @param {string} serviceName - Optional specific service to clear
   */
  clearCache(serviceName = null) {
    if (serviceName) {
      this.resolvedServices.delete(serviceName);
      this.logger.debug(`Cleared cache for service: ${serviceName}`);
    } else {
      this.resolvedServices.clear();
      this.logger.info("Cleared all service cache");
    }

    this.emit("cacheCleared", { serviceName });
  }

  /**
   * Get all lazy services
   * @returns {Map} Map of lazy services
   */
  getLazyServices() {
    return new Map(this.lazyServices);
  }

  /**
   * Check if a service is registered for lazy loading
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if service is lazy loaded
   */
  isLazyService(serviceName) {
    return this.lazyServices.has(serviceName);
  }

  /**
   * Get service resolution statistics
   * @returns {Object} Resolution statistics
   */
  getResolutionStats() {
    return {
      totalServices: this.lazyServices.size,
      resolvedServices: this.resolvedServices.size,
      unresolvedServices: this.lazyServices.size - this.resolvedServices.size,
      resolutionRate: this.lazyServices.size > 0 
        ? (this.resolvedServices.size / this.lazyServices.size) * 100 
        : 0,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Shutdown the lazy loader
   */
  async shutdown() {
    this.logger.info("Shutting down LazyServiceLoader...");

    // Execute lifecycle hooks for resolved services
    for (const [serviceName, service] of this.resolvedServices) {
      const lazyConfig = this.lazyServices.get(serviceName);
      if (lazyConfig && lazyConfig.lifecycle && lazyConfig.lifecycle.onStop) {
        try {
          await lazyConfig.lifecycle.onStop(service);
          this.logger.debug(`Executed onStop lifecycle hook for: ${serviceName}`);
        } catch (error) {
          this.logger.warn(`Lifecycle hook onStop failed for ${serviceName}:`, error.message);
        }
      }
    }

    // Clear all data
    this.lazyServices.clear();
    this.resolvedServices.clear();
    this.resolutionStack.clear();
    this.dependencyGraph.clear();

    this.logger.info("LazyServiceLoader shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = LazyServiceLoader;
