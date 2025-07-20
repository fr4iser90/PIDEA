/**
 * Git Create Branch Step
 * Creates a new Git branch using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCreateBranchStep');

// Step configuration
const config = {
  name: 'GIT_CREATE_BRANCH',
  type: 'git',
  description: 'Creates a new Git branch',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    checkout: true,
    fromBranch: null
  },
  validation: {
    required: ['projectPath', 'branchName'],
    optional: ['checkout', 'fromBranch']
  }
};

class GitCreateBranchStep {
  constructor() {
    this.name = 'GIT_CREATE_BRANCH';
    this.description = 'Creates a new Git branch';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitCreateBranchStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, branchName, checkout = true, fromBranch } = context;
      
      logger.info('Executing GIT_CREATE_BRANCH step', {
        projectPath,
        branchName,
        checkout,
        fromBranch
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Check if branch already exists
      const branchExistsResult = await terminalService.executeCommand(`git branch --list ${branchName}`, { cwd: projectPath });
      if (branchExistsResult.stdout.trim()) {
        logger.warn(`Branch ${branchName} already exists`);
        if (checkout) {
          await terminalService.executeCommand(`git checkout ${branchName}`, { cwd: projectPath });
        }
        return {
          success: true,
          branchName,
          checkout,
          result: 'Branch already exists',
          timestamp: new Date()
        };
      }

      // Switch to base branch if specified
      if (fromBranch) {
        await terminalService.executeCommand(`git checkout ${fromBranch}`, { cwd: projectPath });
      }

      // Create new branch using real Git command
      let createCommand = `git branch ${branchName}`;
      if (checkout) {
        createCommand = `git checkout -b ${branchName}`;
      }

      const result = await terminalService.executeCommand(createCommand, { cwd: projectPath });

      logger.info('GIT_CREATE_BRANCH step completed successfully', {
        branchName,
        checkout,
        result: result.stdout
      });

      return {
        success: true,
        branchName,
        checkout,
        fromBranch,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_CREATE_BRANCH step failed', {
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

module.exports = { config, execute: GitCreateBranchStep.prototype.execute.bind(new GitCreateBranchStep()) }; 