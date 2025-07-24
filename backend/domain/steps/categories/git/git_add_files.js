/**
 * Git Add Files Step
 * Adds files to Git staging area using DDD pattern with Commands and Handlers
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitAddFilesStep');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

// Step configuration
const config = {
  name: 'GitAddFilesStep',
  type: 'git',
  description: 'Adds files to Git staging area',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    files: '.'
  },
  validation: {
    required: ['projectPath'],
    optional: ['files']
  }
};

class GitAddFilesStep {
  constructor() {
    this.name = 'GitAddFilesStep';
    this.description = 'Adds files to Git staging area';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitAddFilesStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, files = '.' } = context;
      
      logger.info('Executing GIT_ADD_FILES step using DDD pattern', {
        projectPath,
        files
      });

      // ✅ DDD PATTERN: Create Command and Handler
      const command = CommandRegistry.buildFromCategory('git', 'GitAddFilesCommand', {
        projectPath,
        files
      });

      const handler = HandlerRegistry.buildFromCategory('git', 'GitAddFilesHandler', {
        terminalService: context.terminalService,
        logger: logger
      });

      if (!command || !handler) {
        throw new Error('Failed to create Git command or handler');
      }

      // Execute command through handler
      const result = await handler.handle(command);

      logger.info('GIT_ADD_FILES step completed successfully using DDD pattern', {
        files,
        result: result.result
      });

      return {
        success: result.success,
        files,
        result: result.result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_ADD_FILES step failed', {
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
const stepInstance = new GitAddFilesStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 