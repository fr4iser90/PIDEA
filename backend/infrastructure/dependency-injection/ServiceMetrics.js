/**
 * ServiceMetrics - Service-level performance metrics collection
 * Provides comprehensive metrics collection for service performance,
 * initialization times, memory usage, and operational statistics
 */
const { EventEmitter } = require("events");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceMetrics extends EventEmitter {
  constructor(options = {}) {
    super();

    this.logger = options.logger || new ServiceLogger("ServiceMetrics");

    // Configuration options
    this.enableMetrics = options.enableMetrics !== false;
    this.enableRealTimeMetrics = options.enableRealTimeMetrics !== false;
    this.metricsRetention = options.metricsRetention || 86400000; // 24 hours
    this.maxMetricsHistory = options.maxMetricsHistory || 10000;
    this.collectionInterval = options.collectionInterval || 10000; // 10 seconds

    // Metrics storage
    this.serviceMetrics = new Map(); // Per-service metrics
    this.initializationMetrics = new Map(); // Service initialization metrics
    this.performanceMetrics = new Map(); // Performance metrics
    this.memoryMetrics = new Map(); // Memory usage metrics
    this.operationalMetrics = new Map(); // Operational metrics

    // Aggregated metrics
    this.aggregatedMetrics = {
      totalServices: 0,
      initializedServices: 0,
      failedInitializations: 0,
      averageInitializationTime: 0,
      totalInitializationTime: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastUpdated: Date.now(),
    };

    // Real-time metrics
    this.realTimeMetrics = {
      activeServices: 0,
      servicesPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUtilization: 0,
      cpuUtilization: 0,
      throughput: 0,
    };

    // Metrics collection interval
    this.collectionIntervalId = null;
    this.isCollecting = false;

    // Start metrics collection if enabled
    if (this.enableMetrics) {
      this.startMetricsCollection();
    }

    this.logger.info("ServiceMetrics initialized");
  }

  /**
   * Record service initialization metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} metrics - Initialization metrics
   */
  recordInitialization(serviceName, metrics) {
    if (!this.enableMetrics) return;

    const initializationData = {
      serviceName,
      startTime: metrics.startTime || Date.now(),
      endTime: metrics.endTime || Date.now(),
      duration: metrics.duration || 0,
      success: metrics.success !== false,
      error: metrics.error || null,
      memoryBefore: metrics.memoryBefore || 0,
      memoryAfter: metrics.memoryAfter || 0,
      memoryDelta: metrics.memoryDelta || 0,
      dependencies: metrics.dependencies || [],
      metadata: metrics.metadata || {},
      timestamp: new Date(),
    };

    this.initializationMetrics.set(serviceName, initializationData);

    // Update aggregated metrics
    this.updateAggregatedMetrics(initializationData);

    this.logger.debug(`Recorded initialization metrics for ${serviceName}: ${initializationData.duration}ms`);
    this.emit("initializationRecorded", initializationData);
  }

  /**
   * Record service performance metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} metrics - Performance metrics
   */
  recordPerformance(serviceName, metrics) {
    if (!this.enableMetrics) return;

    const performanceData = {
      serviceName,
      operation: metrics.operation || "unknown",
      startTime: metrics.startTime || Date.now(),
      endTime: metrics.endTime || Date.now(),
      duration: metrics.duration || 0,
      success: metrics.success !== false,
      error: metrics.error || null,
      memoryUsage: metrics.memoryUsage || 0,
      cpuUsage: metrics.cpuUsage || 0,
      throughput: metrics.throughput || 0,
      metadata: metrics.metadata || {},
      timestamp: new Date(),
    };

    // Store performance data
    if (!this.performanceMetrics.has(serviceName)) {
      this.performanceMetrics.set(serviceName, []);
    }

    const servicePerformance = this.performanceMetrics.get(serviceName);
    servicePerformance.push(performanceData);

    // Keep only recent entries
    if (servicePerformance.length > this.maxMetricsHistory) {
      servicePerformance.shift();
    }

    // Update service metrics
    this.updateServiceMetrics(serviceName, performanceData);

    this.logger.debug(`Recorded performance metrics for ${serviceName}: ${performanceData.duration}ms`);
    this.emit("performanceRecorded", performanceData);
  }

  /**
   * Record memory usage metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} metrics - Memory metrics
   */
  recordMemoryUsage(serviceName, metrics) {
    if (!this.enableMetrics) return;

    const memoryData = {
      serviceName,
      heapUsed: metrics.heapUsed || 0,
      heapTotal: metrics.heapTotal || 0,
      external: metrics.external || 0,
      rss: metrics.rss || 0,
      timestamp: new Date(),
    };

    this.memoryMetrics.set(serviceName, memoryData);

    // Update aggregated metrics
    this.updateMemoryMetrics(memoryData);

    this.logger.debug(`Recorded memory usage for ${serviceName}: ${memoryData.heapUsed}MB`);
    this.emit("memoryUsageRecorded", memoryData);
  }

  /**
   * Record operational metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} metrics - Operational metrics
   */
  recordOperation(serviceName, metrics) {
    if (!this.enableMetrics) return;

    const operationData = {
      serviceName,
      operation: metrics.operation || "unknown",
      success: metrics.success !== false,
      error: metrics.error || null,
      duration: metrics.duration || 0,
      timestamp: new Date(),
    };

    // Store operational data
    if (!this.operationalMetrics.has(serviceName)) {
      this.operationalMetrics.set(serviceName, []);
    }

    const serviceOperations = this.operationalMetrics.get(serviceName);
    serviceOperations.push(operationData);

    // Keep only recent entries
    if (serviceOperations.length > this.maxMetricsHistory) {
      serviceOperations.shift();
    }

    // Update aggregated metrics
    this.updateOperationalMetrics(operationData);

    this.logger.debug(`Recorded operation for ${serviceName}: ${operationData.operation}`);
    this.emit("operationRecorded", operationData);
  }

  /**
   * Update aggregated metrics
   * @param {Object} initializationData - Initialization data
   */
  updateAggregatedMetrics(initializationData) {
    this.aggregatedMetrics.totalServices++;
    this.aggregatedMetrics.totalInitializationTime += initializationData.duration;

    if (initializationData.success) {
      this.aggregatedMetrics.initializedServices++;
    } else {
      this.aggregatedMetrics.failedInitializations++;
    }

    this.aggregatedMetrics.averageInitializationTime = 
      this.aggregatedMetrics.totalInitializationTime / this.aggregatedMetrics.totalServices;
    this.aggregatedMetrics.lastUpdated = Date.now();
  }

  /**
   * Update service metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} performanceData - Performance data
   */
  updateServiceMetrics(serviceName, performanceData) {
    if (!this.serviceMetrics.has(serviceName)) {
      this.serviceMetrics.set(serviceName, {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        peakDuration: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        lastOperation: null,
        firstOperation: null,
      });
    }

    const serviceMetric = this.serviceMetrics.get(serviceName);
    serviceMetric.totalOperations++;
    serviceMetric.totalDuration += performanceData.duration;
    serviceMetric.averageDuration = serviceMetric.totalDuration / serviceMetric.totalOperations;
    serviceMetric.peakDuration = Math.max(serviceMetric.peakDuration, performanceData.duration);
    serviceMetric.peakMemoryUsage = Math.max(serviceMetric.peakMemoryUsage, performanceData.memoryUsage);
    serviceMetric.lastOperation = performanceData.timestamp;

    if (!serviceMetric.firstOperation) {
      serviceMetric.firstOperation = performanceData.timestamp;
    }

    if (performanceData.success) {
      serviceMetric.successfulOperations++;
    } else {
      serviceMetric.failedOperations++;
    }
  }

  /**
   * Update memory metrics
   * @param {Object} memoryData - Memory data
   */
  updateMemoryMetrics(memoryData) {
    this.aggregatedMetrics.averageMemoryUsage = 
      (this.aggregatedMetrics.averageMemoryUsage + memoryData.heapUsed) / 2;
    this.aggregatedMetrics.peakMemoryUsage = 
      Math.max(this.aggregatedMetrics.peakMemoryUsage, memoryData.heapUsed);
  }

  /**
   * Update operational metrics
   * @param {Object} operationData - Operation data
   */
  updateOperationalMetrics(operationData) {
    this.aggregatedMetrics.totalOperations++;

    if (operationData.success) {
      this.aggregatedMetrics.successfulOperations++;
    } else {
      this.aggregatedMetrics.failedOperations++;
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (!this.enableMetrics) {
      throw new Error("Metrics collection is disabled. Enable it first with setMetricsCollection(true)");
    }

    if (this.isCollecting) {
      this.logger.warn("Metrics collection already started");
      return;
    }

    this.isCollecting = true;

    // Start periodic metrics collection
    this.collectionIntervalId = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.collectionInterval);

    this.logger.info("Metrics collection started");
    this.emit("metricsCollectionStarted");
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (!this.isCollecting) {
      this.logger.warn("Metrics collection not started");
      return;
    }

    this.isCollecting = false;

    if (this.collectionIntervalId) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }

    this.logger.info("Metrics collection stopped");
    this.emit("metricsCollectionStopped");
  }

  /**
   * Collect real-time metrics
   */
  collectRealTimeMetrics() {
    if (!this.enableRealTimeMetrics) return;

    // Calculate real-time metrics
    this.realTimeMetrics.activeServices = this.serviceMetrics.size;
    this.realTimeMetrics.errorRate = this.aggregatedMetrics.totalOperations > 0 
      ? (this.aggregatedMetrics.failedOperations / this.aggregatedMetrics.totalOperations) * 100 
      : 0;

    // Calculate throughput (operations per second)
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    let operationsInLastSecond = 0;
    for (const operations of this.operationalMetrics.values()) {
      operationsInLastSecond += operations.filter(op => op.timestamp.getTime() > oneSecondAgo).length;
    }
    
    this.realTimeMetrics.throughput = operationsInLastSecond;
    this.realTimeMetrics.servicesPerSecond = operationsInLastSecond / Math.max(this.serviceMetrics.size, 1);

    // Calculate average response time
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    for (const serviceMetric of this.serviceMetrics.values()) {
      if (serviceMetric.averageDuration > 0) {
        totalResponseTime += serviceMetric.averageDuration;
        responseTimeCount++;
      }
    }
    
    this.realTimeMetrics.averageResponseTime = responseTimeCount > 0 
      ? totalResponseTime / responseTimeCount 
      : 0;

    this.emit("realTimeMetricsUpdated", this.realTimeMetrics);
  }

  /**
   * Get metrics for a specific service
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service metrics
   */
  getServiceMetrics(serviceName) {
    const serviceMetric = this.serviceMetrics.get(serviceName) || {};
    const initializationMetric = this.initializationMetrics.get(serviceName);
    const memoryMetric = this.memoryMetrics.get(serviceName);
    const performanceHistory = this.performanceMetrics.get(serviceName) || [];
    const operationHistory = this.operationalMetrics.get(serviceName) || [];

    return {
      serviceName,
      metrics: serviceMetric,
      initialization: initializationMetric,
      memory: memoryMetric,
      performanceHistory: performanceHistory.slice(-100), // Last 100 entries
      operationHistory: operationHistory.slice(-100), // Last 100 entries
    };
  }

  /**
   * Get all service metrics
   * @returns {Object} All service metrics
   */
  getAllServiceMetrics() {
    const allMetrics = {};
    
    for (const serviceName of this.serviceMetrics.keys()) {
      allMetrics[serviceName] = this.getServiceMetrics(serviceName);
    }

    return allMetrics;
  }

  /**
   * Get aggregated metrics
   * @returns {Object} Aggregated metrics
   */
  getAggregatedMetrics() {
    return {
      ...this.aggregatedMetrics,
      successRate: this.aggregatedMetrics.totalOperations > 0 
        ? (this.aggregatedMetrics.successfulOperations / this.aggregatedMetrics.totalOperations) * 100 
        : 0,
      failureRate: this.aggregatedMetrics.totalOperations > 0 
        ? (this.aggregatedMetrics.failedOperations / this.aggregatedMetrics.totalOperations) * 100 
        : 0,
      initializationSuccessRate: this.aggregatedMetrics.totalServices > 0 
        ? (this.aggregatedMetrics.initializedServices / this.aggregatedMetrics.totalServices) * 100 
        : 0,
    };
  }

  /**
   * Get real-time metrics
   * @returns {Object} Real-time metrics
   */
  getRealTimeMetrics() {
    return { ...this.realTimeMetrics };
  }

  /**
   * Get performance summary
   * @param {string} serviceName - Optional service name filter
   * @returns {Object} Performance summary
   */
  getPerformanceSummary(serviceName = null) {
    if (serviceName) {
      return this.getServiceMetrics(serviceName);
    }

    return {
      aggregated: this.getAggregatedMetrics(),
      realTime: this.getRealTimeMetrics(),
      services: this.getAllServiceMetrics(),
    };
  }

  /**
   * Export metrics data
   * @param {Object} options - Export options
   * @returns {Object} Exported metrics data
   */
  exportMetrics(options = {}) {
    const {
      includeHistory = false,
      includeRealTime = true,
      includeAggregated = true,
      serviceFilter = null,
    } = options;

    const exportData = {
      timestamp: new Date(),
      version: "1.0",
      metadata: {
        totalServices: this.serviceMetrics.size,
        collectionEnabled: this.enableMetrics,
        realTimeEnabled: this.enableRealTimeMetrics,
      },
    };

    if (includeAggregated) {
      exportData.aggregated = this.getAggregatedMetrics();
    }

    if (includeRealTime) {
      exportData.realTime = this.getRealTimeMetrics();
    }

    if (includeHistory) {
      exportData.services = serviceFilter 
        ? { [serviceFilter]: this.getServiceMetrics(serviceFilter) }
        : this.getAllServiceMetrics();
    }

    return exportData;
  }

  /**
   * Clear metrics data
   * @param {string} serviceName - Optional specific service to clear
   */
  clearMetrics(serviceName = null) {
    if (serviceName) {
      this.serviceMetrics.delete(serviceName);
      this.initializationMetrics.delete(serviceName);
      this.performanceMetrics.delete(serviceName);
      this.memoryMetrics.delete(serviceName);
      this.operationalMetrics.delete(serviceName);
      this.logger.debug(`Cleared metrics for service: ${serviceName}`);
    } else {
      this.serviceMetrics.clear();
      this.initializationMetrics.clear();
      this.performanceMetrics.clear();
      this.memoryMetrics.clear();
      this.operationalMetrics.clear();
      this.logger.info("Cleared all metrics data");
    }

    this.emit("metricsCleared", { serviceName });
  }

  /**
   * Shutdown metrics collection
   */
  async shutdown() {
    this.logger.info("Shutting down ServiceMetrics...");

    this.stopMetricsCollection();

    // Clear all data
    this.serviceMetrics.clear();
    this.initializationMetrics.clear();
    this.performanceMetrics.clear();
    this.memoryMetrics.clear();
    this.operationalMetrics.clear();

    this.logger.info("ServiceMetrics shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = ServiceMetrics;
