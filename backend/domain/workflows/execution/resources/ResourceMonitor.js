/**
 * ResourceMonitor - Resource monitoring for workflow execution
 * Provides real-time monitoring and alerting for resource usage
 */
const { EventEmitter } = require('events');
const os = require('os');

/**
 * Resource monitor for workflow execution
 */
class ResourceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enableMonitoring = options.enableMonitoring !== false;
    this.monitoringInterval = options.monitoringInterval || 5000; // 5 seconds
    this.alertThresholds = {
      memory: options.memoryThreshold || 80, // Percentage
      cpu: options.cpuThreshold || 80, // Percentage
      concurrent: options.concurrentThreshold || 90, // Percentage
      responseTime: options.responseTimeThreshold || 30000 // 30 seconds
    };
    
    // Monitoring state
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.monitoringHistory = new Map();
    this.alertHistory = new Map();
    this.resourceSnapshots = [];
    
    // Alert configuration
    this.alertConfig = {
      enableAlerts: options.enableAlerts !== false,
      alertCooldown: options.alertCooldown || 60000, // 1 minute
      maxHistorySize: options.maxHistorySize || 1000
    };
    
    // Performance tracking
    this.performanceMetrics = {
      averageResponseTime: 0,
      peakMemoryUsage: 0,
      peakCpuUsage: 0,
      totalAlerts: 0,
      lastAlertTime: null
    };
    
    this.logger = options.logger || console;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('ResourceMonitor: Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performMonitoring();
    }, this.monitoringInterval);

    this.logger.info('ResourceMonitor: Monitoring started', {
      interval: this.monitoringInterval
    });

    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      this.logger.warn('ResourceMonitor: Monitoring not started');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info('ResourceMonitor: Monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Perform monitoring cycle
   */
  async performMonitoring() {
    try {
      const snapshot = await this.createResourceSnapshot();
      this.resourceSnapshots.push(snapshot);
      
      // Limit snapshot history
      if (this.resourceSnapshots.length > 1000) {
        this.resourceSnapshots = this.resourceSnapshots.slice(-1000);
      }
      
      // Check for alerts
      await this.checkAlerts(snapshot);
      
      // Update performance metrics
      this.updatePerformanceMetrics(snapshot);
      
      // Emit monitoring event
      this.emit('resourceSnapshot', snapshot);
      
    } catch (error) {
      this.logger.error('ResourceMonitor: Monitoring cycle failed', {
        error: error.message
      });
    }
  }

  /**
   * Create resource snapshot
   * @returns {Promise<Object>} Resource snapshot
   */
  async createResourceSnapshot() {
    const timestamp = Date.now();
    
    // Get system resources
    const systemResources = await this.getSystemResources();
    
    // Get process resources
    const processResources = this.getProcessResources();
    
    // Get workflow-specific resources
    const workflowResources = this.getWorkflowResources();
    
    const snapshot = {
      timestamp,
      system: systemResources,
      process: processResources,
      workflow: workflowResources,
      alerts: []
    };
    
    // Store in history
    this.monitoringHistory.set(timestamp, snapshot);
    
    // Clean up old history
    if (this.monitoringHistory.size > this.alertConfig.maxHistorySize) {
      const entries = Array.from(this.monitoringHistory.entries());
      const toDelete = entries.slice(0, entries.length - this.alertConfig.maxHistorySize);
      for (const [key] of toDelete) {
        this.monitoringHistory.delete(key);
      }
    }
    
    return snapshot;
  }

  /**
   * Get system resources
   * @returns {Promise<Object>} System resource usage
   */
  async getSystemResources() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      const cpus = os.cpus();
      const cpuUsage = this.calculateCpuUsage(cpus);
      
      return {
        memory: {
          total: Math.round(totalMemory / 1024 / 1024), // MB
          used: Math.round(usedMemory / 1024 / 1024), // MB
          free: Math.round(freeMemory / 1024 / 1024), // MB
          usage: Math.round((usedMemory / totalMemory) * 100) // Percentage
        },
        cpu: {
          usage: Math.round(cpuUsage * 100), // Percentage
          cores: cpus.length,
          loadAverage: os.loadavg()
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      };
    } catch (error) {
      this.logger.error('ResourceMonitor: Failed to get system resources', {
        error: error.message
      });
      return {
        memory: { total: 0, used: 0, free: 0, usage: 0 },
        cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
        uptime: 0,
        platform: 'unknown',
        arch: 'unknown'
      };
    }
  }

  /**
   * Get process resources
   * @returns {Object} Process resource usage
   */
  getProcessResources() {
    try {
      const usage = process.memoryUsage();
      
      return {
        memory: {
          rss: Math.round(usage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
          external: Math.round(usage.external / 1024 / 1024) // MB
        },
        cpu: {
          user: process.cpuUsage().user,
          system: process.cpuUsage().system
        },
        uptime: process.uptime(),
        pid: process.pid
      };
    } catch (error) {
      this.logger.error('ResourceMonitor: Failed to get process resources', {
        error: error.message
      });
      return {
        memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
        cpu: { user: 0, system: 0 },
        uptime: 0,
        pid: 0
      };
    }
  }

  /**
   * Get workflow resources
   * @returns {Object} Workflow resource usage
   */
  getWorkflowResources() {
    // This would be populated by the workflow execution engine
    // For now, return placeholder data
    return {
      activeExecutions: 0,
      queuedExecutions: 0,
      totalExecutions: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }

  /**
   * Calculate CPU usage
   * @param {Array} cpus - CPU information
   * @returns {number} CPU usage percentage
   */
  calculateCpuUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 1 - (totalIdle / totalTick);
  }

  /**
   * Check for alerts
   * @param {Object} snapshot - Resource snapshot
   */
  async checkAlerts(snapshot) {
    if (!this.alertConfig.enableAlerts) return;

    const alerts = [];
    
    // Check memory usage
    if (snapshot.system.memory.usage > this.alertThresholds.memory) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `Memory usage is ${snapshot.system.memory.usage}% (threshold: ${this.alertThresholds.memory}%)`,
        value: snapshot.system.memory.usage,
        threshold: this.alertThresholds.memory,
        timestamp: snapshot.timestamp
      });
    }
    
    // Check CPU usage
    if (snapshot.system.cpu.usage > this.alertThresholds.cpu) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `CPU usage is ${snapshot.system.cpu.usage}% (threshold: ${this.alertThresholds.cpu}%)`,
        value: snapshot.system.cpu.usage,
        threshold: this.alertThresholds.cpu,
        timestamp: snapshot.timestamp
      });
    }
    
    // Check process memory
    if (snapshot.process.memory.heapUsed > 512) { // 512MB
      alerts.push({
        type: 'process_memory_high',
        severity: 'warning',
        message: `Process heap usage is ${snapshot.process.memory.heapUsed}MB`,
        value: snapshot.process.memory.heapUsed,
        threshold: 512,
        timestamp: snapshot.timestamp
      });
    }
    
    // Check for critical conditions
    if (snapshot.system.memory.usage > 95) {
      alerts.push({
        type: 'memory_critical',
        severity: 'critical',
        message: `Critical memory usage: ${snapshot.system.memory.usage}%`,
        value: snapshot.system.memory.usage,
        threshold: 95,
        timestamp: snapshot.timestamp
      });
    }
    
    if (snapshot.system.cpu.usage > 95) {
      alerts.push({
        type: 'cpu_critical',
        severity: 'critical',
        message: `Critical CPU usage: ${snapshot.system.cpu.usage}%`,
        value: snapshot.system.cpu.usage,
        threshold: 95,
        timestamp: snapshot.timestamp
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
    
    snapshot.alerts = alerts;
  }

  /**
   * Process alert
   * @param {Object} alert - Alert to process
   */
  async processAlert(alert) {
    // Check cooldown
    if (this.performanceMetrics.lastAlertTime) {
      const timeSinceLastAlert = Date.now() - this.performanceMetrics.lastAlertTime;
      if (timeSinceLastAlert < this.alertConfig.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }

    // Store alert
    this.alertHistory.set(`${alert.type}_${alert.timestamp}`, alert);
    
    // Update metrics
    this.performanceMetrics.totalAlerts++;
    this.performanceMetrics.lastAlertTime = Date.now();
    
    // Clean up old alerts
    if (this.alertHistory.size > this.alertConfig.maxHistorySize) {
      const entries = Array.from(this.alertHistory.entries());
      const toDelete = entries.slice(0, entries.length - this.alertConfig.maxHistorySize);
      for (const [key] of toDelete) {
        this.alertHistory.delete(key);
      }
    }
    
    // Log alert
    this.logger.warn('ResourceMonitor: Alert triggered', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold
    });
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Handle critical alerts
    if (alert.severity === 'critical') {
      this.emit('criticalAlert', alert);
      await this.handleCriticalAlert(alert);
    }
  }

  /**
   * Handle critical alert
   * @param {Object} alert - Critical alert
   */
  async handleCriticalAlert(alert) {
    this.logger.error('ResourceMonitor: Critical alert handling', {
      type: alert.type,
      message: alert.message
    });
    
    // Implement critical alert handling logic
    // This could include:
    // - Scaling up resources
    // - Restarting services
    // - Sending notifications
    // - Taking emergency actions
    
    switch (alert.type) {
      case 'memory_critical':
        await this.handleMemoryCritical();
        break;
      case 'cpu_critical':
        await this.handleCpuCritical();
        break;
      default:
        this.logger.warn('ResourceMonitor: Unknown critical alert type', {
          type: alert.type
        });
    }
  }

  /**
   * Handle memory critical alert
   */
  async handleMemoryCritical() {
    this.logger.info('ResourceMonitor: Handling memory critical alert');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.logger.info('ResourceMonitor: Forced garbage collection');
    }
    
    // Emit memory critical event
    this.emit('memoryCritical');
  }

  /**
   * Handle CPU critical alert
   */
  async handleCpuCritical() {
    this.logger.info('ResourceMonitor: Handling CPU critical alert');
    
    // Emit CPU critical event
    this.emit('cpuCritical');
  }

  /**
   * Update performance metrics
   * @param {Object} snapshot - Resource snapshot
   */
  updatePerformanceMetrics(snapshot) {
    // Update peak usage
    this.performanceMetrics.peakMemoryUsage = Math.max(
      this.performanceMetrics.peakMemoryUsage,
      snapshot.system.memory.usage
    );
    
    this.performanceMetrics.peakCpuUsage = Math.max(
      this.performanceMetrics.peakCpuUsage,
      snapshot.system.cpu.usage
    );
    
    // Update average response time (simplified)
    if (snapshot.workflow.averageResponseTime > 0) {
      this.performanceMetrics.averageResponseTime = snapshot.workflow.averageResponseTime;
    }
  }

  /**
   * Get monitoring statistics
   * @returns {Object} Monitoring statistics
   */
  getMonitoringStatistics() {
    const currentSnapshot = this.resourceSnapshots[this.resourceSnapshots.length - 1];
    
    return {
      isMonitoring: this.isMonitoring,
      monitoringInterval: this.monitoringInterval,
      snapshotsCount: this.resourceSnapshots.length,
      alertsCount: this.alertHistory.size,
      performance: this.performanceMetrics,
      currentSnapshot,
      alertThresholds: this.alertThresholds,
      alertConfig: this.alertConfig
    };
  }

  /**
   * Get resource history
   * @param {number} duration - Duration in milliseconds
   * @returns {Array} Resource history
   */
  getResourceHistory(duration = 300000) { // 5 minutes default
    const cutoff = Date.now() - duration;
    return this.resourceSnapshots.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Get alert history
   * @param {number} duration - Duration in milliseconds
   * @returns {Array} Alert history
   */
  getAlertHistory(duration = 3600000) { // 1 hour default
    const cutoff = Date.now() - duration;
    return Array.from(this.alertHistory.values())
      .filter(alert => alert.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alerts by type
   * @param {string} type - Alert type
   * @returns {Array} Alerts of specified type
   */
  getAlertsByType(type) {
    return Array.from(this.alertHistory.values())
      .filter(alert => alert.type === type)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alerts by severity
   * @param {string} severity - Alert severity
   * @returns {Array} Alerts of specified severity
   */
  getAlertsBySeverity(severity) {
    return Array.from(this.alertHistory.values())
      .filter(alert => alert.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Update alert thresholds
   * @param {Object} thresholds - New thresholds
   */
  updateAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    
    this.logger.info('ResourceMonitor: Alert thresholds updated', {
      thresholds: this.alertThresholds
    });
  }

  /**
   * Update alert configuration
   * @param {Object} config - New configuration
   */
  updateAlertConfig(config) {
    this.alertConfig = { ...this.alertConfig, ...config };
    
    this.logger.info('ResourceMonitor: Alert configuration updated', {
      config: this.alertConfig
    });
  }

  /**
   * Clear monitoring history
   */
  clearHistory() {
    this.monitoringHistory.clear();
    this.alertHistory.clear();
    this.resourceSnapshots = [];
    
    this.logger.info('ResourceMonitor: History cleared');
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alertHistory.clear();
    this.performanceMetrics.totalAlerts = 0;
    this.performanceMetrics.lastAlertTime = null;
    
    this.logger.info('ResourceMonitor: Alerts cleared');
  }

  /**
   * Get resource trends
   * @param {number} duration - Duration in milliseconds
   * @returns {Object} Resource trends
   */
  getResourceTrends(duration = 300000) { // 5 minutes default
    const history = this.getResourceHistory(duration);
    
    if (history.length < 2) {
      return {
        memory: { trend: 'stable', change: 0 },
        cpu: { trend: 'stable', change: 0 }
      };
    }
    
    const first = history[0];
    const last = history[history.length - 1];
    
    const memoryChange = last.system.memory.usage - first.system.memory.usage;
    const cpuChange = last.system.cpu.usage - first.system.cpu.usage;
    
    return {
      memory: {
        trend: memoryChange > 5 ? 'increasing' : memoryChange < -5 ? 'decreasing' : 'stable',
        change: memoryChange
      },
      cpu: {
        trend: cpuChange > 5 ? 'increasing' : cpuChange < -5 ? 'decreasing' : 'stable',
        change: cpuChange
      }
    };
  }

  /**
   * Get health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const currentSnapshot = this.resourceSnapshots[this.resourceSnapshots.length - 1];
    const trends = this.getResourceTrends();
    const recentAlerts = this.getAlertHistory(60000); // Last minute
    
    let status = 'healthy';
    let issues = [];
    
    if (!currentSnapshot) {
      status = 'unknown';
      issues.push('No monitoring data available');
    } else {
      // Check current resource usage
      if (currentSnapshot.system.memory.usage > this.alertThresholds.memory) {
        status = 'warning';
        issues.push(`High memory usage: ${currentSnapshot.system.memory.usage}%`);
      }
      
      if (currentSnapshot.system.cpu.usage > this.alertThresholds.cpu) {
        status = 'warning';
        issues.push(`High CPU usage: ${currentSnapshot.system.cpu.usage}%`);
      }
      
      // Check for critical conditions
      if (currentSnapshot.system.memory.usage > 95 || currentSnapshot.system.cpu.usage > 95) {
        status = 'critical';
      }
      
      // Check trends
      if (trends.memory.trend === 'increasing' && trends.memory.change > 10) {
        issues.push('Memory usage is rapidly increasing');
      }
      
      if (trends.cpu.trend === 'increasing' && trends.cpu.change > 10) {
        issues.push('CPU usage is rapidly increasing');
      }
    }
    
    // Check recent alerts
    if (recentAlerts.length > 0) {
      status = 'warning';
      issues.push(`${recentAlerts.length} recent alerts`);
    }
    
    return {
      status,
      issues,
      timestamp: Date.now(),
      currentSnapshot,
      trends
    };
  }

  /**
   * Shutdown monitor
   */
  shutdown() {
    this.logger.info('ResourceMonitor: Shutting down');
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Clear history
    this.clearHistory();
    
    this.logger.info('ResourceMonitor: Shutdown complete');
  }
}

module.exports = ResourceMonitor; 