/**
 * Git Get Branches Step
 * Gets all Git branches using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetBranchesStep');

// Step configuration
const config = {
  name: 'GIT_GET_BRANCHES',
  type: 'git',
  description: 'Gets all Git branches',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000,
    includeRemote: true,
    includeLocal: true
  },
  validation: {
    required: ['projectPath'],
    optional: ['includeRemote', 'includeLocal']
  }
};

class GitGetBranchesStep {
  constructor() {
    this.name = 'GIT_GET_BRANCHES';
    this.description = 'Gets all Git branches';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetBranchesStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, includeRemote = true, includeLocal = true } = context;
      
      logger.info('Executing GIT_GET_BRANCHES step', {
        projectPath,
        includeRemote,
        includeLocal
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      const branches = {
        local: [],
        remote: [],
        all: []
      };

      // Get local branches
      if (includeLocal) {
        const localResult = await terminalService.executeCommand('git branch', { cwd: projectPath });
        branches.local = localResult.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('*'))
          .map(line => line.replace(/^\*?\s*/, ''));
      }

      // Get remote branches
      if (includeRemote) {
        const remoteResult = await terminalService.executeCommand('git branch -r', { cwd: projectPath });
        branches.remote = remoteResult.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('origin/'))
          .filter(line => !line.includes('HEAD ->'))
          .map(line => line.replace(/^origin\//, ''));
      }

      // Combine all branches
      branches.all = [...new Set([...branches.local, ...branches.remote])];

      logger.info('GIT_GET_BRANCHES step completed successfully', {
        localCount: branches.local.length,
        remoteCount: branches.remote.length,
        totalCount: branches.all.length
      });

      return {
        success: true,
        branches,
        result: branches.all,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_BRANCHES step failed', {
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

module.exports = { config, execute: GitGetBranchesStep.prototype.execute.bind(new GitGetBranchesStep()) }; 