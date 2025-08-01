/**
 * CommandRegistry - Application Layer: Command management
 * Manages command registration and retrieval with category support
 * Implements IStandardRegistry interface for consistent patterns
 */

const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../../domain/constants/Categories');
const IStandardRegistry = require('../../domain/interfaces/IStandardRegistry');

class CommandRegistry {
  constructor(serviceRegistry = null) {
    this.commands = new Map();
    this.categories = new Map();
    this.serviceRegistry = serviceRegistry;
  }

  /**
   * Build command from category
   * @param {string} category - Command category
   * @param {string} name - Command name
   * @param {Object} params - Command parameters
   * @returns {Object|null} Command instance
   */
  static buildFromCategory(category, name, params, serviceRegistry = null) {
    // Lazy loading function to get command class
    const getCommandClass = (category, name) => {
      try {
        const commandMap = {
          analysis: {
            AdvancedAnalysisCommand: () => require('./categories/analysis/AdvancedAnalysisCommand'),
            AnalyzeArchitectureCommand: () => require('./categories/analysis/AnalyzeArchitectureCommand'),
            AnalyzeCodeQualityCommand: () => require('./categories/analysis/AnalyzeCodeQualityCommand'),
            AnalyzeDependenciesCommand: () => require('./categories/analysis/AnalyzeDependenciesCommand'),
            AnalyzeRepoStructureCommand: () => require('./categories/analysis/AnalyzeRepoStructureCommand'),
            AnalyzeTechStackCommand: () => require('./categories/analysis/AnalyzeTechStackCommand'),
            AnalyzeLayerViolationsCommand: () => require('./categories/analysis/AnalyzeLayerViolationsCommand')
          },
          generate: {
            GenerateConfigsCommand: () => require('./categories/generate/GenerateConfigsCommand'),
            GenerateDocumentationCommand: () => require('./categories/generate/GenerateDocumentationCommand'),
            GenerateScriptsCommand: () => require('./categories/generate/GenerateScriptsCommand'),
            GenerateTestsCommand: () => require('./categories/generate/GenerateTestsCommand')
          },
          refactoring: {
            OrganizeModulesCommand: () => require('./categories/refactoring/OrganizeModulesCommand'),
            RestructureArchitectureCommand: () => require('./categories/refactoring/RestructureArchitectureCommand'),
            SplitLargeFilesCommand: () => require('./categories/refactoring/SplitLargeFilesCommand'),
            CleanDependenciesCommand: () => require('./categories/refactoring/CleanDependenciesCommand')
          },
          management: {
            PortStreamingCommand: () => require('./categories/management/PortStreamingCommand'),
            ProcessTodoListCommand: () => require('./categories/management/ProcessTodoListCommand'),
            SendMessageCommand: () => require('./categories/management/SendMessageCommand'),
            StartStreamingCommand: () => require('./categories/management/StartStreamingCommand'),
            StopStreamingCommand: () => require('./categories/management/StopStreamingCommand'),
            TestCorrectionCommand: () => require('./categories/management/TestCorrectionCommand'),
            UpdateTestStatusCommand: () => require('./categories/management/UpdateTestStatusCommand')
          },
          workflow: {
            CreateTaskCommand: () => require('./categories/workflow/CreateTaskCommand'),
            UpdateTestStatusCommand: () => require('./categories/workflow/UpdateTestStatusCommand')
          },
          ide: {
            CreateChatCommand: () => require('./categories/ide/CreateChatCommand'),
            SendMessageCommand: () => require('./categories/ide/SendMessageCommand'),
            SwitchChatCommand: () => require('./categories/ide/SwitchChatCommand'),
            ListChatsCommand: () => require('./categories/ide/ListChatsCommand'),
            CloseChatCommand: () => require('./categories/ide/CloseChatCommand'),
            GetChatHistoryCommand: () => require('./categories/ide/GetChatHistoryCommand'),
            OpenTerminalCommand: () => require('./categories/ide/OpenTerminalCommand'),
            ExecuteTerminalCommand: () => require('./categories/ide/ExecuteTerminalCommand'),
            MonitorTerminalOutputCommand: () => require('./categories/ide/MonitorTerminalOutputCommand'),
            RestartUserAppCommand: () => require('./categories/ide/RestartUserAppCommand'),
            TerminalLogCaptureCommand: () => require('./categories/ide/TerminalLogCaptureCommand'),
            AnalyzeProjectCommand: () => require('./categories/ide/AnalyzeProjectCommand'),
            AnalyzeAgainCommand: () => require('./categories/ide/AnalyzeAgainCommand'),
            GetWorkspaceInfoCommand: () => require('./categories/ide/GetWorkspaceInfoCommand'),
            DetectPackageJsonCommand: () => require('./categories/ide/DetectPackageJsonCommand'),
            SwitchIDEPortCommand: () => require('./categories/ide/SwitchIDEPortCommand'),
            OpenFileExplorerCommand: () => require('./categories/ide/OpenFileExplorerCommand'),
            OpenCommandPaletteCommand: () => require('./categories/ide/OpenCommandPaletteCommand'),
            ExecuteIDEActionCommand: () => require('./categories/ide/ExecuteIDEActionCommand'),
            GetIDESelectorsCommand: () => require('./categories/ide/GetIDESelectorsCommand')
          },
          git: {
            GitAddFilesCommand: () => require('./categories/git/GitAddFilesCommand'),
            GitCommitCommand: () => require('./categories/git/GitCommitCommand'),
            GitPushCommand: () => require('./categories/git/GitPushCommand'),
            GitPullCommand: () => require('./categories/git/GitPullCommand'),
            GitCheckoutCommand: () => require('./categories/git/GitCheckoutCommand'),
            GitCreateBranchCommand: () => require('./categories/git/GitCreateBranchCommand'),
            GitMergeCommand: () => require('./categories/git/GitMergeCommand'),
            GitStatusCommand: () => require('./categories/git/GitStatusCommand'),
            GitCloneCommand: () => require('./categories/git/GitCloneCommand'),
            GitInitCommand: () => require('./categories/git/GitInitCommand'),
            GitResetCommand: () => require('./categories/git/GitResetCommand'),
            GitDiffCommand: () => require('./categories/git/GitDiffCommand'),
            GitLogCommand: () => require('./categories/git/GitLogCommand'),
            GitRemoteCommand: () => require('./categories/git/GitRemoteCommand'),
            GitBranchCommand: () => require('./categories/git/GitBranchCommand'),
            GitCreatePullRequestCommand: () => require('./categories/git/GitCreatePullRequestCommand')
          }
        };
        
        const commandLoader = commandMap[category]?.[name];
        if (!commandLoader) return null;
        
        return commandLoader();
      } catch (error) {
        console.error(`Failed to load command ${category}/${name}:`, error.message);
        return null;
      }
    };
    
    const CommandClass = getCommandClass(category, name);
    if (!CommandClass) return null;
    
    // If serviceRegistry is provided, enhance params with services
    if (serviceRegistry) {
      const enhancedParams = { ...params };
      // Add services that the command might need
      if (serviceRegistry.hasService('logger')) {
        enhancedParams.logger = serviceRegistry.getService('logger');
      }
      if (serviceRegistry.hasService('eventBus')) {
        enhancedParams.eventBus = serviceRegistry.getService('eventBus');
      }
      return new CommandClass(enhancedParams);
    }
    
    return new CommandClass(params);
  }

