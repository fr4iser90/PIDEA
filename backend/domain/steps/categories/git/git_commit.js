/**
 * Git Commit Step
 * Commits changes using DDD pattern with Commands and Handlers
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCommitStep');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

// Step configuration
const config = {
  name: 'GitCommitStep',
  type: 'git',
  description: 'Commits changes to Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    files: '.',
    author: null,
    email: null
  },
  validation: {
    required: ['projectPath', 'message'],
    optional: ['files', 'author', 'email']
  }
};

class GitCommitStep {
  constructor() {
    this.name = 'GitCommitStep';
    this.description = 'Commits changes to Git repository';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitCommitStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, message, files = '.', author, email } = context;
      
      logger.info('Executing GIT_COMMIT step using DDD pattern', {
        projectPath,
        message,
        files
      });

      // ✅ DDD PATTERN: Create Command and Handler
      const command = CommandRegistry.buildFromCategory('git', 'GitCommitCommand', {
        projectPath,
        message,
        files,
        author,
        email
      });

      const handler = HandlerRegistry.buildFromCategory('git', 'GitCommitHandler', {
        terminalService: context.terminalService,
        logger: logger
      });

      if (!command || !handler) {
        throw new Error('Failed to create Git command or handler');
      }

      // Execute command through handler
      const result = await handler.handle(command);

      logger.info('GIT_COMMIT step completed successfully using DDD pattern', {
        message,
        files,
        result: result.result
      });

      return {
        success: result.success,
        message,
        files,
        result: result.result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_COMMIT step failed', {
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
    if (!context.message) {
      throw new Error('Commit message is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitCommitStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 