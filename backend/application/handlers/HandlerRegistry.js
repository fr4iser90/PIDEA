/**
 * HandlerRegistry - Application Layer: Handler management
 * Manages handler registration and retrieval with category support
 */
class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.categories = new Map();
  }

  /**
   * Build handler from category
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
      refactor: {
        OrganizeModulesHandler: require('./categories/refactor/OrganizeModulesHandler'),
        RestructureArchitectureHandler: require('./categories/refactor/RestructureArchitectureHandler'),
        SplitLargeFilesHandler: require('./categories/refactor/SplitLargeFilesHandler'),
        CleanDependenciesHandler: require('./categories/refactor/CleanDependenciesHandler')
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
   * Get handlers by category
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
      refactor: [
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
}

module.exports = HandlerRegistry;
