/**
 * Git Checkout Branch Step
 * Checks out a Git branch using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCheckoutBranchStep');

// Step configuration
const config = {
  name: 'GIT_CHECKOUT_BRANCH',
  type: 'git',
  description: 'Checks out a Git branch',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    createIfNotExists: false
  },
  validation: {
    required: ['projectPath', 'branchName'],
    optional: ['createIfNotExists']
  }
};

class GitCheckoutBranchStep {
  constructor() {
    this.name = 'GIT_CHECKOUT_BRANCH';
    this.description = 'Checks out a Git branch';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitCheckoutBranchStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, branchName, createIfNotExists = false } = context;
      
      logger.info('Executing GIT_CHECKOUT_BRANCH step', {
        projectPath,
        branchName,
        createIfNotExists
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Check if branch exists
      const branchExistsResult = await terminalService.executeCommand(`git branch --list ${branchName}`, { cwd: projectPath });
      const branchExists = branchExistsResult.stdout.trim().includes(branchName);

      if (!branchExists && !createIfNotExists) {
        throw new Error(`Branch ${branchName} does not exist and createIfNotExists is false`);
      }

      // Build checkout command
      let checkoutCommand = `git checkout ${branchName}`;
      if (!branchExists && createIfNotExists) {
        checkoutCommand = `git checkout -b ${branchName}`;
      }

      // Execute git checkout using real Git command
      const result = await terminalService.executeCommand(checkoutCommand, { cwd: projectPath });

      logger.info('GIT_CHECKOUT_BRANCH step completed successfully', {
        branchName,
        created: !branchExists && createIfNotExists,
        result: result.stdout
      });

      return {
        success: true,
        branchName,
        created: !branchExists && createIfNotExists,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_CHECKOUT_BRANCH step failed', {
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

module.exports = { config, execute: GitCheckoutBranchStep.prototype.execute.bind(new GitCheckoutBranchStep()) }; 