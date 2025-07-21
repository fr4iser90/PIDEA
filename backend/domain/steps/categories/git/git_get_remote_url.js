/**
 * Git Get Remote URL Step
 * Gets Git remote URL using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetRemoteUrlStep');

// Step configuration
const config = {
  name: 'GitGetRemoteUrlStep',
  type: 'git',
  description: 'Gets Git remote URL',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000,
    remote: 'origin'
  },
  validation: {
    required: ['projectPath'],
    optional: ['remote']
  }
};

class GitGetRemoteUrlStep {
  constructor() {
    this.name = 'GitGetRemoteUrlStep';
    this.description = 'Gets Git remote URL';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetRemoteUrlStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, remote = 'origin' } = context;
      
      logger.info('Executing GIT_GET_REMOTE_URL step', {
        projectPath,
        remote
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Execute git remote get-url using real Git command
      const result = await terminalService.executeCommand(`git remote get-url ${remote}`, { cwd: projectPath });
      const remoteUrl = result.stdout.trim();

      logger.info('GIT_GET_REMOTE_URL step completed successfully', {
        projectPath,
        remote,
        remoteUrl
      });

      return {
        success: true,
        projectPath,
        remote,
        remoteUrl,
        result: remoteUrl,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_REMOTE_URL step failed', {
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
const stepInstance = new GitGetRemoteUrlStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 