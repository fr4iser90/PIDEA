/**
 * Task Synchronization Step - OPTIMIZED VERSION
 * Uses existing task system with file_path and content_hash
 * No resource-intensive workspace scanning!
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs');
const path = require('path');
const logger = new Logger('task_sync_step');

// Step configuration
const config = {
  name: 'task_sync_step',
  type: 'task',
  category: 'task',
  description: 'Sync task content from file using existing task system',
  version: '2.0.0',
  dependencies: ['taskRepository', 'contentHashService'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 10000 // Much faster - no workspace scanning
  },
  validation: {
    required: ['taskId'],
    optional: ['projectId', 'userId']
  }
};

class TaskSyncStep {
  constructor() {
    this.name = 'TaskSyncStep';
    this.description = 'Sync task content from file using existing task system';
    this.category = 'task';
    this.dependencies = ['taskRepository', 'contentHashService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TaskSyncStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { taskId, projectId, userId, workspacePath } = context;
      
      logger.info(`📁 Syncing task: ${taskId}`);
      
      // Get services
      const taskRepository = context.getService('taskRepository');
      const contentHashService = context.getService('contentHashService');
      
      if (!taskRepository) {
        throw new Error('TaskRepository not available in context');
      }
      
      // Try to get task from database first
      let task = null;
      try {
        task = await taskRepository.findById(taskId);
      } catch (error) {
        logger.info(`📝 Task ${taskId} not found in database - will detect from workspace`);
      }
      
      let taskFilePath = null;
      let fileContent = null;
      let newContentHash = null;
      
      if (task && task.filePath) {
        // CASE 1: Task exists in DB with file path - use existing system
        logger.info(`📁 Using existing task file path: ${task.filePath}`);
        taskFilePath = task.filePath;
        fileContent = await this.readTaskFile(taskFilePath);
        newContentHash = await contentHashService.generateContentHash(fileContent);
        
        // Check if content changed
        const contentChanged = task.contentHash !== newContentHash;
        if (!contentChanged) {
          logger.info(`✅ Task content unchanged - no sync needed`);
          return {
            success: true,
            message: 'Task content unchanged',
            data: {
              taskId,
              updatedTask: task,
              contentChanged: false
            }
          };
        }
      } else {
        // CASE 2: Task doesn't exist in DB or has no file path - detect from workspace
        logger.info(`🔍 Detecting new task file in workspace: ${workspacePath}`);
        
        if (!workspacePath) {
          logger.warn(`⚠️ No workspace path provided - cannot detect task file`);
          return {
            success: true,
            message: 'No workspace path provided',
            data: {
              taskId,
              updatedTask: null
            }
          };
        }
        
        // Detect task file in workspace
        const detectedFile = await this.detectNewTaskFile(workspacePath, taskId, context);
        if (!detectedFile) {
          logger.warn(`⚠️ No task file detected in workspace`);
          return {
            success: true,
            message: 'No task file detected',
            data: {
              taskId,
              updatedTask: null
            }
          };
        }
        
        taskFilePath = detectedFile.path;
        fileContent = await this.readTaskFile(taskFilePath);
        newContentHash = await contentHashService.generateContentHash(fileContent);
        
        logger.info(`📄 Detected new task file: ${taskFilePath}`);
      }
      
      // Parse task content to extract structured data
      const parsedTask = this.parseTaskContent(fileContent);
      
      // Create or update task object
      let updatedTask;
      if (task) {
        // Update existing task
        updatedTask = await this.updateTaskFromContent(task, fileContent, parsedTask, newContentHash);
        await taskRepository.update(taskId, updatedTask);
      } else {
        // Create new task
        updatedTask = await this.createNewTaskFromContent(taskId, fileContent, parsedTask, newContentHash, taskFilePath, projectId, userId);
        await taskRepository.create(updatedTask);
      }
      
      logger.info(`✅ Task synchronized successfully`);
      
      return {
        success: true,
        message: 'Task synchronized from file',
        data: {
          taskId,
          updatedTask: updatedTask,
          contentChanged: true,
          newContentHash,
          filePath: taskFilePath,
          isNewTask: !task
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to synchronize task:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Read task file content
   * @param {string} filePath - File path
   * @returns {Promise<string>} File content
   */
  async readTaskFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      logger.info(`📖 Read task file: ${path.basename(filePath)} (${content.length} chars)`);
      return content;
    } catch (error) {
      logger.error(`❌ Error reading task file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Update task object with content from file
   * @param {Object} task - Existing task
   * @param {string} content - Task content
   * @param {Object} parsedTask - Parsed task data
   * @param {string} contentHash - Content hash
   * @returns {Promise<Object>} Updated task object
   */
  async updateTaskFromContent(task, content, parsedTask, contentHash) {
    try {
      // Update task with new content
      const updatedTask = {
        ...task,
        title: parsedTask.title || task.title,
        description: parsedTask.description || content,
        content: content,
        contentHash: contentHash,
        lastSyncedAt: new Date().toISOString(),
        metadata: {
          ...task.metadata,
          ...parsedTask.metadata,
          content: content,
          htmlContent: content,
          steps: parsedTask.steps || [],
          requirements: parsedTask.requirements || [],
          acceptanceCriteria: parsedTask.acceptanceCriteria || [],
          syncedAt: new Date().toISOString()
        }
      };
      
      logger.info(`📝 Updated task object:`, {
        id: updatedTask.id,
        title: updatedTask.title,
        contentHash: updatedTask.contentHash,
        filePath: updatedTask.filePath
      });
      
      return updatedTask;
      
    } catch (error) {
      logger.error('❌ Error updating task from content:', error);
      throw error;
    }
  }

  /**
   * Parse task content to extract structured data
   * @param {string} content - Task content
   * @returns {Object} Parsed task data
   */
  parseTaskContent(content) {
    const parsed = {
      title: null,
      description: null,
      status: null,
      priority: null,
      type: null,
      steps: [],
      requirements: [],
      acceptanceCriteria: [],
      metadata: {}
    };
    
    try {
      const lines = content.split('\n');
      let currentSection = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract title
        if (line.startsWith('# Task:')) {
          parsed.title = line.replace('# Task:', '').trim();
        }
        
        // Extract description
        if (line.startsWith('## Description')) {
          currentSection = 'description';
          continue;
        }
        
        // Extract status
        if (line.startsWith('## Status:')) {
          parsed.status = line.replace('## Status:', '').trim();
        }
        
        // Extract priority
        if (line.startsWith('## Priority:')) {
          parsed.priority = line.replace('## Priority:', '').trim();
        }
        
        // Extract type
        if (line.startsWith('## Type:')) {
          parsed.type = line.replace('## Type:', '').trim();
        }
        
        // Extract steps
        if (line.startsWith('## Steps') || line.startsWith('### Steps')) {
          currentSection = 'steps';
          continue;
        }
        
        // Extract requirements
        if (line.startsWith('## Requirements')) {
          currentSection = 'requirements';
          continue;
        }
        
        // Extract acceptance criteria
        if (line.startsWith('## Acceptance Criteria')) {
          currentSection = 'acceptanceCriteria';
          continue;
        }
        
        // Process section content
        if (currentSection && line && !line.startsWith('#')) {
          if (currentSection === 'description') {
            parsed.description = (parsed.description || '') + line + '\n';
          } else if (currentSection === 'steps' && line.startsWith('-')) {
            parsed.steps.push(line.replace('-', '').trim());
          } else if (currentSection === 'requirements' && line.startsWith('-')) {
            parsed.requirements.push(line.replace('-', '').trim());
          } else if (currentSection === 'acceptanceCriteria' && line.startsWith('-')) {
            parsed.acceptanceCriteria.push(line.replace('-', '').trim());
          }
        }
        
        // Reset section on new heading
        if (line.startsWith('##') || line.startsWith('#')) {
          currentSection = null;
        }
      }
      
      // Clean up description
      if (parsed.description) {
        parsed.description = parsed.description.trim();
      }
      
      logger.info(`📋 Parsed task content:`, {
        title: parsed.title,
        status: parsed.status,
        priority: parsed.priority,
        stepsCount: parsed.steps.length,
        requirementsCount: parsed.requirements.length
      });
      
      return parsed;
      
    } catch (error) {
      logger.error('❌ Error parsing task content:', error);
      return parsed;
    }
  }

  /**
   * Detect new task file in workspace (lightweight detection)
   * @param {string} workspacePath - Workspace path
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Detected task file info
   */
  async detectNewTaskFile(workspacePath, taskId, context = {}) {
    try {
      // Get beforeSnapshot from workflow context (created by file_snapshot_step)
      const beforeSnapshot = this.getBeforeSnapshotFromContext(context);
      
      if (!beforeSnapshot) {
        throw new Error('No beforeSnapshot found in workflow context - file_snapshot_step must run first!');
      }
      
      // Get current snapshot of files
      const currentSnapshot = await this.getFileSnapshot(workspacePath);
      
      // Find NEW files (files that exist now but didn't exist before)
      const newFiles = this.findNewFiles(beforeSnapshot, currentSnapshot);
      
      logger.info(`🔍 Found ${newFiles.length} new files since workflow start`);
      
      // Check each new file to see if it's a task file
      for (const filePath of newFiles) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          
          // Check if file contains task-like content
          if (this.isTaskFile(content)) {
            const stats = await fs.promises.stat(filePath);
            logger.info(`📄 Found new task file: ${path.basename(filePath)}`);
            return {
              path: filePath,
              name: path.basename(filePath),
              size: stats.size,
              modified: stats.mtime,
              type: 'new_file_detection'
            };
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      logger.warn(`⚠️ No new task file detected for task ${taskId}`);
      return null;
      
    } catch (error) {
      logger.error('❌ Error detecting new task file:', error);
      return null;
    }
  }

  /**
   * Get beforeSnapshot from workflow context
   * @param {Object} context - Step context
   * @returns {Set<string>|null} Before snapshot or null
   */
  getBeforeSnapshotFromContext(context) {
    // Look for file_snapshot_step result in previousSteps
    if (context.previousSteps) {
      for (const step of context.previousSteps) {
        if (step.step?.name === 'create-file-snapshot' && step.result?.success) {
          return step.result.data.snapshot;
        }
      }
    }
    
    return null;
  }

  /**
   * Get snapshot of all .md files in workspace
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Set<string>>} Set of file paths
   */
  async getFileSnapshot(workspacePath) {
    const fileSet = new Set();
    
    const searchDirs = [
      workspacePath,
      path.join(workspacePath, 'docs'),
      path.join(workspacePath, 'tasks'),
      path.join(workspacePath, 'docs/09_roadmap')
    ];
    
    for (const searchDir of searchDirs) {
      try {
        const files = await fs.promises.readdir(searchDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        for (const file of mdFiles) {
          const filePath = path.join(searchDir, file);
          fileSet.add(filePath);
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    return fileSet;
  }

  /**
   * Find new files by comparing snapshots
   * @param {Set<string>} beforeSnapshot - Files before workflow
   * @param {Set<string>} currentSnapshot - Files now
   * @returns {Array<string>} Array of new file paths
   */
  findNewFiles(beforeSnapshot, currentSnapshot) {
    const newFiles = [];
    
    for (const filePath of currentSnapshot) {
      if (!beforeSnapshot.has(filePath)) {
        newFiles.push(filePath);
      }
    }
    
    return newFiles;
  }

  /**
   * Check if file content looks like a task file
   * @param {string} content - File content
   * @returns {boolean} True if content looks like a task
   */
  isTaskFile(content) {
    const taskIndicators = [
      '# Task:',
      '## Description',
      '## Instructions',
      '## Steps',
      '## Requirements',
      '## Acceptance Criteria',
      'Task ID:',
      'Priority:',
      'Status:',
      'Type:'
    ];
    
    const lowerContent = content.toLowerCase();
    const matches = taskIndicators.filter(indicator => 
      lowerContent.includes(indicator.toLowerCase())
    );
    
    // Consider it a task file if it has at least 2 task indicators
    return matches.length >= 2;
  }

  /**
   * Create new task from content
   * @param {string} taskId - Task ID
   * @param {string} content - Task content
   * @param {Object} parsedTask - Parsed task data
   * @param {string} contentHash - Content hash
   * @param {string} filePath - File path
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} New task object
   */
  async createNewTaskFromContent(taskId, content, parsedTask, contentHash, filePath, projectId, userId) {
    try {
      const newTask = {
        id: taskId,
        title: parsedTask.title || 'New Task',
        description: parsedTask.description || content,
        content: content,
        contentHash: contentHash,
        filePath: filePath,
        lastSyncedAt: new Date().toISOString(),
        projectId: projectId,
        userId: userId,
        createdBy: userId,
        status: parsedTask.status || 'pending',
        priority: parsedTask.priority || 'medium',
        type: parsedTask.type || 'task',
        category: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          ...parsedTask.metadata,
          content: content,
          htmlContent: content,
          steps: parsedTask.steps || [],
          requirements: parsedTask.requirements || [],
          acceptanceCriteria: parsedTask.acceptanceCriteria || [],
          syncedAt: new Date().toISOString(),
          sourceFile: path.basename(filePath),
          sourcePath: filePath
        }
      };
      
      logger.info(`📝 Created new task object:`, {
        id: newTask.id,
        title: newTask.title,
        filePath: newTask.filePath,
        contentHash: newTask.contentHash
      });
      
      return newTask;
      
    } catch (error) {
      logger.error('❌ Error creating new task from content:', error);
      throw error;
    }
  }

  validateContext(context) {
    if (!context.taskId) {
      throw new Error('Task ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new TaskSyncStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
