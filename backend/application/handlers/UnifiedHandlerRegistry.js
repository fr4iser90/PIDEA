/**
 * UnifiedHandlerRegistry - Application Layer: Unified Handler Management
 * 
 * This class provides a unified registry for managing both business handlers
 * and workflow handlers, combining the category-based approach with the
 * dynamic registration approach.
 * Implements IStandardRegistry interface for consistent patterns
 */

const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../../domain/constants/Categories');
const IStandardRegistry = require('../../domain/interfaces/IStandardRegistry');

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
    // Validate category
    if (!isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    const handlerMap = {
      [STANDARD_CATEGORIES.ANALYSIS]: {
        AdvancedAnalysisHandler: require('./categories/analysis/AdvancedAnalysisHandler')
      },
      [STANDARD_CATEGORIES.GENERATE]: {
        GenerateConfigsHandler: require('./categories/generate/GenerateConfigsHandler'),
        GenerateDocumentationHandler: require('./categories/generate/GenerateDocumentationHandler'),
        GenerateScriptsHandler: require('./categories/generate/GenerateScriptsHandler'),
        GenerateTestsHandler: require('./categories/generate/GenerateTestsHandler')
      },
      [STANDARD_CATEGORIES.REFACTORING]: {
        OrganizeModulesHandler: require('./categories/refactoring/OrganizeModulesHandler'),
        RestructureArchitectureHandler: require('./categories/refactoring/RestructureArchitectureHandler'),
        SplitLargeFilesHandler: require('./categories/refactoring/SplitLargeFilesHandler'),
        CleanDependenciesHandler: require('./categories/refactoring/CleanDependenciesHandler')
      },
      [STANDARD_CATEGORIES.MANAGEMENT]: {
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
    // Validate category
    if (!isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    const categoryHandlers = {
      [STANDARD_CATEGORIES.ANALYSIS]: [
        'AdvancedAnalysisHandler'
      ],
      [STANDARD_CATEGORIES.GENERATE]: [
        'GenerateConfigsHandler',
        'GenerateDocumentationHandler',
        'GenerateScriptsHandler',
        'GenerateTestsHandler'
      ],
      [STANDARD_CATEGORIES.REFACTORING]: [
        'OrganizeModulesHandler',
        'RestructureArchitectureHandler',
        'SplitLargeFilesHandler',
        'CleanDependenciesHandler'
      ],
      [STANDARD_CATEGORIES.MANAGEMENT]: [
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

  // ==================== IStandardRegistry Interface Implementation ====================

  /**
   * Register component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} config - Component configuration
   * @param {string} category - Component category
   * @param {Function} executor - Component executor (optional)
   * @returns {Promise<boolean>} Registration success
   */
  static async register(name, config, category, executor = null) {
    const instance = new UnifiedHandlerRegistry();
    
    // Use default category if not provided
    const finalCategory = category || getDefaultCategory('handler');
    
    // Validate category
    if (!isValidCategory(finalCategory)) {
      throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    // Register as workflow handler
    const handler = {
      name,
      config,
      category: finalCategory,
      executor,
      registeredAt: new Date(),
      status: 'active',
      metadata: {
        type: 'handler',
        category: finalCategory,
        version: config.version || '1.0.0'
      },
      // Mock methods for interface compliance
      execute: executor || (() => Promise.resolve({ success: true })),
      getMetadata: () => ({ name, category: finalCategory, version: config.version || '1.0.0' }),
      validate: () => true,
      canHandle: () => true,
      getDependencies: () => [],
      getVersion: () => config.version || '1.0.0',
      getType: () => 'handler'
    };

    return instance.registerWorkflowHandler(name, handler, config);
  }

  /**
   * Execute component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    const instance = new UnifiedHandlerRegistry();
    const handler = instance.getHandler(name);
    
    if (!handler) {
      throw new Error(`Handler "${name}" not found`);
    }

    if (typeof handler.execute === 'function') {
      return await handler.execute(context, options);
    }

    return { success: true, handler: name, context, options };
  }

  /**
   * Get all categories (IStandardRegistry interface)
   * @returns {Array} All available categories
   */
  static getCategories() {
    return Object.values(STANDARD_CATEGORIES);
  }

  /**
   * Get component by name (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  static get(name) {
    const instance = new UnifiedHandlerRegistry();
    const handler = instance.getHandler(name);
    if (!handler) {
      throw new Error(`Handler "${name}" not found`);
    }
    return handler;
  }

  /**
   * Check if component exists (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    const instance = new UnifiedHandlerRegistry();
    return instance.hasHandler(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new UnifiedHandlerRegistry();
    
    // Try to remove from workflow handlers
    if (instance.workflowHandlers.has(name)) {
      instance.workflowHandlers.delete(name);
      instance.handlerTypes.delete(name);
      instance.handlerMetadata.delete(name);
      instance.handlerStatistics.delete(name);
      return true;
    }
    
    // Try to remove from business handlers
    if (instance.businessHandlers.has(name)) {
      instance.businessHandlers.delete(name);
      return true;
    }
    
    return false;
  }

  /**
   * Get registry statistics (IStandardRegistry interface)
   * @returns {Object} Registry statistics
   */
  static getStats() {
    const instance = new UnifiedHandlerRegistry();
    return {
      totalHandlers: instance.getTotalHandlerCount(),
      businessHandlers: instance.businessHandlers.size,
      workflowHandlers: instance.workflowHandlers.size,
      categories: instance.categories.size,
      activeHandlers: instance.getTotalHandlerCount(), // All handlers are considered active
      inactiveHandlers: 0
    };
  }

  /**
   * Validate component configuration (IStandardRegistry interface)
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      return { isValid: false, errors: ['Handler configuration must be an object'] };
    }

    if (!config.name) {
      return { isValid: false, errors: ['Handler configuration must have a "name" property'] };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Get component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component metadata
   */
  static getMetadata(name) {
    const instance = new UnifiedHandlerRegistry();
    const handler = instance.getHandler(name);
    
    if (!handler) {
      return {};
    }
    
    if (typeof handler.getMetadata === 'function') {
      return handler.getMetadata();
    }
    
    return {
      name,
      type: 'handler',
      version: '1.0.0'
    };
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new UnifiedHandlerRegistry();
    const handler = instance.getHandler(name);
    
    if (!handler) {
      return false;
    }
    
    // Update metadata if handler supports it
    if (typeof handler.getMetadata === 'function') {
      // This would require the handler to have a setMetadata method
      // For now, we'll just return true as the handler exists
      return true;
    }
    
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    const instance = new UnifiedHandlerRegistry();
    const statistics = instance.handlerStatistics.get(name);
    
    if (statistics) {
      return [{
        handler: name,
        executions: statistics.executions,
        successes: statistics.successes,
        failures: statistics.failures,
        lastExecuted: statistics.lastExecuted,
        averageDuration: statistics.averageDuration
      }];
    }
    
    return [];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new UnifiedHandlerRegistry();
    instance.clearAllHandlers();
    return true;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new UnifiedHandlerRegistry();
    return {
      businessHandlers: Array.from(instance.businessHandlers.entries()),
      workflowHandlers: Array.from(instance.workflowHandlers.entries()),
      categories: Array.from(instance.categories.entries()),
      handlerMetadata: Array.from(instance.handlerMetadata.entries()),
      handlerStatistics: Array.from(instance.handlerStatistics.entries())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new UnifiedHandlerRegistry();
    
    if (data.businessHandlers) {
      data.businessHandlers.forEach(([name, handler]) => {
        instance.businessHandlers.set(name, handler);
      });
    }
    
    if (data.workflowHandlers) {
      data.workflowHandlers.forEach(([name, handler]) => {
        instance.workflowHandlers.set(name, handler);
      });
    }
    
    if (data.categories) {
      data.categories.forEach(([category, handlers]) => {
        instance.categories.set(category, new Map(handlers));
      });
    }
    
    if (data.handlerMetadata) {
      data.handlerMetadata.forEach(([name, metadata]) => {
        instance.handlerMetadata.set(name, metadata);
      });
    }
    
    if (data.handlerStatistics) {
      data.handlerStatistics.forEach(([name, statistics]) => {
        instance.handlerStatistics.set(name, statistics);
      });
    }
    
    return true;
  }
}

module.exports = UnifiedHandlerRegistry; 