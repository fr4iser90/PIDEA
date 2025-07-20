/**
 * Git Push Step
 * Pushes changes to remote repository using the existing GitService
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitPushStep');

// Step configuration
const config = {
  name: 'GIT_PUSH',
  type: 'git',
  description: 'Pushes changes to remote Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['gitService'],
  settings: {
    timeout: 30000,
    remote: 'origin',
    setUpstream: false
  },
  validation: {
    required: ['projectPath'],
    optional: ['branch', 'remote', 'setUpstream']
  }
};

class GitPushStep {
  constructor() {
    this.name = 'GIT_PUSH';
    this.description = 'Pushes changes to remote Git repository';
    this.category = 'git';
    this.dependencies = ['gitService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitPushStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, branch, remote = 'origin', setUpstream = false } = context;
      
      logger.info('Executing GIT_PUSH step', {
        projectPath,
        branch,
        remote,
        setUpstream
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

      // Push changes using existing GitService
      const result = await gitService.pushChanges(projectPath, {
        branch,
        remote,
        setUpstream
      });

      logger.info('GIT_PUSH step completed successfully', {
        branch,
        remote,
        result
      });

      return {
        success: true,
        branch,
        remote,
        setUpstream,
        result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_PUSH step failed', {
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

module.exports = { config, execute: GitPushStep.prototype.execute.bind(new GitPushStep()) }; 