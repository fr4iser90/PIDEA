/**
 * HandlerRegistry - zentrale Registry für alle Handler-Typen
 * Manages handler registration and retrieval with category support
 * Implements IStandardRegistry interface for consistent patterns
 */

const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../../domain/constants/Categories');
const IStandardRegistry = require('../../domain/interfaces/IStandardRegistry');

class HandlerRegistry {
  constructor(serviceRegistry = null) {
    this.handlers = new Map();
    this.categories = new Map();
    this.serviceRegistry = serviceRegistry;
  }

  /**
   * Build handler from category
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object|null} Handler instance
   */
  static buildFromCategory(category, name, dependencies, serviceRegistry = null) {
    const handlerMap = {
      analysis: {
        AdvancedAnalysisHandler: require('./categories/analysis/AdvancedAnalysisHandler'),
        AnalyzeLayerViolationsHandler: require('./categories/analysis/AnalyzeLayerViolationsHandler')
      },
      generate: {
        GenerateConfigsHandler: require('./categories/generate/GenerateConfigsHandler'),
        GenerateDocumentationHandler: require('./categories/generate/GenerateDocumentationHandler'),
        GenerateScriptsHandler: require('./categories/generate/GenerateScriptsHandler'),
        GenerateTestsHandler: require('./categories/generate/GenerateTestsHandler')
      },
      refactoring: {
        OrganizeModulesHandler: require('./categories/refactoring/OrganizeModulesHandler'),
        RestructureArchitectureHandler: require('./categories/refactoring/RestructureArchitectureHandler'),
        SplitLargeFilesHandler: require('./categories/refactoring/SplitLargeFilesHandler'),
        CleanDependenciesHandler: require('./categories/refactoring/CleanDependenciesHandler')
      },
      management: {
        CreateTaskHandler: require('./categories/management/CreateTaskHandler'),
        GetChatHistoryHandler: require('./categories/management/GetChatHistoryHandler'),
        PortStreamingHandler: require('./categories/management/PortStreamingHandler'),
        // ProcessTodoListHandler: require('./categories/management/ProcessTodoListHandler'), // Removed - converted to workflow
        SendMessageHandler: require('./categories/management/SendMessageHandler'),
        StartStreamingHandler: require('./categories/management/StartStreamingHandler'),
        StopStreamingHandler: require('./categories/management/StopStreamingHandler'),
        UpdateTestStatusHandler: require('./categories/management/UpdateTestStatusHandler')
      },
      ide: {
        CreateChatHandler: require('./categories/ide/CreateChatHandler'),
        SendMessageHandler: require('./categories/management/SendMessageHandler'),
        SwitchChatHandler: require('./categories/ide/SwitchChatHandler'),
        ListChatsHandler: require('./categories/ide/ListChatsHandler'),
        CloseChatHandler: require('./categories/ide/CloseChatHandler'),
        GetChatHistoryHandler: require('./categories/ide/GetChatHistoryHandler'),
        OpenTerminalHandler: require('./categories/ide/OpenTerminalHandler'),
        ExecuteTerminalHandler: require('./categories/ide/ExecuteTerminalHandler'),
        MonitorTerminalOutputHandler: require('./categories/ide/MonitorTerminalOutputHandler'),
        RestartUserAppHandler: require('./categories/ide/RestartUserAppHandler'),
        TerminalLogCaptureHandler: require('./categories/ide/TerminalLogCaptureHandler'),
        AnalyzeProjectHandler: require('./categories/ide/AnalyzeProjectHandler'),
        AnalyzeAgainHandler: require('./categories/ide/AnalyzeAgainHandler'),
        GetWorkspaceInfoHandler: require('./categories/ide/GetWorkspaceInfoHandler'),
        DetectPackageJsonHandler: require('./categories/ide/DetectPackageJsonHandler'),
        SwitchIDEPortHandler: require('./categories/ide/SwitchIDEPortHandler'),
        OpenFileExplorerHandler: require('./categories/ide/OpenFileExplorerHandler'),
        OpenCommandPaletteHandler: require('./categories/ide/OpenCommandPaletteHandler'),
        ExecuteIDEActionHandler: require('./categories/ide/ExecuteIDEActionHandler'),
        GetIDESelectorsHandler: require('./categories/ide/GetIDESelectorsHandler')
      },
      git: {
        GitAddFilesHandler: require('./categories/git/GitAddFilesHandler'),
        GitCommitHandler: require('./categories/git/GitCommitHandler'),
        GitPushHandler: require('./categories/git/GitPushHandler'),
        GitPullHandler: require('./categories/git/GitPullHandler'),
        GitCheckoutHandler: require('./categories/git/GitCheckoutHandler'),
        GitCreateBranchHandler: require('./categories/git/GitCreateBranchHandler'),
        GitMergeHandler: require('./categories/git/GitMergeHandler'),
        GitStatusHandler: require('./categories/git/GitStatusHandler'),
        GitCloneHandler: require('./categories/git/GitCloneHandler'),
        GitInitHandler: require('./categories/git/GitInitHandler'),
        GitResetHandler: require('./categories/git/GitResetHandler'),
        GitDiffHandler: require('./categories/git/GitDiffHandler'),
        GitLogHandler: require('./categories/git/GitLogHandler'),
        GitRemoteHandler: require('./categories/git/GitRemoteHandler'),
        GitBranchHandler: require('./categories/git/GitBranchHandler'),
        GitCreatePullRequestHandler: require('./categories/git/GitCreatePullRequestHandler')
      }
    };
    
    const HandlerClass = handlerMap[category]?.[name];
    if (!HandlerClass) return null;
    
    // If serviceRegistry is provided, enhance dependencies with services
    if (serviceRegistry) {
      const enhancedDependencies = { ...dependencies };
      // Add services that the handler might need
      if (serviceRegistry.hasService('logger')) {
        enhancedDependencies.logger = serviceRegistry.getService('logger');
      }
      if (serviceRegistry.hasService('eventBus')) {
        enhancedDependencies.eventBus = serviceRegistry.getService('eventBus');
      }
      return new HandlerClass(enhancedDependencies);
    }
    
    return new HandlerClass(dependencies);
  }

