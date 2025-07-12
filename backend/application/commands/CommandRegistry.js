/**
 * CommandRegistry - Application Layer: Command management
 * Manages command registration and retrieval with category support
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }

  /**
   * Build command from category
   * @param {string} category - Command category
   * @param {string} name - Command name
   * @param {Object} params - Command parameters
   * @returns {Object|null} Command instance
   */
  static buildFromCategory(category, name, params) {
    const commandMap = {
      analysis: {
        AdvancedAnalysisCommand: require('./categories/analysis/AdvancedAnalysisCommand'),
        AnalyzeArchitectureCommand: require('./categories/analysis/AnalyzeArchitectureCommand'),
        AnalyzeCodeQualityCommand: require('./categories/analysis/AnalyzeCodeQualityCommand'),
        AnalyzeDependenciesCommand: require('./categories/analysis/AnalyzeDependenciesCommand'),
        AnalyzeRepoStructureCommand: require('./categories/analysis/AnalyzeRepoStructureCommand'),
        AnalyzeTechStackCommand: require('./categories/analysis/AnalyzeTechStackCommand')
      },
      generate: {
        GenerateConfigsCommand: require('./categories/generate/GenerateConfigsCommand'),
        GenerateDocumentationCommand: require('./categories/generate/GenerateDocumentationCommand'),
        GenerateScriptsCommand: require('./categories/generate/GenerateScriptsCommand'),
        GenerateTestsCommand: require('./categories/generate/GenerateTestsCommand')
      },
      refactor: {
        OrganizeModulesCommand: require('./categories/refactor/OrganizeModulesCommand'),
        RestructureArchitectureCommand: require('./categories/refactor/RestructureArchitectureCommand'),
        SplitLargeFilesCommand: require('./categories/refactor/SplitLargeFilesCommand'),
        CleanDependenciesCommand: require('./categories/refactor/CleanDependenciesCommand')
      },
      management: {
        AutoRefactorCommand: require('./categories/management/AutoRefactorCommand'),
        CreateTaskCommand: require('./categories/management/CreateTaskCommand'),
        PortStreamingCommand: require('./categories/management/PortStreamingCommand'),
        ProcessTodoListCommand: require('./categories/management/ProcessTodoListCommand'),
        SendMessageCommand: require('./categories/management/SendMessageCommand'),
        StartStreamingCommand: require('./categories/management/StartStreamingCommand'),
        StopStreamingCommand: require('./categories/management/StopStreamingCommand'),
        TestCorrectionCommand: require('./categories/management/TestCorrectionCommand'),
        UpdateTestStatusCommand: require('./categories/management/UpdateTestStatusCommand')
      }
    };
    
    const CommandClass = commandMap[category]?.[name];
    return CommandClass ? new CommandClass(params) : null;
  }

  /**
   * Get commands by category
   * @param {string} category - Category name
   * @returns {Array} Command names in category
   */
  static getByCategory(category) {
    const categoryCommands = {
      analysis: [
        'AdvancedAnalysisCommand',
        'AnalyzeArchitectureCommand',
        'AnalyzeCodeQualityCommand',
        'AnalyzeDependenciesCommand',
        'AnalyzeRepoStructureCommand',
        'AnalyzeTechStackCommand'
      ],
      generate: [
        'GenerateConfigsCommand',
        'GenerateDocumentationCommand',
        'GenerateScriptsCommand',
        'GenerateTestsCommand'
      ],
      refactor: [
        'OrganizeModulesCommand',
        'RestructureArchitectureCommand',
        'SplitLargeFilesCommand',
        'CleanDependenciesCommand'
      ],
      management: [
        'AutoRefactorCommand',
        'CreateTaskCommand',
        'PortStreamingCommand',
        'ProcessTodoListCommand',
        'SendMessageCommand',
        'StartStreamingCommand',
        'StopStreamingCommand',
        'TestCorrectionCommand',
        'UpdateTestStatusCommand'
      ]
    };
    
    return categoryCommands[category] || [];
  }
}

module.exports = CommandRegistry;
