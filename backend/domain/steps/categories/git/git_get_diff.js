/**
 * Git Get Diff Step
 * Gets Git diff using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetDiffStep');

// Step configuration
const config = {
  name: 'GIT_GET_DIFF',
  type: 'git',
  description: 'Gets Git diff',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    staged: false
  },
  validation: {
    required: ['projectPath'],
    optional: ['staged', 'file', 'commit1', 'commit2']
  }
};

class GitGetDiffStep {
  constructor() {
    this.name = 'GIT_GET_DIFF';
    this.description = 'Gets Git diff';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetDiffStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, staged = false, file, commit1, commit2 } = context;
      
      logger.info('Executing GIT_GET_DIFF step', {
        projectPath,
        staged,
        file,
        commit1,
        commit2
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build diff command
      let diffCommand = 'git diff';
      if (staged) {
        diffCommand += ' --staged';
      }
      if (commit1 && commit2) {
        diffCommand += ` ${commit1}..${commit2}`;
      } else if (commit1) {
        diffCommand += ` ${commit1}`;
      }
      if (file) {
        diffCommand += ` -- ${file}`;
      }

      // Execute git diff using real Git command
      const result = await terminalService.executeCommand(diffCommand, { cwd: projectPath });

      logger.info('GIT_GET_DIFF step completed successfully', {
        staged,
        file,
        commit1,
        commit2,
        diffLength: result.stdout.length
      });

      return {
        success: true,
        staged,
        file,
        commit1,
        commit2,
        diff: result.stdout,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_DIFF step failed', {
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

module.exports = { config, execute: GitGetDiffStep.prototype.execute.bind(new GitGetDiffStep()) }; 