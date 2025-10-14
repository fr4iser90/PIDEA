/**
 * InterfaceManager - Main interface management service
 *
 * This service provides centralized management of all interface instances,
 * including registration, creation, lifecycle management, and discovery.
 * It implements the Registry pattern for interface type management and
 * provides a consistent API for interface operations.
 */
const Logger = require("@logging/Logger");
const ServiceLogger = require("@logging/ServiceLogger");

class InterfaceManager {
  /**
   * Constructor for InterfaceManager
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger("InterfaceManager");
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
      lastActivity: new Date(),
    };

    // IDE handler is not an interface - it's a service handler
    // IDE interfaces are registered separately in Application.js

    // WebChat handler is not an interface - it's a service handler

    // API handler is not an interface - it's a service handler

    // Terminal handler is not an interface - it's a service handler

    // File handler is not an interface - it's a service handler

    // IDE handler is now managed separately in ServiceRegistry
    // No need to initialize it here

    // Store dependencies for later use
    this.dependencies = dependencies;
  }

  /**
   * Register an interface type with its implementation class
   * @param {string} interfaceType - Type identifier (e.g., 'ide', 'editor')
   * @param {Class} interfaceClass - Class that extends BaseInterface
   * @param {Object} config - Default configuration for this interface type
   * @returns {void}
   */
  registerInterface(interfaceType, interfaceClass, config = {}) {
    if (!interfaceType || typeof interfaceType !== "string") {
      throw new Error("interfaceType must be a non-empty string");
    }

    if (!interfaceClass || typeof interfaceClass !== "function") {
      throw new Error("interfaceClass must be a constructor function");
    }

    // Validate that the class extends BaseInterface
    const BaseInterface = require("./BaseInterface");
    if (!(interfaceClass.prototype instanceof BaseInterface)) {
      throw new Error("interfaceClass must extend BaseInterface");
    }

    this.interfaceRegistry.set(interfaceType, {
      class: interfaceClass,
      config: config,
      registeredAt: new Date(),
    });

    this.logger.info(`Registered interface type: ${interfaceType}`, {
      interfaceType,
      className: interfaceClass.name,
      config,
    });

    this._publishEvent("interface.registered", {
      interfaceType,
      className: interfaceClass.name,
    });
  }

  /**
   * Get handler for interface type
   * @param {string} interfaceType - Interface type
   * @returns {Object} Handler instance
   */
  getHandler(interfaceType) {
    const handlerEntry = this.interfaceRegistry.get(interfaceType);
    if (!handlerEntry) {
      throw new Error(`Unknown interface type: ${interfaceType}`);
    }

    const handlerClass = handlerEntry.class;

    // If it's a class, instantiate it with dependencies
    if (typeof handlerClass === "function") {
      return new handlerClass({
        ideManager: this.dependencies?.ideManager,
        eventBus: this.dependencies?.eventBus,
        serviceRegistry: this.dependencies?.serviceRegistry,
        logger: this.logger,
      });
    }

    return handlerClass;
  }