  /**
   * Get handlers by category
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
        // 'ProcessTodoListHandler', // Removed - converted to workflow
        'SendMessageHandler',
        'StartStreamingHandler',
        'StopStreamingHandler',
        'UpdateTestStatusHandler'
      ],
      [STANDARD_CATEGORIES.IDE]: [
        'CreateChatHandler',
        'SendMessageHandler',
        'SwitchChatHandler',
        'ListChatsHandler',
        'CloseChatHandler',
        'GetChatHistoryHandler',
        'OpenTerminalHandler',
        'ExecuteTerminalHandler',
        'MonitorTerminalOutputHandler',
        'RestartUserAppHandler',
        'TerminalLogCaptureHandler',
        'AnalyzeProjectHandler',
        'AnalyzeAgainHandler',
        'GetWorkspaceInfoHandler',
        'DetectPackageJsonHandler',
        'SwitchIDEPortHandler',
        'OpenFileExplorerHandler',
        'OpenCommandPaletteHandler',
        'ExecuteIDEActionHandler',
        'GetIDESelectorsHandler'
      ]
    };
    
    return categoryHandlers[category] || [];
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
    const instance = new HandlerRegistry();
    
    // Use default category if not provided
    const finalCategory = category || getDefaultCategory('handler');
    
    // Validate category
    if (!isValidCategory(finalCategory)) {
      throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    // Store handler
    instance.handlers.set(name, {
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
      }
    });

    // Add to category
    if (!instance.categories.has(finalCategory)) {
      instance.categories.set(finalCategory, new Set());
    }
    instance.categories.get(finalCategory).add(name);

    return true;
  }

  /**
   * Execute component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    const handler = HandlerRegistry.buildFromCategory(context.category || 'management', name, context);
    
    if (!handler) {
      throw new Error(`Handler "${name}" not found`);
    }

    return await handler.handle(context, options);
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
    const instance = new HandlerRegistry();
    const handler = instance.handlers.get(name);
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
    const instance = new HandlerRegistry();
    return instance.handlers.has(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new HandlerRegistry();
    const handler = instance.handlers.get(name);
    
    if (!handler) {
      return false;
    }
    
    // Remove from handlers map
    instance.handlers.delete(name);
    
    // Remove from category
    const category = handler.category;
    if (instance.categories.has(category)) {
      instance.categories.get(category).delete(name);
      
      // Remove empty category
      if (instance.categories.get(category).size === 0) {
        instance.categories.delete(category);
      }
    }
    
    return true;
  }

  /**
   * Get registry statistics (IStandardRegistry interface)
   * @returns {Object} Registry statistics
   */
  static getStats() {
    const instance = new HandlerRegistry();
    return {
      totalHandlers: instance.handlers.size,
      categories: instance.categories.size,
      activeHandlers: Array.from(instance.handlers.values()).filter(h => h.status === 'active').length,
      inactiveHandlers: Array.from(instance.handlers.values()).filter(h => h.status === 'inactive').length
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
    const instance = new HandlerRegistry();
    const handler = instance.handlers.get(name);
    return handler?.metadata || {};
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new HandlerRegistry();
    const handler = instance.handlers.get(name);
    
    if (!handler) {
      return false;
    }
    
    handler.metadata = { ...handler.metadata, ...metadata };
    handler.updatedAt = new Date();
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    // Handler execution history would be implemented here
    return [];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new HandlerRegistry();
    instance.handlers.clear();
    instance.categories.clear();
    return true;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new HandlerRegistry();
    return {
      handlers: Array.from(instance.handlers.entries()),
      categories: Array.from(instance.categories.entries())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new HandlerRegistry();
    
    if (data.handlers) {
      data.handlers.forEach(([name, handler]) => {
        instance.handlers.set(name, handler);
      });
    }
    
    if (data.categories) {
      data.categories.forEach(([category, names]) => {
        instance.categories.set(category, new Set(names));
      });
    }
    
    return true;
  }
}

module.exports = HandlerRegistry;
