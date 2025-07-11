/**
 * HandlerRegistry - Handler registration and management
 * 
 * This class provides a centralized registry for managing handlers,
 * including registration, lookup, lifecycle management, and metadata
 * tracking. It follows the registry pattern for handler management.
 */
class HandlerRegistry {
  /**
   * Create a new handler registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    this.handlers = new Map();
    this.handlerTypes = new Map();
    this.handlerMetadata = new Map();
    this.handlerStatistics = new Map();
    this.options = {
      enableStatistics: options.enableStatistics !== false,
      maxHandlers: options.maxHandlers || 1000,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Register handler
   * @param {string} type - Handler type
   * @param {IHandler} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {boolean} True if registration successful
   */
  registerHandler(type, handler, metadata = {}) {
    try {
      // Validate inputs
      if (!type || typeof type !== 'string') {
        throw new Error('Handler type must be a non-empty string');
      }

      if (!handler) {
        throw new Error('Handler instance is required');
      }

      // Check registry capacity
      if (this.handlers.size >= this.options.maxHandlers) {
        throw new Error(`Registry capacity exceeded (max: ${this.options.maxHandlers})`);
      }

      // Validate handler if enabled
      if (this.options.enableValidation) {
        this.validateHandlerForRegistration(handler);
      }

      // Register handler
      this.handlers.set(type, handler);
      this.handlerTypes.set(type, handler.constructor.name);
      
      // Store metadata
      const fullMetadata = {
        ...handler.getMetadata(),
        ...metadata,
        registeredAt: new Date(),
        type,
        className: handler.constructor.name
      };
      this.handlerMetadata.set(type, fullMetadata);

      // Initialize statistics
      if (this.options.enableStatistics) {
        this.handlerStatistics.set(type, {
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          lastExecuted: null,
          averageDuration: 0
        });
      }

      return true;

    } catch (error) {
      console.error('Handler registration failed:', error.message);
      return false;
    }
  }

  /**
   * Get handler by type
   * @param {string} type - Handler type
   * @returns {IHandler|null} Handler instance
   */
  getHandler(type) {
    return this.handlers.get(type) || null;
  }

  /**
   * Check if handler exists
   * @param {string} type - Handler type
   * @returns {boolean} True if handler exists
   */
  hasHandler(type) {
    return this.handlers.has(type);
  }

  /**
   * Get handler metadata
   * @param {string} type - Handler type
   * @returns {Object|null} Handler metadata
   */
  getHandlerMetadata(type) {
    return this.handlerMetadata.get(type) || null;
  }

  /**
   * Get handler count
   * @returns {number} Number of registered handlers
   */
  getHandlerCount() {
    return this.handlers.size;
  }

  /**
   * Get handler types
   * @returns {Array<string>} Handler types
   */
  getHandlerTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * List all handlers
   * @returns {Array<Object>} Handler information
   */
  listHandlers() {
    const handlers = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      const statistics = this.handlerStatistics.get(type);
      
      handlers.push({
        type,
        name: metadata?.name || handler.constructor.name,
        description: metadata?.description || '',
        version: metadata?.version || '1.0.0',
        registeredAt: metadata?.registeredAt,
        statistics: statistics || null
      });
    }
    
