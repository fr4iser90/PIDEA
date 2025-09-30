/**
 * Git Version Bump Step
 * Automatically bumps version based on task completion and changes
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');
const VersionManagementService = require('@domain/services/version/VersionManagementService');
const logger = new Logger('GitVersionBumpStep');

// Step configuration
const config = {
  name: 'GitVersionBumpStep',
  type: 'git',
  description: 'Automatically bumps version based on task completion and changes',
  category: 'git',
  version: '1.0.0',
  dependencies: ['versionManagementService', 'gitService', 'fileSystemService'],
  settings: {
    timeout: 60000,
    autoCommit: true,
    createGitTags: true,
    analyzeGitChanges: true
  },
  validation: {
    required: ['projectPath', 'task'],
    optional: ['bumpType', 'context']
  }
};

class GitVersionBumpStep {
  constructor() {
    this.name = 'GitVersionBumpStep';
    this.description = 'Automatically bumps version based on task completion and changes';
    this.category = 'git';
    this.dependencies = ['versionManagementService', 'gitService', 'fileSystemService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitVersionBumpStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, task, bumpType, ...otherParams } = context;
      
      logger.info('Executing Git Version Bump step', {
        projectPath,
        taskId: task?.id,
        bumpType,
        ...otherParams
      });

      // Initialize version management service
      const versionManagementService = new VersionManagementService({
        gitService: context.gitService,
        fileSystemService: context.fileSystemService,
        versionRepository: context.versionRepository,
        logger: logger,
        config: {
          autoCommit: context.autoCommit !== false,
          createGitTags: context.createGitTags !== false,
          analyzeGitChanges: context.analyzeGitChanges !== false
        }
      });

      // Execute version bump
      const result = await versionManagementService.bumpVersion(
        task,
        projectPath,
        bumpType,
        {
          ...otherParams,
          userId: context.userId || 'system',
          analyzeGitChanges: context.analyzeGitChanges !== false
        }
      );

      if (result.success) {
        logger.info('Git Version Bump step completed successfully', {
          taskId: task.id,
          currentVersion: result.currentVersion,
          newVersion: result.newVersion,
          bumpType: result.bumpType,
          updatedFiles: result.updatedFiles?.length || 0
        });

        return {
          success: true,
          result: {
            currentVersion: result.currentVersion,
            newVersion: result.newVersion,
            bumpType: result.bumpType,
            updatedFiles: result.updatedFiles,
            versionRecord: result.versionRecord,
            commitResult: result.commitResult,
            tagResult: result.tagResult
          },
          timestamp: new Date()
        };
      } else {
        logger.error('Git Version Bump step failed', {
          taskId: task.id,
          error: result.error
        });

        return {
          success: false,
          error: result.error,
          timestamp: new Date()
        };
      }

    } catch (error) {
      logger.error(`${this.name} failed`, {
        error: error.message,
        context: {
          projectPath: context.projectPath,
          taskId: context.task?.id
        }
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
    if (!context.task) {
      throw new Error('Task object is required');
    }
    if (!context.task.id) {
      throw new Error('Task ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitVersionBumpStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
