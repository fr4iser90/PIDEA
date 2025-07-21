/**
 * Git Commit Step
 * Commits changes using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCommitStep');

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
      
      logger.info('Executing GIT_COMMIT step', {
        projectPath,
        message,
        files
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Add files to staging using real Git command
      const addResult = await terminalService.executeCommand(`git add ${files}`, { cwd: projectPath });

      // Build commit command
      let commitCommand = `git commit -m "${message}"`;
      if (author && email) {
        commitCommand = `git commit -m "${message}" --author="${author} <${email}>"`;
      }

      // Commit changes using real Git command
      const result = await terminalService.executeCommand(commitCommand, { cwd: projectPath });

      logger.info('GIT_COMMIT step completed successfully', {
        message,
        files,
        result: result.stdout
      });

      return {
        success: true,
        message,
        files,
        result: result.stdout,
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