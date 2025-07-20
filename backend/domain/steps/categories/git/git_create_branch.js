/**
 * Git Create Branch Step
 * Creates a new Git branch using the existing GitService
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
  dependencies: ['gitService'],
  settings: {
    timeout: 30000,
    checkout: true,
    startPoint: 'main'
  },
  validation: {
    required: ['projectPath', 'branchName'],
    optional: ['startPoint', 'checkout']
  }
};

class GitCreateBranchStep {
  constructor() {
    this.name = 'GIT_CREATE_BRANCH';
    this.description = 'Creates a new Git branch';
    this.category = 'git';
    this.dependencies = ['gitService'];
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
      
      const { projectPath, branchName, startPoint = 'main', checkout = true } = context;
      
      logger.info('Executing GIT_CREATE_BRANCH step', {
        projectPath,
        branchName,
        startPoint,
        checkout
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

      // Create branch using existing GitService
      const result = await gitService.createBranch(projectPath, branchName, {
        startPoint,
        checkout
      });

      logger.info('GIT_CREATE_BRANCH step completed successfully', {
        branchName,
        result
      });

      return {
        success: true,
        branchName,
        startPoint,
        checkout,
        result,
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