/**
 * Git Commit Step
 * Commits changes using the existing GitService
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCommitStep');

// Step configuration
const config = {
  name: 'GIT_COMMIT',
  type: 'git',
  description: 'Commits changes to Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['gitService'],
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
    this.name = 'GIT_COMMIT';
    this.description = 'Commits changes to Git repository';
    this.category = 'git';
    this.dependencies = ['gitService'];
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

      // Get services via dependency injection
      const gitService = context.getService('GitService');
      const terminalService = context.getService('TerminalService');
      
      if (!gitService) {
        throw new Error('GitService not available in context');
      }
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Add files to staging
      await gitService.addFiles(projectPath, files);

      // Commit changes using existing GitService
      const result = await gitService.commitChanges(projectPath, {
        message,
        author,
        email
      });

      logger.info('GIT_COMMIT step completed successfully', {
        message,
        result
      });

      return {
        success: true,
        message,
        files,
        result,
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

module.exports = { config, execute: GitCommitStep.prototype.execute.bind(new GitCommitStep()) }; 