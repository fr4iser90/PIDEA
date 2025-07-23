/**
 * GitMergeBranch
 * Merges a Git branch using DDD pattern with Commands and Handlers
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitMergeBranchStep');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

// Step configuration
const config = {
  name: 'GitMergeBranchStep',
  type: 'git',
  description: 'Merges a Git branch using DDD pattern with Commands and Handlers',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000
  },
  validation: {
    required: ['projectPath'],
    optional: []
  }
};

class GitMergeBranchStepStep {
  constructor() {
    this.name = 'GitMergeBranchStep';
    this.description = 'Merges a Git branch using DDD pattern with Commands and Handlers';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitMergeBranchStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, ...otherParams } = context;
      
      logger.info(`Executing ${this.name} using DDD pattern`, {
        projectPath,
        ...otherParams
      });

      // ✅ DDD PATTERN: Create Command and Handler
      const command = CommandRegistry.buildFromCategory('git', 'GitMergeCommand', {
        projectPath,
        ...otherParams
      });

      const handler = HandlerRegistry.buildFromCategory('git', 'GitMergeHandler', {
        terminalService: context.terminalService,
        logger: logger
      });

      if (!command || !handler) {
        throw new Error('Failed to create Git command or handler');
      }

      // Execute command through handler
      const result = await handler.handle(command);

      logger.info(`${this.name} completed successfully using DDD pattern`, {
        result: result.result
      });

      return {
        success: result.success,
        result: result.result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`${this.name} failed`, {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitMergeBranchStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
