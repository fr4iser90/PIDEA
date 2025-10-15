/**
 * ServiceLifecycleManager - Centralized lifecycle management for services
 * Provides comprehensive lifecycle management with state transitions,
 * error handling, and recovery mechanisms
 */
const { EventEmitter } = require("events");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceLifecycleManager extends EventEmitter {
  constructor(serviceContainer, options = {}) {
    super();

    this.container = serviceContainer;
    this.logger = options.logger || new ServiceLogger("ServiceLifecycleManager");

    // Configuration options
    this.enableLifecycleManagement = options.enableLifecycleManagement !== false;
    this.enableStateTransitions = options.enableStateTransitions !== false;
    this.enableErrorRecovery = options.enableErrorRecovery !== false;
    this.maxRetryAttempts = options.maxRetryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    this.shutdownTimeout = options.shutdownTimeout || 30000; // 30 seconds

    // Lifecycle state
    this.serviceStates = new Map(); // Service state tracking
    this.lifecycleHooks = new Map(); // Lifecycle hooks
    this.stateTransitions = new Map(); // State transition history
    this.isShuttingDown = false;

    // Lifecycle states
    this.states = {
      UNINITIALIZED: "uninitialized",
      INITIALIZING: "initializing",
      INITIALIZED: "initialized",
      STARTING: "starting",
      STARTED: "started",
      RUNNING: "running",
      STOPPING: "stopping",
      STOPPED: "stopped",
      FAILED: "failed",
      DESTROYED: "destroyed",
    };

    // Valid state transitions
    this.validTransitions = {
      [this.states.UNINITIALIZED]: [this.states.INITIALIZING],
      [this.states.INITIALIZING]: [this.states.INITIALIZED, this.states.FAILED],
      [this.states.INITIALIZED]: [this.states.STARTING],
      [this.states.STARTING]: [this.states.STARTED, this.states.FAILED],
      [this.states.STARTED]: [this.states.RUNNING, this.states.STOPPING],
      [this.states.RUNNING]: [this.states.STOPPING],
      [this.states.STOPPING]: [this.states.STOPPED, this.states.FAILED],
      [this.states.STOPPED]: [this.states.DESTROYED],
      [this.states.FAILED]: [this.states.INITIALIZING, this.states.DESTROYED],
      [this.states.DESTROYED]: [],
    };

    // Lifecycle metrics
    this.metrics = {
      totalServices: 0,
      initializedServices: 0,
      startedServices: 0,
      stoppedServices: 0,
      failedServices: 0,
      destroyedServices: 0,
      stateTransitions: 0,
      lifecycleErrors: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
    };

    this.logger.info("ServiceLifecycleManager initialized");
  }

  /**
   * Register a service for lifecycle management
   * @param {string} serviceName - Name of the service
   * @param {Object} lifecycleHooks - Lifecycle hooks
   * @param {Object} options - Lifecycle options
   */
  registerService(serviceName, lifecycleHooks = {}, options = {}) {
    if (!this.enableLifecycleManagement) {
      throw new Error(`Lifecycle management is disabled. Enable it first with setLifecycleManagement(true)`);
    }

    const lifecycleConfig = {
      hooks: lifecycleHooks,
      autoStart: options.autoStart !== false,
      autoStop: options.autoStop !== false,
      retryOnFailure: options.retryOnFailure !== false,
      critical: options.critical !== false,
      dependencies: options.dependencies || [],
      metadata: options.metadata || {},
      registeredAt: Date.now(),
    };

    this.lifecycleHooks.set(serviceName, lifecycleConfig);

    // Initialize service state
    this.serviceStates.set(serviceName, {
      currentState: this.states.UNINITIALIZED,
      previousState: null,
      stateHistory: [],
      lastTransition: null,
      errorCount: 0,
      lastError: null,
      startTime: null,
      stopTime: null,
      metadata: lifecycleConfig.metadata,
    });

    this.metrics.totalServices++;

    this.logger.debug(`Registered service for lifecycle management: ${serviceName}`);
    this.emit("serviceRegistered", { serviceName, config: lifecycleConfig });

    return this;
  }

  /**
   * Initialize a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initializeService(serviceName, options = {}) {
    const startTime = Date.now();

    try {
      // Validate service is registered
      if (!this.lifecycleHooks.has(serviceName)) {
        throw new Error(`Service ${serviceName} not registered for lifecycle management`);
      }

      // Check current state
      const currentState = this.getServiceState(serviceName);
      if (currentState !== this.states.UNINITIALIZED) {
        throw new Error(`Service ${serviceName} is not in uninitialized state (current: ${currentState})`);
      }

      // Transition to initializing
      await this.transitionState(serviceName, this.states.INITIALIZING);

      // Execute initialization hook
      const lifecycleConfig = this.lifecycleHooks.get(serviceName);
      if (lifecycleConfig.hooks.onInitialize) {
        await lifecycleConfig.hooks.onInitialize();
        this.logger.debug(`Executed onInitialize hook for: ${serviceName}`);
      }

      // Transition to initialized
      await this.transitionState(serviceName, this.states.INITIALIZED);

      this.metrics.initializedServices++;

      const duration = Date.now() - startTime;
      this.logger.debug(`Service ${serviceName} initialized in ${duration}ms`);
      this.emit("serviceInitialized", { serviceName, duration });

    } catch (error) {
      await this.handleLifecycleError(serviceName, error, "initialization");
      throw error;
    }
  }

  /**
   * Start a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Start options
   * @returns {Promise<void>}
   */
  async startService(serviceName, options = {}) {
    const startTime = Date.now();

    try {
      // Validate service is registered
      if (!this.lifecycleHooks.has(serviceName)) {
        throw new Error(`Service ${serviceName} not registered for lifecycle management`);
      }

      // Check current state
      const currentState = this.getServiceState(serviceName);
      if (currentState !== this.states.INITIALIZED) {
        throw new Error(`Service ${serviceName} is not in initialized state (current: ${currentState})`);
      }

      // Transition to starting
      await this.transitionState(serviceName, this.states.STARTING);

      // Execute start hook
      const lifecycleConfig = this.lifecycleHooks.get(serviceName);
      if (lifecycleConfig.hooks.onStart) {
        await lifecycleConfig.hooks.onStart();
        this.logger.debug(`Executed onStart hook for: ${serviceName}`);
      }

      // Transition to started
      await this.transitionState(serviceName, this.states.STARTED);

      // Auto-transition to running if no specific running hook
      if (!lifecycleConfig.hooks.onRunning) {
        await this.transitionState(serviceName, this.states.RUNNING);
      }

      this.metrics.startedServices++;

      const duration = Date.now() - startTime;
      this.logger.debug(`Service ${serviceName} started in ${duration}ms`);
      this.emit("serviceStarted", { serviceName, duration });

    } catch (error) {
      await this.handleLifecycleError(serviceName, error, "start");
      throw error;
    }
  }

  /**
   * Stop a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Stop options
   * @returns {Promise<void>}
   */
  async stopService(serviceName, options = {}) {
    const startTime = Date.now();

    try {
      // Validate service is registered
      if (!this.lifecycleHooks.has(serviceName)) {
        throw new Error(`Service ${serviceName} not registered for lifecycle management`);
      }

      // Check current state
      const currentState = this.getServiceState(serviceName);
      if (![this.states.STARTED, this.states.RUNNING].includes(currentState)) {
        throw new Error(`Service ${serviceName} is not in a startable state (current: ${currentState})`);
      }

      // Transition to stopping
      await this.transitionState(serviceName, this.states.STOPPING);

      // Execute stop hook
      const lifecycleConfig = this.lifecycleHooks.get(serviceName);
      if (lifecycleConfig.hooks.onStop) {
        await lifecycleConfig.hooks.onStop();
        this.logger.debug(`Executed onStop hook for: ${serviceName}`);
      }

      // Transition to stopped
      await this.transitionState(serviceName, this.states.STOPPED);

      this.metrics.stoppedServices++;

      const duration = Date.now() - startTime;
      this.logger.debug(`Service ${serviceName} stopped in ${duration}ms`);
      this.emit("serviceStopped", { serviceName, duration });

    } catch (error) {
      await this.handleLifecycleError(serviceName, error, "stop");
      throw error;
    }
  }

  /**
   * Destroy a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Destroy options
   * @returns {Promise<void>}
   */
  async destroyService(serviceName, options = {}) {
    const startTime = Date.now();

    try {
      // Validate service is registered
      if (!this.lifecycleHooks.has(serviceName)) {
        throw new Error(`Service ${serviceName} not registered for lifecycle management`);
      }

      // Stop service first if it's running
      const currentState = this.getServiceState(serviceName);
      if ([this.states.STARTED, this.states.RUNNING].includes(currentState)) {
        await this.stopService(serviceName);
      }

      // Execute destroy hook
      const lifecycleConfig = this.lifecycleHooks.get(serviceName);
      if (lifecycleConfig.hooks.onDestroy) {
        await lifecycleConfig.hooks.onDestroy();
        this.logger.debug(`Executed onDestroy hook for: ${serviceName}`);
      }

      // Transition to destroyed
      await this.transitionState(serviceName, this.states.DESTROYED);

      this.metrics.destroyedServices++;

      const duration = Date.now() - startTime;
      this.logger.debug(`Service ${serviceName} destroyed in ${duration}ms`);
      this.emit("serviceDestroyed", { serviceName, duration });

    } catch (error) {
      await this.handleLifecycleError(serviceName, error, "destroy");
      throw error;
    }
  }

  /**
   * Transition service to a new state
   * @param {string} serviceName - Name of the service
   * @param {string} newState - New state
   * @returns {Promise<void>}
   */
  async transitionState(serviceName, newState) {
    if (!this.enableStateTransitions) {
      throw new Error(`State transitions are disabled. Enable them first with setStateTransitions(true)`);
    }

    const currentState = this.getServiceState(serviceName);

    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      throw new Error(`Invalid state transition from ${currentState} to ${newState} for service ${serviceName}`);
    }

    // Update state
    const serviceState = this.serviceStates.get(serviceName);
    serviceState.previousState = serviceState.currentState;
    serviceState.currentState = newState;
    serviceState.lastTransition = new Date();

    // Add to state history
    serviceState.stateHistory.push({
      from: serviceState.previousState,
      to: newState,
      timestamp: new Date(),
    });

    // Keep only last 50 transitions
    if (serviceState.stateHistory.length > 50) {
      serviceState.stateHistory.shift();
    }

    this.metrics.stateTransitions++;

    this.logger.debug(`Service ${serviceName} transitioned from ${serviceState.previousState} to ${newState}`);
    this.emit("stateTransitioned", { serviceName, from: serviceState.previousState, to: newState });
  }

  /**
   * Check if state transition is valid
   * @param {string} fromState - Current state
   * @param {string} toState - Target state
   * @returns {boolean} True if transition is valid
   */
  isValidTransition(fromState, toState) {
    const validTransitions = this.validTransitions[fromState] || [];
    return validTransitions.includes(toState);
  }

  /**
   * Handle lifecycle errors
   * @param {string} serviceName - Name of the service
   * @param {Error} error - Error that occurred
   * @param {string} operation - Operation that failed
   * @returns {Promise<void>}
   */
  async handleLifecycleError(serviceName, error, operation) {
    this.metrics.lifecycleErrors++;

    // Update service state
    const serviceState = this.serviceStates.get(serviceName);
    serviceState.errorCount++;
    serviceState.lastError = {
      error: error.message,
      operation,
      timestamp: new Date(),
    };

    // Transition to failed state
    await this.transitionState(serviceName, this.states.FAILED);

    this.metrics.failedServices++;

    this.logger.error(`Lifecycle error for service ${serviceName} during ${operation}:`, error.message);
    this.emit("lifecycleError", { serviceName, error, operation });

    // Attempt recovery if enabled
    if (this.enableErrorRecovery) {
      await this.attemptRecovery(serviceName, error, operation);
    }
  }

  /**
   * Attempt to recover from lifecycle error
   * @param {string} serviceName - Name of the service
   * @param {Error} error - Error that occurred
   * @param {string} operation - Operation that failed
   * @returns {Promise<void>}
   */
  async attemptRecovery(serviceName, error, operation) {
    const lifecycleConfig = this.lifecycleHooks.get(serviceName);
    
    if (!lifecycleConfig.retryOnFailure) {
      this.logger.debug(`Recovery disabled for service: ${serviceName}`);
      return;
    }

    this.metrics.recoveryAttempts++;

    try {
      this.logger.info(`Attempting recovery for service: ${serviceName}`);

      // Execute recovery hook if available
      if (lifecycleConfig.hooks.onRecovery) {
        await lifecycleConfig.hooks.onRecovery(error, operation);
      }

      // Reset to uninitialized state for retry
      await this.transitionState(serviceName, this.states.UNINITIALIZED);

      this.metrics.successfulRecoveries++;
      this.logger.info(`Recovery successful for service: ${serviceName}`);
      this.emit("serviceRecovered", { serviceName, error, operation });

    } catch (recoveryError) {
      this.logger.error(`Recovery failed for service ${serviceName}:`, recoveryError.message);
      this.emit("recoveryFailed", { serviceName, error, recoveryError });
    }
  }

  /**
   * Get service state
   * @param {string} serviceName - Name of the service
   * @returns {string} Current state
   */
  getServiceState(serviceName) {
    const serviceState = this.serviceStates.get(serviceName);
    return serviceState ? serviceState.currentState : this.states.UNINITIALIZED;
  }

  /**
   * Get service state information
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service state information
   */
  getServiceStateInfo(serviceName) {
    return this.serviceStates.get(serviceName) || null;
  }

  /**
   * Get all service states
   * @returns {Object} All service states
   */
  getAllServiceStates() {
    const states = {};
    for (const [serviceName, state] of this.serviceStates) {
      states[serviceName] = state;
    }
    return states;
  }

  /**
   * Start all services
   * @param {Object} options - Start options
   * @returns {Promise<Object>} Start results
   */
  async startAllServices(options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: 0,
    };

    this.logger.info("Starting all services...");

    for (const serviceName of this.lifecycleHooks.keys()) {
      try {
        results.total++;
        await this.startService(serviceName, options);
        results.successful.push(serviceName);
      } catch (error) {
        results.failed.push({ serviceName, error: error.message });
      }
    }

    this.logger.info(`Started ${results.successful.length} services, ${results.failed.length} failed`);
    this.emit("allServicesStarted", results);

    return results;
  }

  /**
   * Stop all services
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Stop results
   */
  async stopAllServices(options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: 0,
    };

    this.logger.info("Stopping all services...");

    for (const serviceName of this.lifecycleHooks.keys()) {
      try {
        results.total++;
        await this.stopService(serviceName, options);
        results.successful.push(serviceName);
      } catch (error) {
        results.failed.push({ serviceName, error: error.message });
      }
    }

    this.logger.info(`Stopped ${results.successful.length} services, ${results.failed.length} failed`);
    this.emit("allServicesStopped", results);

    return results;
  }

  /**
   * Graceful shutdown of all services
   * @param {Object} options - Shutdown options
   * @returns {Promise<void>}
   */
  async gracefulShutdown(options = {}) {
    if (this.isShuttingDown) {
      this.logger.warn("Graceful shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    this.logger.info("Starting graceful shutdown...");

    try {
      // Stop all services
      await this.stopAllServices(options);

      // Destroy all services
      for (const serviceName of this.lifecycleHooks.keys()) {
        try {
          await this.destroyService(serviceName, options);
        } catch (error) {
          this.logger.warn(`Failed to destroy service ${serviceName}:`, error.message);
        }
      }

      this.logger.info("Graceful shutdown completed");
      this.emit("gracefulShutdownCompleted");

    } catch (error) {
      this.logger.error("Graceful shutdown failed:", error.message);
      this.emit("gracefulShutdownFailed", error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Get lifecycle metrics
   * @returns {Object} Lifecycle metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalServices > 0 
        ? ((this.metrics.totalServices - this.metrics.failedServices) / this.metrics.totalServices) * 100 
        : 0,
      recoveryRate: this.metrics.recoveryAttempts > 0 
        ? (this.metrics.successfulRecoveries / this.metrics.recoveryAttempts) * 100 
        : 0,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Shutdown lifecycle manager
   */
  async shutdown() {
    this.logger.info("Shutting down ServiceLifecycleManager...");

    // Clear all data
    this.serviceStates.clear();
    this.lifecycleHooks.clear();
    this.stateTransitions.clear();

    this.logger.info("ServiceLifecycleManager shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = ServiceLifecycleManager;
