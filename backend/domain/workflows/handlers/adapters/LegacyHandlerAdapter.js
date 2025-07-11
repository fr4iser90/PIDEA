/**
 * LegacyHandlerAdapter - Adapter for existing legacy handlers
 * 
 * This adapter provides backward compatibility for existing handlers
 * by wrapping them with the unified handler interface. It supports
 * both class-based and function-based legacy handlers.
 */
const IHandlerAdapter = require('../interfaces/IHandlerAdapter');

class LegacyHandlerAdapter extends IHandlerAdapter {
  /**
   * Create a new legacy handler adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    super();
    this.handlerCache = new Map();
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Create handler from legacy handler
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      const handlerClass = request.handlerClass || this.determineHandlerClass(request);
      
      if (!handlerClass) {
        throw new Error('Could not determine handler class');
      }
      
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, handlerClass);
        if (this.handlerCache.has(cacheKey)) {
          return this.handlerCache.get(cacheKey);
        }
      }
      
      // Create handler instance
      const handler = new handlerClass();
      
      // Wrap with unified handler interface
      const unifiedHandler = this.wrapLegacyHandler(handler, request);
      
      // Cache handler
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, handlerClass);
        this.cacheHandler(cacheKey, unifiedHandler);
      }
      
      return unifiedHandler;

    } catch (error) {
      throw new Error(`Legacy handler creation failed: ${error.message}`);
    }
  }

  /**
   * Determine handler class from request
   * @param {Object} request - Handler request
   * @returns {Function|null} Handler class
   */
  determineHandlerClass(request) {
    // Map request types to handler classes
    const handlerMap = {
      'analyze_architecture': this.loadHandlerClass('@/application/handlers/analyze/AnalyzeArchitectureHandler'),
      'analyze_code_quality': this.loadHandlerClass('@/application/handlers/analyze/AnalyzeCodeQualityHandler'),
      'analyze_tech_stack': this.loadHandlerClass('@/application/handlers/analyze/AnalyzeTechStackHandler'),
      'analyze_repo_structure': this.loadHandlerClass('@/application/handlers/analyze/AnalyzeRepoStructureHandler'),
      'analyze_dependencies': this.loadHandlerClass('@/application/handlers/analyze/AnalyzeDependenciesHandler'),
      'vibecoder_analyze': this.loadHandlerClass('@/application/handlers/vibecoder/VibeCoderAnalyzeHandler'),
      'vibecoder_generate': this.loadHandlerClass('@/application/handlers/vibecoder/VibeCoderGenerateHandler'),
      'vibecoder_refactor': this.loadHandlerClass('@/application/handlers/vibecoder/VibeCoderRefactorHandler'),
      'vibecoder_mode': this.loadHandlerClass('@/application/handlers/vibecoder/VibeCoderModeHandler'),
      'generate_script': this.loadHandlerClass('@/application/handlers/generate/GenerateScriptHandler'),
      'generate_scripts': this.loadHandlerClass('@/application/handlers/generate/GenerateScriptsHandler'),
      'auto_test_fix': this.loadHandlerClass('@/application/handlers/AutoTestFixHandler'),
      'test_correction': this.loadHandlerClass('@/application/handlers/TestCorrectionHandler')
    };
    
    return handlerMap[request.type] || null;
  }

  /**
   * Load handler class dynamically
   * @param {string} path - Handler class path
   * @returns {Function|null} Handler class
   */
  loadHandlerClass(path) {
    try {
      return require(path);
    } catch (error) {
      console.warn(`Failed to load handler class from ${path}:`, error.message);
      return null;
    }
  }

