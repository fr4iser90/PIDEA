/**
 * Git Get Commit History Step
 * Gets Git commit history using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetCommitHistoryStep');

// Step configuration
const config = {
  name: 'GitGetCommitHistoryStep',
  type: 'git',
  description: 'Gets Git commit history',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    limit: 10,
    since: null,
    until: null,
    author: null,
    format: 'pretty=format:"%H|%an|%ae|%ad|%s"'
  },
  validation: {
    required: ['projectPath'],
    optional: ['limit', 'since', 'until', 'author', 'format']
  }
};

class GitGetCommitHistoryStep {
  constructor() {
    this.name = 'GitGetCommitHistoryStep';
    this.description = 'Gets Git commit history';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetCommitHistoryStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { 
        projectPath, 
        limit = 10, 
        since = null, 
        until = null, 
        author = null,
        format = 'pretty=format:"%H|%an|%ae|%ad|%s"'
      } = context;
      
      logger.info('Executing GIT_GET_COMMIT_HISTORY step', {
        projectPath,
        limit,
        since,
        until,
        author
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build log command
      let logCommand = `git log --${format}`;
      if (limit) {
        logCommand += ` -${limit}`;
      }
      if (since) {
        logCommand += ` --since="${since}"`;
      }
      if (until) {
        logCommand += ` --until="${until}"`;
      }
      if (author) {
        logCommand += ` --author="${author}"`;
      }

      // Execute git log using real Git command
      const result = await terminalService.executeCommand(logCommand, { cwd: projectPath });

      // Parse commit history
      const commits = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, author, email, date, message] = line.split('|');
          return { hash, author, email, date, message };
        });

      logger.info('GIT_GET_COMMIT_HISTORY step completed successfully', {
        projectPath,
        commitCount: commits.length
      });

      return {
        success: true,
        projectPath,
        commits,
        commitCount: commits.length,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_COMMIT_HISTORY step failed', {
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
const stepInstance = new GitGetCommitHistoryStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 