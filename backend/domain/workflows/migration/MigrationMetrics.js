/**
 * MigrationMetrics - Migration performance tracking
 * 
 * This class provides comprehensive performance tracking for migration
 * operations, including timing, resource usage, and performance analytics.
 */
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class MigrationMetrics extends EventEmitter {
  /**
   * Create a new migration metrics tracker
   * @param {Object} options - Metrics options
   */
  constructor(options = {}) {
    super();
    
    this.activeCollections = new Map();
    this.metricsHistory = new Map();
    this.performanceData = new Map();
    
    this.options = {
      enableRealTimeMetrics: options.enableRealTimeMetrics !== false,
      enableResourceTracking: options.enableResourceTracking !== false,
      enablePerformanceAlerts: options.enablePerformanceAlerts !== false,
      metricsRetentionDays: options.metricsRetentionDays || 90,
      collectionInterval: options.collectionInterval || 1000, // 1 second
      performanceThresholds: {
        maxExecutionTime: options.maxExecutionTime || 300000, // 5 minutes
        maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
        maxCpuUsage: options.maxCpuUsage || 80, // 80%
        maxDatabaseQueries: options.maxDatabaseQueries || 1000
      },
      ...options
    };
    
    this.collectionTimer = null;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for metrics events
   */
  setupEventHandlers() {
    this.on('metrics:collection:started', (data) => {
      console.log(`Metrics collection started for migration: ${data.migrationId}`);
    });

    this.on('metrics:collection:updated', (data) => {
      if (this.options.enableRealTimeMetrics) {
        console.log(`Metrics updated for migration: ${data.migrationId} - Memory: ${data.memoryUsage}MB`);
      }
    });

    this.on('metrics:collection:completed', (data) => {
      console.log(`Metrics collection completed for migration: ${data.migrationId}`);
    });

    this.on('metrics:performance:alert', (data) => {
      console.warn(`Performance alert for migration: ${data.migrationId} - ${data.alert}`);
    });

    this.on('metrics:threshold:exceeded', (data) => {
      console.error(`Performance threshold exceeded for migration: ${data.migrationId} - ${data.metric}: ${data.value}`);
    });
  }

  /**
   * Initialize metrics tracker
   */
  async initialize() {
    try {
      // Start collection timer if enabled
      if (this.options.enableRealTimeMetrics) {
        this.startCollectionTimer();
      }

      console.log('MigrationMetrics initialized successfully');
      return true;

    } catch (error) {
      console.error('MigrationMetrics initialization failed:', error);
      throw new Error(`Metrics initialization failed: ${error.message}`);
    }
  }

  /**
   * Start metrics collection for migration
   * @param {string} migrationId - Migration ID
   * @returns {boolean} True if collection started successfully
   */
  async startCollection(migrationId) {
    try {
      if (this.activeCollections.has(migrationId)) {
        throw new Error(`Metrics collection already active for migration: ${migrationId}`);
      }

      const collectionData = {
        id: uuidv4(),
        migrationId,
        startTime: new Date(),
        endTime: null,
        metrics: {
          executionTime: 0,
          memoryUsage: [],
          cpuUsage: [],
          databaseQueries: 0,
          databaseQueryTime: 0,
          fileOperations: 0,
          fileOperationTime: 0,
          apiCalls: 0,
          apiCallTime: 0,
          errors: 0,
          warnings: 0
        },
        snapshots: [],
        alerts: [],
        performance: {
          averageMemoryUsage: 0,
          peakMemoryUsage: 0,
          averageCpuUsage: 0,
          peakCpuUsage: 0,
          totalDatabaseQueries: 0,
          averageQueryTime: 0,
          totalFileOperations: 0,
          averageFileOperationTime: 0,
          totalApiCalls: 0,
          averageApiCallTime: 0
        }
      };

      this.activeCollections.set(migrationId, collectionData);

      // Emit collection started event
      this.emit('metrics:collection:started', {
        migrationId,
        collectionId: collectionData.id
      });

      console.log(`Started metrics collection for migration: ${migrationId}`);
      return true;

    } catch (error) {
      console.error(`Failed to start metrics collection for migration: ${migrationId}`, error);
      throw error;
    }
  }

  /**
   * Update metrics for migration
   * @param {string} migrationId - Migration ID
   * @param {Object} metrics - Metrics data
   */
  async updateMetrics(migrationId, metrics) {
    try {
      const collectionData = this.activeCollections.get(migrationId);
      if (!collectionData) {
        throw new Error(`No active metrics collection for migration: ${migrationId}`);
      }

      // Update execution time
      collectionData.metrics.executionTime = Date.now() - collectionData.startTime;

      // Update memory usage
      if (metrics.memoryUsage !== undefined) {
        collectionData.metrics.memoryUsage.push({
          timestamp: new Date(),
          value: metrics.memoryUsage
        });

        // Check memory threshold
        if (metrics.memoryUsage > this.options.performanceThresholds.maxMemoryUsage) {
          this.emitPerformanceAlert(migrationId, 'memory', metrics.memoryUsage);
        }
      }

      // Update CPU usage
      if (metrics.cpuUsage !== undefined) {
        collectionData.metrics.cpuUsage.push({
          timestamp: new Date(),
          value: metrics.cpuUsage
        });

        // Check CPU threshold
        if (metrics.cpuUsage > this.options.performanceThresholds.maxCpuUsage) {
          this.emitPerformanceAlert(migrationId, 'cpu', metrics.cpuUsage);
        }
      }

      // Update database metrics
      if (metrics.databaseQueries !== undefined) {
        collectionData.metrics.databaseQueries += metrics.databaseQueries;
        
        if (metrics.databaseQueryTime !== undefined) {
          collectionData.metrics.databaseQueryTime += metrics.databaseQueryTime;
        }

        // Check database query threshold
        if (collectionData.metrics.databaseQueries > this.options.performanceThresholds.maxDatabaseQueries) {
          this.emitPerformanceAlert(migrationId, 'database_queries', collectionData.metrics.databaseQueries);
        }
      }

      // Update file operation metrics
      if (metrics.fileOperations !== undefined) {
        collectionData.metrics.fileOperations += metrics.fileOperations;
        
        if (metrics.fileOperationTime !== undefined) {
          collectionData.metrics.fileOperationTime += metrics.fileOperationTime;
        }
      }

      // Update API call metrics
      if (metrics.apiCalls !== undefined) {
        collectionData.metrics.apiCalls += metrics.apiCalls;
        
        if (metrics.apiCallTime !== undefined) {
          collectionData.metrics.apiCallTime += metrics.apiCallTime;
        }
      }

      // Update error/warning counts
      if (metrics.errors !== undefined) {
        collectionData.metrics.errors += metrics.errors;
      }

      if (metrics.warnings !== undefined) {
        collectionData.metrics.warnings += metrics.warnings;
      }

      // Create snapshot
      const snapshot = {
        timestamp: new Date(),
        metrics: { ...collectionData.metrics }
      };
      collectionData.snapshots.push(snapshot);

      // Emit metrics updated event
      this.emit('metrics:collection:updated', {
        migrationId,
        executionTime: collectionData.metrics.executionTime,
        memoryUsage: metrics.memoryUsage || 0,
        cpuUsage: metrics.cpuUsage || 0
      });

    } catch (error) {
      console.error(`Failed to update metrics for migration: ${migrationId}`, error);
      throw error;
    }
  }

  /**
   * Emit performance alert
   * @param {string} migrationId - Migration ID
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   */
  emitPerformanceAlert(migrationId, metric, value) {
    if (!this.options.enablePerformanceAlerts) {
      return;
    }

    const alert = {
      id: uuidv4(),
      migrationId,
      metric,
      value,
      threshold: this.options.performanceThresholds[`max${metric.charAt(0).toUpperCase() + metric.slice(1)}`],
      timestamp: new Date(),
      message: `${metric} threshold exceeded: ${value}`
    };

    const collectionData = this.activeCollections.get(migrationId);
    if (collectionData) {
      collectionData.alerts.push(alert);
    }

    this.emit('metrics:performance:alert', alert);
    this.emit('metrics:threshold:exceeded', {
      migrationId,
      metric,
      value,
      threshold: alert.threshold
    });
  }

  /**
   * Stop metrics collection for migration
   * @param {string} migrationId - Migration ID
   * @returns {Object} Final metrics data
   */
  async stopCollection(migrationId) {
    try {
      const collectionData = this.activeCollections.get(migrationId);
      if (!collectionData) {
        return null;
      }

      // Calculate final performance metrics
      collectionData.endTime = new Date();
      collectionData.metrics.executionTime = collectionData.endTime - collectionData.startTime;

      // Calculate averages and peaks
      this.calculatePerformanceMetrics(collectionData);

      // Move to history
      this.metricsHistory.set(migrationId, collectionData);

      // Remove from active collections
      this.activeCollections.delete(migrationId);

      // Emit collection completed event
      this.emit('metrics:collection:completed', {
        migrationId,
        duration: collectionData.metrics.executionTime,
        finalMetrics: collectionData.performance
      });

      console.log(`Stopped metrics collection for migration: ${migrationId}`);
      return collectionData;

    } catch (error) {
      console.error(`Failed to stop metrics collection for migration: ${migrationId}`, error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics
   * @param {Object} collectionData - Collection data
   */
  calculatePerformanceMetrics(collectionData) {
    const { metrics, performance } = collectionData;

    // Calculate memory usage metrics
    if (metrics.memoryUsage.length > 0) {
      const memoryValues = metrics.memoryUsage.map(m => m.value);
      performance.averageMemoryUsage = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
      performance.peakMemoryUsage = Math.max(...memoryValues);
    }

    // Calculate CPU usage metrics
    if (metrics.cpuUsage.length > 0) {
      const cpuValues = metrics.cpuUsage.map(c => c.value);
      performance.averageCpuUsage = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
      performance.peakCpuUsage = Math.max(...cpuValues);
    }

    // Calculate database metrics
    performance.totalDatabaseQueries = metrics.databaseQueries;
    performance.averageQueryTime = metrics.databaseQueries > 0 ? 
      metrics.databaseQueryTime / metrics.databaseQueries : 0;

    // Calculate file operation metrics
    performance.totalFileOperations = metrics.fileOperations;
    performance.averageFileOperationTime = metrics.fileOperations > 0 ? 
      metrics.fileOperationTime / metrics.fileOperations : 0;

    // Calculate API call metrics
    performance.totalApiCalls = metrics.apiCalls;
    performance.averageApiCallTime = metrics.apiCalls > 0 ? 
      metrics.apiCallTime / metrics.apiCalls : 0;
  }

  /**
   * Get metrics for migration
   * @param {string} migrationId - Migration ID
   * @returns {Object} Metrics data
   */
  getMetrics(migrationId) {
    // Check active collections first
    const activeData = this.activeCollections.get(migrationId);
    if (activeData) {
      return {
        ...activeData,
        isActive: true
      };
    }

    // Check history
    const historicalData = this.metricsHistory.get(migrationId);
    if (historicalData) {
      return {
        ...historicalData,
        isActive: false
      };
    }

    return null;
  }

  /**
   * Get all active metrics
   * @returns {Array} Active metrics
   */
  getActiveMetrics() {
    return Array.from(this.activeCollections.values());
  }

  /**
   * Get metrics history
   * @param {string} migrationId - Migration ID (optional)
   * @returns {Array} Metrics history
   */
  getMetricsHistory(migrationId = null) {
    const history = Array.from(this.metricsHistory.values());
    
    if (migrationId) {
      return history.filter(item => item.migrationId === migrationId);
    }
    
    return history;
  }

  /**
   * Get performance analytics
   * @param {Object} options - Analytics options
   * @returns {Object} Performance analytics
   */
  getPerformanceAnalytics(options = {}) {
    const history = Array.from(this.metricsHistory.values());
    
    if (history.length === 0) {
      return {
        totalMigrations: 0,
        averageExecutionTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        totalDatabaseQueries: 0,
        totalFileOperations: 0,
        totalApiCalls: 0,
        errorRate: 0,
        performanceTrends: []
      };
    }

    const analytics = {
      totalMigrations: history.length,
      averageExecutionTime: 0,
      averageMemoryUsage: 0,
      averageCpuUsage: 0,
      totalDatabaseQueries: 0,
      totalFileOperations: 0,
      totalApiCalls: 0,
      errorRate: 0,
      performanceTrends: []
    };

    let totalErrors = 0;

    for (const data of history) {
      analytics.averageExecutionTime += data.metrics.executionTime;
      analytics.averageMemoryUsage += data.performance.averageMemoryUsage;
      analytics.averageCpuUsage += data.performance.averageCpuUsage;
      analytics.totalDatabaseQueries += data.performance.totalDatabaseQueries;
      analytics.totalFileOperations += data.performance.totalFileOperations;
      analytics.totalApiCalls += data.performance.totalApiCalls;
      totalErrors += data.metrics.errors;

      // Add to performance trends
      analytics.performanceTrends.push({
        migrationId: data.migrationId,
        timestamp: data.startTime,
        executionTime: data.metrics.executionTime,
        memoryUsage: data.performance.averageMemoryUsage,
        cpuUsage: data.performance.averageCpuUsage
      });
    }

    // Calculate averages
    analytics.averageExecutionTime /= history.length;
    analytics.averageMemoryUsage /= history.length;
    analytics.averageCpuUsage /= history.length;
    analytics.errorRate = (totalErrors / history.length) * 100;

    // Sort trends by timestamp
    analytics.performanceTrends.sort((a, b) => a.timestamp - b.timestamp);

    return analytics;
  }

  /**
   * Start collection timer
   */
  startCollectionTimer() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.options.collectionInterval);
  }

  /**
   * Stop collection timer
   */
  stopCollectionTimer() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const metrics = {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: await this.getCpuUsage(),
        timestamp: new Date()
      };

      // Update all active collections
      for (const [migrationId, collectionData] of this.activeCollections) {
        await this.updateMetrics(migrationId, metrics);
      }

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Get CPU usage
   * @returns {Promise<number>} CPU usage percentage
   */
  async getCpuUsage() {
    try {
      // Simple CPU usage calculation
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      
      const totalCpuTime = endUsage.user + endUsage.system;
      const cpuUsagePercent = (totalCpuTime / 100000) * 100; // Convert to percentage
      
      return Math.min(cpuUsagePercent, 100);
    } catch (error) {
      console.error('Failed to get CPU usage:', error);
      return 0;
    }
  }

  /**
   * Cleanup old metrics
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.metricsRetentionDays);

      const metricsToRemove = [];
      
      for (const [migrationId, metricsData] of this.metricsHistory) {
        if (metricsData.startTime < cutoffDate) {
          metricsToRemove.push(migrationId);
        }
      }

      for (const migrationId of metricsToRemove) {
        this.metricsHistory.delete(migrationId);
        console.log(`Removed old metrics for migration: ${migrationId}`);
      }

    } catch (error) {
      console.error('Metrics cleanup failed:', error);
    }
  }

  /**
   * Get metrics statistics
   * @returns {Object} Metrics statistics
   */
  getStatistics() {
    const stats = {
      activeCollections: this.activeCollections.size,
      historicalMetrics: this.metricsHistory.size,
      totalMetrics: this.activeCollections.size + this.metricsHistory.size
    };

    // Calculate performance statistics
    const analytics = this.getPerformanceAnalytics();
    stats.averageExecutionTime = analytics.averageExecutionTime;
    stats.averageMemoryUsage = analytics.averageMemoryUsage;
    stats.averageCpuUsage = analytics.averageCpuUsage;
    stats.errorRate = analytics.errorRate;

    return stats;
  }

  /**
   * Export metrics data
   * @param {string} migrationId - Migration ID
   * @returns {Object} Exported metrics data
   */
  exportMetricsData(migrationId) {
    const metricsData = this.getMetrics(migrationId);
    
    if (!metricsData) {
      return null;
    }

    return {
      id: metricsData.id,
      migrationId: metricsData.migrationId,
      startTime: metricsData.startTime,
      endTime: metricsData.endTime,
      metrics: metricsData.metrics,
      performance: metricsData.performance,
      snapshots: metricsData.snapshots,
      alerts: metricsData.alerts,
      isActive: metricsData.isActive
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.stopCollectionTimer();
      
      // Stop all active collections
      for (const [migrationId] of this.activeCollections) {
        await this.stopCollection(migrationId);
      }

      // Clear metrics data
      this.activeCollections.clear();
      this.metricsHistory.clear();
      this.performanceData.clear();

      console.log('MigrationMetrics cleanup completed');
    } catch (error) {
      console.error('MigrationMetrics cleanup failed:', error);
    }
  }
}

module.exports = MigrationMetrics; 