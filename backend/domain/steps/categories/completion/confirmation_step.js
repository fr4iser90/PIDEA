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
  dependencies: ['taskRepository'],
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
    this.dependencies = ['taskRepository'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ConfirmationStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, taskId } = context;
      
      logger.info(`✅ Confirming task for project ${projectId}${taskId ? `, task ${taskId}` : ''}`);
      
      // Get task repository from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const taskRepository = application.taskRepository;
      if (!taskRepository) {
        throw new Error('Task repository not available');
      }
      
      // Simple confirmation logic
      const confirmed = await this.processConfirmation(taskRepository, projectId, taskId);
      
      logger.info(`✅ Confirmation completed: ${confirmed ? 'CONFIRMED' : 'NOT_CONFIRMED'}`);
      
      return {
        success: true,
        message: 'Confirmation completed',
        data: {
          confirmed,
          projectId,
          taskId,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      logger.error('❌ Confirmation failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async processConfirmation(taskRepository, projectId, taskId) {
    try {
      if (taskId) {
        // Confirm specific task
        const task = await taskRepository.findById(taskId);
        if (task) {
          await taskRepository.update(taskId, {
            status: 'confirmed',
            confirmedAt: new Date()
          });
          return true;
        }
      } else {
        // Confirm all pending tasks for project
        const tasks = await taskRepository.findByProjectId(projectId);
        const pendingTasks = tasks.filter(task => task.status === 'pending');
        
        for (const task of pendingTasks) {
          await taskRepository.update(task.id, {
            status: 'confirmed',
            confirmedAt: new Date()
          });
        }
        
        return pendingTasks.length > 0;
      }
      
      return false;
    } catch (error) {
      logger.warn('Could not process confirmation:', error.message);
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
    const stepInstance = new ConfirmationStep();
    return await stepInstance.execute(context);
  }
}; 