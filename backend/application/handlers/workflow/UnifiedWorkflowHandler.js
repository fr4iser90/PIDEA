/**
 * UnifiedWorkflowHandler - Main handler orchestration
 * 
 * This class provides the main entry point for unified workflow handling,
 * orchestrating handler execution using the registry, factory, and validator
 * components. It integrates with existing workflow patterns.
 */
const HandlerRegistry = require('./HandlerRegistry');
const HandlerFactory = require('./HandlerFactory');
const HandlerValidator = require('./HandlerValidator');
const HandlerContext = require('./HandlerContext');
const HandlerResult = require('./HandlerResult');

class UnifiedWorkflowHandler {
  /**
   * Create a new unified workflow handler
   * @param {Object} dependencies - Handler dependencies
   */
  constructor(dependencies = {}) {
    this.handlerRegistry = dependencies.handlerRegistry || new HandlerRegistry();
    this.handlerFactory = dependencies.handlerFactory || new HandlerFactory();
    this.handlerValidator = dependencies.handlerValidator || new HandlerValidator();
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    // Initialize with default adapters
    this.initializeDefaultAdapters();
  }

  /**
   * Handle workflow execution
   * @param {Object} request - Handler request
   * @param {Object} response - Handler response
   * @param {Object} options - Execution options
   * @returns {Promise<HandlerResult>} Handler result
   */
  async handle(request, response, options = {}) {
    const startTime = Date.now();
    const handlerId = this.generateHandlerId();
    
    try {
      this.logger.info('UnifiedWorkflowHandler: Starting workflow handling', {
        handlerId,
        requestType: request?.type,
        taskId: request?.taskId
      });

      // Create handler context
      const context = new HandlerContext(request, response, handlerId, options);
      
      // Validate request
      const validationResult = await this.handlerValidator.validateRequest(request);
      if (!validationResult.isValid) {
        throw new Error(`Request validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get appropriate handler
      const handler = await this.getHandler(request, context);
      
      // Execute handler
      const result = await this.executeHandler(handler, context);
      
      // Update registry statistics
      if (request?.type) {
        this.handlerRegistry.updateStatistics(request.type, result);
      }

      this.logger.info('UnifiedWorkflowHandler: Workflow handling completed', {
        handlerId,
        success: result.isSuccess(),
        duration: result.getFormattedDuration()
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('UnifiedWorkflowHandler: Handler execution failed', {
        handlerId,
        error: error.message,
        duration
      });

      return HandlerResult.error(error.message, {
        handlerId,
        handlerName: 'UnifiedWorkflowHandler',
        duration,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get appropriate handler for request
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async getHandler(request, context) {
    // Check if handler is already registered
    if (request?.type) {
      const registeredHandler = this.handlerRegistry.getHandler(request.type);
      if (registeredHandler) {
        return registeredHandler;
      }
    }

    // Create handler using factory
    const handler = await this.handlerFactory.createHandler(request, context);
    
    // Register handler for future use if it has a type
    if (request?.type) {
      this.handlerRegistry.registerHandler(request.type, handler);
    }
    
    return handler;
  }

  /**
   * Execute handler
   * @param {IHandler} handler - Handler to execute
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<HandlerResult>} Handler result
   */
  async executeHandler(handler, context) {
    const startTime = Date.now();
    
    try {
      // Validate handler
      const validationResult = await this.handlerValidator.validateHandler(handler, context);
      if (!validationResult.isValid) {
        throw new Error(`Handler validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Validate context
      const contextValidation = await this.handlerValidator.validateContext(context);
      if (!contextValidation.isValid) {
        throw new Error(`Context validation failed: ${contextValidation.errors.join(', ')}`);
      }

      // Emit execution started event
      if (this.eventBus) {
        this.eventBus.emit('handler:execution:started', {
          handlerId: context.getHandlerId(),
          handlerType: handler.getType(),
          request: context.getRequest()
        });
      }

      // Execute handler
      const result = await handler.execute(context);
      
      const duration = Date.now() - startTime;
      
      // Create handler result
      const handlerResult = new HandlerResult({
        success: true,
        handlerId: context.getHandlerId(),
        handlerName: handler.getMetadata().name,
        result,
        duration,
        timestamp: new Date()
      });

      // Emit execution completed event
      if (this.eventBus) {
        this.eventBus.emit('handler:execution:completed', {
          handlerId: context.getHandlerId(),
          handlerType: handler.getType(),
          result: handlerResult.toObject()
        });
      }

      return handlerResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Create error result
      const errorResult = new HandlerResult({
        success: false,
        handlerId: context.getHandlerId(),
        handlerName: handler.getMetadata().name,
        error: error.message,
        duration,
        timestamp: new Date()
      });

      // Emit execution failed event
      if (this.eventBus) {
        this.eventBus.emit('handler:execution:failed', {
          handlerId: context.getHandlerId(),
          handlerType: handler.getType(),
          error: error.message,
          result: errorResult.toObject()
        });
      }

      return errorResult;
    }
  }

  /**
   * Register handler
   * @param {string} type - Handler type
   * @param {IHandler} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {boolean} True if registration successful
   */
  registerHandler(type, handler, metadata = {}) {
    return this.handlerRegistry.registerHandler(type, handler, metadata);
  }

  /**
   * Get handler by type
   * @param {string} type - Handler type
   * @returns {IHandler|null} Handler instance
   */
  getHandlerByType(type) {
    return this.handlerRegistry.getHandler(type);
  }

  /**
   * Register adapter
   * @param {string} type - Adapter type
   * @param {IHandlerAdapter} adapter - Handler adapter
   */
  registerAdapter(type, adapter) {
    this.handlerFactory.registerAdapter(type, adapter);
  }

  /**
   * Get handler statistics
   * @returns {Promise<Object>} Handler statistics
   */
  async getHandlerStatistics() {
    return {
      registry: this.handlerRegistry.getSummary(),
      factory: this.handlerFactory.getSummary(),
      registeredHandlers: this.handlerRegistry.getHandlerCount(),
      handlerTypes: this.handlerRegistry.getHandlerTypes(),
      adapters: this.handlerFactory.listAdapters()
    };
  }

  /**
   * Get handler information
   * @returns {Array<Object>} Handler information
   */
  getHandlerInformation() {
    return this.handlerRegistry.listHandlers();
  }

  /**
   * Find handlers by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array<Object>} Matching handlers
   */
  findHandlers(criteria) {
    return this.handlerRegistry.findHandlers(criteria);
  }

  /**
   * Initialize default adapters
   */
  initializeDefaultAdapters() {
    // Register only working adapters
    this.registerAdapter('command', this.handlerFactory.createCommandAdapter());
    this.registerAdapter('service', this.handlerFactory.createServiceAdapter());
  }

  /**
   * Generate handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      name: 'UnifiedWorkflowHandler',
      description: 'Main handler orchestration for unified workflow system',
      version: '1.0.0',
      type: 'unified-workflow'
    };
  }

  /**
   * Get handler dependencies
   * @returns {Array<string>} Handler dependencies
   */
  getDependencies() {
    return ['handlerRegistry', 'handlerFactory', 'handlerValidator'];
  }

  /**
   * Get handler version
   * @returns {string} Handler version
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Get handler type
   * @returns {string} Handler type
   */
  getType() {
    return 'unified-workflow';
  }

  /**
   * Initialize handler with configuration
   * @param {Object} config - Handler configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config = {}) {
    // Initialize components with configuration
    if (config.registry) {
      this.handlerRegistry.setOptions(config.registry);
    }

    if (config.factory) {
      this.handlerFactory.setOptions(config.factory);
    }

    if (config.validator) {
      this.handlerValidator.setOptions(config.validator);
    }

    this.logger.info('UnifiedWorkflowHandler: Initialized with configuration', {
      registryHandlers: this.handlerRegistry.getHandlerCount(),
      factoryAdapters: this.handlerFactory.listAdapters()
    });
  }

  /**
   * Cleanup handler resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    // Clear caches
    this.handlerFactory.clearCache();
    
    // Clear registries
    this.handlerRegistry.clearHandlers();
    this.handlerFactory.clearAdapters();

    this.logger.info('UnifiedWorkflowHandler: Cleanup completed');
  }

  /**
   * Get handler statistics
   * @returns {Object} Handler statistics
   */
  getStatistics() {
    return {
      registry: this.handlerRegistry.getAllStatistics(),
      factory: this.handlerFactory.getCacheStatistics(),
      totalHandlers: this.handlerRegistry.getHandlerCount(),
      totalAdapters: this.handlerFactory.listAdapters().length
    };
  }

  /**
   * Check if handler is healthy
   * @returns {Promise<boolean>} True if handler is healthy
   */
  async isHealthy() {
    try {
      // Check if all components are available
      const registryHealthy = this.handlerRegistry.getHandlerCount() >= 0;
      const factoryHealthy = this.handlerFactory.listAdapters().length > 0;
      
      return registryHealthy && factoryHealthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate handler
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    return await this.handlerValidator.validateContext(context);
  }

  /**
   * Check if handler can handle the given request
   * @param {Object} request - Request object to check
   * @returns {boolean} True if handler can handle the request
   */
  canHandle(request) {
    // Unified handler can handle any request that can be processed by its components
    return !!(request && (request.type || request.handlerClass || request.command || request.service));
  }
}

module.exports = UnifiedWorkflowHandler; 