/**
 * Project Health Check Step
 * Performs health checks on the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ProjectHealthCheckStep');

// Step configuration
const config = {
  name: 'ProjectHealthCheckStep',
  type: 'testing',
  category: 'testing',
  description: 'Perform health checks on the project',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
  settings: {
    includeBuildCheck: true,
    includeTestCheck: true,
    includeLintCheck: true,
    timeout: 60000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class ProjectHealthCheckStep {
  constructor() {
    this.name = 'ProjectHealthCheckStep';
    this.description = 'Perform health checks on the project';
    this.category = 'testing';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ProjectHealthCheckStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🏥 Performing health checks for project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = context.projectRepository || context.getService?.('projectRepository') || global.application?.projectRepository;
      if (!projectRepo) {
        logger.warn('ProjectRepository not available in context, using basic health check');
        // Continue without project repository for basic health check
      }
      
      let project = null;
      if (projectRepo) {
        project = await projectRepo.findById(projectId);
      }
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const packageManager = project.package_manager || 'npm';
      const healthChecks = {
        build: null,
        test: null,
        lint: null,
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          status: 'unknown'
        }
      };
      
      // Perform build check
      if (config.settings.includeBuildCheck) {
        healthChecks.build = await this.performBuildCheck(workspacePath, packageManager);
        healthChecks.summary.total++;
        if (healthChecks.build.success) {
          healthChecks.summary.passed++;
        } else {
          healthChecks.summary.failed++;
        }
      }
      
      // Perform test check
      if (config.settings.includeTestCheck) {
        healthChecks.test = await this.performTestCheck(workspacePath, packageManager);
        healthChecks.summary.total++;
        if (healthChecks.test.success) {
          healthChecks.summary.passed++;
        } else {
          healthChecks.summary.failed++;
        }
      }
      
      // Perform lint check
      if (config.settings.includeLintCheck) {
        healthChecks.lint = await this.performLintCheck(workspacePath, packageManager);
        healthChecks.summary.total++;
        if (healthChecks.lint.success) {
          healthChecks.summary.passed++;
        } else {
          healthChecks.summary.failed++;
        }
      }
      
      // Determine overall status
      if (healthChecks.summary.failed === 0) {
        healthChecks.summary.status = 'healthy';
      } else if (healthChecks.summary.passed > 0) {
        healthChecks.summary.status = 'warning';
      } else {
        healthChecks.summary.status = 'unhealthy';
      }
      
      logger.info(`✅ Health checks completed. Status: ${healthChecks.summary.status}`);
      
        return {
        success: true,
        message: 'Health checks completed',
        data: healthChecks
        };
      
    } catch (error) {
      logger.error('❌ Health checks failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async performBuildCheck(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/TerminalService'))();
      const buildCommand = `${packageManager} run build`;
      
      const result = await terminalService.executeCommand(buildCommand, {
        cwd: workspacePath,
        timeout: 30000,
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      return {
        success: result.success,
        command: buildCommand,
        output: result.output,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async performTestCheck(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/TerminalService'))();
      const testCommand = `${packageManager} test`;
      
      const result = await terminalService.executeCommand(testCommand, {
        cwd: workspacePath,
        timeout: 30000,
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      });
      
      return {
        success: result.success,
        command: testCommand,
        output: result.output,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async performLintCheck(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/TerminalService'))();
      const lintCommand = `${packageManager} run lint`;
      
      const result = await terminalService.executeCommand(lintCommand, {
        cwd: workspacePath,
        timeout: 30000,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
      return {
        success: result.success,
        command: lintCommand,
        output: result.output,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
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
const stepInstance = new ProjectHealthCheckStep();
      
// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 