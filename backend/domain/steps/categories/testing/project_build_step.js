/**
 * Project Build Step
 * Builds the project using configured build command
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ProjectBuildStep');

// Step configuration
const config = {
  name: 'ProjectBuildStep',
  type: 'testing',
  category: 'testing',
  description: 'Build project using configured build command',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
  settings: {
    includeErrorHandling: true,
    timeout: 120000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class ProjectBuildStep {
  constructor() {
    this.name = 'ProjectBuildStep';
    this.description = 'Build project using configured build command';
    this.category = 'testing';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ProjectBuildStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🔨 Building project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = context.projectRepository || context.getService?.('projectRepository') || global.application?.projectRepository;
      if (!projectRepo) {
        logger.warn('ProjectRepository not available in context, using basic build');
        // Continue without project repository for basic build
      }
      
      let project = null;
      if (projectRepo) {
        project = await projectRepo.findById(projectId);
      }
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Get build command from project config
      const buildCommand = project.build_command || 'npm run build';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🔨 Build command: ${buildCommand}`);
      
      // Execute build command
      const terminalService = new (require('@domain/services/terminal/TerminalService'))();
      const result = await terminalService.executeCommand(buildCommand, {
        cwd: workspacePath,
        timeout: config.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      if (result.success) {
        logger.info('✅ Project built successfully');
        return {
          success: true,
          message: 'Project built successfully',
          data: {
            status: 'built',
            command: buildCommand,
            output: result.output
          }
        };
      } else {
        throw new Error(`Build failed: ${result.error}`);
      }
      
    } catch (error) {
      logger.error('❌ Build failed:', error);
        
      if (config.settings.includeErrorHandling) {
        return {
          success: false,
          message: 'Build failed',
          error: error.message,
          data: {
            status: 'error',
            command: context.buildCommand || 'npm run build'
          }
        };
      }
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
      }
    }
}

// Create instance for execution
const stepInstance = new ProjectBuildStep();
      
// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 