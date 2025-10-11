/**
 * InterfaceFactory - Factory for creating interface instances
 * 
 * This factory implements the Factory pattern to create interface instances
 * based on type detection and configuration. It provides a centralized
 * way to create interfaces with proper configuration and dependency injection.
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class InterfaceFactory {
  /**
   * Constructor for InterfaceFactory
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('InterfaceFactory');
    this.interfaceManager = dependencies.interfaceManager || null;
    this.configService = dependencies.configService || null;
    
    // Factory configuration
    this.defaultConfigs = new Map();
    this.typeDetectors = new Map();
    this.creationHooks = new Map();
    
    this.logger.info('InterfaceFactory initialized');
  }

  /**
   * Register a default configuration for an interface type
   * @param {string} interfaceType - Interface type
   * @param {Object} config - Default configuration
   * @returns {void}
   */
  registerDefaultConfig(interfaceType, config) {
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (typeof config !== 'object' || config === null) {
      throw new Error('config must be an object');
    }
    
    this.defaultConfigs.set(interfaceType, config);
    this.logger.info(`Registered default config for interface type: ${interfaceType}`, {
      interfaceType,
      config
    });
  }

  /**
   * Register a type detector function
   * @param {string} interfaceType - Interface type
   * @param {Function} detector - Function that detects if this type should be used
   * @returns {void}
   */
  registerTypeDetector(interfaceType, detector) {
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (typeof detector !== 'function') {
      throw new Error('detector must be a function');
    }
    
    this.typeDetectors.set(interfaceType, detector);
    this.logger.info(`Registered type detector for interface type: ${interfaceType}`);
  }

  /**
   * Register a creation hook for an interface type
   * @param {string} interfaceType - Interface type
   * @param {Function} hook - Function to call after interface creation
   * @returns {void}
   */
  registerCreationHook(interfaceType, hook) {
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (typeof hook !== 'function') {
      throw new Error('hook must be a function');
    }
    
    this.creationHooks.set(interfaceType, hook);
    this.logger.info(`Registered creation hook for interface type: ${interfaceType}`);
  }

  /**
   * Detect the appropriate interface type based on context
   * @param {Object} context - Context for type detection
   * @returns {Promise<string|null>} Detected interface type or null
   */
  async detectInterfaceType(context = {}) {
    const availableTypes = this.interfaceManager ? 
      this.interfaceManager.getAvailableTypes() : 
      Array.from(this.defaultConfigs.keys());
    
    for (const interfaceType of availableTypes) {
      const detector = this.typeDetectors.get(interfaceType);
      if (detector) {
        try {
          const shouldUse = await detector(context);
          if (shouldUse) {
            this.logger.debug(`Detected interface type: ${interfaceType}`, {
              interfaceType,
              context
            });
            return interfaceType;
          }
        } catch (error) {
          this.logger.warn(`Type detector failed for ${interfaceType}`, {
            interfaceType,
            error: error.message
          });
        }
      }
    }
    
    this.logger.debug('No interface type detected', { context });
    return null;
  }

  /**
   * Create an interface instance with automatic type detection
   * @param {Object} context - Context for type detection
   * @param {Object} config - Additional configuration
   * @param {string} interfaceId - Optional custom ID
   * @returns {Promise<BaseInterface>} Created interface instance
   */
  async createInterface(context = {}, config = {}, interfaceId = null) {
    if (!this.interfaceManager) {
      throw new Error('InterfaceManager is required for interface creation');
    }
    
    // Detect interface type
    const detectedType = await this.detectInterfaceType(context);
    if (!detectedType) {
      throw new Error('Could not detect appropriate interface type');
    }
    
    // Merge configurations
    const mergedConfig = this._mergeConfigurations(detectedType, config);
    
    // Create interface instance
    const interfaceInstance = await this.interfaceManager.createInterface(
      detectedType,
      mergedConfig,
      interfaceId
    );
    
    // Execute creation hook if registered
    await this._executeCreationHook(detectedType, interfaceInstance, context);
    
    this.logger.info(`Created interface with detected type: ${detectedType}`, {
      interfaceId: interfaceInstance.id,
      interfaceType: detectedType,
      context,
      config: mergedConfig
    });
    
    return interfaceInstance;
  }

  /**
   * Create an interface instance with explicit type
   * @param {string} interfaceType - Explicit interface type
   * @param {Object} config - Configuration
   * @param {string} interfaceId - Optional custom ID
   * @returns {Promise<BaseInterface>} Created interface instance
   */
  async createInterfaceByType(interfaceType, config = {}, interfaceId = null) {
    if (!this.interfaceManager) {
      throw new Error('InterfaceManager is required for interface creation');
    }
    
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    // Merge configurations
    const mergedConfig = this._mergeConfigurations(interfaceType, config);
    
    // Create interface instance
    const interfaceInstance = await this.interfaceManager.createInterface(
      interfaceType,
      mergedConfig,
      interfaceId
    );
    
    // Execute creation hook if registered
    await this._executeCreationHook(interfaceType, interfaceInstance, {});
    
    this.logger.info(`Created interface with explicit type: ${interfaceType}`, {
      interfaceId: interfaceInstance.id,
      interfaceType,
      config: mergedConfig
    });
    
    return interfaceInstance;
  }

  /**
   * Create multiple interface instances
   * @param {Array<Object>} specifications - Array of interface specifications
   * @returns {Promise<Array<BaseInterface>>} Array of created interface instances
   */
  async createMultipleInterfaces(specifications = []) {
    if (!Array.isArray(specifications)) {
      throw new Error('specifications must be an array');
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < specifications.length; i++) {
      const spec = specifications[i];
      try {
        let interfaceInstance;
        
        if (spec.type) {
          interfaceInstance = await this.createInterfaceByType(
            spec.type,
            spec.config || {},
            spec.id || null
          );
        } else {
          interfaceInstance = await this.createInterface(
            spec.context || {},
            spec.config || {},
            spec.id || null
          );
        }
        
        results.push({
          success: true,
          interface: interfaceInstance,
          index: i,
          specification: spec
        });
        
      } catch (error) {
        errors.push({
          success: false,
          error: error.message,
          index: i,
          specification: spec
        });
        
        this.logger.error(`Failed to create interface at index ${i}`, {
          index: i,
          specification: spec,
          error: error.message
        });
      }
    }
    
    this.logger.info(`Created ${results.length} interfaces, ${errors.length} failed`, {
      total: specifications.length,
      successful: results.length,
      failed: errors.length
    });
    
    return {
      results,
      errors,
      summary: {
        total: specifications.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Get available interface types
   * @returns {Array<string>} Array of available interface types
   */
  getAvailableTypes() {
    if (this.interfaceManager) {
      return this.interfaceManager.getAvailableTypes();
    }
    return Array.from(this.defaultConfigs.keys());
  }

  /**
   * Get default configuration for an interface type
   * @param {string} interfaceType - Interface type
   * @returns {Object|null} Default configuration or null
   */
  getDefaultConfig(interfaceType) {
    return this.defaultConfigs.get(interfaceType) || null;
  }

  /**
   * Check if a type detector is registered
   * @param {string} interfaceType - Interface type
   * @returns {boolean} True if type detector is registered
   */
  hasTypeDetector(interfaceType) {
    return this.typeDetectors.has(interfaceType);
  }

  /**
   * Check if a creation hook is registered
   * @param {string} interfaceType - Interface type
   * @returns {boolean} True if creation hook is registered
   */
  hasCreationHook(interfaceType) {
    return this.creationHooks.has(interfaceType);
  }

  /**
   * Get factory statistics
   * @returns {Object} Factory statistics
   */
  getStats() {
    return {
      defaultConfigs: this.defaultConfigs.size,
      typeDetectors: this.typeDetectors.size,
      creationHooks: this.creationHooks.size,
      availableTypes: this.getAvailableTypes().length
    };
  }

  /**
   * Merge configurations for an interface type
   * @private
   * @param {string} interfaceType - Interface type
   * @param {Object} config - Additional configuration
   * @returns {Object} Merged configuration
   */
  _mergeConfigurations(interfaceType, config) {
    const defaultConfig = this.defaultConfigs.get(interfaceType) || {};
    const globalConfig = this.configService ? 
      this.configService.getInterfaceConfig(interfaceType) : {};
    
    return {
      ...globalConfig,
      ...defaultConfig,
      ...config
    };
  }

  /**
   * Execute creation hook for an interface type
   * @private
   * @param {string} interfaceType - Interface type
   * @param {BaseInterface} interfaceInstance - Created interface instance
   * @param {Object} context - Creation context
   * @returns {Promise<void>}
   */
  async _executeCreationHook(interfaceType, interfaceInstance, context) {
    const hook = this.creationHooks.get(interfaceType);
    if (hook) {
      try {
        await hook(interfaceInstance, context);
        this.logger.debug(`Executed creation hook for ${interfaceType}`, {
          interfaceType,
          interfaceId: interfaceInstance.id
        });
      } catch (error) {
        this.logger.warn(`Creation hook failed for ${interfaceType}`, {
          interfaceType,
          interfaceId: interfaceInstance.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Validate interface creation parameters
   * @private
   * @param {Object} params - Parameters to validate
   * @returns {void}
   * @throws {Error} If validation fails
   */
  _validateParams(params) {
    if (typeof params !== 'object' || params === null) {
      throw new Error('Parameters must be an object');
    }
  }

  /**
   * Clean up factory resources
   * @returns {void}
   */
  destroy() {
    this.defaultConfigs.clear();
    this.typeDetectors.clear();
    this.creationHooks.clear();
    
    this.logger.info('InterfaceFactory destroyed');
  }
}

module.exports = InterfaceFactory;
