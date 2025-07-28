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
      
      const mappedTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status?.value || task.status,
        priority: task.priority?.value || task.priority,
        type: task.type?.value || task.type,
        projectId: task.projectId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        metadata: task.metadata
      }));
      
      // ✅ NEW: Debug log to see what's actually being returned
      this.logger.info(`🔍 DEBUG: API Response - ${mappedTasks.length} tasks with statuses:`, 
        mappedTasks.map(t => ({ title: t.title, status: t.status, progress: t.metadata?.progress }))
      );
      
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
        steps: task.steps || [],
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
      if (!title) {
        throw new Error('Task title is required');
      }
      
      // Get project workspace path
      const workspacePath = await this.getProjectWorkspacePath(projectId);
      
      // Create task using domain service
      const task = await this.taskService.createTask({
        title,
        description,
        priority: priority || TaskPriority.MEDIUM,
        type: type || TaskType.GENERAL,
        projectId,
        userId,
        workspacePath,
        metadata: {
          ...metadata,
          createdBy: userId,
          workspacePath
        }
      });
      
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
   * Execute task within project context
   * @param {string} taskId - Task identifier
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTask(taskId, projectId, userId, options = {}) {
    try {
      this.logger.info(`🚀 Executing task: ${taskId} for project: ${projectId}`);
      
      // Validate task belongs to project
      const task = await this.getTask(taskId, projectId);
      
      // Get project workspace path
      const workspacePath = await this.getProjectWorkspacePath(projectId);
      
      // Execute task using domain service with Categories-based system
      const execution = await this.taskService.executeTask(taskId, userId, {
        ...options,
        projectId,
        workspacePath,
        enableCategories: true
      });
      
      this.logger.info(`✅ Task execution completed: ${taskId}`);
      
      return {
        taskId: execution.taskId,
        executionId: execution.executionId,
        status: execution.status,
        progress: execution.progress,
        result: execution.result,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        duration: execution.duration
      };
      
    } catch (error) {
      this.logger.error('❌ Task execution failed:', error);
      throw new Error(`Task execution failed: ${error.message}`);
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