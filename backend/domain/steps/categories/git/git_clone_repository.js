/**
 * Git Clone Repository Step
 * Clones a Git repository using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCloneRepositoryStep');

// Step configuration
const config = {
  name: 'GitCloneRepositoryStep',
  type: 'git',
  description: 'Clones a Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 60000,
    branch: null,
    depth: null,
    singleBranch: false,
    recursive: false
  },
  validation: {
    required: ['url', 'targetPath'],
    optional: ['branch', 'depth', 'singleBranch', 'recursive']
  }
};

class GitCloneRepositoryStep {
  constructor() {
    this.name = 'GitCloneRepositoryStep';
    this.description = 'Clones a Git repository';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitCloneRepositoryStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { url, targetPath, branch = null, depth = null, singleBranch = false, recursive = false } = context;
      
      logger.info('Executing GIT_CLONE_REPOSITORY step', {
        url,
        targetPath,
        branch,
        depth,
        singleBranch,
        recursive
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build clone command
      let cloneCommand = `git clone ${url} ${targetPath}`;
      if (branch) {
        cloneCommand += ` -b ${branch}`;
      }
      if (depth) {
        cloneCommand += ` --depth ${depth}`;
      }
      if (singleBranch) {
        cloneCommand += ' --single-branch';
      }
      if (recursive) {
        cloneCommand += ' --recursive';
      }

      // Execute git clone using real Git command
      const result = await terminalService.executeCommand(cloneCommand);

      logger.info('GIT_CLONE_REPOSITORY step completed successfully', {
        url,
        targetPath,
        result: result.stdout
      });

      return {
        success: true,
        url,
        targetPath,
        branch,
        depth,
        singleBranch,
        recursive,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_CLONE_REPOSITORY step failed', {
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
    if (!context.url) {
      throw new Error('Repository URL is required');
    }
    if (!context.targetPath) {
      throw new Error('Target path is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitCloneRepositoryStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 