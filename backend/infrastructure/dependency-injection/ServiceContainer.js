/**
 * ServiceContainer - Centralized Dependency Injection Container
 * Provides consistent service registration and resolution across the application
 * Enhanced with circular dependency detection and validation
 */
const path = require("path");
const fs = require("fs").promises;
const Logger = require("@logging/Logger");
const DependencyGraph = require("./DependencyGraph");
const LazyServiceLoader = require("./LazyServiceLoader");
const ServiceHealthMonitor = require("./ServiceHealthMonitor");
const ServiceMetrics = require("./ServiceMetrics");
const ServiceFactory = require("./ServiceFactory");
const ServiceDiscovery = require("./ServiceDiscovery");
const ServiceLifecycleManager = require("./ServiceLifecycleManager");
const logger = new Logger("DIServiceContainer");

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.dependencyGraph = new DependencyGraph();
    this.resolutionStack = new Set(); // Track current resolution path
    this.lifecycleHooks = new Map(); // Service lifecycle hooks
    this.serviceStates = new Map(); // Track service states
    this.projectContext = {
      projectPath: null,
      projectId: null,
      workspacePath: null,
    };

    // Initialize modern service management components
    this.lazyLoader = new LazyServiceLoader(this);
    this.healthMonitor = new ServiceHealthMonitor(this);
    this.metrics = new ServiceMetrics();
    this.serviceFactory = new ServiceFactory(this);
    this.serviceDiscovery = new ServiceDiscovery(this);
    this.lifecycleManager = new ServiceLifecycleManager(this);

    // Configuration options
    this.enableLazyLoading = true;
    this.enableHealthMonitoring = true;
    this.enableMetricsCollection = true;
    this.enableAutoDiscovery = true;
    this.enableLifecycleManagement = true;

    // Register optimization services (disabled for now due to SQL syntax errors)
    // this.registerOptimizationServices();
  }

  /**
   * Register a service factory with lifecycle hooks
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Object} options - Registration options
   */
  register(name, factory, options = {}) {
    const { singleton = false, dependencies = [], lifecycle = {}, lazy = false } = options;

    // Add to dependency graph for circular dependency detection
    this.dependencyGraph.addNode(name, dependencies);

    this.factories.set(name, {
      factory,
      singleton,
      dependencies,
      lazy,
    });

    // Store lifecycle hooks if provided
    if (lifecycle && Object.keys(lifecycle).length > 0) {
      this.lifecycleHooks.set(name, lifecycle);
      logger.debug(`Registered lifecycle hooks for service: ${name}`);
    }

    // Initialize service state
    this.serviceStates.set(name, {
      status: "registered",
      startTime: null,
      stopTime: null,
      errorCount: 0,
      lastError: null,
    });

    // Register with lazy loader if lazy loading is enabled
    if (lazy && this.enableLazyLoading) {
      this.lazyLoader.registerLazyService(name, factory, dependencies, options);
      logger.debug(`Registered lazy service: ${name}`);
    }

    // Register with lifecycle manager if lifecycle management is enabled
    if (this.enableLifecycleManagement && lifecycle) {
      this.lifecycleManager.registerService(name, lifecycle, options);
      logger.debug(`Registered service with lifecycle manager: ${name}`);
    }

    // Register health check if health monitoring is enabled
    if (this.enableHealthMonitoring && options.healthCheck) {
      this.healthMonitor.registerHealthCheck(name, options.healthCheck, options.healthOptions);
      logger.debug(`Registered health check for service: ${name}`);
    }

    logger.debug(
      `Registered service: ${name} (singleton: ${singleton}, lazy: ${lazy}) with dependencies: [${dependencies.join(", ")}]`,
    );
  }

  /**
   * Register a singleton instance
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   */
  registerSingleton(name, instance) {
    this.singletons.set(name, instance);
    // Singleton registration logs removed for cleaner output
  }

  /**
   * Resolve a service
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  resolve(name) {
    // Check for circular dependencies during resolution
    if (this.resolutionStack.has(name)) {
      const cycle = Array.from(this.resolutionStack).concat([name]);
      logger.error(`Circular dependency detected: ${cycle.join(" -> ")}`);
      throw new Error(`Circular dependency detected: ${cycle.join(" -> ")}`);
    }

    // Check if singleton already exists
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if factory exists
    if (this.factories.has(name)) {
      const { factory, singleton, dependencies, lazy } = this.factories.get(name);

      // Use lazy loader if service is marked as lazy
      if (lazy && this.enableLazyLoading) {
        return this.lazyLoader.resolve(name);
      }

      try {
        // Add to resolution stack to detect cycles
        this.resolutionStack.add(name);

        // Resolve dependencies
        const resolvedDependencies = dependencies.map((dep) =>
          this.resolve(dep),
        );

        // Remove from resolution stack
        this.resolutionStack.delete(name);

        // Create instance
        const instance = factory(...resolvedDependencies);

        // Store as singleton if needed
        if (singleton) {
          this.singletons.set(name, instance);
        }

        // Record metrics if enabled
        if (this.enableMetricsCollection) {
          this.metrics.recordInitialization(name, {
            success: true,
            duration: 0, // Would need timing implementation
            dependencies,
          });
        }

        return instance;
      } catch (error) {
        // Remove from resolution stack on error
        this.resolutionStack.delete(name);

        // Record metrics if enabled
        if (this.enableMetricsCollection) {
          this.metrics.recordInitialization(name, {
            success: false,
            error: error.message,
            dependencies,
          });
        }

        logger.error(`Failed to resolve service '${name}':`, error.message);
        logger.error(`Dependencies for '${name}': ${dependencies.join(", ")}`);
        throw new Error(
          `Service resolution failed for '${name}': ${error.message}`,
        );
      }
    }

    // Log available services for debugging
    const availableServices = Array.from(this.factories.keys()).join(", ");
    logger.error(
      `Service '${name}' not found. Available services: ${availableServices}`,
    );
    logger.error(
      `Available singletons: ${Array.from(this.singletons.keys()).join(", ")}`,
    );
    throw new Error(`Service not found: ${name}`);
  }

  /**
   * Enable or disable lazy loading
   * @param {boolean} enabled - Whether to enable lazy loading
   */
  setLazyLoading(enabled) {
    this.enableLazyLoading = enabled;
    logger.info(`Lazy loading ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable health monitoring
   * @param {boolean} enabled - Whether to enable health monitoring
   */
  setHealthMonitoring(enabled) {
    this.enableHealthMonitoring = enabled;
    if (enabled) {
      this.healthMonitor.startMonitoring();
    } else {
      this.healthMonitor.stopMonitoring();
    }
    logger.info(`Health monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable metrics collection
   * @param {boolean} enabled - Whether to enable metrics collection
   */
  setMetricsCollection(enabled) {
    this.enableMetricsCollection = enabled;
    if (enabled) {
      this.metrics.startMetricsCollection();
    } else {
      this.metrics.stopMetricsCollection();
    }
    logger.info(`Metrics collection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable auto-discovery
   * @param {boolean} enabled - Whether to enable auto-discovery
   */
  setAutoDiscovery(enabled) {
    this.enableAutoDiscovery = enabled;
    logger.info(`Auto-discovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable lifecycle management
   * @param {boolean} enabled - Whether to enable lifecycle management
   */
  setLifecycleManagement(enabled) {
    this.enableLifecycleManagement = enabled;
    logger.info(`Lifecycle management ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Scan for services and auto-register them
   * @param {Array} directories - Optional specific directories to scan
   * @returns {Promise<Object>} Scan results
   */
  async scanForServices(directories = null) {
    if (!this.enableAutoDiscovery) {
      throw new Error("Auto-discovery is disabled. Enable it first with setAutoDiscovery(true)");
    }

    return await this.serviceDiscovery.scanForServices(directories);
  }

  /**
   * Get service health status
   * @param {string} serviceName - Optional specific service name
   * @returns {Object} Health status
   */
  getServiceHealth(serviceName = null) {
    if (!this.enableHealthMonitoring) {
      throw new Error("Health monitoring is disabled. Enable it first with setHealthMonitoring(true)");
    }

    return serviceName 
      ? this.healthMonitor.getServiceHealth(serviceName)
      : this.healthMonitor.getOverallHealth();
  }

  /**
   * Get service metrics
   * @param {string} serviceName - Optional specific service name
   * @returns {Object} Service metrics
   */
  getServiceMetrics(serviceName = null) {
    if (!this.enableMetricsCollection) {
      throw new Error("Metrics collection is disabled. Enable it first with setMetricsCollection(true)");
    }

    return serviceName 
      ? this.metrics.getServiceMetrics(serviceName)
      : this.metrics.getAggregatedMetrics();
  }

  /**
   * Get service lifecycle information
   * @param {string} serviceName - Optional specific service name
   * @returns {Object} Lifecycle information
   */
  getServiceLifecycle(serviceName = null) {
    if (!this.enableLifecycleManagement) {
      throw new Error("Lifecycle management is disabled. Enable it first with setLifecycleManagement(true)");
    }

    return serviceName 
      ? this.lifecycleManager.getServiceStateInfo(serviceName)
      : this.lifecycleManager.getAllServiceStates();
  }

  /**
   * Start all services with lifecycle management
   * @param {Object} options - Start options
   * @returns {Promise<Object>} Start results
   */
  async startAllServices(options = {}) {
    if (!this.enableLifecycleManagement) {
      throw new Error("Lifecycle management is disabled. Enable it first with setLifecycleManagement(true)");
    }

    return await this.lifecycleManager.startAllServices(options);
  }

  /**
   * Stop all services with lifecycle management
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Stop results
   */
  async stopAllServices(options = {}) {
    if (!this.enableLifecycleManagement) {
      throw new Error("Lifecycle management is disabled. Enable it first with setLifecycleManagement(true)");
    }

    return await this.lifecycleManager.stopAllServices(options);
  }

  /**
   * Graceful shutdown of all services
   * @param {Object} options - Shutdown options
   * @returns {Promise<void>}
   */
  async gracefulShutdown(options = {}) {
    logger.info("Starting graceful shutdown...");

    try {
      // Stop lifecycle management
      if (this.enableLifecycleManagement) {
        await this.lifecycleManager.gracefulShutdown(options);
      }

      // Stop health monitoring
      if (this.enableHealthMonitoring) {
        this.healthMonitor.stopMonitoring();
      }

      // Stop metrics collection
      if (this.enableMetricsCollection) {
        this.metrics.stopMetricsCollection();
      }

      // Shutdown lazy loader
      if (this.enableLazyLoading) {
        await this.lazyLoader.shutdown();
      }

      logger.info("Graceful shutdown completed");
    } catch (error) {
      logger.error("Graceful shutdown failed:", error.message);
      throw error;
    }
  }

  /**
   * Get modern service management status
   * @returns {Object} Status information
   */
  getModernServiceStatus() {
    return {
      lazyLoading: {
        enabled: this.enableLazyLoading,
        metrics: this.lazyLoader.getMetrics(),
      },
      healthMonitoring: {
        enabled: this.enableHealthMonitoring,
        metrics: this.healthMonitor.getMetrics(),
      },
      metricsCollection: {
        enabled: this.enableMetricsCollection,
        metrics: this.metrics.getAggregatedMetrics(),
      },
      autoDiscovery: {
        enabled: this.enableAutoDiscovery,
        metrics: this.serviceDiscovery.getMetrics(),
      },
      lifecycleManagement: {
        enabled: this.enableLifecycleManagement,
        metrics: this.lifecycleManager.getMetrics(),
      },
    };
  }

  /**
   * Set project context
   * @param {Object} context - Project context
   */
  setProjectContext(context) {
    this.projectContext = { ...this.projectContext, ...context };
    logger.info(`Project context updated:`, this.projectContext);
  }

  /**
   * Get project context
   * @returns {Object} Project context
   */
  getProjectContext() {
    return { ...this.projectContext };
  }

  /**
   * Get project path
   * @returns {string|null} Project path
   */
  getProjectPath() {
    return this.projectContext.projectPath;
  }

  /**
   * Get project ID
   * @returns {string|null} Project ID
   */
  getProjectId() {
    return this.projectContext.projectId;
  }

  /**
   * Get workspace path
   * @returns {string|null} Workspace path
   */
  getWorkspacePath() {
    return this.projectContext.workspacePath;
  }

  /**
   * Auto-detect project path
   * @returns {Promise<string|null>} Project path or null
   */
  async autoDetectProject() {
    try {
      const cwd = process.cwd();
      const files = await fs.readdir(cwd);

      const projectIndicators = [
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "Cargo.toml",
        "composer.json",
        "pom.xml",
        "build.gradle",
        ".git",
        "README.md",
        "src",
        "app",
        "lib",
      ];

      for (const indicator of projectIndicators) {
        if (files.includes(indicator)) {
          return cwd;
        }
      }

      // Check parent directories
      const parentDir = path.dirname(cwd);
      if (parentDir !== cwd) {
        const parentFiles = await fs.readdir(parentDir);
        for (const indicator of projectIndicators) {
          if (parentFiles.includes(indicator)) {
            return parentDir;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error("Auto-detect failed:", error.message);
      return null;
    }
  }

  /**
   * Validate all dependencies for circular dependencies
   * @returns {Object} Validation result
   */
  validateDependencies() {
    const cycles = this.dependencyGraph.detectCircularDependencies();
    const validation = this.dependencyGraph.validateDependencies();

    return {
      hasCircularDependencies: cycles.length > 0,
      circularDependencies: cycles,
      missingDependencies: validation.missingDependencies,
      isValid: cycles.length === 0 && validation.isValid,
    };
  }

  /**
   * Get dependency information for a service
   * @param {string} name - Service name
   * @returns {Object} Dependency information
   */
  getDependencyInfo(name) {
    if (!this.factories.has(name)) {
      return null;
    }

    const { dependencies } = this.factories.get(name);
    const dependents = this.dependencyGraph.getDependents(name);

    return {
      serviceName: name,
      dependencies: Array.from(dependencies),
      dependents: Array.from(dependents),
      dependencyCount: dependencies.length,
      dependentCount: dependents.size,
      isResolved: this.singletons.has(name),
    };
  }

  /**
   * Get all services with their dependency information
   * @returns {Object} All services dependency information
   */
  getAllDependencyInfo() {
    const info = {};

    for (const [name, factory] of this.factories.entries()) {
      info[name] = this.getDependencyInfo(name);
    }

    return info;
  }

  /**
   * Get dependency statistics
   * @returns {Object} Dependency statistics
   */
  getDependencyStats() {
    return this.dependencyGraph.getStats();
  }

  /**
   * Start all services with lifecycle hooks
   * @returns {Promise<Object>} Startup results
   */
  async startAllServices() {
    const results = {
      started: [],
      failed: [],
      skipped: [],
    };

    logger.info("Starting all services with lifecycle hooks...");

    for (const [serviceName, factory] of this.factories.entries()) {
      try {
        const lifecycle = this.lifecycleHooks.get(serviceName);
        const serviceState = this.serviceStates.get(serviceName);

        if (lifecycle && lifecycle.onStart) {
          // Resolve service if not already resolved
          let service = this.singletons.get(serviceName);
          if (!service) {
            service = this.resolve(serviceName);
          }

          // Execute onStart hook
          await lifecycle.onStart(service);

          // Update service state
          serviceState.status = "started";
          serviceState.startTime = new Date();

          results.started.push(serviceName);
          logger.info(`Started service: ${serviceName}`);
        } else {
          results.skipped.push(serviceName);
          logger.debug(`Skipped service (no lifecycle hooks): ${serviceName}`);
        }
      } catch (error) {
        const serviceState = this.serviceStates.get(serviceName);
        serviceState.status = "failed";
        serviceState.errorCount++;
        serviceState.lastError = error.message;

        results.failed.push({
          service: serviceName,
          error: error.message,
        });
        logger.error(`Failed to start service ${serviceName}:`, error.message);
      }
    }

    logger.info(
      `Service startup completed: ${results.started.length} started, ${results.failed.length} failed, ${results.skipped.length} skipped`,
    );
    return results;
  }

  /**
   * Stop all services with lifecycle hooks
   * @returns {Promise<Object>} Shutdown results
   */
  async stopAllServices() {
    const results = {
      stopped: [],
      failed: [],
      skipped: [],
    };

    logger.info("Stopping all services with lifecycle hooks...");

    // Stop services in reverse dependency order
    let sortedServices;
    try {
      sortedServices = this.dependencyGraph.topologicalSort().reverse();
    } catch (error) {
      // In development mode, continue with empty list if topological sort fails
      if (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "test"
      ) {
        logger.warn(
          "Development mode: Continuing shutdown despite topological sort failure",
        );
        sortedServices = [];
      } else {
        throw error;
      }
    }

    for (const serviceName of sortedServices) {
      try {
        const lifecycle = this.lifecycleHooks.get(serviceName);
        const serviceState = this.serviceStates.get(serviceName);

        if (lifecycle && lifecycle.onStop) {
          const service = this.singletons.get(serviceName);
          if (service) {
            // Execute onStop hook
            await lifecycle.onStop(service);

            // Update service state
            serviceState.status = "stopped";
            serviceState.stopTime = new Date();

            results.stopped.push(serviceName);
            logger.info(`Stopped service: ${serviceName}`);
          } else {
            results.skipped.push(serviceName);
            logger.debug(`Skipped service (not instantiated): ${serviceName}`);
          }
        } else {
          results.skipped.push(serviceName);
          logger.debug(`Skipped service (no lifecycle hooks): ${serviceName}`);
        }
      } catch (error) {
        const serviceState = this.serviceStates.get(serviceName);
        serviceState.status = "failed";
        serviceState.errorCount++;
        serviceState.lastError = error.message;

        results.failed.push({
          service: serviceName,
          error: error.message,
        });
        logger.error(`Failed to stop service ${serviceName}:`, error.message);
      }
    }

    logger.info(
      `Service shutdown completed: ${results.stopped.length} stopped, ${results.failed.length} failed, ${results.skipped.length} skipped`,
    );
    return results;
  }

  /**
   * Handle service error with lifecycle hooks
   * @param {string} serviceName - Service name
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   */
  async handleServiceError(serviceName, error) {
    const lifecycle = this.lifecycleHooks.get(serviceName);
    const serviceState = this.serviceStates.get(serviceName);

    serviceState.errorCount++;
    serviceState.lastError = error.message;

    if (lifecycle && lifecycle.onError) {
      try {
        const service = this.singletons.get(serviceName);
        if (service) {
          await lifecycle.onError(service, error);
          logger.info(`Error handled for service: ${serviceName}`);
        }
      } catch (hookError) {
        logger.error(
          `Error in lifecycle hook for service ${serviceName}:`,
          hookError.message,
        );
      }
    }

    logger.error(`Service error for ${serviceName}:`, error.message);
  }

  /**
   * Get service lifecycle information
   * @param {string} serviceName - Service name
   * @returns {Object} Service lifecycle information
   */
  getServiceLifecycleInfo(serviceName) {
    const lifecycle = this.lifecycleHooks.get(serviceName);
    const serviceState = this.serviceStates.get(serviceName);
    const factory = this.factories.get(serviceName);

    return {
      serviceName,
      hasLifecycleHooks: !!lifecycle,
      lifecycleHooks: lifecycle ? Object.keys(lifecycle) : [],
      state: serviceState,
      isResolved: this.singletons.has(serviceName),
      dependencies: factory ? factory.dependencies : [],
    };
  }

  /**
   * Get all services lifecycle information
   * @returns {Object} All services lifecycle information
   */
  getAllLifecycleInfo() {
    const info = {};

    for (const [serviceName, factory] of this.factories.entries()) {
      info[serviceName] = this.getServiceLifecycleInfo(serviceName);
    }

    return info;
  }

  /**
   * Clear all services
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.dependencyGraph.clear();
    this.resolutionStack.clear();
    this.projectContext = {
      projectPath: null,
      projectId: null,
      workspacePath: null,
    };
    logger.info("All services cleared");
  }

  /**
   * Get all registered services
   * @returns {Object} Service registry
   */
  getRegistry() {
    return {
      services: Array.from(this.services.keys()),
      singletons: Array.from(this.singletons.keys()),
      factories: Array.from(this.factories.keys()),
      projectContext: this.projectContext,
    };
  }

  /**
   * Register optimization services
   */
  registerOptimizationServices() {
    // Register QueryOptimizer as singleton
    this.register(
      "queryOptimizer",
      (container) => {
        const databaseConnection = container.resolve("databaseConnection");
        const QueryOptimizer = require("../database/QueryOptimizer");
        return new QueryOptimizer(databaseConnection);
      },
      { singleton: true, dependencies: ["databaseConnection"] },
    );

    // Register IndexManager as singleton
    this.register(
      "indexManager",
      (container) => {
        const databaseConnection = container.resolve("databaseConnection");
        const IndexManager = require("../database/IndexManager");
        return new IndexManager(databaseConnection);
      },
      { singleton: true, dependencies: ["databaseConnection"] },
    );

    // Register PartitionManager as singleton
    this.register(
      "partitionManager",
      (container) => {
        const databaseConnection = container.resolve("databaseConnection");
        const PartitionManager = require("../database/PartitionManager");
        return new PartitionManager(databaseConnection);
      },
      { singleton: true, dependencies: ["databaseConnection"] },
    );

    // Register MaterializedViewManager as singleton
    this.register(
      "materializedViewManager",
      (container) => {
        const databaseConnection = container.resolve("databaseConnection");
        const MaterializedViewManager = require("../database/MaterializedViewManager");
        return new MaterializedViewManager(databaseConnection);
      },
      { singleton: true, dependencies: ["databaseConnection"] },
    );

    // Register PerformanceSchema as singleton
    this.register(
      "performanceSchema",
      (container) => {
        const databaseConnection = container.resolve("databaseConnection");
        const PerformanceSchema = require("../database/PerformanceSchema");
        return new PerformanceSchema(databaseConnection);
      },
      { singleton: true, dependencies: ["databaseConnection"] },
    );

    // Register DatabaseOptimizationService as singleton
    this.register(
      "databaseOptimizationService",
      (container) => {
        const queryOptimizer = container.resolve("queryOptimizer");
        const indexManager = container.resolve("indexManager");
        const partitionManager = container.resolve("partitionManager");
        const materializedViewManager = container.resolve(
          "materializedViewManager",
        );
        const DatabaseOptimizationService = require("../../application/services/DatabaseOptimizationService");
        return new DatabaseOptimizationService(
          queryOptimizer,
          indexManager,
          partitionManager,
          materializedViewManager,
        );
      },
      {
        singleton: true,
        dependencies: [
          "queryOptimizer",
          "indexManager",
          "partitionManager",
          "materializedViewManager",
        ],
      },
    );

    logger.debug("Optimization services registered");
  }
}

// Global singleton instance
let globalContainer = null;

/**
 * Get global service container
 * @returns {ServiceContainer} Global container instance
 */
function getServiceContainer() {
  if (!globalContainer) {
    globalContainer = new ServiceContainer();
  }
  return globalContainer;
}

/**
 * Set global service container
 * @param {ServiceContainer} container - Service container
 */
function setServiceContainer(container) {
  globalContainer = container;
}

module.exports = {
  ServiceContainer,
  getServiceContainer,
  setServiceContainer,
};
