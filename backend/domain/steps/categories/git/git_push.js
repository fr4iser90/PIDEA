/**
 * Git Push Step
 * Pushes changes to remote repository using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitPushStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitPushStep',
  type: 'git',
  description: 'Pushes changes to remote Git repository',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    remote: 'origin',
    setUpstream: false
  },
  validation: {
    required: ['projectPath'],
    optional: ['branch', 'remote', 'setUpstream']
  }
};

class GitPushStep {
  constructor() {
    this.name = 'GitPushStep';
    this.description = 'Pushes changes to remote Git repository';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitPushStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, branch, remote = 'origin', setUpstream = false } = context;
      
      logger.info('Executing GIT_PUSH step', {
        projectPath,
        branch,
        remote,
        setUpstream
      });

      // Get current branch if not specified using execAsync
      let currentBranch = branch;
      if (!currentBranch) {
        const branchResult = await execAsync('git branch --show-current', { cwd: projectPath });
        currentBranch = branchResult.stdout.trim();
      }

      // Build git push command
      let pushCommand = `git push ${remote} ${currentBranch}`;
      if (setUpstream) {
        pushCommand = `git push -u ${remote} ${currentBranch}`;
      }

      // Execute git push using execAsync (like legacy implementation)
      const result = await execAsync(pushCommand, { cwd: projectPath });

      logger.info('GIT_PUSH step completed successfully', {
        branch: currentBranch,
        remote,
        setUpstream,
        result: result.stdout
      });

      return {
        success: true,
        branch: currentBranch,
        remote,
        setUpstream,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_PUSH step failed', {
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
const stepInstance = new GitPushStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 