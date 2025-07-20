/**
 * Git Add Files Step
 * Adds files to Git staging area using real Git commands
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitAddFilesStep');

// Step configuration
const config = {
  name: 'GIT_ADD_FILES',
  type: 'git',
  description: 'Adds files to Git staging area',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    files: '.'
  },
  validation: {
    required: ['projectPath'],
    optional: ['files']
  }
};

class GitAddFilesStep {
  constructor() {
    this.name = 'GIT_ADD_FILES';
    this.description = 'Adds files to Git staging area';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitAddFilesStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, files = '.' } = context;
      
      logger.info('Executing GIT_ADD_FILES step', {
        projectPath,
        files
      });

      // Get terminal service via dependency injection
      const terminalService = context.getService('terminalService');
      
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      // Build add command
      const addCommand = `git add ${files}`;

      // Execute git add using real Git command
      const result = await terminalService.executeCommand(addCommand, { cwd: projectPath });

      logger.info('GIT_ADD_FILES step completed successfully', {
        files,
        result: result.stdout
      });

      return {
        success: true,
        files,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('GIT_ADD_FILES step failed', {
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

module.exports = { config, execute: GitAddFilesStep.prototype.execute.bind(new GitAddFilesStep()) }; 