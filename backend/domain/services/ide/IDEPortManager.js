/**
 * IDE Port Manager
 * Centralized port management service with intelligent selection and fallback strategies
 */

const Logger = require('@logging/Logger');
const logger = new Logger('IDEPortManager');

class IDEPortManager {
  constructor(ideManager, eventBus) {
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.activePort = null;
    this.portPreferences = new Map();
    this.portHealth = new Map();
    this.fallbackStrategies = [
      'previously_active',
      'first_available',
      'healthiest_ide',
      'default_port_range'
    ];
    this.healthCheckInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.initialized = false; // Add initialization guard
    this.initializing = false; // Add initialization lock
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for port management
   */
  setupEventHandlers() {
    if (this.eventBus) {
      this.eventBus.subscribe('idePortFailure', async (eventData) => {
        logger.info('Received idePortFailure event:', eventData);
        if (eventData.port) {
          await this.handlePortFailure(eventData.port, eventData.reason);
        }
      });

      this.eventBus.subscribe('ideHealthChanged', async (eventData) => {
        logger.info('Received ideHealthChanged event:', eventData);
        if (eventData.port) {
          this.portHealth.set(eventData.port, eventData.health);
        }
      });
    }
  }

  /**
   * Select active port using intelligent fallback strategies
   * @returns {Promise<number|null>} Selected active port
   */
  async selectActivePort() {
    logger.info('Selecting active port...');
    
    try {
      // Strategy 1: Previously active port
      const previouslyActive = await this.tryPreviouslyActivePort();
      if (previouslyActive) {
        logger.info('Using previously active port:', previouslyActive);
        return previouslyActive;
      }

      // Strategy 2: First available port
      const firstAvailable = await this.tryFirstAvailablePort();
      if (firstAvailable) {
        logger.info(`Using first available port: ${firstAvailable}`);
        return firstAvailable;
      }

      // Strategy 3: Healthiest IDE
      const healthiest = await this.tryHealthiestIDE();
      if (healthiest) {
        logger.info('Using healthiest IDE port:', healthiest);
        return healthiest;
      }

      // Strategy 4: Default port range
      const defaultPort = await this.tryDefaultPortRange();
      if (defaultPort) {
        logger.info('Using default port range port:', defaultPort);
        return defaultPort;
      }

      logger.warn('No active port could be selected');
      return null;
    } catch (error) {
      logger.error('Error selecting active port:', error);
      return null;
    }
  }

  /**
   * Try to use previously active port
   * @returns {Promise<number|null>} Previously active port if available and healthy
   */
  async tryPreviouslyActivePort() {
    if (!this.activePort) {
      return null;
    }

    const isValid = await this.validatePort(this.activePort);
    if (isValid) {
      return this.activePort;
    }

          logger.info(`Previously active port not available: ${this.activePort}`);
    return null;
  }

  /**
   * Try to use first available port
   * @returns {Promise<number|null>} First available port
   */
  async tryFirstAvailablePort() {
    try {
      // Use direct detection to avoid circular dependency
      const availableIDEs = await this.ideManager.detectorFactory.detectAll() || [];
      if (availableIDEs.length > 0) {
        // Sort by port number for consistent selection
        const sortedIDEs = availableIDEs.sort((a, b) => a.port - b.port);
        const firstIDE = sortedIDEs[0];
        
        // Try validation first
        const isValid = await this.validatePort(firstIDE.port);
        if (isValid) {
          return firstIDE.port;
        }
        
        // If validation fails but IDE is detected, use it anyway
        logger.info('Port validation failed for first IDE, but using it anyway:', firstIDE.port);
        return firstIDE.port;
      }
    } catch (error) {
      logger.error('Error getting first available port:', error);
    }
    
    return null;
  }

  /**
   * Try to use healthiest IDE
   * @returns {Promise<number|null>} Healthiest IDE port
   */
  async tryHealthiestIDE() {
    try {
      // Use direct detection to avoid circular dependency
      const availableIDEs = await this.ideManager.detectorFactory.detectAll() || [];
      if (availableIDEs.length === 0) {
        return null;
      }

      // Score IDEs based on health and preferences
      const scoredIDEs = availableIDEs.map(ide => ({
        ...ide,
        score: this.calculateHealthScore(ide)
      }));

      // Sort by score (highest first)
      scoredIDEs.sort((a, b) => b.score - a.score);
      
      const bestIDE = scoredIDEs[0];
      const isValid = await this.validatePort(bestIDE.port);
      if (isValid) {
        return bestIDE.port;
      }
    } catch (error) {
      logger.error('Error getting healthiest IDE:', error);
    }
    
    return null;
  }

  /**
   * Try to use default port range
   * @returns {Promise<number|null>} Default port if available
   */
  async tryDefaultPortRange() {
    try {
      // Try common default ports
      const defaultPorts = [9222, 9223, 9224, 9225, 9226];
      
      for (const port of defaultPorts) {
        const isValid = await this.validatePort(port);
        if (isValid) {
          return port;
        }
      }
    } catch (error) {
      logger.error('Error trying default port range:', error);
    }
    
    return null;
  }

  /**
   * Calculate health score for an IDE
   * @param {Object} ide - IDE information
   * @returns {number} Health score (0-100)
   */
  calculateHealthScore(ide) {
    let score = 50; // Base score

    // Add points for good status
    if (ide.status === 'running') score += 20;
    if (ide.status === 'active') score += 10;
    
    // Add points for health status
    if (ide.healthStatus) {
      if (ide.healthStatus === 'healthy') score += 20;
      if (ide.healthStatus === 'warning') score += 10;
    }
    
    // Add points for workspace path
    if (ide.workspacePath) score += 10;
    
    // Add points for IDE type preference
    const preference = this.portPreferences.get(ide.port);
    if (preference) {
      score += preference.weight || 0;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Validate if a port is available and healthy
   * @param {number} port - Port to validate
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async validatePort(port) {
    // logger.info(`Validating port: ${port}`);
    try {
      const health = await this.performHealthCheck(port);
      // logger.info(`Health check result for port ${port}:`, health);
      if (health.healthy) {
        return true;
      } else {
        logger.warn(`Port ${port} is not healthy: ${health.reason}`);
        // Clean up stale IDE entry when validation fails
        if (this.ideManager && typeof this.ideManager.cleanupStaleIDEs === 'function') {
          logger.info(`Cleaning up stale IDE entry for port ${port} due to validation failure`);
          await this.ideManager.cleanupStaleIDEs(port);
        }
        return false;
      }
    } catch (error) {
      logger.error(`Error during port validation for port ${port}:`, error);
      // Clean up stale IDE entry when validation throws error
      if (this.ideManager && typeof this.ideManager.cleanupStaleIDEs === 'function') {
        logger.info(`Cleaning up stale IDE entry for port ${port} due to validation error`);
        await this.ideManager.cleanupStaleIDEs(port);
      }
      return false;
    }
  }

  /**
   * Check if port is in valid range
   * @param {number} port - Port to check
   * @returns {boolean} True if port is in valid range
   */
  isValidPortRange(port) {
    // Cursor: 9222-9231
    if (port >= 9222 && port <= 9231) return true;
    // VSCode: 9232-9241
    if (port >= 9232 && port <= 9241) return true;
    // Windsurf: 9242-9251
    if (port >= 9242 && port <= 9251) return true;
    
    return false;
  }

  /**
   * Perform health check on port
   * @param {number} port - Port to check
   * @returns {Promise<Object>} Health check result
   */
  async performHealthCheck(port) {
    try {
      // Use direct detection to avoid circular dependency
      const availableIDEs = await this.ideManager.detectorFactory.detectAll() || [];
      const ide = availableIDEs.find(ide => ide.port === port);
      // logger.info(`performHealthCheck: Looking for IDE on port ${port}. Found:`, !!ide);
      if (!ide) {
        logger.warn(`performHealthCheck: IDE not found for port ${port}`);
        return { healthy: false, reason: 'IDE not found' };
      }
      
      // If IDE is detected and running, consider it healthy
      // Workspace path will be assigned by IDEManager during initialization
      if (ide.status === 'running' || ide.status === 'active') {
        // logger.info(`performHealthCheck: IDE on port ${port} is healthy (detected and running)`);
        return { healthy: true, reason: 'IDE detected and running' };
      }
      
      // Check health status if available
      if (ide.healthStatus && ide.healthStatus.status === 'unhealthy') {
        logger.warn(`performHealthCheck: IDE reported unhealthy for port ${port}`);
        return { healthy: false, reason: 'IDE reported unhealthy' };
      }
      
      // If we have a workspace path, that's a bonus
      if (ide.workspacePath) {
        // logger.info(`performHealthCheck: IDE on port ${port} is healthy with workspace path`);
        return { healthy: true, reason: 'IDE with workspace path' };
      }
      
      // Default: if IDE is detected, consider it healthy
      // logger.info(`performHealthCheck: IDE on port ${port} is healthy (detected)`);
      return { healthy: true, reason: 'IDE detected' };
    } catch (error) {
      logger.error(`performHealthCheck: Error for port ${port}:`, error);
      return { healthy: false, reason: error.message };
    }
  }

  /**
   * Handle port failure with automatic recovery
   * @param {number} port - Failed port
   * @param {string} reason - Failure reason
   * @returns {Promise<number|null>} New active port
   */
  async handlePortFailure(port, reason = 'unknown') {
    logger.info('Handling port failure:', port, reason);
    
    // Remove failed port from preferences
    this.portPreferences.delete(port);
    this.portHealth.delete(port);
    
    // If this was the active port, select a new one
    if (this.activePort === port) {
      logger.info('Active port failed, selecting new port');
      const newPort = await this.selectActivePort();
      
      if (newPort) {
        await this.setActivePort(newPort);
        return newPort;
      }
    }
    
    return null;
  }

  /**
   * Set active port with validation
   * @param {number} port - Port to set as active
   * @returns {Promise<boolean>} True if successful
   */
  async setActivePort(port) {
    try {
      logger.info(`Setting active port: ${port}`);
      
      const isValid = await this.validatePort(port);
      if (!isValid) {
        logger.error('Port validation failed:', port);
        return false;
      }

      // Just update the active port - don't call ideManager.switchToIDE to avoid circular dependency
      this.activePort = port;
      
      // Update preferences
      this.portPreferences.set(port, {
        weight: 100,
        lastUsed: new Date().toISOString(),
        usageCount: (this.portPreferences.get(port)?.usageCount || 0) + 1
      });
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('activePortChanged', {
          port: port,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`Active port set successfully: ${port}`);
      return true;
    } catch (error) {
      logger.error('Error setting active port:', error);
      return false;
    }
  }

  /**
   * Get active port
   * @returns {number|null} Active port
   */
  getActivePort() {
    return this.activePort;
  }

  /**
   * Get port preferences
   * @returns {Map} Port preferences
   */
  getPortPreferences() {
    return new Map(this.portPreferences);
  }

  /**
   * Get port health information
   * @returns {Map} Port health information
   */
  getPortHealth() {
    return new Map(this.portHealth);
  }

  /**
   * Initialize port manager
   * @returns {Promise<void>}
   */
  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.initializing) {
      logger.info('Initialization already in progress, waiting...');
      // Wait for current initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Check if already initialized
    if (this.initialized) {
      logger.info('Already initialized');
      return;
    }

    this.initializing = true;
    logger.info('Initializing...');
    
    try {
      // Select initial active port
      const initialPort = await this.selectActivePort();
      if (initialPort) {
        await this.setActivePort(initialPort);
      }
      
      this.initialized = true;
      logger.info('Initialization complete');
    } catch (error) {
      logger.error('Initialization failed:', error);
      this.initialized = false;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Refresh port manager state
   * @returns {Promise<void>}
   */
  async refresh() {
    logger.info('Refreshing...');
    
    try {
      // Re-validate current active port
      if (this.activePort) {
        const isValid = await this.validatePort(this.activePort);
        if (!isValid) {
          logger.info('Current active port invalid, selecting new one');
          const newPort = await this.selectActivePort();
          if (newPort) {
            await this.setActivePort(newPort);
          }
        }
      } else {
        // No active port, select one
        const newPort = await this.selectActivePort();
        if (newPort) {
          await this.setActivePort(newPort);
        }
      }
      
      logger.info('Refresh complete');
    } catch (error) {
      logger.error('Refresh failed:', error);
    }
  }
}

module.exports = IDEPortManager; 