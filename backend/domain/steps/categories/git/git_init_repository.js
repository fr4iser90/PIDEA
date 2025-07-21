/**
 * Git Init Repository Step
 * Initializes a Git repository using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitInitRepositoryStep');

// Step configuration
const config = {
  name: 'GitInitRepositoryStep',
  type: 'git',
  description: 'Initializes a Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    bare: false,
    initialBranch: 'main'
  },
  validation: {
    required: ['projectPath'],
    optional: ['bare', 'initialBranch']
  }
};

class GitInitRepositoryStep {
  constructor() {
    this.name = 'GitInitRepositoryStep';
    this.description = 'Initializes a Git repository';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitInitRepositoryStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, bare = false, initialBranch = 'main' } = context;
      
      logger.info('Executing GIT_INIT_REPOSITORY step', {
        projectPath,
        bare,
        initialBranch
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build init command
      let initCommand = 'git init';
      if (bare) {
        initCommand += ' --bare';
      }
      if (initialBranch) {
        initCommand += ` -b ${initialBranch}`;
      }

      // Execute git init using real Git command
      const result = await terminalService.executeCommand(initCommand, { cwd: projectPath });

      logger.info('GIT_INIT_REPOSITORY step completed successfully', {
        projectPath,
        bare,
        initialBranch,
        result: result.stdout
      });

      return {
        success: true,
        projectPath,
        bare,
        initialBranch,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_INIT_REPOSITORY step failed', {
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
const stepInstance = new GitInitRepositoryStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 