const { chromium } = require('playwright');
const Logger = require('@logging/Logger');
const logger = new Logger('ConnectionPool');

/**
 * Connection Pool for managing multiple Chrome DevTools Protocol connections
 * Provides instant port switching by maintaining multiple parallel connections
 */
class ConnectionPool {
  constructor(options = {}) {
    this.connections = new Map(); // port -> {browser, page, lastUsed, health, createdAt, isConnecting}
    this.maxConnections = options.maxConnections || 10; // Increased for better performance
    this.connectionTimeout = options.connectionTimeout || 20000; // Increased timeout for stability
    this.cleanupInterval = options.cleanupInterval || 120000; // 2 minutes - less frequent cleanup
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute - less frequent health checks
    this.host = options.host || '127.0.0.1';
    
    // Performance monitoring
    this.performanceMetrics = {
      totalConnections: 0,
      failedConnections: 0,
      slowConnections: 0,
      memoryUsage: [],
      lastCleanup: Date.now()
    };
    
    // Start cleanup timer
    this.cleanupTimer = null;
    this.healthCheckTimer = null;
    this.startCleanupTimer();
    this.startHealthCheckTimer();
    
    logger.info(`ConnectionPool initialized with maxConnections: ${this.maxConnections}, cleanupInterval: ${this.cleanupInterval}ms, healthCheckInterval: ${this.healthCheckInterval}ms`);
  }

