/**
 * Git Get Status Step
 * Gets Git repository status using DDD pattern with Commands and Handlers
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetStatusStep');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

// Step configuration
const config = {
  name: 'GitGetStatusStep',
  type: 'git',
  description: 'Gets Git repository status',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000,
    porcelain: true
  },
  validation: {
    required: ['projectPath'],
    optional: ['porcelain']
  }
};

class GitGetStatusStep {
  constructor() {
    this.name = 'GitGetStatusStep';
    this.description = 'Gets Git repository status';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, porcelain = true } = context;
      
      logger.info('Executing GIT_GET_STATUS step using DDD pattern', {
        projectPath,
        porcelain
      });

      // ✅ DDD PATTERN: Create Command and Handler
      const command = CommandRegistry.buildFromCategory('git', 'GitStatusCommand', {
        projectPath,
        porcelain
      });

      const handler = HandlerRegistry.buildFromCategory('git', 'GitStatusHandler', {
        terminalService: context.terminalService,
        logger: logger
      });

      if (!command || !handler) {
        throw new Error('Failed to create Git command or handler');
      }

      // Execute command through handler
      const result = await handler.handle(command);

      logger.info('GIT_GET_STATUS step completed successfully using DDD pattern', {
        modifiedCount: result.status?.modified?.length || 0,
        addedCount: result.status?.added?.length || 0,
        deletedCount: result.status?.deleted?.length || 0,
        untrackedCount: result.status?.untracked?.length || 0
      });

      return {
        success: result.success,
        status: result.status,
        result: result.result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_STATUS step failed', {
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
const stepInstance = new GitGetStatusStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 