/**
 * Completion Detection Step
 * Detects when tasks are completed
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('completion_detection_step');

// Step configuration
const config = {
  name: 'CompletionDetectionStep',
  type: 'completion',
  category: 'completion',
  description: 'Detect when tasks are completed',
  version: '1.0.0',
  dependencies: ['TaskRepository', 'TerminalService'],
  settings: {
    includeFileChanges: true,
    includeGitChanges: true,
    includeTestResults: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'taskId']
  }
};

class CompletionDetectionStep {
  constructor() {
    this.name = 'CompletionDetectionStep';
    this.description = 'Detect when tasks are completed';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  async execute(context) {
    try {
      logger.info('Starting CompletionDetectionStep execution');
      
      // Get services via dependency injection (NOT global.application!)
      const taskRepository = context.getService('TaskRepository');
      const terminalService = context.getService('TerminalService');
      
      if (!taskRepository) {
        throw new Error('TaskRepository not available in context');
      }
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }

      const { projectId, workspacePath = process.cwd(), taskId } = context;

      logger.info(`Detecting completion for project: ${projectId}${taskId ? `, task: ${taskId}` : ''}`);

      // Get tasks to check
      let tasksToCheck = [];
      
      if (taskId) {
        // Check specific task
        const task = await taskRepository.findById(taskId);
        if (task && task.status === 'pending') {
          tasksToCheck = [task];
        }
      } else {
        // Check all pending tasks for project
        tasksToCheck = await taskRepository.findByProjectIdAndStatus(projectId, 'pending');
      }

      if (tasksToCheck.length === 0) {
        logger.info('No pending tasks found to check');
        return {
          success: true,
          message: 'No pending tasks found to check',
          data: { completedTasks: 0 }
        };
      }

      logger.info(`Found ${tasksToCheck.length} pending tasks to check`);

      // Check completion criteria using TerminalService
      const completionCriteria = await this.checkCompletionCriteria(terminalService, workspacePath);

      // Update tasks based on completion criteria
      const results = [];
      for (const task of tasksToCheck) {
        try {
          const isCompleted = await this.isTaskCompleted(task, completionCriteria);
          
          if (isCompleted) {
            // Mark task as completed
            await taskRepository.update(task.id, {
              status: 'completed',
              completedAt: new Date(),
              completionCriteria
            });

            results.push({
              taskId: task.id,
              success: true,
              message: 'Task marked as completed',
              completed: true
            });

            logger.info(`Task ${task.id} marked as completed`);
          } else {
            results.push({
              taskId: task.id,
              success: true,
              message: 'Task not yet completed',
              completed: false
            });
          }
        } catch (error) {
          logger.error(`Failed to check task ${task.id}:`, error);
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }

      const completedTasks = results.filter(r => r.success && r.completed).length;

      logger.info(`CompletionDetectionStep completed: ${completedTasks}/${tasksToCheck.length} tasks completed`);
      
      return {
        success: true,
        message: 'Completion detection completed',
        data: {
          completedTasks,
          totalTasks: tasksToCheck.length,
          results,
          completionCriteria
        }
      };

    } catch (error) {
      logger.error('Error in CompletionDetectionStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkCompletionCriteria(terminalService, workspacePath) {
    try {
      // Check for test results
      const testResults = await terminalService.executeCommand('npm test -- --passWithNoTests', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Check for build success
      const buildCheck = await terminalService.executeCommand('npm run build', {
        cwd: workspacePath,
        timeout: 60000
      });

      // Check for linting
      const lintCheck = await terminalService.executeCommand('npm run lint', {
        cwd: workspacePath,
        timeout: 30000
      });

      // Check for git changes
      const gitStatus = await terminalService.executeCommand('git status --porcelain', {
        cwd: workspacePath,
        timeout: 10000
      });

      return {
        testsPassed: testResults.success,
        buildSuccess: buildCheck.success,
        lintPassed: lintCheck.success,
        hasChanges: gitStatus.success && gitStatus.output.trim(),
        testOutput: testResults.output,
        buildOutput: buildCheck.output,
        lintOutput: lintCheck.output,
        gitStatus: gitStatus.output
      };

    } catch (error) {
      logger.error('Error checking completion criteria:', error);
      return {
        testsPassed: false,
        buildSuccess: false,
        lintPassed: false,
        hasChanges: false,
        error: error.message
      };
    }
  }

  async isTaskCompleted(task, completionCriteria) {
    // Simple completion logic - can be enhanced based on task type
    const { testsPassed, buildSuccess, lintPassed } = completionCriteria;
    
    // Basic completion: tests pass, build succeeds, lint passes
    return testsPassed && buildSuccess && lintPassed;
  }
}

// Create instance for execution
const stepInstance = new CompletionDetectionStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
