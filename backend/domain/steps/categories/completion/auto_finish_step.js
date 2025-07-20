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
  dependencies: ['taskRepository'],
  settings: {
    includeCompletionDetection: true,
    includeAutoCommit: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class AutoFinishStep {
  constructor() {
    this.name = 'AutoFinishStep';
    this.description = 'Automatically finish tasks based on completion detection';
    this.category = 'completion';
    this.dependencies = ['taskRepository'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = AutoFinishStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🚀 Auto-finishing tasks for project ${projectId}`);
      
      // Get task repository from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const taskRepository = application.taskRepository;
      if (!taskRepository) {
        throw new Error('Task repository not available');
      }
      
      // Get completed tasks
      const completedTasks = await taskRepository.findByStatus('completed');
      
      if (completedTasks.length === 0) {
        logger.info('ℹ️ No completed tasks detected');
        return {
          success: true,
          message: 'No completed tasks detected',
          data: {
            completedTasks: 0,
            status: 'no_tasks'
          }
        };
      }
      
      logger.info(`✅ Found ${completedTasks.length} completed tasks`);
      
      // Auto-finish each task
      const results = [];
      for (const task of completedTasks) {
        try {
          // Mark task as finished
          await taskRepository.update(task.id, {
            status: 'finished',
            finishedAt: new Date()
          });
          
          results.push({
            taskId: task.id,
            success: true,
            message: 'Task marked as finished'
          });
          
        } catch (error) {
          logger.error(`❌ Failed to auto-finish task ${task.id}:`, error);
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }
      
      const successfulFinishes = results.filter(r => r.success).length;
      
      logger.info(`✅ Auto-finish completed: ${successfulFinishes}/${completedTasks.length} tasks`);
      
      return {
        success: true,
        message: 'Auto-finish completed',
        data: {
          totalTasks: completedTasks.length,
          successfulFinishes,
          failedFinishes: completedTasks.length - successfulFinishes,
          results
        }
      };
      
    } catch (error) {
      logger.error('❌ Auto-finish failed:', error);
      
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

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new AutoFinishStep();
    return await stepInstance.execute(context);
  }
}; 