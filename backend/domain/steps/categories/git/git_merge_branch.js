/**
 * Git Merge Branch Step
 * Merges a Git branch using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitMergeBranchStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitMergeBranchStep',
  type: 'git',
  description: 'Merges a Git branch',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    strategy: 'recursive',
    noFF: false
  },
  validation: {
    required: ['projectPath', 'branchName'],
    optional: ['strategy', 'noFF']
  }
};

class GitMergeBranchStep {
  constructor() {
    this.name = 'GitMergeBranchStep';
    this.description = 'Merges a Git branch';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitMergeBranchStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, branchName, strategy = 'recursive', noFF = false } = context;
      
      logger.info('Executing GIT_MERGE_BRANCH step', {
        projectPath,
        branchName,
        strategy,
        noFF
      });

      // Build merge command
      let mergeCommand = 'git merge';
      if (noFF) {
        mergeCommand += ' --no-ff';
      }
      mergeCommand += ` ${branchName}`;

      // Execute git merge using execAsync (like legacy implementation)
      const result = await execAsync(mergeCommand, { cwd: projectPath });

      logger.info('GIT_MERGE_BRANCH step completed successfully', {
        branchName,
        strategy,
        noFF,
        result: result.stdout
      });

      return {
        success: true,
        branchName,
        strategy,
        noFF,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_MERGE_BRANCH step failed', {
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
    if (!context.branchName) {
      throw new Error('Branch name is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitMergeBranchStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 