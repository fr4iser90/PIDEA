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
  dependencies: ['taskRepository'],
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
    this.dependencies = ['taskRepository'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CompletionDetectionStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, taskId } = context;
      
      logger.info(`🔍 Detecting completion for project ${projectId}${taskId ? `, task ${taskId}` : ''}`);
      
      // Get task repository from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const taskRepository = application.taskRepository;
      if (!taskRepository) {
        throw new Error('Task repository not available');
      }
      
      // Simple completion detection logic
      const isComplete = await this.detectCompletion(taskRepository, projectId, taskId);
      
      logger.info(`✅ Completion detection completed: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
      
      return {
        success: true,
        message: 'Completion detection completed',
        data: {
          isComplete,
          projectId,
          taskId,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      logger.error('❌ Completion detection failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async detectCompletion(taskRepository, projectId, taskId) {
    try {
      if (taskId) {
        // Check specific task
        const task = await taskRepository.findById(taskId);
        return task && task.status === 'completed';
      } else {
        // Check all tasks for project
        const tasks = await taskRepository.findByProjectId(projectId);
        return tasks.some(task => task.status === 'completed');
      }
    } catch (error) {
      logger.warn('Could not detect completion:', error.message);
      return false;
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
    const stepInstance = new CompletionDetectionStep();
    return await stepInstance.execute(context);
  }
}; 