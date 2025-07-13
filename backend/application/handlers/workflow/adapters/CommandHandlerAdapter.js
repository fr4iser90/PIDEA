/**
 * CommandHandlerAdapter - Adapter for command-based handlers
 * 
 * This adapter provides integration with the command bus pattern,
 * allowing command handlers to be executed through the unified
 * handler system.
 */
const IHandlerAdapter = require('../../../../domain/interfaces/IHandlerAdapter');

class CommandHandlerAdapter extends IHandlerAdapter {
  /**
   * Create a new command handler adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    super();
    this.commandBus = options.commandBus;
    this.commandCache = new Map();
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Create handler from command
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      const command = request.command || this.createCommand(request);
      
      if (!command) {
        throw new Error('Could not create command from request');
      }

      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, command);
        if (this.commandCache.has(cacheKey)) {
          return this.commandCache.get(cacheKey);
        }
      }

      // Create unified handler wrapper
      const unifiedHandler = this.wrapCommandHandler(command, request);
      
      // Cache handler
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, command);
        this.cacheHandler(cacheKey, unifiedHandler);
      }
      
      return unifiedHandler;

    } catch (error) {
      throw new Error(`Command handler creation failed: ${error.message}`);
    }
  }

  /**
   * Create command from request
   * @param {Object} request - Handler request
   * @returns {Object} Command instance
   */
  createCommand(request) {
    try {
      const commandType = request.commandType || this.determineCommandType(request);
      const commandData = request.commandData || {};
      
      if (!commandType) {
        throw new Error('Could not determine command type');
      }

      // Load command class
      const CommandClass = this.loadCommandClass(commandType);
      if (!CommandClass) {
        throw new Error(`Command class not found: ${commandType}`);
      }

      // Create command instance
      return new CommandClass(commandData);

    } catch (error) {
      throw new Error(`Command creation failed: ${error.message}`);
    }
  }

  /**
   * Determine command type from request
   * @param {Object} request - Handler request
   * @returns {string|null} Command type
   */
  determineCommandType(request) {
    // Map request types to command types
    const commandMap = {
      'analyze_architecture': 'AnalyzeArchitectureCommand',
      'analyze_code_quality': 'AnalyzeCodeQualityCommand',
      'analyze_tech_stack': 'AnalyzeTechStackCommand',
      'analyze_repo_structure': 'AnalyzeRepoStructureCommand',
      'analyze_dependencies': 'AnalyzeDependenciesCommand',
      'vibecoder_analyze': 'VibeCoderAnalyzeCommand',
      'vibecoder_generate': 'VibeCoderGenerateCommand',
      'vibecoder_refactor': 'VibeCoderRefactorCommand',
      'generate_script': 'GenerateScriptCommand',
      'auto_refactor': 'AutoRefactorCommand',
      'create_task': 'CreateTaskCommand',
      'port_streaming': 'PortStreamingCommand'
    };
    
    return commandMap[request.type] || null;
  }

  /**
   * Load command class dynamically
   * @param {string} commandType - Command type
   * @returns {Function|null} Command class
   */
  loadCommandClass(commandType) {
    try {
      // Try different command paths
      const commandPaths = [
        `@/application/commands/${commandType}`,
        `@/application/commands/categories/analysis/${commandType}`,
        `@/application/commands/categories/generate/${commandType}`,
        `@/application/commands/categories/refactoring/${commandType}`,
        `@/application/commands/vibecoder/${commandType}`
      ];

      for (const path of commandPaths) {
        try {
          return require(path);
        } catch (error) {
          // Continue to next path
        }
      }

      return null;
    } catch (error) {
      console.warn(`Failed to load command class ${commandType}:`, error.message);
      return null;
    }
  }