  /**
   * Get commands by category
   * @param {string} category - Category name
   * @returns {Array} Command names in category
   */
  static getByCategory(category) {
    // Validate category
    if (!isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    const categoryCommands = {
      [STANDARD_CATEGORIES.ANALYSIS]: [
        'AdvancedAnalysisCommand',
        'AnalyzeArchitectureCommand',
        'AnalyzeCodeQualityCommand',
        'AnalyzeDependenciesCommand',
        'AnalyzeRepoStructureCommand',
        'AnalyzeTechStackCommand'
      ],
      [STANDARD_CATEGORIES.GENERATE]: [
        'GenerateConfigsCommand',
        'GenerateDocumentationCommand',
        'GenerateScriptsCommand',
        'GenerateTestsCommand'
      ],
      [STANDARD_CATEGORIES.REFACTORING]: [
        'OrganizeModulesCommand',
        'RestructureArchitectureCommand',
        'SplitLargeFilesCommand',
        'CleanDependenciesCommand'
      ],
      [STANDARD_CATEGORIES.MANAGEMENT]: [
        'AutoRefactorCommand',
        'CreateTaskCommand',
        'PortStreamingCommand',
        'ProcessTodoListCommand',
        'SendMessageCommand',
        'StartStreamingCommand',
        'StopStreamingCommand',
        'TestCorrectionCommand',
        'UpdateTestStatusCommand'
      ],
      [STANDARD_CATEGORIES.IDE]: [
        'CreateChatCommand',
        'SendMessageCommand',
        'SwitchChatCommand',
        'ListChatsCommand',
        'CloseChatCommand',
        'GetChatHistoryCommand',
        'OpenTerminalCommand',
        'ExecuteTerminalCommand',
        'MonitorTerminalOutputCommand',
        'RestartUserAppCommand',
        'TerminalLogCaptureCommand',
        'AnalyzeProjectCommand',
        'AnalyzeAgainCommand',
        'GetWorkspaceInfoCommand',
        'DetectPackageJsonCommand',
        'SwitchIDEPortCommand',
        'OpenFileExplorerCommand',
        'OpenCommandPaletteCommand',
        'ExecuteIDEActionCommand',
        'GetIDESelectorsCommand'
      ]
    };
    
    return categoryCommands[category] || [];
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
    const instance = new CommandRegistry();
    
    // Use default category if not provided
    const finalCategory = category || getDefaultCategory('command');
    
    // Validate category
    if (!isValidCategory(finalCategory)) {
      throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
    }
    
    // Store command
    instance.commands.set(name, {
      name,
      config,
      category: finalCategory,
      executor,
      registeredAt: new Date(),
      status: 'active',
      metadata: {
        type: 'command',
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
    const command = CommandRegistry.buildFromCategory(context.category || 'management', name, context);
    
    if (!command) {
      throw new Error(`Command "${name}" not found`);
    }

    return await command.execute(context, options);
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
    const instance = new CommandRegistry();
    const command = instance.commands.get(name);
    if (!command) {
      throw new Error(`Command "${name}" not found`);
    }
    return command;
  }

  /**
   * Check if component exists (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    const instance = new CommandRegistry();
    return instance.commands.has(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new CommandRegistry();
    const command = instance.commands.get(name);
    
    if (!command) {
      return false;
    }
    
    // Remove from commands map
    instance.commands.delete(name);
    
    // Remove from category
    const category = command.category;
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
    const instance = new CommandRegistry();
    return {
      totalCommands: instance.commands.size,
      categories: instance.categories.size,
      activeCommands: Array.from(instance.commands.values()).filter(c => c.status === 'active').length,
      inactiveCommands: Array.from(instance.commands.values()).filter(c => c.status === 'inactive').length
    };
  }

  /**
   * Validate component configuration (IStandardRegistry interface)
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      return { isValid: false, errors: ['Command configuration must be an object'] };
    }

    if (!config.name) {
      return { isValid: false, errors: ['Command configuration must have a "name" property'] };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Get component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component metadata
   */
  static getMetadata(name) {
    const instance = new CommandRegistry();
    const command = instance.commands.get(name);
    return command?.metadata || {};
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new CommandRegistry();
    const command = instance.commands.get(name);
    
    if (!command) {
      return false;
    }
    
    command.metadata = { ...command.metadata, ...metadata };
    command.updatedAt = new Date();
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    // Command execution history would be implemented here
    return [];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new CommandRegistry();
    instance.commands.clear();
    instance.categories.clear();
    return true;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new CommandRegistry();
    return {
      commands: Array.from(instance.commands.entries()),
      categories: Array.from(instance.categories.entries())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new CommandRegistry();
    
    if (data.commands) {
      data.commands.forEach(([name, command]) => {
        instance.commands.set(name, command);
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

module.exports = CommandRegistry;
