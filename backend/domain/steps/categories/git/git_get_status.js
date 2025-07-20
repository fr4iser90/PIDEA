/**
 * Git Get Status Step
 * Gets Git repository status using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitGetStatusStep');

// Step configuration
const config = {
  name: 'GIT_GET_STATUS',
  type: 'git',
  description: 'Gets Git repository status',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 10000,
    porcelain: true
  },
  validation: {
    required: ['projectPath'],
    optional: ['porcelain']
  }
};

class GitGetStatusStep {
  constructor() {
    this.name = 'GIT_GET_STATUS';
    this.description = 'Gets Git repository status';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitGetStatusStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, porcelain = true } = context;
      
      logger.info('Executing GIT_GET_STATUS step', {
        projectPath,
        porcelain
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build status command
      const statusCommand = porcelain ? 'git status --porcelain' : 'git status';
      
      // Execute git status using real Git command
      const result = await terminalService.executeCommand(statusCommand, { cwd: projectPath });

      // Parse status if porcelain format
      let status = { raw: result.stdout };
      
      if (porcelain) {
        status = this.parsePorcelainStatus(result.stdout);
      }

      logger.info('GIT_GET_STATUS step completed successfully', {
        modifiedCount: status.modified?.length || 0,
        addedCount: status.added?.length || 0,
        deletedCount: status.deleted?.length || 0,
        untrackedCount: status.untracked?.length || 0
      });

      return {
        success: true,
        status,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_GET_STATUS step failed', {
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

  parsePorcelainStatus(stdout) {
    const lines = stdout.split('\n').filter(line => line.trim());
    const status = {
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      staged: [],
      unstaged: [],
      renamed: [],
      copied: []
    };

    for (const line of lines) {
      const code = line.substring(0, 2);
      const file = line.substring(3);

      if (code === 'M ') status.modified.push(file);
      else if (code === 'A ') status.added.push(file);
      else if (code === 'D ') status.deleted.push(file);
      else if (code === '??') status.untracked.push(file);
      else if (code === 'M ') status.staged.push(file);
      else if (code === ' M') status.unstaged.push(file);
      else if (code === 'R ') status.renamed.push(file);
      else if (code === 'C ') status.copied.push(file);
    }

    return status;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

module.exports = { config, execute: GitGetStatusStep.prototype.execute.bind(new GitGetStatusStep()) }; 