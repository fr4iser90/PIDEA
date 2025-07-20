/**
 * Git Get Last Commit Step
 * Gets the last Git commit using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetLastCommitStep');

// Step configuration
const config = {
  name: 'GIT_GET_LAST_COMMIT',
  type: 'git',
  description: 'Gets the last Git commit',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000
  },
  validation: {
    required: ['projectPath'],
    optional: []
  }
};

class GitGetLastCommitStep {
  constructor() {
    this.name = 'GIT_GET_LAST_COMMIT';
    this.description = 'Gets the last Git commit';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetLastCommitStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath } = context;
      
      logger.info('Executing GIT_GET_LAST_COMMIT step', {
        projectPath
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Get commit hash
      const hashResult = await terminalService.executeCommand('git rev-parse HEAD', { cwd: projectPath });
      const hash = hashResult.stdout.trim();
      
      // Get commit message
      const messageResult = await terminalService.executeCommand('git log -1 --pretty=format:%s', { cwd: projectPath });
      const message = messageResult.stdout.trim();
      
      // Get commit author
      const authorResult = await terminalService.executeCommand('git log -1 --pretty=format:%an', { cwd: projectPath });
      const author = authorResult.stdout.trim();
      
      // Get commit date
      const dateResult = await terminalService.executeCommand('git log -1 --pretty=format:%cd', { cwd: projectPath });
      const date = dateResult.stdout.trim();

      const lastCommit = { hash, message, author, date };

      logger.info('GIT_GET_LAST_COMMIT step completed successfully', {
        projectPath,
        hash,
        author,
        message
      });

      return {
        success: true,
        projectPath,
        lastCommit,
        result: lastCommit,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_LAST_COMMIT step failed', {
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

module.exports = { config, execute: GitGetLastCommitStep.prototype.execute.bind(new GitGetLastCommitStep()) }; 