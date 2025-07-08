/**
 * AutoTestFixController - Controller for auto test fix system
 * Handles API endpoints for automated test correction and coverage improvement
 */
const AutoTestFixSystem = require('../../../domain/services/auto-test/AutoTestFixSystem');
const TestCorrectionCommand = require('../../../application/commands/TestCorrectionCommand');

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
      const { options = {} } = req.body;
      const userId = req.user?.id;
      const projectId = req.params.projectId;

      this.logger.info('[AutoTestFixController] Executing auto test fix workflow', {
        userId,
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

      // Execute workflow
      const result = await this.autoTestFixSystem.executeAutoTestFixWorkflow({
        ...options,
        userId,
        projectId,
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      this.logger.info('[AutoTestFixController] Auto test fix workflow completed', {
        sessionId: result.sessionId,
        duration: result.duration
      });

      return res.status(200).json({
        success: true,
        sessionId: result.sessionId,
        result: result,
        duration: result.duration
      });

    } catch (error) {
      this.logger.error('[AutoTestFixController] Auto test fix workflow failed:', error.message);

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

      this.logger.info('[AutoTestFixController] Analyzing project tests', {
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

      this.logger.info('[AutoTestFixController] Project test analysis completed', {
        totalIssues: result.totalIssues,
        hasIssues: result.hasIssues
      });

      return res.status(200).json({
        success: true,
        result: result
      });

    } catch (error) {
      this.logger.error('[AutoTestFixController] Project test analysis failed:', error.message);

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

      this.logger.info('[AutoTestFixController] Getting session status', {
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
      this.logger.error('[AutoTestFixController] Failed to get session status:', error.message);

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

      this.logger.info('[AutoTestFixController] Cancelling session', {
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
      this.logger.error('[AutoTestFixController] Failed to cancel session:', error.message);

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

      this.logger.info('[AutoTestFixController] Getting auto test fix statistics', {
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
      this.logger.error('[AutoTestFixController] Failed to get statistics:', error.message);

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

      this.logger.info('[AutoTestFixController] Getting auto test tasks', {
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
      this.logger.error('[AutoTestFixController] Failed to get auto test tasks:', error.message);

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

      this.logger.info('[AutoTestFixController] Getting auto test task details', {
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
      this.logger.error('[AutoTestFixController] Failed to get auto test task details:', error.message);

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

      this.logger.info('[AutoTestFixController] Retrying auto test task', {
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
      this.logger.error('[AutoTestFixController] Failed to retry auto test task:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AutoTestFixController; 