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
    this.maxConnections = options.maxConnections || 5;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.cleanupInterval = options.cleanupInterval || 60000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.host = options.host || '127.0.0.1';
    
    // Start cleanup timer
    this.cleanupTimer = null;
    this.healthCheckTimer = null;
    this.startCleanupTimer();
    this.startHealthCheckTimer();
    
    logger.info(`ConnectionPool initialized with maxConnections: ${this.maxConnections}`);
  }

  /**
   * Get a connection for the specified port, creating if necessary
   * @param {number} port - The port number
   * @returns {Promise<Object>} Connection object with browser and page
   */
  async getConnection(port) {
    try {
      // Check if connection already exists and is healthy
      if (this.connections.has(port)) {
        const connection = this.connections.get(port);
        
        // Update last used timestamp
        connection.lastUsed = Date.now();
        
        // Check if connection is healthy
        if (connection.health === 'healthy' && connection.browser && connection.page) {
          logger.debug(`Using existing connection for port ${port}`);
          return connection;
        }
        
        // Connection exists but unhealthy, remove it
        logger.warn(`Removing unhealthy connection for port ${port}`);
        await this.closeConnection(port);
      }
      
      // Create new connection
      logger.info(`Creating new connection for port ${port}`);
      return await this.createConnection(port);
      
    } catch (error) {
      logger.error(`Error getting connection for port ${port}:`, error.message);
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
      
      // Connect to Chrome DevTools Protocol
      const browser = await chromium.connectOverCDP(`http://${this.host}:${port}`, {
        timeout: this.connectionTimeout
      });
      
      // Get the first page
      const contexts = browser.contexts();
      const page = contexts[0].pages()[0];
      
      if (!page) {
        throw new Error(`No page found on port ${port}`);
      }

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
    const staleThreshold = now - (this.cleanupInterval * 2); // 2x cleanup interval
    
    logger.debug(`Cleaning up stale connections, threshold: ${staleThreshold}`);
    
    const stalePorts = [];
    for (const [port, connection] of this.connections) {
      if (connection.lastUsed < staleThreshold && connection.health !== 'healthy') {
        stalePorts.push(port);
      }
    }
    
    for (const port of stalePorts) {
      logger.debug(`Removing stale connection for port ${port}`);
      await this.closeConnection(port);
    }
    
    if (stalePorts.length > 0) {
      logger.info(`Cleaned up ${stalePorts.length} stale connections`);
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
          // Simple health check - try to get page title
          await connection.page.title();
          connection.health = 'healthy';
          logger.debug(`Health check passed for port ${port}`);
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
    
    // Remove failed connections
    const failedPorts = [];
    for (const [port, connection] of this.connections) {
      if (connection.health === 'failed') {
        failedPorts.push(port);
      }
    }
    
    for (const port of failedPorts) {
      logger.info(`Removing failed connection for port ${port}`);
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