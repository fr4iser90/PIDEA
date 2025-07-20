/**
 * Confirmation Step
 * Handles task confirmation and validation
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('confirmation_step');

// Step configuration
const config = {
  name: 'ConfirmationStep',
  type: 'completion',
  category: 'completion',
  description: 'Handle task confirmation and validation',
  version: '1.0.0',
  dependencies: ['TaskRepository', 'TerminalService'],
  settings: {
    includeAutoConfirmation: true,
    includeQualityCheck: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'taskId']
  }
};

class ConfirmationStep {
  constructor() {
    this.name = 'ConfirmationStep';
    this.description = 'Handle task confirmation and validation';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  async execute(context) {
    try {
      logger.info('Starting ConfirmationStep execution');
      
      // Get services from global application (like analysis steps)
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const taskRepository = application.taskRepository;
      const terminalService = application.terminalService;
      
      if (!taskRepository) {
        throw new Error('TaskRepository not available');
      }
      if (!terminalService) {
        throw new Error('TerminalService not available');
      }

      const { projectId, workspacePath = process.cwd(), taskId } = context;

      logger.info(`Confirming project: ${projectId}${taskId ? `, task: ${taskId}` : ''}`);

      // Get tasks to confirm
      let tasksToConfirm = [];
      
      if (taskId) {
        // Confirm specific task
        const task = await taskRepository.findById(taskId);
        if (task && task.status === 'completed') {
          tasksToConfirm = [task];
        }
      } else {
        // Confirm all completed tasks for project
        tasksToConfirm = await taskRepository.findByProjectIdAndStatus(projectId, 'completed');
      }

      if (tasksToConfirm.length === 0) {
        logger.info('No completed tasks found to confirm');
        return {
          success: true,
          message: 'No completed tasks found to confirm',
          data: { confirmedTasks: 0 }
        };
      }

      logger.info(`Found ${tasksToConfirm.length} completed tasks to confirm`);

      // Run quality checks using TerminalService
      const qualityChecks = await this.runQualityChecks(terminalService, workspacePath);
      
      // Run validation tests using TerminalService
      const validationTests = await this.runValidationTests(terminalService, workspacePath);
      
      // Check for any errors or warnings
      const hasErrors = qualityChecks.hasErrors || validationTests.hasErrors;
      const hasWarnings = qualityChecks.hasWarnings || validationTests.hasWarnings;
      
      const canConfirm = !hasErrors && qualityChecks.allPassed && validationTests.allPassed;

      // Confirm tasks if quality checks pass
      const results = [];
      for (const task of tasksToConfirm) {
        try {
          if (canConfirm) {
            // Mark task as confirmed
            await taskRepository.update(task.id, {
              status: 'confirmed',
              confirmedAt: new Date(),
              qualityChecks,
              validationTests
            });

            results.push({
              taskId: task.id,
              success: true,
              message: 'Task confirmed',
              confirmed: true
            });

            logger.info(`Task ${task.id} confirmed`);
          } else {
            results.push({
              taskId: task.id,
              success: false,
              message: 'Task not confirmed due to quality check failures',
              confirmed: false,
              reason: 'quality_checks_failed'
            });
          }
        } catch (error) {
          logger.error(`Failed to confirm task ${task.id}:`, error);
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }

      const confirmedTasks = results.filter(r => r.success && r.confirmed).length;

      logger.info(`ConfirmationStep completed: ${confirmedTasks}/${tasksToConfirm.length} tasks confirmed`);
      
      return {
        success: true,
        message: 'Confirmation completed',
        data: {
          confirmedTasks,
          totalTasks: tasksToConfirm.length,
          results,
          qualityChecks,
          validationTests,
          canConfirm
        }
      };

    } catch (error) {
      logger.error('Error in ConfirmationStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runQualityChecks(terminalService, workspacePath) {
    try {
      // Run linting
      const lintResult = await terminalService.executeCommand('npm run lint', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Run type checking (if available)
      const typeCheckResult = await terminalService.executeCommand('npm run type-check', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Run security audit
      const auditResult = await terminalService.executeCommand('npm audit --audit-level=moderate', {
        cwd: workspacePath,
        timeout: 30000
      });

      const hasErrors = !lintResult.success || !typeCheckResult.success;
      const hasWarnings = !auditResult.success;

      return {
        allPassed: lintResult.success && typeCheckResult.success,
        hasErrors,
        hasWarnings,
        lint: {
          success: lintResult.success,
          output: lintResult.output
        },
        typeCheck: {
          success: typeCheckResult.success,
          output: typeCheckResult.output
        },
        audit: {
          success: auditResult.success,
          output: auditResult.output
        }
      };

    } catch (error) {
      logger.error('Error running quality checks:', error);
      return {
        allPassed: false,
        hasErrors: true,
        hasWarnings: false,
        error: error.message
      };
    }
  }

  async runValidationTests(terminalService, workspacePath) {
    try {
      // Run unit tests
      const unitTests = await terminalService.executeCommand('npm test', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Run integration tests (if available)
      const integrationTests = await terminalService.executeCommand('npm run test:integration', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Run e2e tests (if available)
      const e2eTests = await terminalService.executeCommand('npm run test:e2e', {
        cwd: workspacePath,
        timeout: 60000
      });

      const hasErrors = !unitTests.success;
      const hasWarnings = !integrationTests.success || !e2eTests.success;

      return {
        allPassed: unitTests.success,
        hasErrors,
        hasWarnings,
        unitTests: {
          success: unitTests.success,
          output: unitTests.output
        },
        integrationTests: {
          success: integrationTests.success,
          output: integrationTests.output
        },
        e2eTests: {
          success: e2eTests.success,
          output: e2eTests.output
        }
      };

    } catch (error) {
      logger.error('Error running validation tests:', error);
      return {
        allPassed: false,
        hasErrors: true,
        hasWarnings: false,
        error: error.message
      };
    }
  }
}

// Create instance for execution
const stepInstance = new ConfirmationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
