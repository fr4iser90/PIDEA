/**
 * IDEFactory - Factory pattern for creating IDE instances
 * Manages IDE type registration and instance creation
 */
const IDETypes = require('./IDETypes');

class IDEFactory {
  constructor() {
    this.ideImplementations = new Map();
    this.defaultIDEType = IDETypes.CURSOR;
    this.initialized = false;
  }

  /**
   * Initialize the factory with default IDE implementations
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    console.log('[IDEFactory] Initializing IDE factory...');

    // Register default IDE implementations
    this.registerDefaultImplementations();

    this.initialized = true;
    console.log('[IDEFactory] IDE factory initialized');
  }

  /**
   * Register default IDE implementations
   */
  registerDefaultImplementations() {
    try {
      // Register Cursor IDE implementation
      const CursorIDE = require('./implementations/CursorIDE');
      this.registerIDE(IDETypes.CURSOR, CursorIDE);

      // Register VSCode IDE implementation
      const VSCodeIDE = require('./implementations/VSCodeIDE');
      this.registerIDE(IDETypes.VSCODE, VSCodeIDE);

      console.log('[IDEFactory] Default IDE implementations registered');
    } catch (error) {
      console.error('[IDEFactory] Failed to register default implementations:', error);
    }
  }

  /**
   * Register a new IDE type implementation
   * @param {string} type - IDE type
   * @param {Class} implementation - IDE implementation class
   * @returns {boolean} True if registration successful
   */
  registerIDE(type, implementation) {
    try {
      // Validate IDE type
      if (!IDETypes.isValid(type)) {
        throw new Error(`Invalid IDE type: ${type}`);
      }

      // Validate implementation
      if (!implementation || typeof implementation !== 'function') {
        throw new Error(`Invalid IDE implementation for type: ${type}`);
      }

      // Check if implementation has required methods
      const requiredMethods = [
        'detect', 'start', 'stop', 'getStatus', 'getVersion',
        'getFeatures', 'executeCommand', 'getDOM', 'interact',
        'sendMessage', 'getWorkspacePath', 'switchToPort',
        'getActivePort', 'monitorTerminalOutput', 'getUserAppUrlForPort',
        'detectDevServerFromPackageJson', 'applyRefactoring',
        'sendTask', 'sendAutoModeTasks'
      ];

      const prototype = implementation.prototype;
      const missingMethods = requiredMethods.filter(method => 
        typeof prototype[method] !== 'function'
      );

      if (missingMethods.length > 0) {
        throw new Error(`IDE implementation missing required methods: ${missingMethods.join(', ')}`);
      }

      this.ideImplementations.set(type, implementation);
      console.log(`[IDEFactory] Registered IDE implementation for type: ${type}`);
      
      return true;
    } catch (error) {
      console.error(`[IDEFactory] Failed to register IDE implementation for type ${type}:`, error);
      return false;
    }
  }

  /**
   * Create IDE instance by type
   * @param {string} type - IDE type
   * @param {Object} dependencies - Dependencies for IDE instance
   * @returns {Object|null} IDE instance
   */
  createIDE(type, dependencies = {}) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // Validate IDE type
      if (!IDETypes.isValid(type)) {
        throw new Error(`Invalid IDE type: ${type}`);
      }

      // Check if implementation exists
      const Implementation = this.ideImplementations.get(type);
      if (!Implementation) {
        throw new Error(`No implementation registered for IDE type: ${type}`);
      }

      // Extract required dependencies
      const {
        browserManager,
        ideManager,
        eventBus = null
      } = dependencies;

      // Validate required dependencies
      if (!browserManager) {
        throw new Error('browserManager is required for IDE creation');
      }

      if (!ideManager) {
        throw new Error('ideManager is required for IDE creation');
      }

      // Create IDE instance
      const ideInstance = new Implementation(browserManager, ideManager, eventBus);
      
      console.log(`[IDEFactory] Created IDE instance for type: ${type}`);
      