    return handlers;
  }

  /**
   * Unregister handler
   * @param {string} type - Handler type
   * @returns {boolean} True if handler was unregistered
   */
  unregisterHandler(type) {
    const wasRegistered = this.handlers.has(type);
    
    if (wasRegistered) {
      this.handlers.delete(type);
      this.handlerTypes.delete(type);
      this.handlerMetadata.delete(type);
      this.handlerStatistics.delete(type);
    }
    
    return wasRegistered;
  }

  /**
   * Clear all handlers
   */
  clearHandlers() {
    this.handlers.clear();
    this.handlerTypes.clear();
    this.handlerMetadata.clear();
    this.handlerStatistics.clear();
  }

  /**
   * Update handler statistics
   * @param {string} type - Handler type
   * @param {Object} result - Execution result
   */
  updateStatistics(type, result) {
    if (!this.options.enableStatistics) {
      return;
    }

    const stats = this.handlerStatistics.get(type);
    if (!stats) {
      return;
    }

    stats.executions++;
    stats.lastExecuted = new Date();

    if (result.isSuccess()) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (result.getDuration) {
      const duration = result.getDuration();
      stats.totalDuration += duration;
      stats.averageDuration = stats.totalDuration / stats.executions;
    }
  }

  /**
   * Get handler statistics
   * @param {string} type - Handler type
   * @returns {Object|null} Handler statistics
   */
  getHandlerStatistics(type) {
    return this.handlerStatistics.get(type) || null;
  }

  /**
   * Get all statistics
   * @returns {Object} All handler statistics
   */
  getAllStatistics() {
    const result = {};
    
    for (const [type, stats] of this.handlerStatistics) {
      result[type] = { ...stats };
    }
    
    return result;
  }

  /**
   * Find handlers by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.name - Handler name pattern
   * @param {string} criteria.type - Handler type pattern
   * @param {string} criteria.version - Handler version
   * @returns {Array<Object>} Matching handlers
   */
  findHandlers(criteria = {}) {
    const matches = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      
      let matchesCriteria = true;
      
      if (criteria.name && metadata?.name) {
        matchesCriteria = matchesCriteria && metadata.name.includes(criteria.name);
      }
      
      if (criteria.type) {
        matchesCriteria = matchesCriteria && type.includes(criteria.type);
      }
      
      if (criteria.version && metadata?.version) {
        matchesCriteria = matchesCriteria && metadata.version === criteria.version;
      }
      
      if (matchesCriteria) {
        matches.push({
          type,
          handler,
          metadata
        });
      }
    }
    
    return matches;
  }

  /**
   * Get registry summary
   * @returns {Object} Registry summary
   */
  getSummary() {
    const totalExecutions = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.executions, 0);
    
    const totalSuccesses = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.successes, 0);
    
    const totalFailures = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.failures, 0);
    
    return {
      totalHandlers: this.handlers.size,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      handlerTypes: this.getHandlerTypes(),
      statisticsEnabled: this.options.enableStatistics
    };
  }

  /**
   * Validate handler for registration
   * @param {IHandler} handler - Handler to validate
   * @throws {Error} If validation fails
   */
  validateHandlerForRegistration(handler) {
    const requiredMethods = [
      'execute',
      'getMetadata',
      'validate',
      'canHandle',
      'getDependencies',
      'getVersion',
      'getType'
    ];

    for (const method of requiredMethods) {
      if (typeof handler[method] !== 'function') {
        throw new Error(`Handler must implement ${method} method`);
      }
    }

    // Validate metadata
    try {
      const metadata = handler.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Handler must return valid metadata object');
      }
    } catch (error) {
      throw new Error(`Handler metadata validation failed: ${error.message}`);
    }
  }

  /**
   * Get registry options
   * @returns {Object} Registry options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set registry options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Export registry state
   * @returns {Object} Registry state
   */
  exportState() {
    const state = {
      handlers: {},
      metadata: {},
      statistics: {},
      options: this.options
    };

    for (const [type, handler] of this.handlers) {
      state.handlers[type] = {
        className: handler.constructor.name,
        type: handler.getType(),
        version: handler.getVersion()
      };
    }

    for (const [type, metadata] of this.handlerMetadata) {
      state.metadata[type] = metadata;
    }

    for (const [type, stats] of this.handlerStatistics) {
      state.statistics[type] = stats;
    }

    return state;
  }

  /**
   * Import registry state
   * @param {Object} state - Registry state
   * @returns {boolean} True if import successful
   */
  importState(state) {
    try {
      if (state.options) {
        this.options = { ...this.options, ...state.options };
      }

      // Note: This is a basic import. In a real implementation,
      // you would need to reconstruct handler instances from the state.
      
      return true;
    } catch (error) {
      console.error('Registry state import failed:', error.message);
      return false;
    }
  }
}

module.exports = HandlerRegistry; 