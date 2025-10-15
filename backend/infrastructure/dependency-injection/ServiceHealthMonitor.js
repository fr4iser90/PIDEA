/**
 * ServiceHealthMonitor - Generic service health monitoring system
 * Provides comprehensive health monitoring for all registered services
 * with real-time status tracking and health check execution
 */
const { EventEmitter } = require("events");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceHealthMonitor extends EventEmitter {
  constructor(serviceContainer, options = {}) {
    super();

    this.container = serviceContainer;
    this.logger = options.logger || new ServiceLogger("ServiceHealthMonitor");

    // Configuration options
    this.enableHealthMonitoring = options.enableHealthMonitoring !== false;
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.healthCheckTimeout = options.healthCheckTimeout || 5000; // 5 seconds
    this.enableRealTimeMonitoring = options.enableRealTimeMonitoring !== false;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second

    // Health monitoring state
    this.serviceHealth = new Map(); // Service health status
    this.healthChecks = new Map(); // Health check functions
    this.healthHistory = new Map(); // Health check history
    this.monitoringInterval = null;
    this.isMonitoring = false;

    // Health metrics
    this.metrics = {
      totalHealthChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageCheckTime: 0,
      lastCheckTime: null,
      servicesMonitored: 0,
      criticalFailures: 0,
    };

    // Health status levels
    this.healthStatus = {
      HEALTHY: "healthy",
      UNHEALTHY: "unhealthy",
      DEGRADED: "degraded",
      UNKNOWN: "unknown",
      STARTING: "starting",
      STOPPING: "stopping",
    };

    this.logger.info("ServiceHealthMonitor initialized");
  }

  /**
   * Register a health check for a service
   * @param {string} serviceName - Name of the service
   * @param {Function} healthCheck - Health check function
   * @param {Object} options - Health check options
   */
  registerHealthCheck(serviceName, healthCheck, options = {}) {
    if (!this.enableHealthMonitoring) {
      throw new Error(`Health monitoring is disabled. Enable it first with setHealthMonitoring(true)`);
    }

    const healthCheckConfig = {
      function: healthCheck,
      timeout: options.timeout || this.healthCheckTimeout,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      retryDelay: options.retryDelay || this.retryDelay,
      critical: options.critical !== false,
      metadata: options.metadata || {},
      registeredAt: Date.now(),
    };

    this.healthChecks.set(serviceName, healthCheckConfig);

    // Initialize health status
    this.serviceHealth.set(serviceName, {
      status: this.healthStatus.UNKNOWN,
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      totalFailures: 0,
      averageResponseTime: 0,
      metadata: healthCheckConfig.metadata,
    });

    this.logger.debug(`Registered health check for service: ${serviceName}`);
    this.emit("healthCheckRegistered", { serviceName, options });

    return this;
  }

  /**
   * Execute health check for a specific service
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Health check result
   */
  async checkServiceHealth(serviceName) {
    const startTime = Date.now();

    try {
      const healthCheckConfig = this.healthChecks.get(serviceName);
      if (!healthCheckConfig) {
        throw new Error(`No health check registered for service: ${serviceName}`);
      }

      // Execute health check with timeout
      const result = await this.executeHealthCheck(serviceName, healthCheckConfig);
      const responseTime = Date.now() - startTime;

      // Update health status
      this.updateServiceHealth(serviceName, {
        status: this.healthStatus.HEALTHY,
        lastCheck: new Date(),
        lastSuccess: new Date(),
        consecutiveFailures: 0,
        totalChecks: (this.serviceHealth.get(serviceName)?.totalChecks || 0) + 1,
        averageResponseTime: this.calculateAverageResponseTime(serviceName, responseTime),
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      this.logger.debug(`Health check passed for ${serviceName} in ${responseTime}ms`);
      this.emit("healthCheckPassed", { serviceName, responseTime, result });

      return {
        serviceName,
        status: this.healthStatus.HEALTHY,
        responseTime,
        result,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update health status
      this.updateServiceHealth(serviceName, {
        status: this.healthStatus.UNHEALTHY,
        lastCheck: new Date(),
        lastFailure: new Date(),
        consecutiveFailures: (this.serviceHealth.get(serviceName)?.consecutiveFailures || 0) + 1,
        totalChecks: (this.serviceHealth.get(serviceName)?.totalChecks || 0) + 1,
        totalFailures: (this.serviceHealth.get(serviceName)?.totalFailures || 0) + 1,
        averageResponseTime: this.calculateAverageResponseTime(serviceName, responseTime),
      });

      // Update metrics
      this.updateMetrics(false, responseTime);

      // Check if this is a critical failure
      const healthCheckConfig = this.healthChecks.get(serviceName);
      if (healthCheckConfig && healthCheckConfig.critical) {
        this.metrics.criticalFailures++;
        this.emit("criticalHealthFailure", { serviceName, error });
      }

      this.logger.error(`Health check failed for ${serviceName}:`, error.message);
      this.emit("healthCheckFailed", { serviceName, error, responseTime });

      return {
        serviceName,
        status: this.healthStatus.UNHEALTHY,
        responseTime,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute health check with timeout and retries
   * @param {string} serviceName - Name of the service
   * @param {Object} healthCheckConfig - Health check configuration
   * @returns {Promise<any>} Health check result
   */
  async executeHealthCheck(serviceName, healthCheckConfig) {
    let lastError = null;

    for (let attempt = 1; attempt <= healthCheckConfig.retryAttempts; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Health check timeout")), healthCheckConfig.timeout);
        });

        // Execute health check with timeout
        const result = await Promise.race([
          healthCheckConfig.function(),
          timeoutPromise,
        ]);

        return result;
      } catch (error) {
        lastError = error;
        this.logger.debug(`Health check attempt ${attempt} failed for ${serviceName}:`, error.message);

        // Wait before retry (except for last attempt)
        if (attempt < healthCheckConfig.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, healthCheckConfig.retryDelay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Update service health status
   * @param {string} serviceName - Name of the service
   * @param {Object} updates - Health status updates
   */
  updateServiceHealth(serviceName, updates) {
    const currentHealth = this.serviceHealth.get(serviceName) || {};
    const updatedHealth = { ...currentHealth, ...updates };

    this.serviceHealth.set(serviceName, updatedHealth);

    // Store health history
    this.storeHealthHistory(serviceName, updatedHealth);

    this.emit("healthStatusUpdated", { serviceName, health: updatedHealth });
  }

  /**
   * Store health check history
   * @param {string} serviceName - Name of the service
   * @param {Object} health - Health status
   */
  storeHealthHistory(serviceName, health) {
    if (!this.healthHistory.has(serviceName)) {
      this.healthHistory.set(serviceName, []);
    }

    const history = this.healthHistory.get(serviceName);
    history.push({
      ...health,
      timestamp: new Date(),
    });

    // Keep only last 100 entries per service
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Calculate average response time
   * @param {string} serviceName - Name of the service
   * @param {number} responseTime - Current response time
   * @returns {number} Average response time
   */
  calculateAverageResponseTime(serviceName, responseTime) {
    const currentHealth = this.serviceHealth.get(serviceName);
    if (!currentHealth) return responseTime;

    const currentAverage = currentHealth.averageResponseTime || 0;
    const totalChecks = currentHealth.totalChecks || 1;

    return (currentAverage * (totalChecks - 1) + responseTime) / totalChecks;
  }

  /**
   * Update health monitoring metrics
   * @param {boolean} success - Whether the health check succeeded
   * @param {number} responseTime - Response time in milliseconds
   */
  updateMetrics(success, responseTime) {
    this.metrics.totalHealthChecks++;
    this.metrics.lastCheckTime = new Date();

    if (success) {
      this.metrics.successfulChecks++;
    } else {
      this.metrics.failedChecks++;
    }

    this.metrics.averageCheckTime = 
      (this.metrics.averageCheckTime + responseTime) / 2;
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (!this.enableHealthMonitoring) {
      throw new Error("Health monitoring is disabled. Enable it first with setHealthMonitoring(true)");
    }

    if (this.isMonitoring) {
      this.logger.warn("Health monitoring already started");
      return;
    }

    this.isMonitoring = true;
    this.metrics.servicesMonitored = this.healthChecks.size;

    // Start periodic health checks
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);

    this.logger.info(`Health monitoring started for ${this.healthChecks.size} services`);
    this.emit("monitoringStarted", { servicesCount: this.healthChecks.size });

    // Perform initial health checks
    this.performHealthChecks();
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      this.logger.warn("Health monitoring not started");
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info("Health monitoring stopped");
    this.emit("monitoringStopped");
  }

  /**
   * Perform health checks for all registered services
   * @returns {Promise<Object>} Health check results
   */
  async performHealthChecks() {
    const results = {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      errors: [],
      startTime: Date.now(),
    };

    this.logger.debug(`Performing health checks for ${this.healthChecks.size} services...`);

    // Execute health checks in parallel
    const healthCheckPromises = Array.from(this.healthChecks.keys()).map(async (serviceName) => {
      try {
        const result = await this.checkServiceHealth(serviceName);
        results.total++;
        
        if (result.status === this.healthStatus.HEALTHY) {
          results.healthy++;
        } else {
          results.unhealthy++;
        }

        return result;
      } catch (error) {
        results.errors.push({ serviceName, error: error.message });
        return { serviceName, status: this.healthStatus.UNKNOWN, error: error.message };
      }
    });

    await Promise.all(healthCheckPromises);

    results.duration = Date.now() - results.startTime;

    this.logger.debug(`Health checks completed: ${results.healthy} healthy, ${results.unhealthy} unhealthy in ${results.duration}ms`);
    this.emit("healthChecksCompleted", results);

    return results;
  }

  /**
   * Get health status for a specific service
   * @param {string} serviceName - Name of the service
   * @returns {Object} Health status
   */
  getServiceHealth(serviceName) {
    return this.serviceHealth.get(serviceName) || {
      status: this.healthStatus.UNKNOWN,
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      totalFailures: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Get health status for all services
   * @returns {Object} All services health status
   */
  getAllServicesHealth() {
    const healthStatus = {};
    
    for (const [serviceName, health] of this.serviceHealth) {
      healthStatus[serviceName] = health;
    }

    return healthStatus;
  }

  /**
   * Get health check history for a service
   * @param {string} serviceName - Name of the service
   * @param {number} limit - Maximum number of history entries
   * @returns {Array} Health check history
   */
  getServiceHealthHistory(serviceName, limit = 50) {
    const history = this.healthHistory.get(serviceName) || [];
    return history.slice(-limit);
  }

  /**
   * Get health monitoring metrics
   * @returns {Object} Health monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalHealthChecks > 0 
        ? (this.metrics.successfulChecks / this.metrics.totalHealthChecks) * 100 
        : 0,
      failureRate: this.metrics.totalHealthChecks > 0 
        ? (this.metrics.failedChecks / this.metrics.totalHealthChecks) * 100 
        : 0,
      isMonitoring: this.isMonitoring,
      healthCheckInterval: this.healthCheckInterval,
    };
  }

  /**
   * Get overall system health status
   * @returns {Object} Overall system health
   */
  getOverallHealth() {
    const services = Array.from(this.serviceHealth.values());
    const totalServices = services.length;
    
    if (totalServices === 0) {
      return {
        status: this.healthStatus.UNKNOWN,
        healthyServices: 0,
        unhealthyServices: 0,
        degradedServices: 0,
        unknownServices: 0,
        healthPercentage: 0,
      };
    }

    const healthyServices = services.filter(s => s.status === this.healthStatus.HEALTHY).length;
    const unhealthyServices = services.filter(s => s.status === this.healthStatus.UNHEALTHY).length;
    const degradedServices = services.filter(s => s.status === this.healthStatus.DEGRADED).length;
    const unknownServices = services.filter(s => s.status === this.healthStatus.UNKNOWN).length;

    const healthPercentage = (healthyServices / totalServices) * 100;

    let overallStatus = this.healthStatus.HEALTHY;
    if (unhealthyServices > 0) {
      overallStatus = this.healthStatus.UNHEALTHY;
    } else if (degradedServices > 0 || unknownServices > 0) {
      overallStatus = this.healthStatus.DEGRADED;
    }

    return {
      status: overallStatus,
      healthyServices,
      unhealthyServices,
      degradedServices,
      unknownServices,
      totalServices,
      healthPercentage,
      lastCheck: this.metrics.lastCheckTime,
    };
  }

  /**
   * Unregister health check for a service
   * @param {string} serviceName - Name of the service
   */
  unregisterHealthCheck(serviceName) {
    this.healthChecks.delete(serviceName);
    this.serviceHealth.delete(serviceName);
    this.healthHistory.delete(serviceName);

    this.logger.debug(`Unregistered health check for service: ${serviceName}`);
    this.emit("healthCheckUnregistered", { serviceName });
  }

  /**
   * Shutdown health monitor
   */
  async shutdown() {
    this.logger.info("Shutting down ServiceHealthMonitor...");

    this.stopMonitoring();

    // Clear all data
    this.healthChecks.clear();
    this.serviceHealth.clear();
    this.healthHistory.clear();

    this.logger.info("ServiceHealthMonitor shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = ServiceHealthMonitor;