  /**
   * Wrap command handler with unified interface
   * @param {Object} command - Command instance
   * @param {Object} request - Handler request
   * @returns {IHandler} Unified handler
   */
  wrapCommandHandler(command, request) {
    return {
      /**
       * Execute command handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          if (!this.commandBus) {
            throw new Error('Command bus not available');
          }

          // Execute command through command bus
          const result = await this.commandBus.execute(command);
          
          return {
            success: true,
            data: result,
            metadata: {
              commandHandler: true,
              commandType: command.constructor.name,
              originalRequest: context.getRequest()
            }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              commandHandler: true,
              commandType: command.constructor.name,
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
          name: `CommandHandler_${command.constructor.name}`,
          description: 'Command handler adapter',
          type: 'command',
          version: '1.0.0',
          commandType: command.constructor.name,
          adapter: 'CommandHandlerAdapter'
        };
      },

      /**
       * Validate command handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        try {
          // Validate command if it has a validate method
          if (typeof command.validate === 'function') {
            const validationResult = await command.validate();
            return validationResult;
          }

          // Basic validation
          return {
            isValid: true,
            errors: [],
            warnings: ['Command validation is limited']
          };
        } catch (error) {
          return {
            isValid: false,
            errors: [error.message],
            warnings: []
          };
        }
      },

      /**
       * Check if handler can handle the request
       * @param {Object} request - Request to check
       * @returns {boolean} True if handler can handle the request
       */
      canHandle(request) {
        return !!(request && (request.command || request.commandType));
      },

      /**
       * Get handler dependencies
       * @returns {Array<string>} Handler dependencies
       */
      getDependencies() {
        return ['command', 'adapter', 'commandBus'];
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
        return 'command';
      },

      /**
       * Get handler statistics
       * @returns {Object} Handler statistics
       */
      getStatistics() {
        return {
          type: 'command',
          adapter: 'CommandHandlerAdapter',
          commandType: command.constructor.name,
          cacheSize: this.commandCache.size,
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
    return !!(request.command || request.commandType || 
              (request.type && this.determineCommandType(request)));
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'Command Handler Adapter',
      description: 'Adapter for command handler patterns',
      version: '1.0.0',
      type: 'command',
      capabilities: ['command_execution', 'command_bus_integration', 'caching'],
      supportedTypes: [
        'analyze_architecture',
        'analyze_code_quality',
        'analyze_tech_stack',
        'analyze_repo_structure',
        'analyze_dependencies',
        'vibecoder_analyze',
        'vibecoder_generate',
        'vibecoder_refactor',
        'generate_script',
        'auto_refactor',
        'create_task',
        'port_streaming'
      ]
    };
  }

  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return 'command';
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

    if (config.commandBus) {
      this.commandBus = config.commandBus;
    }
  }

  /**
   * Cleanup adapter resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    this.commandCache.clear();
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
      if (!request.command && !request.commandType && !request.type) {
        errors.push('Request must have command, commandType, or type');
      }

      if (!this.commandBus) {
        warnings.push('Command bus not available');
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
      'generate_script',
      'auto_refactor',
      'create_task',
      'port_streaming'
    ];
  }

  /**
   * Check if adapter is healthy
   * @returns {Promise<boolean>} True if adapter is healthy
   */
  async isHealthy() {
    try {
      // Test loading a sample command class
      const testCommand = this.loadCommandClass('AnalyzeArchitectureCommand');
      return !!testCommand && !!this.commandBus;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {Object} command - Command instance
   * @returns {string} Cache key
   */
  generateCacheKey(request, command) {
    return `${command.constructor.name}_${request.type || 'unknown'}_${JSON.stringify(request.options || {})}`;
  }

  /**
   * Cache handler
   * @param {string} key - Cache key
   * @param {IHandler} handler - Handler to cache
   */
  cacheHandler(key, handler) {
    if (this.commandCache.size >= this.options.cacheSize) {
      // Remove oldest entry
      const firstKey = this.commandCache.keys().next().value;
      this.commandCache.delete(firstKey);
    }
    this.commandCache.set(key, handler);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return {
      size: this.commandCache.size,
      maxSize: this.options.cacheSize,
      enabled: this.options.enableCaching,
      keys: Array.from(this.commandCache.keys())
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.commandCache.clear();
  }

  /**
   * Set command bus
   * @param {Object} commandBus - Command bus instance
   */
  setCommandBus(commandBus) {
    this.commandBus = commandBus;
  }

  /**
   * Get command bus
   * @returns {Object|null} Command bus instance
   */
  getCommandBus() {
    return this.commandBus;
  }
}

module.exports = CommandHandlerAdapter; 