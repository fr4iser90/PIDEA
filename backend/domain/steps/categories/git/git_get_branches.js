/**
 * Git Get Branches Step
 * Gets all Git branches using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetBranchesStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitGetBranchesStep',
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
    this.name = 'GitGetBranchesStep';
    this.description = 'Gets all Git branches';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
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

      const branches = {
        local: [],
        remote: [],
        all: []
      };

      // Get local branches using execAsync
      if (includeLocal) {
        const localResult = await execAsync('git branch', { cwd: projectPath });
        branches.local = localResult.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('*'))
          .map(line => line.replace(/^\*?\s*/, ''));
      }

      // Get remote branches using execAsync
      if (includeRemote) {
        const remoteResult = await execAsync('git branch -r', { cwd: projectPath });
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

// Create instance for execution
const stepInstance = new GitGetBranchesStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 