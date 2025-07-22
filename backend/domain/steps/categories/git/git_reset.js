/**
 * Git Reset Step
 * Resets Git repository using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitResetStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitResetStep',
  type: 'git',
  description: 'Resets the current HEAD to the specified state',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000
  },
  validation: {
    required: ['projectPath'],
    optional: ['mode', 'commit']
  }
};

class GitResetStep {
  constructor() {
    this.name = 'GitResetStep';
    this.description = 'Resets the current HEAD to the specified state';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitResetStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, mode = 'mixed', commit = 'HEAD' } = context;
      
      logger.info('Executing GIT_RESET step', {
        projectPath,
        mode,
        commit
      });

      // Validate mode
      const validModes = ['soft', 'mixed', 'hard'];
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid reset mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
      }

      // Build reset command
      const resetCommand = `git reset --${mode} ${commit}`;

      // Execute git reset using execAsync (like legacy implementation)
      const result = await execAsync(resetCommand, { cwd: projectPath });

      logger.info('GIT_RESET step completed successfully', {
        mode,
        commit,
        result: result.stdout
      });

      return {
        success: true,
        mode,
        commit,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_RESET step failed', {
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
const stepInstance = new GitResetStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 