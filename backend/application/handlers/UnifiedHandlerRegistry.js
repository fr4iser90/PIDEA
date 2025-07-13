/**
 * UnifiedHandlerRegistry - Application Layer: Unified Handler Management
 * 
 * This class provides a unified registry for managing both business handlers
 * and workflow handlers, combining the category-based approach with the
 * dynamic registration approach.
 */
class UnifiedHandlerRegistry {
  /**
   * Create a new unified handler registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    // Business handlers (category-based)
    this.businessHandlers = new Map();
    this.categories = new Map();
    
    // Workflow handlers (dynamic registration)
    this.workflowHandlers = new Map();
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

  // ==================== BUSINESS HANDLER METHODS ====================

  /**
   * Build business handler from category
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object|null} Handler instance
   */
  static buildFromCategory(category, name, dependencies) {
    const handlerMap = {
      analysis: {
        AdvancedAnalysisHandler: require('./categories/analysis/AdvancedAnalysisHandler')
      },
      generate: {
        GenerateConfigsHandler: require('./categories/generate/GenerateConfigsHandler'),
        GenerateDocumentationHandler: require('./categories/generate/GenerateDocumentationHandler'),
        GenerateScriptsHandler: require('./categories/generate/GenerateScriptsHandler'),
        GenerateTestsHandler: require('./categories/generate/GenerateTestsHandler')
      },
      refactoring: { // Updated from 'refactor' to 'refactoring'
        OrganizeModulesHandler: require('./categories/refactoring/OrganizeModulesHandler'),
        RestructureArchitectureHandler: require('./categories/refactoring/RestructureArchitectureHandler'),
        SplitLargeFilesHandler: require('./categories/refactoring/SplitLargeFilesHandler'),
        CleanDependenciesHandler: require('./categories/refactoring/CleanDependenciesHandler')
      },
      management: {
        CreateTaskHandler: require('./categories/management/CreateTaskHandler'),
        GetChatHistoryHandler: require('./categories/management/GetChatHistoryHandler'),
        PortStreamingHandler: require('./categories/management/PortStreamingHandler'),
        ProcessTodoListHandler: require('./categories/management/ProcessTodoListHandler'),
        SendMessageHandler: require('./categories/management/SendMessageHandler'),
        StartStreamingHandler: require('./categories/management/StartStreamingHandler'),
        StopStreamingHandler: require('./categories/management/StopStreamingHandler'),
        UpdateTestStatusHandler: require('./categories/management/UpdateTestStatusHandler')
      }
    };
    
    const HandlerClass = handlerMap[category]?.[name];
    return HandlerClass ? new HandlerClass(dependencies) : null;
  }

  /**
   * Get business handlers by category
   * @param {string} category - Category name
   * @returns {Array} Handler names in category
   */
  static getByCategory(category) {
    const categoryHandlers = {
      analysis: [
        'AdvancedAnalysisHandler'
      ],
      generate: [
        'GenerateConfigsHandler',
        'GenerateDocumentationHandler',
        'GenerateScriptsHandler',
        'GenerateTestsHandler'
      ],
      refactoring: [ // Updated from 'refactor' to 'refactoring'
        'OrganizeModulesHandler',
        'RestructureArchitectureHandler',
        'SplitLargeFilesHandler',
        'CleanDependenciesHandler'
      ],
      management: [
        'CreateTaskHandler',
        'GetChatHistoryHandler',
        'PortStreamingHandler',
        'ProcessTodoListHandler',
        'SendMessageHandler',
        'StartStreamingHandler',
        'StopStreamingHandler',
        'UpdateTestStatusHandler'
      ]
    };
    
    return categoryHandlers[category] || [];
  }

