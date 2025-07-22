/**
 * Git Add Remote Step
 * Adds a Git remote using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitAddRemoteStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitAddRemoteStep',
  type: 'git',
  description: 'Adds a Git remote',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000
  },
  validation: {
    required: ['projectPath', 'name', 'url'],
    optional: []
  }
};

class GitAddRemoteStep {
  constructor() {
    this.name = 'GitAddRemoteStep';
    this.description = 'Adds a Git remote';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitAddRemoteStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, name, url } = context;
      
      logger.info('Executing GIT_ADD_REMOTE step', {
        projectPath,
        name,
        url
      });

      // Execute git remote add using execAsync (like legacy implementation)
      const result = await execAsync(`git remote add ${name} ${url}`, { cwd: projectPath });

      logger.info('GIT_ADD_REMOTE step completed successfully', {
        projectPath,
        name,
        url,
        result: result.stdout
      });

      return {
        success: true,
        projectPath,
        name,
        url,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_ADD_REMOTE step failed', {
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
    if (!context.name) {
      throw new Error('Remote name is required');
    }
    if (!context.url) {
      throw new Error('Remote URL is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitAddRemoteStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 