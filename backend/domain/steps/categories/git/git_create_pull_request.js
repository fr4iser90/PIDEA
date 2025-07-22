/**
 * Git Create Pull Request Step
 * Creates a pull request using GitHub CLI or Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitCreatePullRequestStep');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Step configuration
const config = {
  name: 'GitCreatePullRequestStep',
  type: 'git',
  description: 'Creates a pull request',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
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
    this.name = 'GitCreatePullRequestStep';
    this.description = 'Creates a pull request';
    this.category = 'git';
    this.dependencies = ['terminalService'];
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



      // Generate PR data
      const prTitle = title || `Merge ${sourceBranch} into ${targetBranch}`;
      const prDescription = description || `Automated pull request from ${sourceBranch}`;

      // Try GitHub CLI first, fallback to manual process
      try {
        // Check if GitHub CLI is available
        const ghCheck = await execAsync('gh --version', { cwd: projectPath });
        
        if (ghCheck.exitCode === 0) {
          // Use GitHub CLI to create PR
          let ghCommand = `gh pr create --base ${targetBranch} --head ${sourceBranch} --title "${prTitle}" --body "${prDescription}"`;
          
          if (labels.length > 0) {
            ghCommand += ` --label "${labels.join(',')}"`;
          }
          
          if (reviewers.length > 0) {
            ghCommand += ` --reviewer "${reviewers.join(',')}"`;
          }

          const result = await execAsync(ghCommand, { cwd: projectPath });
          
          // Extract PR URL from output
          const prUrlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
          const prUrl = prUrlMatch ? prUrlMatch[0] : result.stdout;

          logger.info('GIT_CREATE_PULL_REQUEST step completed successfully with GitHub CLI', {
            sourceBranch,
            targetBranch,
            prUrl
          });

          return {
            success: true,
            pullRequestUrl: prUrl,
            title: prTitle,
            sourceBranch,
            targetBranch,
            labels,
            reviewers,
            method: 'github-cli',
            result: result.stdout,
            timestamp: new Date()
          };
        }
      } catch (ghError) {
        logger.warn('GitHub CLI not available, using manual process');
      }

      // Fallback: Manual process (push and create PR via web)
      await execAsync(`git push origin ${sourceBranch}`, { cwd: projectPath });
      
      // Get remote URL to construct PR URL
      const remoteResult = await execAsync('git remote get-url origin', { cwd: projectPath });
      const remoteUrl = remoteResult.stdout.trim();
      
      // Convert SSH to HTTPS if needed
      let repoUrl = remoteUrl;
      if (remoteUrl.startsWith('git@github.com:')) {
        repoUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
      }

      const prUrl = `${repoUrl}/compare/${targetBranch}...${sourceBranch}`;

      logger.info('GIT_CREATE_PULL_REQUEST step completed successfully with manual process', {
        sourceBranch,
        targetBranch,
        prUrl
      });

      return {
        success: true,
        pullRequestUrl: prUrl,
        title: prTitle,
        sourceBranch,
        targetBranch,
        labels,
        reviewers,
        method: 'manual',
        result: 'Push completed, create PR manually',
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

// Create instance for execution
const stepInstance = new GitCreatePullRequestStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 