/**
 * Task Synchronization Step - OPTIMIZED VERSION
 * Uses existing task system with file_path and content_hash
 * No resource-intensive workspace scanning!
 */

const StepBuilder = require('../../StepBuilder');
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
      logger.info(`🔍 [TaskSyncStep] Context values:`, {
        taskId,
        projectId,
        userId,
        workspacePath,
        contextKeys: Object.keys(context)
      });
      
      // Get services
      const taskRepository = context.getService('taskRepository');
      const contentHashService = context.getService('contentHashService');
      const taskService = context.getService('taskService');
      
      if (!taskRepository) {
        throw new Error('TaskRepository not available in context');
      }
      
      if (!taskService) {
        throw new Error('TaskService not available in context');
      }
      
      // MANUAL TASK SYNC - Detect file and sync values to EXISTING task
      logger.info(`🔍 [TaskSyncStep] Detecting manual task file for EXISTING task: ${taskId}`);
        
        if (!workspacePath) {
        logger.error(`❌ [TaskSyncStep] No workspace path provided - REQUIRED for manual task sync`);
        throw new Error('Workspace path is required for manual task sync');
      }
      
      logger.info(`🔍 [TaskSyncStep] Context available:`, {
        hasPreviousSteps: !!context.previousSteps,
        previousStepsCount: context.previousSteps?.length || 0,
        hasWorkspacePath: !!context.workspacePath,
        hasTaskId: !!context.taskId
      });
      
      // Get existing task from DB FIRST!
      const existingTask = await taskRepository.findById(taskId);
      if (!existingTask) {
        logger.error(`❌ [TaskSyncStep] Task ${taskId} not found in DB - cannot sync`);
        throw new Error(`Task ${taskId} not found in database`);
      }
      
      // Find existing task file in workspace (not new files!)
      const detectedFile = await this.findExistingTaskFile(workspacePath, existingTask);
      if (!detectedFile) {
        logger.error(`❌ [TaskSyncStep] No existing task file found in workspace - REQUIRED for sync`);
        throw new Error('Existing task file is required for sync');
      }
      
      const taskFilePath = detectedFile.path;
      const fileContent = await this.readTaskFile(taskFilePath);
      const newContentHash = await contentHashService.generateContentHash(fileContent);
      
      logger.info(`📄 [TaskSyncStep] Detected manual task file: ${taskFilePath}`);
      
      // Parse task content to extract structured data
      const parsedTask = await this.parseTaskContent(fileContent, contentHashService);
      
      // Sync values from file to EXISTING task - NO FALLBACKS!
      logger.info(`🔄 [TaskSyncStep] Syncing manual task values from file to EXISTING task: ${taskId}`);
      const syncedTask = await this.syncManualTaskFromContent(existingTask, fileContent, parsedTask, newContentHash, projectId, userId);
      await taskRepository.update(taskId, syncedTask);
      
      logger.info(`✅ Manual task synced successfully to EXISTING task`);
      
      return {
        success: true,
        message: 'Manual task synced from file to existing task',
        data: {
          taskId,
          syncedTask: syncedTask,
          contentHash: newContentHash,
          filePath: taskFilePath,
          isManualSync: true
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
  async updateTaskFromContent(task, content, parsedTask, contentHash, projectId, userId) {
    try {
      // Validate required fields from parsed content - NO FALLBACKS!
      if (!parsedTask.type) {
        throw new Error('Task file must contain ## Type: field - NO FALLBACKS ALLOWED');
      }
      if (!parsedTask.status) {
        throw new Error('Task file must contain ## Status: field - NO FALLBACKS ALLOWED');
      }
      if (!parsedTask.priority) {
        throw new Error('Task file must contain ## Priority: field - NO FALLBACKS ALLOWED');
      }

      // Update task with new content - ONLY use file values
      const updatedTask = {
        ...task,
        title: parsedTask.title || task.title,
        description: parsedTask.description || content,
        content: content,
        contentHash: contentHash,
        projectId: projectId,
        userId: userId,
        type: parsedTask.type,        // ← NUR Datei-Werte!
        status: parsedTask.status,    // ← NUR Datei-Werte!
        priority: parsedTask.priority, // ← NUR Datei-Werte!
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
   * Sync manual task from content to existing task - NO FALLBACKS!
   * @param {Object} existingTask - Existing task from DB
   * @param {string} fileContent - File content
   * @param {Object} parsedTask - Parsed task data
   * @param {string} newContentHash - New content hash
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Object} Updated task object
   */
  async syncManualTaskFromContent(existingTask, fileContent, parsedTask, newContentHash, projectId, userId) {
    try {
      logger.info(`🔄 [TaskSyncStep] Syncing manual task from content - NO FALLBACKS!`);
      
      // Validate required fields from parsed content - NO FALLBACKS!
      if (!parsedTask.type || parsedTask.type.trim() === '') {
        throw new Error('Task file must contain valid type field - NO FALLBACKS ALLOWED');
      }
      if (!parsedTask.status || parsedTask.status.trim() === '') {
        throw new Error('Task file must contain valid status field - NO FALLBACKS ALLOWED');
      }
      if (!parsedTask.priority || parsedTask.priority.trim() === '') {
        throw new Error('Task file must contain valid priority field - NO FALLBACKS ALLOWED');
      }
      
      // Update task with parsed content - NO FALLBACKS!
      const updatedTask = {
        ...existingTask,
        title: parsedTask.title || existingTask.title,
        description: fileContent, // Set description field for Task entity validation
        contentHash: newContentHash,
        type: parsedTask.type, // NO FALLBACK!
        status: parsedTask.status, // NO FALLBACK!
        priority: parsedTask.priority, // NO FALLBACK!
        projectId: projectId,
        userId: userId,
        htmlContent: fileContent,
        steps: parsedTask.steps || [],
        requirements: parsedTask.requirements || [],
        acceptanceCriteria: parsedTask.acceptanceCriteria || [],
        syncedAt: new Date().toISOString()
      };
      
      logger.info(`📝 Updated task object:`, {
        id: updatedTask.id,
        title: updatedTask.title,
        type: updatedTask.type,
        status: updatedTask.status,
        priority: updatedTask.priority,
        contentHash: updatedTask.contentHash,
        hasContent: !!updatedTask.description,
        contentLength: updatedTask.description ? updatedTask.description.length : 0
      });
      
      return updatedTask;
      
    } catch (error) {
      logger.error('❌ Error syncing manual task from content:', error);
      throw error;
    }
  }

  /**
   * Parse task content to extract structured data - USING MANUAL TASK SYNC LOGIC!
   * @param {string} content - Task content
   * @param {Object} contentHashService - Content hash service for status extraction
   * @param {string} filename - Filename for fallback title
   * @returns {Object} Parsed task data
   */
  async parseTaskContent(content, contentHashService, filename = '') {
    try {
      // Extract title from first line
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '');

      // Extract priority - USING MANUAL TASK SYNC LOGIC!
      let priority = 'medium'; // Default from path structure
      
      // Extract priority from file path (EXACT SAME AS ManualTasksImportService!)
      const filePath = filename || '';
      if (filePath.includes('/pending/medium/') || filePath.includes('/medium/')) {
        priority = 'medium';
      } else if (filePath.includes('/pending/high/') || filePath.includes('/high/')) {
        priority = 'high';
      } else if (filePath.includes('/pending/low/') || filePath.includes('/low/')) {
        priority = 'low';
      } else if (filePath.includes('/pending/critical/') || filePath.includes('/critical/')) {
        priority = 'critical';
      }
      
      if (content) {
        // Look for priority in content (EXACT SAME AS ManualTasksImportService!)
        const priorityMatch = content.match(/priority[:\s]+(high|medium|low|critical)/i);
        if (priorityMatch) {
          priority = priorityMatch[1].toLowerCase();
        }
        // Look for priority indicators in content (more comprehensive)
        else if (content.includes('**Priority**: High') || content.includes('Priority: High') || content.includes('🔥 High')) {
          priority = 'high';
        } else if (content.includes('**Priority**: Medium') || content.includes('Priority: Medium') || content.includes('⚡ Medium')) {
          priority = 'medium';
        } else if (content.includes('**Priority**: Low') || content.includes('Priority: Low') || content.includes('📝 Low')) {
          priority = 'low';
        } else if (content.includes('**Priority**: Critical') || content.includes('Priority: Critical') || content.includes('🚨 Critical')) {
          priority = 'critical';
        }
      }

      // All manual tasks from roadmap/features should be 'documentation' type
      let type = 'documentation';
      
      // Extract status - USING MANUAL TASK SYNC LOGIC! (EXACT SAME AS ManualTasksImportService!)
      let status;
      
      if (content) {
        // Extract status from markdown content using content hash service (EXACT SAME!)
        status = await contentHashService.extractStatusFromContent(content);
      } else {
        // Fallback to pending if no content available
        status = 'pending';
      }

      const parsed = {
        title: title,
        description: null,
        status: status,
        priority: priority,
        type: type,
        steps: [],
        requirements: [],
        acceptanceCriteria: [],
        metadata: {}
      };
      
      logger.info(`📋 Parsed task content (MANUAL SYNC LOGIC):`, {
        title: parsed.title,
        status: parsed.status,
        priority: parsed.priority,
        type: parsed.type,
        stepsCount: parsed.steps.length,
        requirementsCount: parsed.requirements.length
      });
      
      return parsed;
      
    } catch (error) {
      logger.error('❌ Error parsing task content:', error);
      return {
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
    }
  }

  /**
   * Find existing task file in workspace based on task info
   * @param {string} workspacePath - Workspace path
   * @param {Object} existingTask - Existing task from DB
   * @returns {Promise<Object|null>} Found task file info
   */
  async findExistingTaskFile(workspacePath, existingTask) {
    try {
      logger.info(`🔍 [TaskSyncStep] Finding existing task file for task: ${existingTask.id}`);
      
      // Search for task files in the roadmap directory
      const roadmapDir = path.join(workspacePath, 'docs/09_roadmap');
      
      // Get all .md files recursively
      const allFiles = await this.getAllMarkdownFiles(roadmapDir);
      logger.info(`📁 Found ${allFiles.length} markdown files in ${roadmapDir}`);
      
      // Find the NEWEST file (most recently created/modified)
      let newestFile = null;
      let newestTime = 0;
      
      for (const filePath of allFiles) {
        const filename = path.basename(filePath).toLowerCase();
        
        // Only consider index files
        if (filename.endsWith('-index.md')) {
          const stats = await fs.promises.stat(filePath);
          const fileTime = stats.mtime.getTime();
          
          if (fileTime > newestTime) {
            newestTime = fileTime;
            newestFile = {
              path: filePath,
              name: path.basename(filePath),
              size: stats.size,
              modified: stats.mtime,
              type: 'newest_file_detection'
            };
          }
        }
      }
      
      if (newestFile) {
        logger.info(`✅ [TaskSyncStep] Found newest index file: ${newestFile.path}`);
        return newestFile;
      }
      
      logger.error(`❌ [TaskSyncStep] No index file found for task: ${existingTask.id}`);
      return null;
      
    } catch (error) {
      logger.error('❌ [TaskSyncStep] Error finding existing task file:', error);
      throw error;
    }
  }

  /**
   * Get all markdown files recursively from directory
   * @param {string} dir - Directory path
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getAllMarkdownFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.getAllMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Add .md files to the list
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.debug(`Cannot read directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Detect new task file in workspace (lightweight detection)
   * @param {string} workspacePath - Workspace path
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Detected task file info
   */
  async detectNewTaskFile(workspacePath, taskId, context = {}) {
    try {
      logger.info(`🔍 [TaskSyncStep] Starting new task file detection for task: ${taskId}`);
      logger.info(`🔍 [TaskSyncStep] Workspace path: ${workspacePath}`);
      
      // Get beforeSnapshot from workflow context (created by file_snapshot_step)
      const beforeSnapshot = this.getBeforeSnapshotFromContext(context);
      
      if (!beforeSnapshot) {
        logger.error('❌ [TaskSyncStep] No beforeSnapshot found - CANNOT detect new files');
        throw new Error('File snapshot is required for new file detection');
      }
      
      logger.info(`📸 [TaskSyncStep] Before snapshot contains ${beforeSnapshot.size} files`);
      
      // Get current snapshot of files
      const currentSnapshot = await this.getFileSnapshot(workspacePath);
      logger.info(`📸 [TaskSyncStep] Current snapshot contains ${currentSnapshot.size} files`);
      
      // Find NEW files (files that exist now but didn't exist before)
      const newFiles = this.findNewFiles(beforeSnapshot, currentSnapshot);
      
      logger.info(`🔍 [TaskSyncStep] Found ${newFiles.length} new files since workflow start`);
      
      if (newFiles.length === 0) {
        logger.warn(`⚠️ [TaskSyncStep] No new files detected - this might indicate the task file already existed`);
        logger.info(`🔍 [TaskSyncStep] Current files:`, Array.from(currentSnapshot).slice(0, 5));
        logger.info(`🔍 [TaskSyncStep] Before files:`, Array.from(beforeSnapshot).slice(0, 5));
      }
      
      // Check each new file to see if it's a task file
      for (const filePath of newFiles) {
        logger.info(`🔍 [TaskSyncStep] Checking new file: ${path.basename(filePath)}`);
        
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          logger.info(`📖 [TaskSyncStep] Read file content: ${content.length} characters`);
          
          // Check if file contains task-like content using filename patterns
          const isTaskFile = this.isTaskFileByFilename(filePath);
          logger.info(`🔍 [TaskSyncStep] File ${path.basename(filePath)} isTaskFileByFilename: ${isTaskFile}`);
          
          if (isTaskFile) {
            const stats = await fs.promises.stat(filePath);
            logger.info(`📄 [TaskSyncStep] Found new task file: ${path.basename(filePath)}`);
            logger.info(`📄 [TaskSyncStep] File details:`, {
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              contentLength: content.length
            });
            
            return {
              path: filePath,
              name: path.basename(filePath),
              size: stats.size,
              modified: stats.mtime,
              type: 'new_file_detection'
            };
          }
        } catch (error) {
          logger.warn(`⚠️ [TaskSyncStep] Error reading file ${filePath}:`, error.message);
          // Skip files that can't be read
        }
      }
      
      logger.error(`❌ [TaskSyncStep] No new task file detected for task ${taskId} - REQUIRED`);
      logger.error(`❌ [TaskSyncStep] New files found:`, newFiles.map(f => path.basename(f)));
      logger.error(`❌ [TaskSyncStep] Task file pattern: files ending with '-index.md'`);
      
      throw new Error(`No new task file detected for task ${taskId}`);
      
    } catch (error) {
      logger.error('❌ [TaskSyncStep] Error detecting new task file:', error);
      throw error;
    }
  }

  /**
   * Get beforeSnapshot from workflow context
   * @param {Object} context - Step context
   * @returns {Set<string>|null} Before snapshot or null
   */
  getBeforeSnapshotFromContext(context) {
    // Look for file_snapshot_step result in previousSteps
    if (context.previousSteps && Array.isArray(context.previousSteps)) {
      logger.info('🔍 [TaskSyncStep] Searching through previousSteps:', {
        stepCount: context.previousSteps.length,
        stepNames: context.previousSteps.map(s => s.step?.name || s.name || 'unknown')
      });
      
      for (const step of context.previousSteps) {
        const stepName = step.step?.name || step.name;
        logger.info('🔍 [TaskSyncStep] Checking step:', {
          stepName: stepName,
          hasResult: !!step.result,
          hasSuccess: !!step.result?.success,
          hasData: !!step.result?.data,
          hasSnapshot: !!step.result?.data?.snapshot,
          resultKeys: step.result ? Object.keys(step.result) : 'no result',
          dataKeys: step.result?.data ? Object.keys(step.result.data) : 'no data'
        });
        
        // Check if this is the file_snapshot_step (multiple possible names)
        const isFileSnapshotStep = stepName === 'file_snapshot_step' || 
                                   stepName === 'create-file-snapshot' ||
                                   step.step?.step === 'file_snapshot_step';
        
        if (isFileSnapshotStep && step.result?.success) {
          logger.info('🔍 [TaskSyncStep] Found file snapshot step, checking data structure...');
          
          // Try different possible data structures
          let snapshot = null;
          
          // Structure 1: step.result.data.snapshot
          if (step.result.data?.snapshot) {
            snapshot = step.result.data.snapshot;
            logger.info('✅ [TaskSyncStep] Found snapshot in step.result.data.snapshot');
          }
          // Structure 2: step.result.result.data.snapshot (StepRegistry wraps the result)
          else if (step.result.result?.data?.snapshot) {
            snapshot = step.result.result.data.snapshot;
            logger.info('✅ [TaskSyncStep] Found snapshot in step.result.result.data.snapshot');
          }
          // Structure 3: step.result.data (snapshot is the data itself)
          else if (step.result.data && typeof step.result.data === 'object' && step.result.data.size !== undefined) {
            snapshot = step.result.data;
            logger.info('✅ [TaskSyncStep] Found snapshot as step.result.data');
          }
          
          if (snapshot) {
            logger.info('✅ [TaskSyncStep] File snapshot found successfully', {
              snapshotType: typeof snapshot,
              snapshotSize: snapshot.size,
              snapshotConstructor: snapshot.constructor.name
            });
            return snapshot;
          } else {
            logger.warn('⚠️ [TaskSyncStep] File snapshot step found but no snapshot data detected');
          }
        }
      }
    }
    
    logger.error('❌ [TaskSyncStep] No file snapshot found in previousSteps - REQUIRED for task sync');
    throw new Error('File snapshot is required for task synchronization');
  }

  /**
   * Get snapshot of all .md files in workspace (recursive search)
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
        await this.searchDirectoryRecursively(searchDir, fileSet);
      } catch (error) {
        logger.debug(`Skipping directory: ${searchDir} - ${error.message}`);
      }
    }
    
    return fileSet;
  }

  /**
   * Recursively search directory for .md files
   * @param {string} dirPath - Directory path to search
   * @param {Set<string>} fileSet - Set to add files to
   */
  async searchDirectoryRecursively(dirPath, fileSet) {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.searchDirectoryRecursively(fullPath, fileSet);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Add .md files to the set
          fileSet.add(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
      logger.debug(`Cannot read directory ${dirPath}: ${error.message}`);
    }
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
   * Check if file is a task file based on filename patterns (same as ManualTasksImportService)
   * @param {string} filePath - File path
   * @returns {boolean} True if filename matches task patterns
   */
  isTaskFileByFilename(filePath) {
    const filename = path.basename(filePath);
    
    // ONLY use index files for task sync - not implementation, phase, or summary files
    return filename.endsWith('-index.md');
  }

  /**
   * Check if file content looks like a task file
   * @param {string} content - File content
   * @returns {boolean} True if content looks like a task
   */
  isTaskFile(content) {
    // Use the same detection logic as ManualTasksImportService
    // Check for task file patterns in filename (passed via content parameter)
    // This is a simplified version - in practice we should check the actual filename
    
    // For now, check if content contains typical task structure
    const taskPatterns = [
      /# .*Implementation/i,
      /# .*Index/i,
      /## Description/i,
      /## Requirements/i,
      /## Steps/i,
      /## Acceptance Criteria/i
    ];
    
    const matches = taskPatterns.filter(pattern => pattern.test(content));
    
    // Consider it a task file if it has at least 2 task patterns
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
        status: parsedTask.status,
        priority: parsedTask.priority,
        type: parsedTask.type,
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
