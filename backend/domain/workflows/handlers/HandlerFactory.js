/**
 * HandlerFactory - Factory for creating handlers
 * 
 * This class provides a factory pattern for creating handlers from
 * different sources using adapters. It supports legacy handlers,
 * external services, and new unified handlers.
 */
class HandlerFactory {
  /**
   * Create a new handler factory
   * @param {Object} options - Factory options
   */
  constructor(options = {}) {
    this.adapters = new Map();
    this.handlerCache = new Map();
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 100,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Create handler for request
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      // Determine handler type
      const handlerType = this.determineHandlerType(request);
      
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, handlerType);
        if (this.handlerCache.has(cacheKey)) {
          return this.handlerCache.get(cacheKey);
        }
      }
      
      // Get appropriate adapter
      let adapter = this.adapters.get(handlerType);
      if (!adapter) {
        // Try to find a compatible adapter
        adapter = this.findCompatibleAdapter(request);
        if (!adapter) {
          throw new Error(`No adapter found for handler type: ${handlerType}`);
        }
        // Register the compatible adapter for future use
        this.registerAdapter(handlerType, adapter);
      }
      
      // Create handler using adapter
      const handler = await adapter.createHandler(request, context);
      
      // Validate handler if enabled
      if (this.options.enableValidation) {
        await this.validateCreatedHandler(handler, context);
      }
      
      // Cache handler
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, handlerType);
        this.cacheHandler(cacheKey, handler);
      }
      
      return handler;

    } catch (error) {
      throw new Error(`Handler creation failed: ${error.message}`);
    }
  }

  /**
   * Find compatible adapter for request
   * @param {Object} request - Handler request
   * @returns {IHandlerAdapter|null} Compatible adapter
   */
  findCompatibleAdapter(request) {
    // Load real adapters
    const LegacyHandlerAdapter = require('./adapters/LegacyHandlerAdapter');
    const CommandHandlerAdapter = require('./adapters/CommandHandlerAdapter');
    const ServiceHandlerAdapter = require('./adapters/ServiceHandlerAdapter');

    // Create adapter instances
    const adapters = [
      new LegacyHandlerAdapter(),
      new CommandHandlerAdapter(),
      new ServiceHandlerAdapter()
    ];

    // Find adapter that can handle the request
    for (const adapter of adapters) {
      if (adapter.canHandle(request)) {
        return adapter;
      }
    }

    return null;
  }

  /**
   * Determine handler type from request
   * @param {Object} request - Handler request
   * @returns {string} Handler type
   */
  determineHandlerType(request) {
    // Check for legacy handler patterns
    if (request.handlerClass || request.handlerPath) {
      return 'legacy';
    }
    
    // Check for command handler patterns
    if (request.command || request.commandType) {
      return 'command';
    }
    
    // Check for service handler patterns
    if (request.service || request.serviceMethod) {
      return 'service';
    }
    
    // Check for workflow handler patterns
    if (request.workflow || request.workflowType) {
      return 'workflow';
    }
    
    // Check for explicit type
    if (request.type) {
      return request.type;
    }
    
    // Default to legacy
    return 'legacy';
  }

  /**
   * Register adapter
   * @param {string} type - Adapter type
   * @param {IHandlerAdapter} adapter - Handler adapter
   */
  registerAdapter(type, adapter) {
    if (!type || typeof type !== 'string') {
      throw new Error('Adapter type must be a non-empty string');
    }

    if (!adapter) {
      throw new Error('Adapter instance is required');
    }

    // Validate adapter interface
    this.validateAdapter(adapter);

    this.adapters.set(type, adapter);
  }

  /**
   * Get adapter
   * @param {string} type - Adapter type
   * @returns {IHandlerAdapter|null} Handler adapter
   */
  getAdapter(type) {
    return this.adapters.get(type) || null;
  }

  /**
   * List available adapters
   * @returns {Array<string>} Adapter types
   */
  listAdapters() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregister adapter
   * @param {string} type - Adapter type
   * @returns {boolean} True if adapter was unregistered
   */
  unregisterAdapter(type) {
    const wasRegistered = this.adapters.has(type);
    
    if (wasRegistered) {
      this.adapters.delete(type);
    }
    
    return wasRegistered;
  }

  /**
   * Clear all adapters
   */
  clearAdapters() {
    this.adapters.clear();
  }

  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {string} handlerType - Handler type
   * @returns {string} Cache key
   */
  generateCacheKey(request, handlerType) {
    const requestStr = JSON.stringify(request);
    const crypto = require('crypto');
    return `${handlerType}_${crypto.createHash('md5').update(requestStr).digest('hex')}`;
  }

  /**
   * Cache handler
   * @param {string} key - Cache key
   * @param {IHandler} handler - Handler to cache
   */
  cacheHandler(key, handler) {
    // Check cache size limit
    if (this.handlerCache.size >= this.options.cacheSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.handlerCache.keys().next().value;
      this.handlerCache.delete(firstKey);
    }
    
    this.handlerCache.set(key, handler);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.handlerCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return {
      size: this.handlerCache.size,
      maxSize: this.options.cacheSize,
      hitRate: 0, // Would need to track hits/misses
      enabled: this.options.enableCaching
    };
  }

  /**
   * Validate created handler
   * @param {IHandler} handler - Handler to validate
   * @param {HandlerContext} context - Handler context
   * @throws {Error} If validation fails
   */
  async validateCreatedHandler(handler, context) {
    if (!handler) {
      throw new Error('Created handler is null or undefined');
    }

    // Check if handler implements required interface
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
        throw new Error(`Created handler must implement ${method} method`);
      }
    }

    // Validate handler metadata
    try {
      const metadata = handler.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Handler must return valid metadata object');
      }
    } catch (error) {
      throw new Error(`Handler metadata validation failed: ${error.message}`);
    }

    // Validate handler can handle the request
    try {
      const canHandle = handler.canHandle(context.getRequest());
      if (!canHandle) {
        throw new Error('Handler cannot handle the given request');
      }
    } catch (error) {
      throw new Error(`Handler canHandle validation failed: ${error.message}`);
    }
  }

  /**
   * Validate adapter
   * @param {IHandlerAdapter} adapter - Adapter to validate
   * @throws {Error} If validation fails
   */
  validateAdapter(adapter) {
    const requiredMethods = [
      'createHandler',
      'canHandle',
      'getMetadata',
      'getType',
      'getVersion'
    ];

    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(`Adapter must implement ${method} method`);
      }
    }

    // Validate adapter metadata
    try {
      const metadata = adapter.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Adapter must return valid metadata object');
      }
    } catch (error) {
      throw new Error(`Adapter metadata validation failed: ${error.message}`);
    }
  }

  /**
   * Get factory options
   * @returns {Object} Factory options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set factory options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get factory summary
   * @returns {Object} Factory summary
   */
  getSummary() {
    return {
      adapters: this.listAdapters(),
      cacheSize: this.handlerCache.size,
      cacheEnabled: this.options.enableCaching,
      validationEnabled: this.options.enableValidation,
      maxCacheSize: this.options.cacheSize
    };
  }

  /**
   * Create legacy handler adapter
   * @returns {IHandlerAdapter} Legacy handler adapter
   */
  createLegacyAdapter() {
    return {
      async createHandler(request, context) {
        // This would be implemented to handle legacy handler patterns
        throw new Error('Legacy adapter not implemented');
      },

      canHandle(request) {
        return !!(request.handlerClass || request.handlerPath);
      },

      getMetadata() {
        return {
          name: 'Legacy Handler Adapter',
          description: 'Adapter for legacy handler patterns',
          version: '1.0.0',
          type: 'legacy'
        };
      },

      getType() {
        return 'legacy';
      },

      getVersion() {
        return '1.0.0';
      }
    };
  }

  /**
   * Create command handler adapter
   * @returns {IHandlerAdapter} Command handler adapter
   */
  createCommandAdapter() {
    return {
      async createHandler(request, context) {
        // This would be implemented to handle command patterns
        throw new Error('Command adapter not implemented');
      },

      canHandle(request) {
        return !!(request.command || request.commandType);
      },

      getMetadata() {
        return {
          name: 'Command Handler Adapter',
          description: 'Adapter for command handler patterns',
          version: '1.0.0',
          type: 'command'
        };
      },

      getType() {
        return 'command';
      },

      getVersion() {
        return '1.0.0';
      }
    };
  }

  /**
   * Create service handler adapter
   * @returns {IHandlerAdapter} Service handler adapter
   */
  createServiceAdapter() {
    return {
      async createHandler(request, context) {
        // This would be implemented to handle service patterns
        throw new Error('Service adapter not implemented');
      },

      canHandle(request) {
        return !!(request.service || request.serviceMethod);
      },

      getMetadata() {
        return {
          name: 'Service Handler Adapter',
          description: 'Adapter for service handler patterns',
          version: '1.0.0',
          type: 'service'
        };
      },

      getType() {
        return 'service';
      },

      getVersion() {
        return '1.0.0';
      }
    };
  }
}

module.exports = HandlerFactory; 