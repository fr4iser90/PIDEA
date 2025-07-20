/**
 * Git Get Current Branch Step
 * Gets the current Git branch using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetCurrentBranchStep');

// Step configuration
const config = {
  name: 'GIT_GET_CURRENT_BRANCH',
  type: 'git',
  description: 'Gets the current Git branch',
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

class GitGetCurrentBranchStep {
  constructor() {
    this.name = 'GIT_GET_CURRENT_BRANCH';
    this.description = 'Gets the current Git branch';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetCurrentBranchStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath } = context;
      
      logger.info('Executing GIT_GET_CURRENT_BRANCH step', {
        projectPath
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Execute git branch --show-current using real Git command
      const result = await terminalService.executeCommand('git branch --show-current', { cwd: projectPath });
      const currentBranch = result.stdout.trim();

      logger.info('GIT_GET_CURRENT_BRANCH step completed successfully', {
        currentBranch,
        result: result.stdout
      });

      return {
        success: true,
        currentBranch,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_CURRENT_BRANCH step failed', {
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

module.exports = { config, execute: GitGetCurrentBranchStep.prototype.execute.bind(new GitGetCurrentBranchStep()) }; 