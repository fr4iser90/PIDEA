/**
 * Task File Organization Step
 * Handles automatic file organization based on task properties
 * Created: 2025-09-19T19:22:57.000Z
 */

const BaseStep = require('../BaseStep');
const Logger = require('../../infrastructure/logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class TaskFileOrganizationStep extends BaseStep {
  constructor() {
    super();
    this.logger = new Logger('TaskFileOrganizationStep');
    this.stepName = 'TaskFileOrganizationStep';
    this.stepType = 'organization';
  }

  /**
   * Execute file organization step
   * @param {Object} context - Execution context
   * @param {Object} options - Step options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context, options = {}) {
    try {
      this.logger.info('📁 Starting task file organization step...');
      
      const {
        taskId,
        taskMetadata = {},
        createDirectories = true,
        moveFiles = true,
        updateReferences = true
      } = options;

      if (!taskId) {
        throw new Error('Task ID is required');
      }

      // 1. Determine target directory structure
      const targetPath = this.determineTargetPath(taskMetadata);
      
      // 2. Create directory structure if requested
      if (createDirectories) {
        await this.createDirectoryStructure(targetPath);
      }

      // 3. Move files if requested
      let filesMoved = [];
      if (moveFiles) {
        filesMoved = await this.moveTaskFiles(taskId, targetPath, taskMetadata);
      }

      // 4. Update references if requested
      let referencesUpdated = [];
      if (updateReferences) {
        referencesUpdated = await this.updateFileReferences(taskId, targetPath);
      }

      const result = {
        success: true,
        taskId,
        targetPath,
        directoriesCreated: createDirectories,
        filesMoved: filesMoved.length,
        referencesUpdated: referencesUpdated.length,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`✅ File organization completed for task ${taskId}`);
      return result;

    } catch (error) {
      this.logger.error('❌ File organization failed:', error);
      throw error;
    }
  }

  /**
   * Determine target path based on task metadata
   * @param {Object} taskMetadata - Task metadata
   * @returns {string} Target directory path
   */
  determineTargetPath(taskMetadata) {
    const {
      status = 'pending',
      priority = 'medium',
      category = 'uncategorized',
      completedAt,
      id
    } = taskMetadata;

    const basePath = 'docs/09_roadmap';

    switch (status) {
      case 'completed':
        const quarter = this.getCompletionQuarter(completedAt);
        return path.join(basePath, 'completed', quarter, category, id);
        
      case 'in_progress':
        return path.join(basePath, 'in-progress', category, id);
        
      case 'pending':
        return path.join(basePath, 'pending', priority, category, id);
        
      case 'blocked':
        return path.join(basePath, 'blocked', category, id);
        
      case 'cancelled':
        return path.join(basePath, 'cancelled', category, id);
        
      case 'failed':
        return path.join(basePath, 'failed', category, id);
        
      default:
        return path.join(basePath, 'pending', priority, category, id);
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
   * Create directory structure
   * @param {string} targetPath - Target directory path
   */
  async createDirectoryStructure(targetPath) {
    try {
      const fullPath = path.join(process.cwd(), targetPath);
      await fs.mkdir(fullPath, { recursive: true });
      
      // Create subdirectories for different file types
      const subdirs = ['implementation', 'phases', 'documentation', 'assets'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(fullPath, subdir);
        await fs.mkdir(subdirPath, { recursive: true });
      }
      
      this.logger.info(`📁 Created directory structure: ${targetPath}`);
      
    } catch (error) {
      this.logger.error(`Error creating directory structure ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Move task files to new location
   * @param {string} taskId - Task ID
   * @param {string} targetPath - Target directory path
   * @param {Object} taskMetadata - Task metadata
   * @returns {Promise<Array>} List of moved files
   */
  async moveTaskFiles(taskId, targetPath, taskMetadata) {
    try {
      const movedFiles = [];
      
      // Find source files (this would typically come from database or file system scan)
      const sourceFiles = await this.findSourceFiles(taskId);
      
      const fullTargetPath = path.join(process.cwd(), targetPath);
      
      for (const sourceFile of sourceFiles) {
        const fileName = path.basename(sourceFile);
        const targetFile = path.join(fullTargetPath, fileName);
        
        // Create backup
        const backupFile = `${sourceFile}.backup`;
        await fs.copyFile(sourceFile, backupFile);
        
        // Move file
        await fs.rename(sourceFile, targetFile);
        
        // Remove backup after successful move
        await fs.unlink(backupFile);
        
        movedFiles.push({
          source: sourceFile,
          target: targetFile,
          fileName
        });
      }
      
      this.logger.info(`📄 Moved ${movedFiles.length} files for task ${taskId}`);
      return movedFiles;
      
    } catch (error) {
      this.logger.error(`Error moving files for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Find source files for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} List of source file paths
   */
  async findSourceFiles(taskId) {
    try {
      // TODO: Implement actual file discovery logic
      // This would typically scan the current roadmap directory for task files
      
      const mockFiles = [
        `docs/09_roadmap/tasks/task-${taskId}/task-${taskId}-implementation.md`,
        `docs/09_roadmap/tasks/task-${taskId}/task-${taskId}-index.md`
      ];
      
      // Filter to only existing files
      const existingFiles = [];
      for (const file of mockFiles) {
        try {
          const fullPath = path.join(process.cwd(), file);
          await fs.access(fullPath);
          existingFiles.push(fullPath);
        } catch (error) {
          // File doesn't exist, skip
        }
      }
      
      return existingFiles;
      
    } catch (error) {
      this.logger.error(`Error finding source files for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update file references to new path
   * @param {string} taskId - Task ID
   * @param {string} targetPath - New target path
   * @returns {Promise<Array>} List of updated references
   */
  async updateFileReferences(taskId, targetPath) {
    try {
      const updatedReferences = [];
      
      // TODO: Implement actual reference updates
      // This would update references in:
      // - Database records
      // - Other task files
      // - Configuration files
      // - Documentation files
      
      this.logger.info(`📝 Would update file references for task ${taskId} to path: ${targetPath}`);
      
      return updatedReferences;
      
    } catch (error) {
      this.logger.error(`Error updating file references for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Archive old completed tasks
   * @param {Object} options - Archive options
   * @returns {Promise<Object>} Archive result
   */
  async archiveOldTasks(options = {}) {
    try {
      const {
        olderThanMonths = 12,
        archivePath = 'docs/09_roadmap/archive'
      } = options;

      this.logger.info(`📦 Archiving completed tasks older than ${olderThanMonths} months...`);
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);
      
      // TODO: Implement actual archiving logic
      // 1. Find completed tasks older than cutoff date
      // 2. Move them to archive directory
      // 3. Update database records
      
      const result = {
        success: true,
        archivedTasks: 0,
        archivePath,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString()
      };
      
      this.logger.info(`✅ Archive process completed (placeholder)`);
      return result;
      
    } catch (error) {
      this.logger.error('Error archiving old tasks:', error);
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
      description: 'Organizes task files based on status and metadata',
      options: {
        taskId: {
          type: 'string',
          required: true,
          description: 'Task ID to organize'
        },
        taskMetadata: {
          type: 'object',
          description: 'Task metadata including status, priority, category'
        },
        createDirectories: {
          type: 'boolean',
          default: true,
          description: 'Whether to create directory structure'
        },
        moveFiles: {
          type: 'boolean',
          default: true,
          description: 'Whether to move files to new location'
        },
        updateReferences: {
          type: 'boolean',
          default: true,
          description: 'Whether to update file references'
        }
      }
    };
  }
}

module.exports = TaskFileOrganizationStep;
