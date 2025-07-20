/**
 * Auto Finish Step
 * Automatically finishes tasks based on completion detection
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('auto_finish_step');

// Step configuration
const config = {
  name: 'AutoFinishStep',
  type: 'completion',
  category: 'completion',
  description: 'Automatically finish tasks based on completion detection',
  version: '1.0.0',
  dependencies: ['TaskRepository', 'TerminalService'],
  settings: {
    includeCompletionDetection: true,
    includeAutoCommit: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'taskId']
  }
};

class AutoFinishStep {
  constructor() {
    this.name = 'AutoFinishStep';
    this.description = 'Automatically finish tasks based on completion detection';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  async execute(context) {
    try {
      logger.info('Starting AutoFinishStep execution');
      
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

      logger.info(`Auto-finishing project: ${projectId}${taskId ? `, task: ${taskId}` : ''}`);

      // Get tasks to finish
      let tasksToFinish = [];
      
      if (taskId) {
        // Finish specific task
        const task = await taskRepository.findById(taskId);
        if (task && task.status === 'completed') {
          tasksToFinish = [task];
        }
      } else {
        // Finish all completed tasks for project
        tasksToFinish = await taskRepository.findByProjectIdAndStatus(projectId, 'completed');
      }

      if (tasksToFinish.length === 0) {
        logger.info('No completed tasks found to finish');
        return {
          success: true,
          message: 'No completed tasks found to finish',
          data: { finishedTasks: 0 }
        };
      }

      logger.info(`Found ${tasksToFinish.length} completed tasks to finish`);

      // Finish each task
      const results = [];
      for (const task of tasksToFinish) {
        try {
          // Update task status to finished
          await taskRepository.update(task.id, {
            status: 'finished',
            finishedAt: new Date()
          });

          results.push({
            taskId: task.id,
            success: true,
            message: 'Task marked as finished'
          });

          logger.info(`Task ${task.id} marked as finished`);
        } catch (error) {
          logger.error(`Failed to finish task ${task.id}:`, error);
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }

      // Auto-commit if there are changes (using TerminalService)
      const gitStatus = await terminalService.executeCommand('git status --porcelain', {
        cwd: workspacePath,
        timeout: 10000
      });

      if (gitStatus.success && gitStatus.output.trim()) {
        logger.info('Found uncommitted changes, auto-committing');
        
        await terminalService.executeCommand('git add .', {
          cwd: workspacePath,
          timeout: 10000
        });

        const commitMessage = `Auto-finish: ${results.length} tasks finished`;
        await terminalService.executeCommand(`git commit -m "${commitMessage}"`, {
          cwd: workspacePath,
          timeout: 10000
        });

        logger.info('Auto-commit completed successfully');
      }

      const successfulFinishes = results.filter(r => r.success).length;

      logger.info(`AutoFinishStep completed: ${successfulFinishes}/${tasksToFinish.length} tasks finished`);
      
      return {
        success: true,
        message: 'Tasks auto-finished successfully',
        data: {
          finishedTasks: successfulFinishes,
          totalTasks: tasksToFinish.length,
          results,
          committed: gitStatus.success && gitStatus.output.trim() ? true : false
        }
      };

    } catch (error) {
      logger.error('Error in AutoFinishStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create instance for execution
const stepInstance = new AutoFinishStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
