/**
 * Git Create Pull Request Step
 * Creates a pull request using the existing PullRequestManager
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCreatePullRequestStep');

// Step configuration
const config = {
  name: 'GIT_CREATE_PULL_REQUEST',
  type: 'git',
  description: 'Creates a pull request',
  category: 'git',
  version: '1.0.0',
  dependencies: ['pullRequestManager'],
  settings: {
    timeout: 60000,
    targetBranch: 'main',
    labels: [],
    reviewers: []
  },
  validation: {
    required: ['projectPath', 'sourceBranch', 'targetBranch'],
    optional: ['title', 'description', 'labels', 'reviewers']
  }
};

class GitCreatePullRequestStep {
  constructor() {
    this.name = 'GIT_CREATE_PULL_REQUEST';
    this.description = 'Creates a pull request';
    this.category = 'git';
    this.dependencies = ['pullRequestManager'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitCreatePullRequestStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { 
        projectPath, 
        sourceBranch, 
        targetBranch = 'main',
        title,
        description,
        labels = [],
        reviewers = []
      } = context;
      
      logger.info('Executing GIT_CREATE_PULL_REQUEST step', {
        projectPath,
        sourceBranch,
        targetBranch,
        title
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

      // Generate PR data
      const prData = {
        title: title || `Merge ${sourceBranch} into ${targetBranch}`,
        description: description || `Automated pull request from ${sourceBranch}`,
        sourceBranch,
        targetBranch,
        labels,
        reviewers
      };

      // Create pull request using existing PullRequestManager
      const result = await gitService.createPullRequest(projectPath, prData);

      logger.info('GIT_CREATE_PULL_REQUEST step completed successfully', {
        sourceBranch,
        targetBranch,
        prId: result.id,
        prUrl: result.url
      });

      return {
        success: true,
        pullRequestId: result.id,
        pullRequestUrl: result.url,
        title: prData.title,
        sourceBranch,
        targetBranch,
        labels,
        reviewers,
        result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_CREATE_PULL_REQUEST step failed', {
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
    if (!context.sourceBranch) {
      throw new Error('Source branch is required');
    }
    if (!context.targetBranch) {
      throw new Error('Target branch is required');
    }
  }
}

module.exports = { config, execute: GitCreatePullRequestStep.prototype.execute.bind(new GitCreatePullRequestStep()) }; 