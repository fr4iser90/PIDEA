
/**
 * IDE Health Monitor
 * Monitors IDE health, status, and performance
 */

const EventEmitter = require('events');

const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEHealthMonitor');

class IDEHealthMonitor extends EventEmitter {
  constructor(configManager = null) {
    super();
    this.configManager = configManager;
    this.monitoring = false;
    this.healthInterval = null;
    this.ideHealth = new Map(); // port -> health info
    this.healthHistory = new Map(); // port -> health history
    this.maxHistorySize = 100;
    this.healthCheckInterval = 15000; // 30 seconds
    
    // Stale detection configuration
    this.failureCounts = new Map(); // port -> failure count
    this.maxFailures = 1; // Consider stale after X consecutive failures
  }

  /**
   * Start health monitoring
   * @param {number} interval - Health check interval in milliseconds
   * @returns {Promise<void>}
   */
  async startMonitoring(interval = null) {
    if (this.monitoring) {
      logger.info('Monitoring already active');
      return;
    }

    // Get interval from config if available
    if (!interval && this.configManager) {
      try {
        const globalConfig = this.configManager.getGlobalConfig();
        interval = globalConfig.healthCheckInterval || this.healthCheckInterval;
      } catch (error) {
        logger.warn('Could not get config, using default interval');
        interval = this.healthCheckInterval;
      }
    }

    this.healthCheckInterval = interval || this.healthCheckInterval;
    this.monitoring = true;

    logger.info(`Starting health monitoring with ${this.healthCheckInterval}ms interval`);

    // Start periodic health checks
    this.healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    // Emit start event
    this.emit('monitoringStarted', { interval: this.healthCheckInterval });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.monitoring) {
      logger.info('Monitoring not active');
      return;
    }

    this.monitoring = false;

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    logger.info('Health monitoring stopped');

