/**
 * Project Test Step
 * Runs tests for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ProjectTestStep');

// Step configuration
const config = {
  name: 'project_test_step',
  type: 'testing',
  category: 'testing',
  description: 'Run tests for the project',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
  settings: {
    includeUnitTests: true,
    includeIntegrationTests: true,
    includeCoverage: true,
    timeout: 120000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class ProjectTestStep {
  constructor() {
    this.name = 'ProjectTestStep';
    this.description = 'Run tests for the project';
    this.category = 'testing';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ProjectTestStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🧪 Running tests for project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = context.projectRepository || context.getService?.('projectRepository') || global.application?.projectRepository;
      if (!projectRepo) {
        logger.warn('ProjectRepository not available in context, using basic test execution');
        // Continue without project repository for basic test execution
      }
      
      let project = null;
      if (projectRepo) {
        project = await projectRepo.findById(projectId);
      }
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const packageManager = project.package_manager || 'npm';
      const testResults = {
        unit: null,
        integration: null,
        coverage: null,
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          status: 'unknown'
        }
      };
      
      // Run unit tests
      if (config.settings.includeUnitTests) {
        testResults.unit = await this.runUnitTests(workspacePath, packageManager);
        testResults.summary.total++;
        if (testResults.unit.success) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
        }
      }
      
      // Run integration tests
      if (config.settings.includeIntegrationTests) {
        testResults.integration = await this.runIntegrationTests(workspacePath, packageManager);
        testResults.summary.total++;
        if (testResults.integration.success) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
        }
      }
      
      // Run coverage tests
      if (config.settings.includeCoverage) {
        testResults.coverage = await this.runCoverageTests(workspacePath, packageManager);
        testResults.summary.total++;
        if (testResults.coverage.success) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
        }
      }
      
      // Determine overall status
      if (testResults.summary.failed === 0) {
        testResults.summary.status = 'passed';
      } else if (testResults.summary.passed > 0) {
        testResults.summary.status = 'partial';
      } else {
        testResults.summary.status = 'failed';
      }
      
      logger.info(`✅ Tests completed. Status: ${testResults.summary.status}`);
        
        return {
        success: testResults.summary.status === 'passed',
        message: 'Tests completed',
        data: testResults
        };
      
    } catch (error) {
      logger.error('❌ Tests failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async runUnitTests(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/terminal/TerminalService'))();
      const testCommand = `${packageManager} test`;
      
      const result = await terminalService.executeCommand(testCommand, {
        cwd: workspacePath,
        timeout: 60000,
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
    
  async runIntegrationTests(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/terminal/TerminalService'))();
      const testCommand = `${packageManager} run test:integration`;
      
      const result = await terminalService.executeCommand(testCommand, {
        cwd: workspacePath,
        timeout: 60000,
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

  async runCoverageTests(workspacePath, packageManager) {
    try {
      const terminalService = new (require('@domain/services/terminal/TerminalService'))();
      const testCommand = `${packageManager} run test:coverage`;
      
      const result = await terminalService.executeCommand(testCommand, {
        cwd: workspacePath,
        timeout: 60000,
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

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new ProjectTestStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 