  /**
   * Wrap legacy handler with unified interface
   * @param {Object} legacyHandler - Legacy handler instance
   * @param {Object} request - Handler request
   * @returns {IHandler} Unified handler
   */
  wrapLegacyHandler(legacyHandler, request) {
    return {
      /**
       * Execute handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          // Call legacy handler method
          const result = await legacyHandler.handle(context.getRequest(), context.getResponse());
          
          return {
            success: true,
            data: result,
            metadata: {
              legacyHandler: true,
              handlerClass: legacyHandler.constructor.name,
              originalRequest: context.getRequest()
            }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              legacyHandler: true,
              handlerClass: legacyHandler.constructor.name,
              originalRequest: context.getRequest()
            }
          };
        }
      },

      /**
       * Get handler metadata
       * @returns {Object} Handler metadata
       */
      getMetadata() {
        return {
          name: legacyHandler.constructor.name,
          description: 'Legacy handler adapter',
          type: 'legacy',
          version: '1.0.0',
          originalHandler: legacyHandler.constructor.name,
          adapter: 'LegacyHandlerAdapter'
        };
      },

      /**
       * Validate handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        // Basic validation for legacy handlers
        return {
          isValid: true,
          errors: [],
          warnings: ['Legacy handler validation is limited']
        };
      },

      /**
       * Check if handler can handle the request
       * @param {Object} request - Request to check
       * @returns {boolean} True if handler can handle the request
       */
      canHandle(request) {
        // Legacy handlers can handle any request that matches their type
        return !!(request && (request.type || request.handlerClass));
      },

      /**
       * Get handler dependencies
       * @returns {Array<string>} Handler dependencies
       */
      getDependencies() {
        return ['legacy', 'adapter'];
      },

      /**
       * Get handler version
       * @returns {string} Handler version
       */
      getVersion() {
        return '1.0.0';
      },

      /**
       * Get handler type
       * @returns {string} Handler type
       */
      getType() {
        return 'legacy';
      },

      /**
       * Get handler statistics
       * @returns {Object} Handler statistics
       */
      getStatistics() {
        return {
          type: 'legacy',
          adapter: 'LegacyHandlerAdapter',
          cacheSize: this.handlerCache.size,
          cacheEnabled: this.options.enableCaching
        };
      }
    };
  }

  /**
   * Check if adapter can handle the given request
   * @param {Object} request - Handler request object
   * @returns {boolean} True if adapter can handle the request
   */
  canHandle(request) {
    return !!(request.handlerClass || request.handlerPath || 
              (request.type && this.determineHandlerClass(request)));
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'Legacy Handler Adapter',
      description: 'Adapter for legacy handler patterns',
      version: '1.0.0',
      type: 'legacy',
      capabilities: ['legacy_handler_wrapping', 'backward_compatibility', 'caching'],
      supportedTypes: [
        'analyze_architecture',
        'analyze_code_quality', 
        'analyze_tech_stack',
        'analyze_repo_structure',
        'analyze_dependencies',
        'vibecoder_analyze',
        'vibecoder_generate',
        'vibecoder_refactor',
        'vibecoder_mode',
        'generate_script',
        'generate_scripts',
        'auto_test_fix',
        'test_correction'
      ]
    };
  }

  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return 'legacy';
  }

  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Initialize adapter with configuration
   * @param {Object} config - Adapter configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config = {}) {
    this.options = {
      ...this.options,
      ...config
    };
  }

  /**
   * Cleanup adapter resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    this.handlerCache.clear();
  }

  /**
   * Validate request for this adapter
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request) {
      errors.push('Request is required');
    } else {
      if (!request.handlerClass && !request.handlerPath && !request.type) {
        errors.push('Request must have handlerClass, handlerPath, or type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get supported request types
   * @returns {Array<string>} Array of supported request types
   */
  getSupportedTypes() {
    return [
      'analyze_architecture',
      'analyze_code_quality',
      'analyze_tech_stack',
      'analyze_repo_structure',
      'analyze_dependencies',
      'vibecoder_analyze',
      'vibecoder_generate',
      'vibecoder_refactor',
      'vibecoder_mode',
      'generate_script',
      'generate_scripts',
      'auto_test_fix',
      'test_correction'
    ];
  }

  /**
   * Check if adapter is healthy
   * @returns {Promise<boolean>} True if adapter is healthy
   */
  async isHealthy() {
    try {
      // Test loading a sample handler class
      const testHandler = this.loadHandlerClass('@/application/handlers/analyze/AnalyzeArchitectureHandler');
      return !!testHandler;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {Function} handlerClass - Handler class
   * @returns {string} Cache key
   */
  generateCacheKey(request, handlerClass) {
    return `${handlerClass.name}_${request.type || 'unknown'}_${JSON.stringify(request.options || {})}`;
  }

  /**
   * Cache handler
   * @param {string} key - Cache key
   * @param {IHandler} handler - Handler to cache
   */
  cacheHandler(key, handler) {
    if (this.handlerCache.size >= this.options.cacheSize) {
      // Remove oldest entry
      const firstKey = this.handlerCache.keys().next().value;
      this.handlerCache.delete(firstKey);
    }
    this.handlerCache.set(key, handler);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return {
      size: this.handlerCache.size,
      maxSize: this.options.cacheSize,
      enabled: this.options.enableCaching,
      keys: Array.from(this.handlerCache.keys())
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.handlerCache.clear();
  }
}

module.exports = LegacyHandlerAdapter; 