  /**
   * Get a connection for the specified port, creating if necessary
   * @param {number} port - The port number
   * @returns {Promise<Object>} Connection object with browser and page
   */
  async getConnection(port) {
    const startTime = Date.now();
    
    try {
      // Check if connection already exists and is healthy
      if (this.connections.has(port)) {
        const connection = this.connections.get(port);
        
        // Update last used timestamp
        connection.lastUsed = Date.now();
        
        // Check if connection is healthy - but be more lenient
        if (connection.health === 'healthy' && connection.browser && connection.page) {
          const duration = Date.now() - startTime;
          this.trackPerformance('cache_hit', duration);
          logger.debug(`Using existing connection for port ${port} in ${duration}ms`);
          return connection;
        }
        
        // Try to recover connection before removing it
        if (connection.browser && connection.health !== 'failed') {
          try {
            logger.debug(`Attempting to recover connection for port ${port}`);
            
            // Check if browser is still connected
            const contexts = connection.browser.contexts();
            if (contexts.length > 0) {
              const pages = contexts[0].pages();
              if (pages.length > 0) {
                // Connection is actually healthy, just update status
                connection.page = pages[0];
                connection.health = 'healthy';
                const duration = Date.now() - startTime;
                this.trackPerformance('recovered', duration);
                logger.debug(`Successfully recovered connection for port ${port} in ${duration}ms`);
                return connection;
              }
            }
          } catch (recoveryError) {
            logger.debug(`Recovery failed for port ${port}: ${recoveryError.message}`);
          }
        }
        
        // Only remove if truly unhealthy
        if (connection.health === 'failed') {
          logger.warn(`Removing failed connection for port ${port}`);
          await this.closeConnection(port);
        } else {
          // Mark as connecting and try to recreate
          connection.health = 'connecting';
          logger.debug(`Marking connection as connecting for port ${port}`);
        }
      }
      
      // Create new connection
      logger.info(`Creating new connection for port ${port}`);
      const result = await this.createConnection(port);
      const duration = Date.now() - startTime;
      this.trackPerformance('new_connection', duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackPerformance('failed', duration);
      logger.error(`Error getting connection for port ${port} after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new Chrome DevTools connection
   * @param {number} port - The port number
   * @returns {Promise<Object>} Connection object
   */
  async createConnection(port) {
    // Check if we're already connecting to this port
    const existingConnection = this.connections.get(port);
    if (existingConnection && existingConnection.isConnecting) {
      logger.debug(`Already connecting to port ${port}, waiting...`);
      while (existingConnection.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.connections.get(port);
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      await this.evictOldestConnection();
    }

    // Create connection entry
    const connection = {
      browser: null,
      page: null,
      lastUsed: Date.now(),
      health: 'connecting',
      createdAt: Date.now(),
      isConnecting: true
    };

    this.connections.set(port, connection);

    try {
      logger.info(`Connecting to Chrome DevTools on port ${port}...`);
      
      // Use shorter timeout for initial connection to fail fast
      const initialTimeout = Math.min(this.connectionTimeout, 10000); // Max 10 seconds for initial connection
      
      // Connect to Chrome DevTools Protocol with retry logic
      let browser = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !browser) {
        try {
          browser = await chromium.connectOverCDP(`http://${this.host}:${port}`, {
            timeout: initialTimeout
          });
          logger.info(`Successfully connected to port ${port} on attempt ${retryCount + 1}`);
        } catch (connectError) {
          retryCount++;
          logger.warn(`Connection attempt ${retryCount} failed for port ${port}: ${connectError.message}`);
          
          if (retryCount < maxRetries) {
            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            logger.debug(`Waiting ${waitTime}ms before retry ${retryCount + 1}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw connectError;
          }
        }
      }
      
      if (!browser) {
        throw new Error(`Failed to connect to port ${port} after ${maxRetries} attempts`);
      }
      
      // Get the first page with timeout
      const contexts = browser.contexts();
      if (!contexts || contexts.length === 0) {
        throw new Error(`No contexts found on port ${port}`);
      }
      
      const pages = contexts[0].pages();
      if (!pages || pages.length === 0) {
        throw new Error(`No pages found on port ${port}`);
      }
      
      const page = pages[0];

      // Update connection
      connection.browser = browser;
      connection.page = page;
      connection.health = 'healthy';
      connection.isConnecting = false;

      logger.info(`Successfully connected to port ${port}`);
      return connection;

    } catch (error) {
      logger.error(`Failed to connect to port ${port}:`, error.message);
      
      // Clean up failed connection
      connection.health = 'failed';
      connection.isConnecting = false;
      this.connections.delete(port);
      
      throw error;
    }
  }

  /**
   * Close a specific connection
   * @param {number} port - The port number
   * @returns {Promise<boolean>} Success status
   */
  async closeConnection(port) {
    try {
      const connection = this.connections.get(port);
      if (!connection) {
        return true; // Already closed
      }

      logger.info(`Closing connection for port ${port}`);
      
      if (connection.browser) {
        await connection.browser.close();
      }
      
      this.connections.delete(port);
      logger.info(`Successfully closed connection for port ${port}`);
      return true;

    } catch (error) {
      logger.error(`Error closing connection for port ${port}:`, error.message);
      this.connections.delete(port); // Remove anyway
      return false;
    }
  }

  /**
   * Close all connections
   * @returns {Promise<void>}
   */
  async closeAllConnections() {
    logger.info('Closing all connections...');
    
    const closePromises = Array.from(this.connections.keys()).map(port => 
      this.closeConnection(port)
    );
    
    await Promise.allSettled(closePromises);
    logger.info('All connections closed');
  }

  /**
   * Evict the oldest connection to make room for new ones
   * @returns {Promise<boolean>} Success status
   */
  async evictOldestConnection() {
    if (this.connections.size === 0) {
      return true;
    }

    let oldestPort = null;
    let oldestTime = Date.now();

    for (const [port, connection] of this.connections) {
      if (connection.lastUsed < oldestTime) {
        oldestTime = connection.lastUsed;
        oldestPort = port;
      }
    }

    if (oldestPort) {
      logger.info(`Evicting oldest connection for port ${oldestPort}`);
      return await this.closeConnection(oldestPort);
    }

    return true;
  }

  /**
   * Clean up stale connections
   * @returns {Promise<void>}
   */
  async cleanup() {
    const now = Date.now();
    const staleThreshold = now - (this.cleanupInterval * 4); // 8 minutes - less aggressive
    
    logger.debug(`Cleaning up stale connections, threshold: ${staleThreshold}`);
    
    const stalePorts = [];
    for (const [port, connection] of this.connections) {
      // Less aggressive cleanup conditions
      const isStale = connection.lastUsed < staleThreshold;
      const isUnhealthy = connection.health === 'failed'; // Only clean up truly failed connections
      const isVeryOld = (now - connection.createdAt) > (this.cleanupInterval * 12); // 24 minutes old
      const isUnstableTooLong = connection.health === 'unstable' && 
                                (now - connection.lastUsed) > (this.cleanupInterval * 6); // 12 minutes unstable
      
      // Clean up only if connection is truly stale and very old, or truly failed, or unstable too long
      if ((isStale && isVeryOld) || isUnhealthy || isUnstableTooLong) {
        stalePorts.push(port);
        logger.debug(`Marking connection for cleanup - port: ${port}, stale: ${isStale}, old: ${isVeryOld}, unhealthy: ${isUnhealthy}, unstableTooLong: ${isUnstableTooLong}`);
      }
    }
    
    for (const port of stalePorts) {
      logger.debug(`Removing stale connection for port ${port}`);
      await this.closeConnection(port);
    }
    
    if (stalePorts.length > 0) {
      logger.info(`Cleaned up ${stalePorts.length} stale connections`);
      this.performanceMetrics.lastCleanup = now;
    }
    
    // Force garbage collection if memory usage is high
    const memUsage = process.memoryUsage();
    const heapUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsageMB > 100) { // If heap usage > 100MB
      logger.warn(`High memory usage detected: ${heapUsageMB.toFixed(2)}MB, forcing cleanup`);
      
      // Close all connections except the most recently used one
      const sortedConnections = Array.from(this.connections.entries())
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed);
      
      if (sortedConnections.length > 1) {
        const toClose = sortedConnections.slice(1); // Keep only the most recent
        for (const [port] of toClose) {
          logger.debug(`Force closing connection for port ${port} due to high memory usage`);
          await this.closeConnection(port);
        }
      }
    }
  }

  /**
   * Perform health check on all connections
   * @returns {Promise<void>}
   */
  async healthCheck() {
    logger.debug('Performing health check on connections...');
    
    const healthPromises = Array.from(this.connections.entries()).map(async ([port, connection]) => {
      try {
        if (connection.browser && connection.page) {
          // More robust health check - try multiple operations
          try {
            // Try to get page title (lightweight operation)
            await connection.page.title();
            connection.health = 'healthy';
            logger.debug(`Health check passed for port ${port}`);
          } catch (titleError) {
            // If title fails, try to get contexts (more robust)
            try {
              const contexts = connection.browser.contexts();
              if (contexts.length > 0) {
                const pages = contexts[0].pages();
                if (pages.length > 0) {
                  // Update page reference and mark as healthy
                  connection.page = pages[0];
                  connection.health = 'healthy';
                  logger.debug(`Health check recovered for port ${port}`);
                } else {
                  // Don't mark as failed immediately - IDE might be restarting
                  connection.health = 'unstable';
                  logger.debug(`Health check unstable for port ${port} - no pages, but browser exists`);
                }
              } else {
                // Don't mark as failed immediately - IDE might be restarting
                connection.health = 'unstable';
                logger.debug(`Health check unstable for port ${port} - no contexts, but browser exists`);
              }
            } catch (contextError) {
              connection.health = 'failed';
              logger.warn(`Health check failed for port ${port}: ${contextError.message}`);
            }
          }
        } else {
          connection.health = 'failed';
          logger.warn(`Health check failed for port ${port} - no browser/page`);
        }
      } catch (error) {
        connection.health = 'failed';
        logger.warn(`Health check failed for port ${port}:`, error.message);
      }
    });
    
    await Promise.allSettled(healthPromises);
    
    // Only remove connections that are truly failed (not just temporarily unhealthy)
    const failedPorts = [];
    for (const [port, connection] of this.connections) {
      if (connection.health === 'failed') {
        // Double-check before removing
        try {
          if (connection.browser) {
            const contexts = connection.browser.contexts();
            if (contexts.length > 0) {
              // Connection might be recoverable, don't remove yet
              logger.debug(`Connection for port ${port} might be recoverable, keeping it`);
              continue;
            }
          }
        } catch (finalCheckError) {
          // Connection is truly broken
          logger.debug(`Final check confirms connection for port ${port} is broken`);
        }
        
        failedPorts.push(port);
      }
    }
    
    for (const port of failedPorts) {
      logger.info(`Removing truly failed connection for port ${port}`);
      await this.closeConnection(port);
    }
  }

  /**
   * Get connection pool health status
   * @returns {Object} Health status object
   */
  getHealth() {
    const total = this.connections.size;
    const healthy = Array.from(this.connections.values()).filter(c => c.health === 'healthy').length;
    const failed = Array.from(this.connections.values()).filter(c => c.health === 'failed').length;
    const connecting = Array.from(this.connections.values()).filter(c => c.isConnecting).length;
    
    return {
      total,
      healthy,
      failed,
      connecting,
      maxConnections: this.maxConnections,
      utilization: total / this.maxConnections
    };
  }

  /**
   * Get connection statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      connections: {}
    };
    
    for (const [port, connection] of this.connections) {
      stats.connections[port] = {
        health: connection.health,
        lastUsed: connection.lastUsed,
        createdAt: connection.createdAt,
        age: Date.now() - connection.createdAt,
        idleTime: Date.now() - connection.lastUsed
      };
    }
    
    return stats;
  }

  /**
   * Track performance metrics for monitoring degradation
   * @param {string} type - Type of operation
   * @param {number} duration - Duration in milliseconds
   */
  trackPerformance(type, duration) {
    this.performanceMetrics.totalConnections++;
    
    if (type === 'failed') {
      this.performanceMetrics.failedConnections++;
    }
    
    if (duration > 1000) {
      this.performanceMetrics.slowConnections++;
    }
    
    // Track memory usage every 10 operations
    if (this.performanceMetrics.totalConnections % 10 === 0) {
      const memUsage = process.memoryUsage();
      this.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        connections: this.connections.size
      });
      
      // Keep only last 50 memory readings
      if (this.performanceMetrics.memoryUsage.length > 50) {
        this.performanceMetrics.memoryUsage.shift();
      }
      
      // Log performance warning if degradation detected
      if (this.performanceMetrics.slowConnections > 5) {
        logger.warn(`Performance degradation detected: ${this.performanceMetrics.slowConnections} slow connections out of ${this.performanceMetrics.totalConnections} total`);
        this.performanceMetrics.slowConnections = 0; // Reset counter
      }
    }
  }

  /**
   * Start the cleanup timer
   * @private
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error('Error in cleanup timer:', error.message);
      }
    }, this.cleanupInterval);
  }

  /**
   * Start the health check timer
   * @private
   */
  startHealthCheckTimer() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        logger.error('Error in health check timer:', error.message);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop all timers and cleanup
   */
  destroy() {
    logger.info('Destroying ConnectionPool...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // Close all connections
    this.closeAllConnections();
    
    logger.info('ConnectionPool destroyed');
  }
}

module.exports = ConnectionPool; 