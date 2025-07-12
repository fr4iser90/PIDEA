/**
 * AutoTestFixHandler - API handler for auto test fix workflow
 * Handles HTTP requests for test fix task generation and processing
 */
const AutoTestFixSystem = require('@/domain/services/auto-test/AutoTestFixSystem');
const TestReportParser = require('@/domain/services/TestReportParser');
const TestFixTaskGenerator = require('@/domain/services/TestFixTaskGenerator');

class AutoTestFixHandler {
  constructor(dependencies = {}) {
    this.taskRepository = dependencies.taskRepository;
    this.cursorIDE = dependencies.cursorIDE;
    this.webSocketManager = dependencies.webSocketManager;
    this.logger = dependencies.logger || console;
    
    // Initialize AutoTestFixSystem
    this.autoTestFixSystem = new AutoTestFixSystem({
      taskRepository: this.taskRepository,
      cursorIDE: this.cursorIDE,
      webSocketManager: this.webSocketManager,
      logger: this.logger
    });
    
    // Initialize other services
    this.testReportParser = new TestReportParser();
    this.testFixTaskGenerator = new TestFixTaskGenerator(this.taskRepository);
  }

  /**
   * Initialize the handler
   */
  async initialize() {
    try {
      await this.autoTestFixSystem.initialize();
      this.logger.info('[AutoTestFixHandler] Initialized successfully');
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Start auto test fix workflow
   * POST /api/auto-test-fix/start
   */
  async startWorkflow(req, res) {
    try {
      const { projectPath, projectId, userId, options = {} } = req.body;
      
      this.logger.info('[AutoTestFixHandler] Starting auto test fix workflow', {
        projectPath,
        projectId,
        userId
      });
      
      // Validate required parameters
      if (!projectPath) {
        return res.status(400).json({
          success: false,
          error: 'projectPath is required'
        });
      }
      
      // Execute workflow
      const result = await this.autoTestFixSystem.executeAutoTestFixWorkflow({
        projectPath,
        projectId: projectId || 'system',
        userId: userId || 'system',
        ...options
      });
      
      res.json({
        success: true,
        result
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Workflow start failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get workflow status
   * GET /api/auto-test-fix/status/:sessionId
   */
  async getWorkflowStatus(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      
      const status = this.autoTestFixSystem.getSessionStatus(sessionId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      res.json({
        success: true,
        status
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Get status failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancel workflow
   * POST /api/auto-test-fix/cancel/:sessionId
   */
  async cancelWorkflow(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      
      const cancelled = this.autoTestFixSystem.cancelSession(sessionId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or already completed'
        });
      }
      
      res.json({
        success: true,
        message: 'Workflow cancelled successfully'
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Cancel workflow failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Parse test output files only
   * POST /api/auto-test-fix/parse
   */
  async parseTestOutputs(req, res) {
    try {
      const { projectPath } = req.body;
      
      if (!projectPath) {
        return res.status(400).json({
          success: false,
          error: 'projectPath is required'
        });
      }
      
      this.logger.info('[AutoTestFixHandler] Parsing test output files', { projectPath });
      
      const parsedData = await this.testReportParser.parseAllTestOutputs(projectPath);
      
      res.json({
        success: true,
        parsedData
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Parse test outputs failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate tasks only (without processing)
   * POST /api/auto-test-fix/generate-tasks
   */
  async generateTasks(req, res) {
    try {
      const { projectPath, projectId, userId, parsedData } = req.body;
      
      if (!projectPath && !parsedData) {
        return res.status(400).json({
          success: false,
          error: 'Either projectPath or parsedData is required'
        });
      }
      
      let dataToUse = parsedData;
      
      // Parse data if projectPath provided
      if (projectPath && !parsedData) {
        this.logger.info('[AutoTestFixHandler] Parsing test output files for task generation', { projectPath });
        dataToUse = await this.testReportParser.parseAllTestOutputs(projectPath);
      }
      
      this.logger.info('[AutoTestFixHandler] Generating tasks from parsed data');
      
      const tasks = await this.testFixTaskGenerator.generateAndSaveTasks(dataToUse, {
        projectId: projectId || 'system',
        userId: userId || 'system'
      });
      
      res.json({
        success: true,
        tasks,
        count: tasks.length,
        parsedData: dataToUse
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Generate tasks failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get system statistics
   * GET /api/auto-test-fix/stats
   */
  async getStats(req, res) {
    try {
      const stats = this.autoTestFixSystem.getStats();
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Get stats failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get active sessions
   * GET /api/auto-test-fix/sessions
   */
  async getActiveSessions(req, res) {
    try {
      const sessions = this.autoTestFixSystem.getActiveSessions();
      
      res.json({
        success: true,
        sessions
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Get active sessions failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Health check
   * GET /api/auto-test-fix/health
   */
  async healthCheck(req, res) {
    try {
      const stats = this.autoTestFixSystem.getStats();
      const isHealthy = stats.totalSessions < stats.maxConcurrentSessions;
      
      res.json({
        success: true,
        healthy: isHealthy,
        stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Health check failed:', error.message);
      res.status(500).json({
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.autoTestFixSystem.cleanup();
      this.logger.info('[AutoTestFixHandler] Cleanup completed');
    } catch (error) {
      this.logger.error('[AutoTestFixHandler] Cleanup failed:', error.message);
    }
  }
}

module.exports = AutoTestFixHandler; 