    // Emit stop event
    this.emit('monitoringStopped');
  }

  /**
   * Perform health check for all monitored IDEs
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck() {
    const healthResults = {};
    const checkPromises = [];

    // Check health for all known IDEs
    for (const [port, healthInfo] of this.ideHealth) {
      checkPromises.push(
        this.checkIDEHealth(port, healthInfo.ideType)
          .then(result => {
            healthResults[port] = result;
            return result;
          })
          .catch(error => {
            logger.error(`Error checking health for port ${port}:`, error);
            healthResults[port] = {
              port: port,
              status: 'error',
              error: error.message,
              timestamp: Date.now()
            };
            return healthResults[port];
          })
      );
    }

    const results = await Promise.allSettled(checkPromises);
    
    // Update health information
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const healthInfo = result.value;
        this.updateHealthInfo(healthInfo.port, healthInfo);
      }
    }

    // Emit health check event
    this.emit('healthCheck', healthResults);

    return healthResults;
  }

  /**
   * Check health for specific IDE
   * @param {number} port - IDE port
   * @param {string} ideType - IDE type
   * @returns {Promise<Object>} Health information
   */
  async checkIDEHealth(port, ideType) {
    const startTime = Date.now();
    
    try {
      // Check if IDE is responding
      const isResponding = await this.checkIDEResponse(port);
      
      const responseTime = Date.now() - startTime;
      
      const healthInfo = {
        port: port,
        ideType: ideType,
        status: isResponding ? 'healthy' : 'unhealthy',
        responseTime: responseTime,
        timestamp: Date.now(),
        lastCheck: new Date().toISOString()
      };

      // Add additional health metrics if IDE is responding
      if (isResponding) {
        const additionalMetrics = await this.getAdditionalHealthMetrics(port, ideType);
        Object.assign(healthInfo, additionalMetrics);
      }

      return healthInfo;
    } catch (error) {
      return {
        port: port,
        ideType: ideType,
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check if IDE is responding
   * @param {number} port - IDE port
   * @returns {Promise<boolean>} True if IDE is responding
   */
  async checkIDEResponse(port) {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get({
        hostname: '127.0.0.1',
        port: port,
        path: '/json/version',
        timeout: 1000 // 1 second timeout
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get additional health metrics for IDE
   * @param {number} port - IDE port
   * @param {string} ideType - IDE type
   * @returns {Promise<Object>} Additional health metrics
   */
  async getAdditionalHealthMetrics(port, ideType) {
    const metrics = {};

    try {
      // Get process information
      const processInfo = await this.getProcessInfo(port);
      if (processInfo) {
        metrics.processInfo = processInfo;
      }

      // Get memory usage if available
      const memoryUsage = await this.getMemoryUsage(port);
      if (memoryUsage) {
        metrics.memoryUsage = memoryUsage;
      }

      // Get uptime
      const uptime = await this.getUptime(port);
      if (uptime) {
        metrics.uptime = uptime;
      }

    } catch (error) {
      logger.warn(`Error getting additional metrics for port ${port}:`, error);
    }

    return metrics;
  }

  /**
   * Get process information for IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object|null>} Process information
   */
  async getProcessInfo(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        const pid = stdout.trim();
        exec(`ps -p ${pid} -o pid,ppid,cmd,etime`, (psError, psOutput) => {
          if (psError) {
            resolve({ pid: pid });
          } else {
            const lines = psOutput.trim().split('\n');
            if (lines.length > 1) {
              const parts = lines[1].trim().split(/\s+/);
              resolve({
                pid: parts[0],
                ppid: parts[1],
                cmd: parts.slice(2, -1).join(' '),
                etime: parts[parts.length - 1]
              });
            } else {
              resolve({ pid: pid });
            }
          }
        });
      });
    });
  }

  /**
   * Get memory usage for IDE process
   * @param {number} port - IDE port
   * @returns {Promise<Object|null>} Memory usage information
   */
  async getMemoryUsage(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        const pid = stdout.trim();
        exec(`ps -p ${pid} -o rss,vsz`, (psError, psOutput) => {
          if (psError) {
            resolve(null);
          } else {
            const lines = psOutput.trim().split('\n');
            if (lines.length > 1) {
              const parts = lines[1].trim().split(/\s+/);
              resolve({
                rss: parseInt(parts[0]) || 0, // Resident Set Size in KB
                vsz: parseInt(parts[1]) || 0   // Virtual Memory Size in KB
              });
            } else {
              resolve(null);
            }
          }
        });
      });
    });
  }

  /**
   * Get uptime for IDE process
   * @param {number} port - IDE port
   * @returns {Promise<number|null>} Uptime in seconds
   */
  async getUptime(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        const pid = stdout.trim();
        exec(`ps -p ${pid} -o etime=`, (psError, psOutput) => {
          if (psError || !psOutput.trim()) {
            resolve(null);
          } else {
            const etime = psOutput.trim();
            // Convert etime (DD-HH:MM:SS or HH:MM:SS) to seconds
            const parts = etime.split('-');
            let seconds = 0;
            
            if (parts.length === 2) {
              // DD-HH:MM:SS format
              const days = parseInt(parts[0]) || 0;
              const timeParts = parts[1].split(':');
              const hours = parseInt(timeParts[0]) || 0;
              const minutes = parseInt(timeParts[1]) || 0;
              const secs = parseInt(timeParts[2]) || 0;
              seconds = days * 86400 + hours * 3600 + minutes * 60 + secs;
            } else {
              // HH:MM:SS format
              const timeParts = etime.split(':');
              const hours = parseInt(timeParts[0]) || 0;
              const minutes = parseInt(timeParts[1]) || 0;
              const secs = parseInt(timeParts[2]) || 0;
              seconds = hours * 3600 + minutes * 60 + secs;
            }
            
            resolve(seconds);
          }
        });
      });
    });
  }

  /**
   * Register IDE for health monitoring
   * @param {number} port - IDE port
   * @param {string} ideType - IDE type
   */
  registerIDE(port, ideType) {
    this.ideHealth.set(port, {
      port: port,
      ideType: ideType,
      status: 'unknown',
      timestamp: Date.now(),
      lastCheck: null
    });

    this.healthHistory.set(port, []);

    // Don't log individual registrations - will be logged in batch
    this.emit('ideRegistered', { port, ideType });
  }

  /**
   * Log all registered IDEs in a single batch log
   */
  logRegisteredIDEs() {
    const registeredIDEs = Array.from(this.ideHealth.entries())
      .map(([port, health]) => `${health.ideType}:${port}`)
      .join(', ');
    
    if (registeredIDEs) {
      logger.info(`Registered IDEs for health monitoring: ${registeredIDEs}`);
    }
  }

  /**
   * Unregister IDE from health monitoring
   * @param {number} port - IDE port
   */
  unregisterIDE(port) {
    this.ideHealth.delete(port);
    this.healthHistory.delete(port);

    logger.info(`Unregistered IDE on port ${port} from health monitoring`);
    this.emit('ideUnregistered', { port });
  }

  /**
   * Update health information for IDE
   * @param {number} port - IDE port
   * @param {Object} healthInfo - Health information
   */
  updateHealthInfo(port, healthInfo) {
    // Update current health
    this.ideHealth.set(port, healthInfo);

    // Handle stale detection
    this.handleStaleDetection(port, healthInfo);

    // Add to history
    const history = this.healthHistory.get(port) || [];
    history.push(healthInfo);

    // Keep history size limited
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.healthHistory.set(port, history);

    // Emit health update event
    this.emit('healthUpdate', { port, healthInfo });
  }

  /**
   * Handle stale detection for IDE
   * @param {number} port - IDE port
   * @param {Object} healthInfo - Health information
   */
  handleStaleDetection(port, healthInfo) {
    const currentFailureCount = this.failureCounts.get(port) || 0;
    
    if (healthInfo.status === 'unhealthy' || healthInfo.status === 'error') {
      // Increment failure count
      const newFailureCount = currentFailureCount + 1;
      this.failureCounts.set(port, newFailureCount);
      
      logger.warn(`IDE on port ${port} failed health check (${newFailureCount}/${this.maxFailures})`);
      
      // Check if IDE is now stale
      if (newFailureCount >= this.maxFailures) {
        logger.error(`IDE on port ${port} is now STALE after ${newFailureCount} consecutive failures`);
        
        // Emit stale event
        this.emit('ideStale', {
          port: port,
          ideType: healthInfo.ideType,
          failureCount: newFailureCount,
          lastHealthInfo: healthInfo,
          timestamp: Date.now()
        });
        
        // Mark as stale in health info
        healthInfo.stale = true;
        healthInfo.staleSince = Date.now();
      }
    } else if (healthInfo.status === 'healthy') {
      // Reset failure count on successful health check
      if (currentFailureCount > 0) {
        logger.info(`IDE on port ${port} recovered, resetting failure count from ${currentFailureCount} to 0`);
        this.failureCounts.set(port, 0);
        
        // Remove stale flag if it was set
        if (healthInfo.stale) {
          healthInfo.stale = false;
          healthInfo.staleSince = null;
          logger.info(`IDE on port ${port} is no longer stale`);
        }
      }
    }
  }

  /**
   * Get stale IDEs
   * @returns {Array} Array of stale IDE information
   */
  getStaleIDEs() {
    const staleIDEs = [];
    
    for (const [port, healthInfo] of this.ideHealth) {
      if (healthInfo.stale) {
        staleIDEs.push({
          port: port,
          ideType: healthInfo.ideType,
          failureCount: this.failureCounts.get(port) || 0,
          staleSince: healthInfo.staleSince,
          lastHealthInfo: healthInfo
        });
      }
    }
    
    return staleIDEs;
  }

  /**
   * Check if IDE is stale
   * @param {number} port - IDE port
   * @returns {boolean} True if IDE is stale
   */
  isIDEStale(port) {
    const healthInfo = this.ideHealth.get(port);
    return healthInfo && healthInfo.stale === true;
  }

  /**
   * Get failure count for IDE
   * @param {number} port - IDE port
   * @returns {number} Failure count
   */
  getFailureCount(port) {
    return this.failureCounts.get(port) || 0;
  }

  /**
   * Reset failure count for IDE
   * @param {number} port - IDE port
   */
  resetFailureCount(port) {
    this.failureCounts.set(port, 0);
    logger.info(`Reset failure count for IDE on port ${port}`);
  }

  /**
   * Set stale detection configuration
   * @param {number} maxFailures - Maximum failures before considering stale
   */
  setStaleThreshold(maxFailures) {
    this.maxFailures = maxFailures;
    logger.info(`Set stale threshold to ${maxFailures} failures`);
  }

  /**
   * Get current health status for all IDEs
   * @returns {Object} Health status for all IDEs
   */
  getHealthStatus() {
    const status = {};
    for (const [port, healthInfo] of this.ideHealth) {
      status[port] = healthInfo;
    }
    return status;
  }

  /**
   * Get health status for specific IDE
   * @param {number} port - IDE port
   * @returns {Object|null} Health status
   */
  getIDEHealthStatus(port) {
    return this.ideHealth.get(port) || null;
  }

  /**
   * Get health history for IDE
   * @param {number} port - IDE port
   * @param {number} limit - Number of history entries to return
   * @returns {Array} Health history
   */
  getHealthHistory(port, limit = null) {
    const history = this.healthHistory.get(port) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get health statistics
   * @returns {Object} Health statistics
   */
  getHealthStats() {
    const stats = {
      totalIDEs: this.ideHealth.size,
      healthyIDEs: 0,
      unhealthyIDEs: 0,
      errorIDEs: 0,
      monitoring: this.monitoring,
      interval: this.healthCheckInterval
    };

    for (const [_, healthInfo] of this.ideHealth) {
      switch (healthInfo.status) {
        case 'healthy':
          stats.healthyIDEs++;
          break;
        case 'unhealthy':
          stats.unhealthyIDEs++;
          break;
        case 'error':
          stats.errorIDEs++;
          break;
      }
    }

    return stats;
  }

  /**
   * Check if monitoring is active
   * @returns {boolean} True if monitoring is active
   */
  isMonitoring() {
    return this.monitoring;
  }

  /**
   * Get monitoring configuration
   * @returns {Object} Monitoring configuration
   */
  getMonitoringConfig() {
    return {
      monitoring: this.monitoring,
      interval: this.healthCheckInterval,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Add health check for specific IDE
   * @param {string} ideType - IDE type
   * @param {number} port - IDE port
   * @param {Function} checkFunction - Health check function
   */
  addHealthCheck(ideType, port, checkFunction) {
    if (typeof checkFunction !== 'function') {
      throw new Error('Check function must be a function');
    }

    const key = `${ideType}:${port}`;
    this.healthChecks = this.healthChecks || new Map();
    this.healthChecks.set(key, checkFunction);

    logger.info(`Added health check for ${ideType} on port ${port}`);
  }

  /**
   * Clear all health checks
   */
  clearHealthChecks() {
    this.healthChecks = this.healthChecks || new Map();
    this.healthChecks.clear();
    logger.info('Cleared all health checks');
  }

  /**
   * Get count of health checks
   * @returns {number} Number of health checks
   */
  getHealthCheckCount() {
    this.healthChecks = this.healthChecks || new Map();
    return this.healthChecks.size;
  }

  /**
   * Check if monitoring is active
   * @returns {boolean} True if monitoring is active
   */
  isMonitoring() {
    return this.monitoring;
  }
}

module.exports = IDEHealthMonitor; 