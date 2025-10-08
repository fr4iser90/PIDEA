/**
 * TaskApplicationService - Application layer service for task operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate task management use cases
 * ✅ Handle task execution and lifecycle
 * ✅ Manage task data and project relationships
 * ✅ Orchestrate task analysis and validation
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const ETagService = require('@domain/services/shared/ETagService');

class TaskApplicationService {
  constructor({
    taskService,
    taskQueueService,
    taskRepository,
    aiService,
    projectAnalyzer,
    projectMappingService,
    ideManager,
    manualTasksImportService,
    logger
  }) {
    // Domain services
    this.taskService = taskService;
    this.taskQueueService = taskQueueService;
    this.aiService = aiService;
    this.projectAnalyzer = projectAnalyzer;
    this.projectMappingService = projectMappingService;
    this.ideManager = ideManager;
    this.manualTasksImportService = manualTasksImportService;
    
    // Infrastructure repositories (accessed through domain interfaces)
    this.taskRepository = taskRepository;
    
    // Application services
    this.logger = logger || new ServiceLogger('TaskApplicationService');
    this.etagService = new ETagService();
  }

  /**
   * Get project workspace path with fallback detection
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Project workspace path
   */
  async getProjectWorkspacePath(projectId) {
    try {
      // Try to get workspace path from IDE manager
      if (this.ideManager) {
        try {
          const activeIDE = await this.ideManager.getActiveIDE();
          if (activeIDE && activeIDE.port) {
            const workspacePath = await this.ideManager.detectWorkspacePath(activeIDE.port);
            if (workspacePath) {
              this.logger.info(`✅ Using IDE detected workspace path: ${workspacePath}`);
              return workspacePath;
            }
          }
        } catch (error) {
          this.logger.warn('IDE workspace detection failed:', error.message);
        }
      }
      
      // Try project mapping service
      if (this.projectMappingService) {
        try {
          const projectInfo = await this.projectMappingService.getProjectInfo(projectId);
          if (projectInfo && projectInfo.workspacePath) {
            this.logger.info(`✅ Using project mapping workspace path: ${projectInfo.workspacePath}`);
            return projectInfo.workspacePath;
          }
        } catch (error) {
          this.logger.warn('Project mapping failed:', error.message);
        }
      }
      
      // Fallback to current working directory
      const fallbackPath = process.cwd();
      this.logger.warn(`Using fallback workspace path: ${fallbackPath}`);
      return fallbackPath;
      
    } catch (error) {
      this.logger.error('❌ Failed to get project workspace path:', error);
      throw new Error(`Failed to get project workspace path: ${error.message}`);
    }
  }

  /**
   * Get all tasks for a project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of tasks
   */
  async getProjectTasks(projectId, options = {}) {
    try {
      // // // this.logger.info(`Getting tasks for project: ${projectId}`);
      
      const { limit = 50, offset = 0, status, priority, type } = options;
      
      const tasks = await this.taskRepository.findByProjectId(projectId, {
        limit,
        offset,
        status,
        priority,
        type
      });
      
      const mappedTasks = tasks.map(task => {
        // Parse metadata to extract content and details
        let parsedMetadata = {};
        try {
          // Check if metadata is already an object or needs parsing
          if (typeof task.metadata === 'string') {
            parsedMetadata = JSON.parse(task.metadata || '{}');
          } else {
            parsedMetadata = task.metadata || {};
          }
        } catch (error) {
          this.logger.warn('Failed to parse task metadata:', error.message);
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status?.value || task.status,
          priority: task.priority?.value || task.priority,
          type: task.type?.value || task.type,
          projectId: task.projectId,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          metadata: task.metadata,
          // ✅ FIXED: Add content and details for frontend display
          content: parsedMetadata.content || task.description,
          htmlContent: parsedMetadata.htmlContent || parsedMetadata.content || task.description,
          steps: parsedMetadata.steps || [],
          requirements: parsedMetadata.requirements || [],
          acceptanceCriteria: parsedMetadata.acceptanceCriteria || [],
          sourceFile: parsedMetadata.sourceFile,
          sourcePath: parsedMetadata.sourcePath,
          // ✅ FIXED: Use new status-based path for filePath
          filePath: parsedMetadata.newPath || parsedMetadata.sourcePath || `docs/09_roadmap/pending/${task.priority?.value || 'medium'}/${task.category || 'general'}/${task.title?.toLowerCase().replace(/\s+/g, '-')}/`,
          progress: task.progress || 0
        };
      });
      
      
      return mappedTasks;
      
    } catch (error) {
      this.logger.error('❌ Failed to get project tasks:', error);
      throw new Error(`Failed to get project tasks: ${error.message}`);
    }
  }

  /**
   * Get task by ID with project validation
   * @param {string} taskId - Task identifier
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Task data
   */
  async getTask(taskId, projectId) {
    try {
      this.logger.info(`Getting task: ${taskId} for project: ${projectId}`);
      
      const task = await this.taskRepository.findById(taskId);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      if (!task.belongsToProject(projectId)) {
        throw new Error(`Task ${taskId} does not belong to project ${projectId}`);
      }
      
      // Parse metadata to extract content and details
      let parsedMetadata = {};
      try {
        // Check if metadata is already an object or needs parsing
        if (typeof task.metadata === 'string') {
          parsedMetadata = JSON.parse(task.metadata || '{}');
        } else {
          parsedMetadata = task.metadata || {};
        }
      } catch (error) {
        this.logger.warn('Failed to parse task metadata:', error.message);
      }

      const finalFilePath = parsedMetadata.newPath || parsedMetadata.sourcePath || `docs/09_roadmap/pending/${task.priority?.value || 'medium'}/${task.category || 'general'}/${task.title?.toLowerCase().replace(/\s+/g, '-')}/`;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        projectId: task.projectId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        metadata: task.metadata,
        // ✅ FIXED: Add content and details for frontend display
        content: parsedMetadata.content || task.description,
        htmlContent: parsedMetadata.htmlContent || parsedMetadata.content || task.description,
        steps: parsedMetadata.steps || task.steps || [],
        requirements: parsedMetadata.requirements || [],
        acceptanceCriteria: parsedMetadata.acceptanceCriteria || [],
        sourceFile: parsedMetadata.sourceFile,
        sourcePath: parsedMetadata.sourcePath,
        // ✅ FIXED: Use new status-based path for filePath
        filePath: finalFilePath,
        progress: task.progress || 0
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get task:', error);
      throw new Error(`Failed to get task: ${error.message}`);
    }
  }

  /**
   * Create new task for project
   * @param {Object} taskData - Task creation data
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData, projectId, userId) {
    try {
      this.logger.info(`Creating task for project: ${projectId}`);
      
      const { title, description, priority, type, metadata } = taskData;
      
      // Validate required fields
      // In normal mode, title can be empty as AI will generate it
      // In advanced mode, title is required
      const creationMode = metadata?.creationMode || 'normal';
      if (creationMode === 'advanced' && !title) {
        throw new Error('Task title is required for advanced task creation');
      }
      
      // Generate a temporary title if none provided (for normal mode)
      const taskTitle = title || 'New Task';
      
      // Get project workspace path
      const workspacePath = await this.getProjectWorkspacePath(projectId);
      
      // Create task using domain service
      const task = await this.taskService.createTask(
        projectId,
        taskTitle,
        description,
        priority || TaskPriority.MEDIUM,
        type || TaskType.GENERAL,
        null, // category
        {
          ...metadata,
          createdBy: userId,
          workspacePath
        }
      );
      
      this.logger.info(`✅ Task created: ${task.id}`);
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        projectId: task.projectId,
        createdAt: task.createdAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to create task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Queue task for execution within project context using queue system
   * @param {string} taskId - Task identifier
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Queue result (task is queued, not executed immediately)
   */
  async executeTask(taskId, projectId, userId, options = {}) {
    try {
      this.logger.info(`🚀 Queuing task for execution: ${taskId} for project: ${projectId}`);
      
      // Validate task belongs to project
      const task = await this.getTask(taskId, projectId);
      
      // Get projectPath from database using projectId
      const projectPath = await this.getProjectWorkspacePath(projectId);
      this.logger.info(`✅ Resolved projectPath for ${projectId}: ${projectPath}`);
      
      // Queue task for execution using TaskQueueService
      const execution = await this.taskQueueService.enqueue(taskId, userId, {
        ...options,
        projectId,
        projectPath  // ← WICHTIG: projectPath aus DB hinzufügen
      });
      
      this.logger.info(`✅ Task queued successfully: ${taskId}`);
      
      return {
        taskId: execution.taskId,
        queueItemId: execution.queueItemId,
        status: execution.status,
        position: execution.position,
        estimatedStartTime: execution.estimatedStartTime,
        message: execution.message,
        queuedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ Task queueing failed:', error);
      throw new Error(`Task queueing failed: ${error.message}`);
    }
  }

  /**
   * Update task data
   * @param {string} taskId - Task identifier
   * @param {string} projectId - Project identifier
   * @param {Object} updateData - Task update data
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, projectId, updateData, userId) {
    try {
      this.logger.info(`Updating task: ${taskId}`);
      
      // Validate task belongs to project
      await this.getTask(taskId, projectId);
      
      // Update task
      const updatedTask = await this.taskRepository.update(taskId, {
        ...updateData,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
      
      this.logger.info(`✅ Task updated: ${taskId}`);
      
      return {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        type: updatedTask.type,
        updatedAt: updatedTask.updatedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to update task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete task with project validation
   * @param {string} taskId - Task identifier
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteTask(taskId, projectId, userId) {
    try {
      this.logger.info(`Deleting task: ${taskId}`);
      
      // Validate task belongs to project
      await this.getTask(taskId, projectId);
      
      // Delete task
      await this.taskRepository.delete(taskId);
      
      this.logger.info(`✅ Task deleted: ${taskId}`);
      
      return true;
      
    } catch (error) {
      this.logger.error('❌ Failed to delete task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Sync manual tasks using workspace
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Sync result
   */
  async syncManualTasks(projectId, userId) {
    try {
      this.logger.info(`🔄 Syncing manual tasks for project: ${projectId}`);
      
      if (!this.manualTasksImportService) {
        throw new Error('ManualTasksImportService not available');
      }
      
      // Get workspace path
      const workspacePath = await this.getProjectWorkspacePath(projectId);
      
      // Use ManualTasksImportService for workspace import
      const result = await this.manualTasksImportService.importManualTasksFromWorkspace(projectId, workspacePath);
      
      this.logger.info(`✅ Manual tasks import completed:`, {
        importedCount: result.importedCount,
        totalFiles: result.totalFiles,
        workspacePath: result.workspacePath
      });
      
      return {
        success: true,
        importedCount: result.importedCount,
        totalFiles: result.totalFiles,
        workspacePath: result.workspacePath,
        projectId
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to sync manual tasks:', error);
      throw new Error(`Failed to sync manual tasks: ${error.message}`);
    }
  }

  /**
   * Clean manual tasks from database
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanManualTasks(projectId, userId) {
    try {
      this.logger.info(`🧹 Cleaning manual tasks for project: ${projectId}`);
      
      if (!this.taskRepository) {
        throw new Error('TaskRepository not available');
      }
      
      // Get all manual tasks for the project
      const manualTasks = await this.taskRepository.findByProject(projectId, {
        type: 'documentation'
      });
      
      this.logger.info(`Found ${manualTasks.length} manual tasks to clean`);
      
      // Delete all manual tasks
      let deletedCount = 0;
      for (const task of manualTasks) {
        await this.taskRepository.delete(task.id);
        deletedCount++;
      }
      
      this.logger.info(`✅ Cleaned ${deletedCount} manual tasks from project: ${projectId}`);
      
      return {
        success: true,
        deletedCount,
        projectId,
        message: `Successfully cleaned ${deletedCount} manual tasks`
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to clean manual tasks:', error);
      throw new Error(`Failed to clean manual tasks: ${error.message}`);
    }
  }

  /**
   * Analyze project for task suggestions
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result with task suggestions
   */
  async analyzeProjectForTasks(projectId, options = {}) {
    try {
      this.logger.info(`Analyzing project for task suggestions: ${projectId}`);
      
      if (!this.projectAnalyzer) {
        throw new Error('ProjectAnalyzer not available');
      }
      
      // Get workspace path
      const workspacePath = await this.getProjectWorkspacePath(projectId);
      
      // Perform project analysis
      const analysis = await this.projectAnalyzer.analyzeProject(workspacePath, {
        ...options,
        projectId,
        includeRecommendations: true
      });
      
      return {
        projectId,
        workspacePath,
        analysis: analysis.summary,
        recommendations: analysis.recommendations || [],
        issues: analysis.issues || [],
        recommendations: analysis.recommendations || []
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to analyze project for tasks:', error);
      throw new Error(`Failed to analyze project for tasks: ${error.message}`);
    }
  }

  /**
   * Generate ETag for task data caching
   * @param {Object} data - Data to generate ETag for
   * @returns {string} ETag value
   */
  generateETag(data) {
    return this.etagService.generate(data);
  }

  /**
   * Validate ETag for conditional requests
   * @param {string} etag - ETag from request
   * @param {Object} data - Current data
   * @returns {boolean} Whether ETag matches
   */
  validateETag(etag, data) {
    return this.etagService.validate(etag, data);
  }
}

module.exports = TaskApplicationService; 