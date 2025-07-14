/**
 * AutoTestFixController - Controller for auto test fix system
 * Handles API endpoints for automated test correction and coverage improvement
 */
const AutoTestFixSystem = require('@services/auto-test/AutoTestFixSystem');
const TestCorrectionCommand = require('@commands/categories/management/TestCorrectionCommand');
const fs = require('fs'); // Added for fs.existsSync
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class AutoTestFixController {
  constructor(dependencies = {}) {
    this.autoTestFixSystem = dependencies.autoTestFixSystem;
    this.commandBus = dependencies.commandBus;
    this.taskService = dependencies.taskService;
    this.taskRepository = dependencies.taskRepository;
    this.aiService = dependencies.aiService;
    this.projectAnalyzer = dependencies.projectAnalyzer;
    this.cursorIDEService = dependencies.cursorIDEService;
    this.ideManager = dependencies.ideManager;
    this.webSocketManager = dependencies.webSocketManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute auto test fix workflow
   * POST /api/projects/:projectId/auto/tests/fix
   */
  async executeAutoTestFix(req, res) {
    try {
      const projectId = req.params.projectId;
      const userId = req.user?.id;
      const {
        projectPath,
        clearExisting = false,
        stopOnError = false,
        loadExistingTasks = false, // New option to load existing tasks
        taskStatus = null, // Optional status filter for existing tasks
        ...otherOptions
      } = req.body;

      this.logger.info('Executing auto test fix', {
        projectId,
        userId,
        projectPath,
        clearExisting,
        stopOnError,
        loadExistingTasks,
        taskStatus
      });

      // Validate project path
      const validatedProjectPath = projectPath || process.cwd();
      
      if (!fs.existsSync(validatedProjectPath)) {
        return res.status(400).json({
          success: false,
          error: `Project path does not exist: ${validatedProjectPath}`
        });
      }

      // Execute workflow
      const result = await this.autoTestFixSystem.executeAutoTestFixWorkflow({
        projectPath: validatedProjectPath,
        projectId,
        userId,
        clearExisting,
        stopOnError,
        loadExistingTasks, // Pass the new option
        taskStatus, // Pass the status filter
        ...otherOptions
      });

      return res.status(200).json({
        success: true,
        data: {
          sessionId: result.sessionId,
          message: loadExistingTasks ? 'Processing existing tasks' : 'Generated and processing new tasks',
          result: result
        }
      });

    } catch (error) {
      this.logger.error('Auto test fix execution failed:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Analyze project tests
   * POST /api/projects/:projectId/auto/tests/analyze
   */
  async analyzeProjectTests(req, res) {
    try {
      const { options = {} } = req.body;
      const projectId = req.params.projectId;

      this.logger.info('Analyzing project tests', {
        projectId,
        options
      });

      // Validate request
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required'
        });
      }

      // Analyze project tests
      const result = await this.autoTestFixSystem.analyzeProjectTests(
        options.projectPath || process.cwd()
      );

      this.logger.info('Project test analysis completed', {
        totalIssues: result.totalIssues,
        hasIssues: result.hasIssues
      });

      return res.status(200).json({
        success: true,
        result: result
      });

    } catch (error) {
      this.logger.error('Project test analysis failed:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get session status
   * GET /api/projects/:projectId/auto/tests/status/:sessionId
   */
  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const projectId = req.params.projectId;

      this.logger.info('Getting session status', {
        sessionId,
        projectId
      });

      // Get session status
      const status = this.autoTestFixSystem.getSessionStatus(sessionId);

      return res.status(200).json({
        success: true,
        status: status
      });

    } catch (error) {
      this.logger.error('Failed to get session status:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cancel session
   * POST /api/projects/:projectId/auto/tests/cancel/:sessionId
   */
  async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;
      const projectId = req.params.projectId;

      this.logger.info('Cancelling session', {
        sessionId,
        projectId
      });

      // Cancel session
      const success = this.autoTestFixSystem.cancelSession(sessionId);

      return res.status(200).json({
        success: true,
        cancelled: success,
        sessionId: sessionId
      });

    } catch (error) {
      this.logger.error('Failed to cancel session:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get auto test fix statistics
   * GET /api/projects/:projectId/auto/tests/stats
   */
  async getStats(req, res) {
    try {
      const projectId = req.params.projectId;

      this.logger.info('Getting auto test fix statistics', {
        projectId
      });

      // Get statistics from active sessions
      const activeSessions = Array.from(this.autoTestFixSystem.activeSessions.values());
      
      // Get task statistics from database
      const projectTasks = await this.taskRepository.findByProject(projectId, {
        type: 'testing'
      });

      const completedTasks = projectTasks.filter(task => task.status?.value === 'completed');
      const failedTasks = projectTasks.filter(task => task.status?.value === 'failed');
      const pendingTasks = projectTasks.filter(task => task.status?.value === 'pending');

      const stats = {
        activeSessions: activeSessions.length,
        maxConcurrentSessions: this.autoTestFixSystem.maxConcurrentSessions,
        sessionTimeout: this.autoTestFixSystem.sessionTimeout,
        config: this.autoTestFixSystem.config,
        tasks: {
          total: projectTasks.length,
          completed: completedTasks.length,
          failed: failedTasks.length,
          pending: pendingTasks.length
        },
        timestamp: new Date()
      };

      return res.status(200).json({
        success: true,
        stats: stats
      });

    } catch (error) {
      this.logger.error('Failed to get statistics:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get auto test fix tasks for project
   * GET /api/projects/:projectId/auto/tests/tasks
   */
  async getAutoTestTasks(req, res) {
    try {
      const projectId = req.params.projectId;
      const { status, limit = 50, offset = 0 } = req.query;

      this.logger.info('Getting auto test tasks', {
        projectId,
        status,
        limit,
        offset
      });

      // Get tasks from database with filtering
      const tasks = await this.taskRepository.findByProject(projectId, {
        type: 'testing',
        status: status
      });

      // Apply pagination
      const paginatedTasks = tasks.slice(offset, offset + limit);

      return res.status(200).json({
        success: true,
        data: {
          tasks: paginatedTasks,
          pagination: {
            total: tasks.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: offset + limit < tasks.length
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get auto test tasks:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get auto test fix task details
   * GET /api/projects/:projectId/auto/tests/tasks/:taskId
   */
  async getAutoTestTaskDetails(req, res) {
    try {
      const { projectId, taskId } = req.params;

      this.logger.info('Getting auto test task details', {
        projectId,
        taskId
      });

      // Get task from database
      const task = await this.taskRepository.findById(taskId);
      
      if (!task || !task.belongsToProject(projectId)) {
        return res.status(404).json({
          success: false,
          error: 'Auto test task not found'
        });
      }

      // Get execution history if available
      const executionHistory = task.executionHistory || [];

      return res.status(200).json({
        success: true,
        data: {
          task: task,
          executionHistory: executionHistory
        }
      });

    } catch (error) {
      this.logger.error('Failed to get auto test task details:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Retry failed auto test task
   * POST /api/projects/:projectId/auto/tests/tasks/:taskId/retry
   */
  async retryAutoTestTask(req, res) {
    try {
      const { projectId, taskId } = req.params;
      const userId = req.user?.id;

      this.logger.info('Retrying auto test task', {
        projectId,
        taskId,
        userId
      });

      // Get task from database
      const task = await this.taskRepository.findById(taskId);
      
      if (!task || !task.belongsToProject(projectId)) {
        return res.status(404).json({
          success: false,
          error: 'Auto test task not found'
        });
      }

      // Reset task status and retry
      task.updateStatus('pending');
      task.clearExecutionHistory();
      await this.taskRepository.save(task);

      // Execute task again
      const execution = await this.taskService.executeTask(taskId, userId);

      return res.status(200).json({
        success: true,
        data: {
          task: task,
          execution: execution,
          message: 'Auto test task retry initiated'
        }
      });

    } catch (error) {
      this.logger.error('Failed to retry auto test task:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Load existing tasks without processing
   * GET /api/projects/:projectId/auto/tests/load-tasks
   */
  async loadExistingTasks(req, res) {
    try {
      const projectId = req.params.projectId;
      const userId = req.user?.id;
      const { status } = req.query;

      this.logger.info('Loading existing tasks', {
        projectId,
        userId,
        status
      });

      // Load existing tasks
      const tasks = await this.autoTestFixSystem.loadExistingTasks({
        projectId,
        userId,
        status: status || null
      });

      return res.status(200).json({
        success: true,
        data: {
          tasks: tasks,
          count: tasks.length,
          message: `Loaded ${tasks.length} existing tasks from database`
        }
      });

    } catch (error) {
      this.logger.error('Failed to load existing tasks:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AutoTestFixController; 