  /**
   * Unregister an interface type
   * @param {string} interfaceType - Type identifier to unregister
   * @returns {boolean} True if interface type was unregistered
   */
  unregisterInterface(interfaceType) {
    if (!this.interfaceRegistry.has(interfaceType)) {
      this.logger.warn(
        `Interface type not found for unregistration: ${interfaceType}`,
      );
      return false;
    }

    // Check if there are active instances of this type
    const activeInstances = Array.from(this.activeInterfaces.values()).filter(
      (instance) => instance.type === interfaceType,
    );

    if (activeInstances.length > 0) {
      this.logger.warn(
        `Cannot unregister interface type ${interfaceType} - ${activeInstances.length} active instances exist`,
      );
      return false;
    }

    this.interfaceRegistry.delete(interfaceType);
    this.logger.info(`Unregistered interface type: ${interfaceType}`);

    this._publishEvent("interface.unregistered", { interfaceType });
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
        { logger: this.logger, eventBus: this.eventBus },
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
        config: mergedConfig,
      });

      this._publishEvent("interface.created", {
        interfaceId,
        interfaceType,
        config: mergedConfig,
      });

      return interfaceInstance;
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to create interface: ${interfaceId}`, {
        interfaceId,
        interfaceType,
        error: error.message,
        stack: error.stack,
      });

      this._publishEvent("interface.creation_failed", {
        interfaceId,
        interfaceType,
        error: error.message,
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
    return Array.from(this.activeInterfaces.values()).filter(
      (interfaceInstance) => interfaceInstance.type === interfaceType,
    );
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
        interfaceType: interfaceInstance.type,
      });

      this._publishEvent("interface.removed", {
        interfaceId,
        interfaceType: interfaceInstance.type,
      });

      return true;
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to remove interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack,
      });

      this._publishEvent("interface.removal_failed", {
        interfaceId,
        error: error.message,
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
        interfaceType: interfaceInstance.type,
      });

      this._publishEvent("interface.started", {
        interfaceId,
        interfaceType: interfaceInstance.type,
      });

      return true;
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to start interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack,
      });

      this._publishEvent("interface.start_failed", {
        interfaceId,
        error: error.message,
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
        interfaceType: interfaceInstance.type,
      });

      this._publishEvent("interface.stopped", {
        interfaceId,
        interfaceType: interfaceInstance.type,
      });

      return true;
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to stop interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack,
      });

      this._publishEvent("interface.stop_failed", {
        interfaceId,
        error: error.message,
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
        interfaceType: interfaceInstance.type,
      });

      this._publishEvent("interface.restarted", {
        interfaceId,
        interfaceType: interfaceInstance.type,
      });

      return true;
    } catch (error) {
      this.stats.errorCount++;
      this.logger.error(`Failed to restart interface: ${interfaceId}`, {
        interfaceId,
        error: error.message,
        stack: error.stack,
      });

      this._publishEvent("interface.restart_failed", {
        interfaceId,
        error: error.message,
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
        config: entry.config,
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
      interfaceTypes: this.getAvailableTypes(),
    };
  }

  /**
   * Get interface status summary
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const interfaces = this.getAllInterfaces();
    const statusCounts = {};

    interfaces.forEach((interfaceInstance) => {
      const status = interfaceInstance.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      total: interfaces.length,
      statusCounts,
      types: this.getAvailableTypes(),
      lastActivity: this.stats.lastActivity,
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
    if (this.eventBus && typeof this.eventBus.publish === "function") {
      try {
        this.eventBus.publish(eventName, {
          source: "InterfaceManager",
          timestamp: new Date().toISOString(),
          ...data,
        });
      } catch (error) {
        this.logger.warn(`Failed to publish event: ${eventName}`, {
          eventName,
          error: error.message,
        });
      }
    }
  }

  /**
   * Clean up resources and destroy all interfaces
   * @returns {Promise<void>}
   */
  async destroy() {
    this.logger.info("Destroying InterfaceManager and all interfaces");

    // Stop and destroy all active interfaces
    const interfaceIds = Array.from(this.activeInterfaces.keys());
    for (const interfaceId of interfaceIds) {
      try {
        await this.removeInterface(interfaceId);
      } catch (error) {
        this.logger.error(
          `Failed to destroy interface during cleanup: ${interfaceId}`,
          {
            interfaceId,
            error: error.message,
          },
        );
      }
    }

    // Clear registry and cache
    this.interfaceRegistry.clear();
    this.configCache.clear();

    this.logger.info("InterfaceManager destroyed");
  }

  /**
   * Create interface within project context
   * @param {string} projectId - Project identifier
   * @param {Object} interfaceData - Interface creation data
   * @returns {Promise<Object>} Created interface
   */
  async createInterface(projectId, interfaceData) {
    try {
      const { name, type, configuration = {} } = interfaceData;

      // Generate unique interface ID
      const interfaceId = `interface_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create interface instance
      const interfaceInstance = await this.createInterface(
        type,
        {
          ...configuration,
          projectId,
          name,
        },
        interfaceId,
      );

      // Get interface schema for validation
      const interfaceInfo = this.interfaceRegistry.get(type);
      const schema = interfaceInfo.schema || interfaceInfo.config;

      // Validate configuration against schema
      const validationResult = this.validateInterfaceConfig(
        configuration,
        schema,
      );
      if (!validationResult.valid) {
        throw new Error(
          `Configuration validation failed: ${validationResult.errors.join(", ")}`,
        );
      }

      // Apply schema defaults
      const finalConfig = this.applySchemaDefaults(configuration, schema);

      // Store in active interfaces with project context
      this.activeInterfaces.set(interfaceId, {
        ...interfaceInstance,
        projectId,
        name,
        type,
        status: "created",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.stats.totalCreated++;
      this.stats.activeCount++;
      this.stats.lastActivity = new Date();

      this.logger.info(
        `Interface created: ${interfaceId} for project: ${projectId}`,
        {
          interfaceId,
          projectId,
          name,
          type,
        },
      );

      return {
        id: interfaceId,
        name,
        type,
        projectId,
        configuration: finalConfig,
        status: "created",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to create interface:", error);
      throw new Error(`Failed to create interface: ${error.message}`);
    }
  }

  /**
   * Get interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<Object|null>} Interface data or null if not found
   */
  async getInterface(projectId, interfaceId) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return null;
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return null;
      }

      return {
        id: interfaceId,
        name: interfaceInstance.name,
        type: interfaceInstance.type,
        projectId: interfaceInstance.projectId,
        configuration: interfaceInstance.configuration,
        status: interfaceInstance.status,
        createdAt: interfaceInstance.createdAt,
        updatedAt: interfaceInstance.updatedAt,
      };
    } catch (error) {
      this.logger.error("Failed to get interface:", error);
      throw new Error(`Failed to get interface: ${error.message}`);
    }
  }

  /**
   * Update interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated interface or null if not found
   */
  async updateInterface(projectId, interfaceId, updateData) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return null;
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return null;
      }

      // Update interface data
      const updatedInterface = {
        ...interfaceInstance,
        ...updateData,
        updatedAt: new Date(),
      };

      this.activeInterfaces.set(interfaceId, updatedInterface);

      this.logger.info(
        `Interface updated: ${interfaceId} for project: ${projectId}`,
        {
          interfaceId,
          projectId,
          updateData,
        },
      );

      return {
        id: interfaceId,
        name: updatedInterface.name,
        type: updatedInterface.type,
        projectId: updatedInterface.projectId,
        configuration: updatedInterface.configuration,
        status: updatedInterface.status,
        createdAt: updatedInterface.createdAt,
        updatedAt: updatedInterface.updatedAt,
      };
    } catch (error) {
      this.logger.error("Failed to update interface:", error);
      throw new Error(`Failed to update interface: ${error.message}`);
    }
  }

  /**
   * Delete interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<boolean>} True if interface was deleted
   */
  async deleteInterface(projectId, interfaceId) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return false;
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return false;
      }

      // Stop interface if running
      if (interfaceInstance.status === "running") {
        await this.stopInterface(projectId, interfaceId);
      }

      // Remove from active interfaces
      this.activeInterfaces.delete(interfaceId);

      this.stats.totalDestroyed++;
      this.stats.activeCount--;
      this.stats.lastActivity = new Date();

      this.logger.info(
        `Interface deleted: ${interfaceId} for project: ${projectId}`,
        {
          interfaceId,
          projectId,
        },
      );

      return true;
    } catch (error) {
      this.logger.error("Failed to delete interface:", error);
      throw new Error(`Failed to delete interface: ${error.message}`);
    }
  }

  /**
   * List interfaces for a project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of interfaces with pagination info
   */
  async listInterfaces(projectId, options = {}) {
    try {
      const { page = 1, limit = 10, type, status } = options;
      const offset = (page - 1) * limit;

      // Filter interfaces by project
      let projectInterfaces = Array.from(this.activeInterfaces.values()).filter(
        (interfaceInstance) => interfaceInstance.projectId === projectId,
      );

      // Apply filters
      if (type) {
        projectInterfaces = projectInterfaces.filter(
          (interfaceInstance) => interfaceInstance.type === type,
        );
      }

      if (status) {
        projectInterfaces = projectInterfaces.filter(
          (interfaceInstance) => interfaceInstance.status === status,
        );
      }

      // Apply pagination
      const total = projectInterfaces.length;
      const paginatedInterfaces = projectInterfaces.slice(
        offset,
        offset + limit,
      );

      const interfaces = paginatedInterfaces.map((interfaceInstance) => ({
        id: interfaceInstance.interfaceId || interfaceInstance.id,
        name: interfaceInstance.name,
        type: interfaceInstance.type,
        projectId: interfaceInstance.projectId,
        configuration: interfaceInstance.configuration,
        status: interfaceInstance.status,
        createdAt: interfaceInstance.createdAt,
        updatedAt: interfaceInstance.updatedAt,
      }));

      return {
        interfaces,
        total,
      };
    } catch (error) {
      this.logger.error("Failed to list interfaces:", error);
      throw new Error(`Failed to list interfaces: ${error.message}`);
    }
  }

  /**
   * Start interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<Object>} Start result
   */
  async startInterface(projectId, interfaceId) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return { error: "Interface not found" };
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return { error: "Interface not found" };
      }

      // Check if already running
      if (interfaceInstance.status === "running") {
        return { error: "Interface already running" };
      }

      // Update status to starting
      interfaceInstance.status = "starting";
      interfaceInstance.updatedAt = new Date();

      // Simulate interface start (in real implementation, this would start the actual interface)
      setTimeout(() => {
        interfaceInstance.status = "running";
        interfaceInstance.updatedAt = new Date();
        this.logger.info(
          `Interface started: ${interfaceId} for project: ${projectId}`,
        );
      }, 1000);

      return {
        interface: {
          id: interfaceId,
          name: interfaceInstance.name,
          type: interfaceInstance.type,
          projectId: interfaceInstance.projectId,
          status: "starting",
          createdAt: interfaceInstance.createdAt,
          updatedAt: interfaceInstance.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error("Failed to start interface:", error);
      return { error: error.message };
    }
  }

  /**
   * Stop interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopInterface(projectId, interfaceId) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return { error: "Interface not found" };
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return { error: "Interface not found" };
      }

      // Check if already stopped
      if (interfaceInstance.status === "stopped") {
        return { error: "Interface already stopped" };
      }

      // Update status to stopping
      interfaceInstance.status = "stopping";
      interfaceInstance.updatedAt = new Date();

      // Simulate interface stop (in real implementation, this would stop the actual interface)
      setTimeout(() => {
        interfaceInstance.status = "stopped";
        interfaceInstance.updatedAt = new Date();
        this.logger.info(
          `Interface stopped: ${interfaceId} for project: ${projectId}`,
        );
      }, 1000);

      return {
        interface: {
          id: interfaceId,
          name: interfaceInstance.name,
          type: interfaceInstance.type,
          projectId: interfaceInstance.projectId,
          status: "stopping",
          createdAt: interfaceInstance.createdAt,
          updatedAt: interfaceInstance.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error("Failed to stop interface:", error);
      return { error: error.message };
    }
  }

  /**
   * Restart interface within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<Object>} Restart result
   */
  async restartInterface(projectId, interfaceId) {
    try {
      // Stop interface first
      const stopResult = await this.stopInterface(projectId, interfaceId);
      if (!stopResult.success) {
        return stopResult;
      }

      // Wait a moment then start
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Start interface
      const startResult = await this.startInterface(projectId, interfaceId);
      return startResult;
    } catch (error) {
      this.logger.error("Failed to restart interface:", error);
      return { error: error.message };
    }
  }

  /**
   * Get interface status within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<Object|null>} Interface status or null if not found
   */
  async getInterfaceStatus(projectId, interfaceId) {
    try {
      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return null;
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return null;
      }

      return {
        status: interfaceInstance.status,
        running: interfaceInstance.status === "running",
        port: interfaceInstance.configuration?.port || null,
        pid: interfaceInstance.configuration?.pid || null,
        lastActivity: interfaceInstance.updatedAt,
      };
    } catch (error) {
      this.logger.error("Failed to get interface status:", error);
      throw new Error(`Failed to get interface status: ${error.message}`);
    }
  }

  /**
   * Get interface logs within project context
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @param {Object} options - Log options
   * @returns {Promise<Array|null>} Interface logs or null if not found
   */
  async getInterfaceLogs(projectId, interfaceId, options = {}) {
    try {
      const { lines = 100 } = options;

      const interfaceInstance = this.activeInterfaces.get(interfaceId);

      if (!interfaceInstance) {
        return null;
      }

      // Verify interface belongs to project
      if (interfaceInstance.projectId !== projectId) {
        return null;
      }

      // Simulate log generation (in real implementation, this would read actual logs)
      const logs = Array.from(
        { length: Math.min(lines, 50) },
        (_, i) =>
          `[${new Date().toISOString()}] Interface ${interfaceId} log line ${i + 1}`,
      );

      return logs;
    } catch (error) {
      this.logger.error("Failed to get interface logs:", error);
      throw new Error(`Failed to get interface logs: ${error.message}`);
    }
  }

  /**
   * Get available IDEs
   * @returns {Promise<Array>} Available IDEs
   */
  async getAvailableIDEs() {
    try {
      // Use IDE handler from dependencies (ServiceRegistry)
      const ideHandler = this.dependencies?.ideHandler;
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.getAvailableIDEs();
    } catch (error) {
      this.logger.error("Failed to get available IDEs:", error);
      throw error;
    }
  }

  /**
   * Get IDE features
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} IDE features
   */
  async getIDEFeatures(interfaceId) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.getIDEFeatures(
        interfaceInstance.configuration?.port,
      );
    } catch (error) {
      this.logger.error("Failed to get IDE features:", error);
      throw error;
    }
  }

  /**
   * Get IDE version
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<string>} IDE version
   */
  async getIDEVersion(interfaceId) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.getIDEVersion(
        interfaceInstance.configuration?.port,
      );
    } catch (error) {
      this.logger.error("Failed to get IDE version:", error);
      throw error;
    }
  }

  /**
   * Get workspace info
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} Workspace information
   */
  async getWorkspaceInfo(interfaceId) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.getWorkspaceInfo(
        interfaceInstance.configuration?.port,
      );
    } catch (error) {
      this.logger.error("Failed to get workspace info:", error);
      throw error;
    }
  }

  /**
   * Set workspace path
   * @param {string} interfaceId - Interface ID
   * @param {string} workspacePath - New workspace path
   * @returns {Promise<Object>} Set result
   */
  async setWorkspacePath(interfaceId, workspacePath) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.setWorkspacePath(
        interfaceInstance.configuration?.port,
        workspacePath,
      );
    } catch (error) {
      this.logger.error("Failed to set workspace path:", error);
      throw error;
    }
  }

  /**
   * Detect workspace paths
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Array>} Detected workspace paths
   */
  async detectWorkspacePaths(interfaceId) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.detectWorkspacePaths(
        interfaceInstance.configuration?.port,
      );
    } catch (error) {
      this.logger.error("Failed to detect workspace paths:", error);
      throw error;
    }
  }

  /**
   * Monitor terminal
   * @param {string} interfaceId - Interface ID
   * @param {Object} options - Monitor options
   * @returns {Promise<Object>} Monitor result
   */
  async monitorTerminal(interfaceId, options = {}) {
    try {
      const interfaceInstance = this.getInterfaceInstance(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface ${interfaceId} not found`);
      }

      const ideHandler = this.getHandler("ide");
      if (!ideHandler) {
        throw new Error("IDE handler not available");
      }

      return await ideHandler.monitorTerminal(
        interfaceInstance.configuration?.port,
        options,
      );
    } catch (error) {
      this.logger.error("Failed to monitor terminal:", error);
      throw error;
    }
  }

  /**
   * Validate interface configuration against schema
   * @param {Object} config - Configuration to validate
   * @param {Object} schema - Schema definition
   * @returns {Object} Validation result
   */
  validateInterfaceConfig(config, schema) {
    const errors = [];

    if (!schema) {
      return { valid: true, errors: [] };
    }

    // Check required fields
    for (const [field, fieldSchema] of Object.entries(schema)) {
      if (
        fieldSchema.required &&
        (config[field] === undefined || config[field] === null)
      ) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      if (config[field] !== undefined) {
        // Type validation
        if (
          fieldSchema.type === "number" &&
          typeof config[field] !== "number"
        ) {
          errors.push(`Field '${field}' must be a number`);
        } else if (
          fieldSchema.type === "string" &&
          typeof config[field] !== "string"
        ) {
          errors.push(`Field '${field}' must be a string`);
        } else if (
          fieldSchema.type === "boolean" &&
          typeof config[field] !== "boolean"
        ) {
          errors.push(`Field '${field}' must be a boolean`);
        }

        // Range validation for numbers
        if (fieldSchema.type === "number") {
          if (
            fieldSchema.min !== undefined &&
            config[field] < fieldSchema.min
          ) {
            errors.push(`Field '${field}' must be >= ${fieldSchema.min}`);
          }
          if (
            fieldSchema.max !== undefined &&
            config[field] > fieldSchema.max
          ) {
            errors.push(`Field '${field}' must be <= ${fieldSchema.max}`);
          }
        }

        // String length validation
        if (fieldSchema.type === "string") {
          if (
            fieldSchema.minLength !== undefined &&
            config[field].length < fieldSchema.minLength
          ) {
            errors.push(
              `Field '${field}' must be at least ${fieldSchema.minLength} characters`,
            );
          }
          if (
            fieldSchema.maxLength !== undefined &&
            config[field].length > fieldSchema.maxLength
          ) {
            errors.push(
              `Field '${field}' must be at most ${fieldSchema.maxLength} characters`,
            );
          }
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(config[field])) {
          errors.push(
            `Field '${field}' must be one of: ${fieldSchema.enum.join(", ")}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply schema defaults to configuration
   * @param {Object} config - Configuration
   * @param {Object} schema - Schema definition
   * @returns {Object} Configuration with defaults applied
   */
  applySchemaDefaults(config, schema) {
    if (!schema) {
      return config;
    }

    const result = { ...config };

    for (const [field, fieldSchema] of Object.entries(schema)) {
      if (result[field] === undefined && fieldSchema.default !== undefined) {
        result[field] = fieldSchema.default;
      }
    }

    return result;
  }
}

module.exports = InterfaceManager;