  /**
   * Register business handler
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} handler - Handler instance
   */
  registerBusinessHandler(category, name, handler) {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Map());
    }
    this.categories.get(category).set(name, handler);
    this.businessHandlers.set(`${category}.${name}`, handler);
  }

  /**
   * Get business handler
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @returns {Object|null} Handler instance
   */
  getBusinessHandler(category, name) {
    return this.categories.get(category)?.get(name) || null;
  }

  /**
   * Get all business handlers
   * @returns {Array<Object>} All business handlers
   */
  getAllBusinessHandlers() {
    return Array.from(this.businessHandlers.values());
  }

  // ==================== WORKFLOW HANDLER METHODS ====================

  /**
   * Register workflow handler
   * @param {string} type - Handler type
   * @param {Object} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {boolean} True if registration successful
   */
  registerWorkflowHandler(type, handler, metadata = {}) {
    try {
      // Validate inputs
      if (!type || typeof type !== 'string') {
        throw new Error('Handler type must be a non-empty string');
      }

      if (!handler) {
        throw new Error('Handler instance is required');
      }

      // Check registry capacity
      if (this.workflowHandlers.size >= this.options.maxHandlers) {
        throw new Error(`Registry capacity exceeded (max: ${this.options.maxHandlers})`);
      }

      // Validate handler if enabled
      if (this.options.enableValidation) {
        this.validateHandlerForRegistration(handler);
      }

      // Register handler
      this.workflowHandlers.set(type, handler);
      this.handlerTypes.set(type, handler.constructor.name);
      
      // Store metadata
      const fullMetadata = {
        ...handler.getMetadata?.(),
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
      console.error('Workflow handler registration failed:', error.message);
      return false;
    }
  }

  /**
   * Get workflow handler by type
   * @param {string} type - Handler type
   * @returns {Object|null} Handler instance
   */
  getWorkflowHandler(type) {
    return this.workflowHandlers.get(type) || null;
  }

  /**
   * Check if workflow handler exists
   * @param {string} type - Handler type
   * @returns {boolean} True if handler exists
   */
  hasWorkflowHandler(type) {
    return this.workflowHandlers.has(type);
  }

  /**
   * Get workflow handler metadata
   * @param {string} type - Handler type
   * @returns {Object|null} Handler metadata
   */
  getWorkflowHandlerMetadata(type) {
    return this.handlerMetadata.get(type) || null;
  }

  /**
   * Get workflow handler count
   * @returns {number} Number of registered workflow handlers
   */
  getWorkflowHandlerCount() {
    return this.workflowHandlers.size;
  }

  /**
   * Get workflow handler types
   * @returns {Array<string>} Workflow handler types
   */
  getWorkflowHandlerTypes() {
    return Array.from(this.workflowHandlers.keys());
  }

  /**
   * List all workflow handlers
   * @returns {Array<Object>} Workflow handler information
   */
  listWorkflowHandlers() {
    const handlers = [];
    
    for (const [type, handler] of this.workflowHandlers) {
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

  // ==================== UNIFIED METHODS ====================

  /**
   * Get handler by type (unified lookup)
   * @param {string} type - Handler type
   * @returns {Object|null} Handler instance
   */
  getHandler(type) {
    // First try workflow handlers
    const workflowHandler = this.getWorkflowHandler(type);
    if (workflowHandler) {
      return workflowHandler;
    }

    // Then try business handlers
    return this.businessHandlers.get(type) || null;
  }

  /**
   * Check if handler exists (unified check)
   * @param {string} type - Handler type
   * @returns {boolean} True if handler exists
   */
  hasHandler(type) {
    return this.hasWorkflowHandler(type) || this.businessHandlers.has(type);
  }

  /**
   * Get total handler count
   * @returns {number} Total number of handlers
   */
  getTotalHandlerCount() {
    return this.businessHandlers.size + this.workflowHandlers.size;
  }

  /**
   * Get registry summary
   * @returns {Object} Registry summary
   */
  getSummary() {
    return {
      businessHandlers: {
        count: this.businessHandlers.size,
        categories: Array.from(this.categories.keys())
      },
      workflowHandlers: {
        count: this.workflowHandlers.size,
        types: this.getWorkflowHandlerTypes()
      },
      total: this.getTotalHandlerCount(),
      options: this.options
    };
  }

  /**
   * Validate handler for registration
   * @param {Object} handler - Handler to validate
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
   * Get options
   * @returns {Object} Registry options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clear all handlers
   */
  clearAllHandlers() {
    this.businessHandlers.clear();
    this.categories.clear();
    this.workflowHandlers.clear();
    this.handlerTypes.clear();
    this.handlerMetadata.clear();
    this.handlerStatistics.clear();
  }
}

module.exports = UnifiedHandlerRegistry; 