      return {
        success: true,
        ide: ideInstance,
        type: type,
        metadata: IDETypes.getMetadata(type),
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`[IDEFactory] Failed to create IDE instance for type ${type}:`, error);
      return {
        success: false,
        error: error.message,
        type: type,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get list of available IDE types
   * @returns {Array<string>} Available IDE types
   */
  getAvailableIDEs() {
    if (!this.initialized) {
      this.initialize();
    }

    return Array.from(this.ideImplementations.keys());
  }

  /**
   * Get default IDE type
   * @returns {string} Default IDE type
   */
  getDefaultIDE() {
    return this.defaultIDEType;
  }

  /**
   * Set default IDE type
   * @param {string} type - IDE type to set as default
   * @returns {boolean} True if successful
   */
  setDefaultIDE(type) {
    if (!IDETypes.isValid(type)) {
      console.error(`[IDEFactory] Cannot set invalid IDE type as default: ${type}`);
      return false;
    }

    if (!this.ideImplementations.has(type)) {
      console.error(`[IDEFactory] Cannot set unregistered IDE type as default: ${type}`);
      return false;
    }

    this.defaultIDEType = type;
    console.log(`[IDEFactory] Set default IDE type to: ${type}`);
    return true;
  }

  /**
   * Check if IDE type is registered
   * @param {string} type - IDE type to check
   * @returns {boolean} True if registered
   */
  isRegistered(type) {
    return this.ideImplementations.has(type);
  }

  /**
   * Get IDE implementation class
   * @param {string} type - IDE type
   * @returns {Class|null} IDE implementation class
   */
  getImplementation(type) {
    return this.ideImplementations.get(type) || null;
  }

  /**
   * Unregister IDE type
   * @param {string} type - IDE type to unregister
   * @returns {boolean} True if successful
   */
  unregisterIDE(type) {
    if (type === this.defaultIDEType) {
      console.error(`[IDEFactory] Cannot unregister default IDE type: ${type}`);
      return false;
    }

    const removed = this.ideImplementations.delete(type);
    if (removed) {
      console.log(`[IDEFactory] Unregistered IDE type: ${type}`);
    }
    return removed;
  }

  /**
   * Get factory status
   * @returns {Object} Factory status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      defaultIDEType: this.defaultIDEType,
      registeredTypes: this.getAvailableIDEs(),
      totalImplementations: this.ideImplementations.size,
      timestamp: new Date()
    };
  }

  /**
   * Validate IDE instance
   * @param {Object} ideInstance - IDE instance to validate
   * @returns {Object} Validation result
   */
  validateIDEInstance(ideInstance) {
    try {
      if (!ideInstance) {
        throw new Error('IDE instance is null or undefined');
      }

      const requiredMethods = [
        'detect', 'start', 'stop', 'getStatus', 'getVersion',
        'getFeatures', 'executeCommand', 'getDOM', 'interact',
        'sendMessage', 'getWorkspacePath', 'switchToPort',
        'getActivePort', 'monitorTerminalOutput', 'getUserAppUrlForPort',
        'detectDevServerFromPackageJson', 'applyRefactoring',
        'sendTask', 'sendAutoModeTasks'
      ];

      const missingMethods = requiredMethods.filter(method => 
        typeof ideInstance[method] !== 'function'
      );

      if (missingMethods.length > 0) {
        throw new Error(`IDE instance missing required methods: ${missingMethods.join(', ')}`);
      }

      return {
        valid: true,
        message: 'IDE instance is valid',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Create IDE instance with fallback
   * @param {string} preferredType - Preferred IDE type
   * @param {Object} dependencies - Dependencies for IDE instance
   * @returns {Object} IDE instance with fallback info
   */
  createIDEWithFallback(preferredType, dependencies = {}) {
    // Try preferred type first
    let result = this.createIDE(preferredType, dependencies);
    
    if (result.success) {
      return {
        ...result,
        usedFallback: false,
        preferredType: preferredType
      };
    }

    // Try default type as fallback
    if (preferredType !== this.defaultIDEType) {
      console.log(`[IDEFactory] Falling back to default IDE type: ${this.defaultIDEType}`);
      result = this.createIDE(this.defaultIDEType, dependencies);
      
      if (result.success) {
        return {
          ...result,
          usedFallback: true,
          preferredType: preferredType,
          fallbackType: this.defaultIDEType
        };
      }
    }

    // Return original error
    return {
      ...result,
      usedFallback: false,
      preferredType: preferredType
    };
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.ideImplementations.clear();
    this.defaultIDEType = IDETypes.CURSOR;
    this.initialized = false;
    console.log('[IDEFactory] Cleared all IDE registrations');
  }
}

// Create singleton instance
let factoryInstance = null;

/**
 * Get the global IDE factory instance
 * @returns {IDEFactory} Factory instance
 */
function getIDEFactory() {
  if (!factoryInstance) {
    factoryInstance = new IDEFactory();
  }
  return factoryInstance;
}

/**
 * Set the global IDE factory instance
 * @param {IDEFactory} factory - Factory instance
 */
function setIDEFactory(factory) {
  factoryInstance = factory;
}

module.exports = {
  IDEFactory,
  getIDEFactory,
  setIDEFactory
}; 