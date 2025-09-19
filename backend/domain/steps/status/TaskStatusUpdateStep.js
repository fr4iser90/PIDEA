/**
 * Task Status Update Step
 * Handles automatic task status updates and file organization
 * Created: 2025-09-19T19:22:57.000Z
 */

const BaseStep = require('../BaseStep');
const Logger = require('../../infrastructure/logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class TaskStatusUpdateStep extends BaseStep {
  constructor() {
    super();
    this.logger = new Logger('TaskStatusUpdateStep');
    this.stepName = 'TaskStatusUpdateStep';
    this.stepType = 'status';
  }

  /**
   * Execute status update step
   * @param {Object} context - Execution context
   * @param {Object} options - Step options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context, options = {}) {
    try {
      this.logger.info('🔄 Starting task status update step...');
      
      const {
        taskId,
        newStatus,
        taskMetadata = {},
        autoMoveFiles = true,
        updateDatabase = true
      } = options;

      if (!taskId || !newStatus) {
        throw new Error('Task ID and new status are required');
      }

      // 1. Get current task information
      const currentTask = await this.getCurrentTaskInfo(taskId);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }

      // 2. Validate status transition
      const isValidTransition = this.validateStatusTransition(currentTask.status, newStatus);
      if (!isValidTransition) {
        throw new Error(`Invalid status transition from ${currentTask.status} to ${newStatus}`);
      }

      // 3. Update task status in database
      if (updateDatabase) {
        await this.updateTaskStatus(taskId, newStatus, taskMetadata);
      }

      // 4. Move files if requested
      if (autoMoveFiles) {
        await this.moveTaskFiles(taskId, currentTask, newStatus, taskMetadata);
      }

      // 5. Update references
      await this.updateFileReferences(taskId, currentTask, newStatus);

      const result = {
        success: true,
        taskId,
        oldStatus: currentTask.status,
        newStatus,
        filesMoved: autoMoveFiles,
        databaseUpdated: updateDatabase,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`✅ Task status updated successfully: ${taskId} -> ${newStatus}`);
      return result;

    } catch (error) {
      this.logger.error('❌ Task status update failed:', error);
      throw error;
    }
  }

  /**
   * Get current task information
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Current task info
   */
  async getCurrentTaskInfo(taskId) {
    try {
      // TODO: Implement actual database lookup
      // For now, return mock data
      return {
        id: taskId,
        status: 'pending',
        priority: 'medium',
        category: 'uncategorized',
        filePath: `docs/09_roadmap/pending/medium-priority/task-${taskId}`,
        completedAt: null
      };
    } catch (error) {
      this.logger.error(`Error getting current task info for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} Whether transition is valid
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['in_progress', 'cancelled', 'blocked'],
      'in_progress': ['completed', 'failed', 'blocked', 'cancelled'],
      'blocked': ['pending', 'in_progress', 'cancelled'],
      'completed': [], // No transitions from completed
      'failed': ['pending', 'in_progress'],
      'cancelled': [] // No transitions from cancelled
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Update task status in database
   * @param {string} taskId - Task ID
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   */
  async updateTaskStatus(taskId, newStatus, metadata) {
    try {
      // TODO: Implement actual database update
      this.logger.info(`📊 Would update database record for task ${taskId}: status=${newStatus}`);
      
      // Mock database update
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
        ...metadata
      };
      
      this.logger.info(`Database update data:`, updateData);
      
    } catch (error) {
      this.logger.error(`Error updating database for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Move task files to new location
   * @param {string} taskId - Task ID
   * @param {Object} currentTask - Current task info
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   */
  async moveTaskFiles(taskId, currentTask, newStatus, metadata) {
    try {
      const currentPath = currentTask.filePath;
      const newPath = this.determineNewPath(newStatus, { ...currentTask, ...metadata });
      
      this.logger.info(`📁 Moving files from ${currentPath} to ${newPath}`);
      
      // Create target directory
      const fullNewPath = path.join(process.cwd(), newPath);
      await fs.mkdir(fullNewPath, { recursive: true });
      
      // Move files
      const fullCurrentPath = path.join(process.cwd(), currentPath);
      const files = await fs.readdir(fullCurrentPath);
      
      for (const file of files) {
        const sourceFile = path.join(fullCurrentPath, file);
        const targetFile = path.join(fullNewPath, file);
        
        // Create backup
        const backupFile = `${sourceFile}.backup`;
        await fs.copyFile(sourceFile, backupFile);
        
        // Move file
        await fs.rename(sourceFile, targetFile);
        
        // Remove backup after successful move
        await fs.unlink(backupFile);
      }
      
      // Remove empty source directory
      await fs.rmdir(fullCurrentPath);
      
      this.logger.info(`✅ Files moved successfully: ${currentPath} -> ${newPath}`);
      
    } catch (error) {
      this.logger.error(`Error moving files for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Determine new path based on status
   * @param {string} newStatus - New status
   * @param {Object} taskMetadata - Task metadata
   * @returns {string} New file path
   */
  determineNewPath(newStatus, taskMetadata) {
    const { priority = 'medium', category = 'uncategorized', completedAt } = taskMetadata;
    
    switch (newStatus) {
      case 'completed':
        const quarter = this.getCompletionQuarter(completedAt);
        return `docs/09_roadmap/completed/${quarter}/${category}/${taskMetadata.id}/`;
        
      case 'in_progress':
        return `docs/09_roadmap/in-progress/${category}/${taskMetadata.id}/`;
        
      case 'pending':
        return `docs/09_roadmap/pending/${priority}/${category}/${taskMetadata.id}/`;
        
      case 'blocked':
        return `docs/09_roadmap/blocked/${category}/${taskMetadata.id}/`;
        
      case 'cancelled':
        return `docs/09_roadmap/cancelled/${category}/${taskMetadata.id}/`;
        
      case 'failed':
        return `docs/09_roadmap/failed/${category}/${taskMetadata.id}/`;
        
      default:
        return `docs/09_roadmap/pending/${priority}/${category}/${taskMetadata.id}/`;
    }
  }

  /**
   * Get completion quarter from date
   * @param {string} completedAt - Completion date
   * @returns {string} Quarter string
   */
  getCompletionQuarter(completedAt) {
    if (!completedAt) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (month <= 3) return `${year}-q1`;
      if (month <= 6) return `${year}-q2`;
      if (month <= 9) return `${year}-q3`;
      return `${year}-q4`;
    }
    
    const date = new Date(completedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }

  /**
   * Update file references to new path
   * @param {string} taskId - Task ID
   * @param {Object} currentTask - Current task info
   * @param {string} newStatus - New status
   */
  async updateFileReferences(taskId, currentTask, newStatus) {
    try {
      // TODO: Implement reference updates in other files
      this.logger.info(`📝 Would update file references for task ${taskId} with new status: ${newStatus}`);
      
    } catch (error) {
      this.logger.error(`Error updating file references for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get step configuration
   * @returns {Object} Step configuration
   */
  getConfiguration() {
    return {
      name: this.stepName,
      type: this.stepType,
      description: 'Updates task status and organizes files accordingly',
      options: {
        taskId: {
          type: 'string',
          required: true,
          description: 'Task ID to update'
        },
        newStatus: {
          type: 'string',
          required: true,
          description: 'New status for the task',
          enum: ['pending', 'in_progress', 'completed', 'failed', 'blocked', 'cancelled']
        },
        autoMoveFiles: {
          type: 'boolean',
          default: true,
          description: 'Whether to automatically move files to new location'
        },
        updateDatabase: {
          type: 'boolean',
          default: true,
          description: 'Whether to update database record'
        }
      }
    };
  }
}

module.exports = TaskStatusUpdateStep;
