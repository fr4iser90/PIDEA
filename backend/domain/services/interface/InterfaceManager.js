/**
 * InterfaceManager - Main interface management service
 * 
 * This service provides centralized management of all interface instances,
 * including registration, creation, lifecycle management, and discovery.
 * It implements the Registry pattern for interface type management and
 * provides a consistent API for interface operations.
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class InterfaceManager {
  /**
   * Constructor for InterfaceManager
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('InterfaceManager');
    this.eventBus = dependencies.eventBus || null;
    
    // Interface registry - maps interface types to their classes
    this.interfaceRegistry = new Map();
    
    // Active interface instances - maps interface IDs to instances
    this.activeInterfaces = new Map();
    
    // Interface configuration cache
    this.configCache = new Map();
    
    // Statistics tracking
    this.stats = {
      totalCreated: 0,
      totalDestroyed: 0,
      activeCount: 0,
      errorCount: 0,
      lastActivity: new Date()
    };
    
    this.logger.info('InterfaceManager initialized');
  }

  /**
   * Register an interface type with its implementation class
   * @param {string} interfaceType - Type identifier (e.g., 'ide', 'editor')
   * @param {Class} interfaceClass - Class that extends BaseInterface
   * @param {Object} config - Default configuration for this interface type
   * @returns {void}
   */
  registerInterface(interfaceType, interfaceClass, config = {}) {
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (!interfaceClass || typeof interfaceClass !== 'function') {
      throw new Error('interfaceClass must be a constructor function');
    }
    
    // Validate that the class extends BaseInterface
    const BaseInterface = require('./BaseInterface');
    if (!(interfaceClass.prototype instanceof BaseInterface)) {
      throw new Error('interfaceClass must extend BaseInterface');
    }
    
    this.interfaceRegistry.set(interfaceType, {
      class: interfaceClass,
      config: config,
      registeredAt: new Date()
    });
    
    this.logger.info(`Registered interface type: ${interfaceType}`, {
      interfaceType,
      className: interfaceClass.name,
      config
    });
    
    this._publishEvent('interface.registered', {
      interfaceType,
      className: interfaceClass.name
    });
  }

  /**
   * Unregister an interface type
   * @param {string} interfaceType - Type identifier to unregister
   * @returns {boolean} True if interface type was unregistered
   */
  unregisterInterface(interfaceType) {
    if (!this.interfaceRegistry.has(interfaceType)) {
      this.logger.warn(`Interface type not found for unregistration: ${interfaceType}`);
      return false;
    }
    
    // Check if there are active instances of this type
    const activeInstances = Array.from(this.activeInterfaces.values())
      .filter(instance => instance.type === interfaceType);
    
    if (activeInstances.length > 0) {
      this.logger.warn(`Cannot unregister interface type ${interfaceType} - ${activeInstances.length} active instances exist`);
      return false;
    }
    
    this.interfaceRegistry.delete(interfaceType);
    this.logger.info(`Unregistered interface type: ${interfaceType}`);
    
    this._publishEvent('interface.unregistered', { interfaceType });
    return true;
  }

  /**
   * Create a new interface instance
   * @param {string} interfaceType - Type of interface to create
   * @param {Object} config - Configuration for the interface
   * @param {string} interfaceId - Optional custom ID, will be generated if not provided
   * @returns {Promise<BaseInterface>} Created interface instance
   */
  async createInterface(interfaceType, config = {}, interfaceId = null) {
    if (!this.interfaceRegistry.has(interfaceType)) {
      throw new Error(`Interface type '${interfaceType}' is not registered`);
    }
    
    // Generate ID if not provided
    if (!interfaceId) {
      interfaceId = this._generateInterfaceId(interfaceType);
    }
    
    // Check if ID already exists
    if (this.activeInterfaces.has(interfaceId)) {
      throw new Error(`Interface with ID '${interfaceId}' already exists`);
    }
    
    try {
      const registryEntry = this.interfaceRegistry.get(interfaceType);
      const InterfaceClass = registryEntry.class;
      
      // Merge default config with provided config
      const mergedConfig = { ...registryEntry.config, ...config };
      
      // Create interface instance
      const interfaceInstance = new InterfaceClass(
        interfaceId,
        interfaceType,
        mergedConfig,
        { logger: this.logger, eventBus: this.eventBus }
      );
      
      // Store in active interfaces
      this.activeInterfaces.set(interfaceId, interfaceInstance);
      
      // Update statistics
      this.stats.totalCreated++;
      this.stats.activeCount++;
      this.stats.lastActivity = new Date();
      
      this.logger.info(`Created interface instance: ${interfaceId}`, {
        interfaceId,
        interfaceType,
        config: mergedConfig
      });
      
      this._publishEvent('interface.created', {
        interfaceId,
        interfaceType,
        config: mergedConfig
      });
      
      return interfaceInstance;
      
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to create interface: ${interfaceId}`, {
        interfaceId,
        interfaceType,
        error: error.message,
        stack: error.stack
      });
      
      this._publishEvent('interface.creation_failed', {
        interfaceId,
        interfaceType,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get an interface instance by ID
   * @param {string} interfaceId - Interface ID
   * @returns {BaseInterface|null} Interface instance or null if not found
   */
  getInterface(interfaceId) {
    return this.activeInterfaces.get(interfaceId) || null;
  }

  /**
   * Get all active interface instances
   * @returns {Array<BaseInterface>} Array of active interface instances
   */
  getAllInterfaces() {
    return Array.from(this.activeInterfaces.values());
  }

  /**
   * Get interfaces by type
   * @param {string} interfaceType - Interface type to filter by
   * @returns {Array<BaseInterface>} Array of interfaces of the specified type
   */
  getInterfacesByType(interfaceType) {
    return Array.from(this.activeInterfaces.values())
      .filter(interfaceInstance => interfaceInstance.type === interfaceType);
  }

  /**
   * Remove an interface instance
   * @param {string} interfaceId - Interface ID to remove
   * @returns {Promise<boolean>} True if interface was removed
   */
  async removeInterface(interfaceId) {
    const interfaceInstance = this.activeInterfaces.get(interfaceId);
    if (!interfaceInstance) {
      this.logger.warn(`Interface not found for removal: ${interfaceId}`);
      return false;
    }
    
    try {
      // Destroy the interface instance
      await interfaceInstance.destroy();
      
      // Remove from active interfaces
      this.activeInterfaces.delete(interfaceId);
      
      // Update statistics
      this.stats.totalDestroyed++;
      this.stats.activeCount--;
      this.stats.lastActivity = new Date();
      
      this.logger.info(`Removed interface instance: ${interfaceId}`, {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      this._publishEvent('interface.removed', {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      return true;
      
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to remove interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack
      });
      
      this._publishEvent('interface.removal_failed', {
        interfaceId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Start an interface instance
   * @param {string} interfaceId - Interface ID to start
   * @returns {Promise<boolean>} True if interface was started successfully
   */
  async startInterface(interfaceId) {
    const interfaceInstance = this.activeInterfaces.get(interfaceId);
    if (!interfaceInstance) {
      throw new Error(`Interface not found: ${interfaceId}`);
    }
    
    try {
      await interfaceInstance.start();
      this.stats.lastActivity = new Date();
      
      this.logger.info(`Started interface: ${interfaceId}`, {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      this._publishEvent('interface.started', {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      return true;
      
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to start interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack
      });
      
      this._publishEvent('interface.start_failed', {
        interfaceId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Stop an interface instance
   * @param {string} interfaceId - Interface ID to stop
   * @returns {Promise<boolean>} True if interface was stopped successfully
   */
  async stopInterface(interfaceId) {
    const interfaceInstance = this.activeInterfaces.get(interfaceId);
    if (!interfaceInstance) {
      throw new Error(`Interface not found: ${interfaceId}`);
    }
    
    try {
      await interfaceInstance.stop();
      this.stats.lastActivity = new Date();
      
      this.logger.info(`Stopped interface: ${interfaceId}`, {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      this._publishEvent('interface.stopped', {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      return true;
      
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to stop interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack
      });
      
      this._publishEvent('interface.stop_failed', {
        interfaceId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Restart an interface instance
   * @param {string} interfaceId - Interface ID to restart
   * @returns {Promise<boolean>} True if interface was restarted successfully
   */
  async restartInterface(interfaceId) {
    const interfaceInstance = this.activeInterfaces.get(interfaceId);
    if (!interfaceInstance) {
      throw new Error(`Interface not found: ${interfaceId}`);
    }
    
    try {
      await interfaceInstance.stop();
      await interfaceInstance.start();
      this.stats.lastActivity = new Date();
      
      this.logger.info(`Restarted interface: ${interfaceId}`, {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      this._publishEvent('interface.restarted', {
        interfaceId,
        interfaceType: interfaceInstance.type
      });
      
      return true;
      
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to restart interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack
      });
      
      this._publishEvent('interface.restart_failed', {
        interfaceId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Discover available interface types
   * @returns {Array<string>} Array of registered interface types
   */
  getAvailableTypes() {
    return Array.from(this.interfaceRegistry.keys());
  }

  /**
   * Get interface registry information
   * @returns {Object} Registry information
   */
  getRegistryInfo() {
    const registryInfo = {};
    for (const [type, entry] of this.interfaceRegistry.entries()) {
      registryInfo[type] = {
        className: entry.class.name,
        registeredAt: entry.registeredAt,
        config: entry.config
      };
    }
    return registryInfo;
  }

  /**
   * Get interface manager statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      registeredTypes: this.interfaceRegistry.size,
      activeInterfaces: this.activeInterfaces.size,
      interfaceTypes: this.getAvailableTypes()
    };
  }

  /**
   * Get interface status summary
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const interfaces = this.getAllInterfaces();
    const statusCounts = {};
    
    interfaces.forEach(interfaceInstance => {
      const status = interfaceInstance.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return {
      total: interfaces.length,
      statusCounts,
      types: this.getAvailableTypes(),
      lastActivity: this.stats.lastActivity
    };
  }

  /**
   * Generate a unique interface ID
   * @private
   * @param {string} interfaceType - Interface type
   * @returns {string} Generated interface ID
   */
  _generateInterfaceId(interfaceType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${interfaceType}_${timestamp}_${random}`;
  }

  /**
   * Publish an event to the event bus
   * @private
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @returns {void}
   */
  _publishEvent(eventName, data) {
    if (this.eventBus && typeof this.eventBus.publish === 'function') {
      try {
        this.eventBus.publish(eventName, {
          source: 'InterfaceManager',
          timestamp: new Date().toISOString(),
          ...data
        });
      } catch (error) {
        this.logger.warn(`Failed to publish event: ${eventName}`, {
          eventName,
          error: error.message
        });
      }
    }
  }

  /**
   * Clean up resources and destroy all interfaces
   * @returns {Promise<void>}
   */
  async destroy() {
    this.logger.info('Destroying InterfaceManager and all interfaces');
    
    // Stop and destroy all active interfaces
    const interfaceIds = Array.from(this.activeInterfaces.keys());
    for (const interfaceId of interfaceIds) {
      try {
        await this.removeInterface(interfaceId);
      } catch (error) {
        this.logger.error(`Failed to destroy interface during cleanup: ${interfaceId}`, {
          interfaceId,
          error: error.message
        });
      }
    }
    
    // Clear registry and cache
    this.interfaceRegistry.clear();
    this.configCache.clear();
    
    this.logger.info('InterfaceManager destroyed');
  }
}

module.exports = InterfaceManager;
