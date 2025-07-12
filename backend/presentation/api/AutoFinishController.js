const ProcessTodoListCommand = require('@commands/categories/management/ProcessTodoListCommand');

/**
 * AutoFinishController - Controller for auto-finish system API endpoints
 * Handles TODO list processing requests and session management
 */
class AutoFinishController {
  constructor(dependencies = {}) {
    this.commandBus = dependencies.commandBus;
    this.taskSessionRepository = dependencies.taskSessionRepository;
    this.autoFinishSystem = dependencies.autoFinishSystem;
    this.logger = dependencies.logger || console;
  }

  /**
   * Process TODO list
   * POST /api/auto-finish/process
   */
  async processTodoList(req, res) {
    try {
      const { todoInput, options = {} } = req.body;
      const userId = req.user?.id;
      const projectId = req.params.projectId || req.body.projectId;

      this.logger.info('[AutoFinishController] Processing TODO list request', {
        userId,
        projectId,
        todoInputLength: todoInput?.length || 0
      });

      // Validate request
      if (!todoInput || typeof todoInput !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'todoInput is required and must be a string'
        });
      }

      if (todoInput.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'todoInput must be less than 10,000 characters'
        });
      }

      // Create command
      const command = new ProcessTodoListCommand({
        todoInput,
        userId,
        projectId,
        options: {
          ...options,
          requestId: req.id,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        },
        metadata: {
          endpoint: '/api/auto-finish/process',
          method: 'POST',
          timestamp: new Date()
        }
      });

      // Execute command
      const result = await this.commandBus.execute('ProcessTodoListCommand', command);

      this.logger.info('[AutoFinishController] TODO list processing completed', {
        sessionId: result.sessionId,
        duration: result.duration
      });

      return res.status(200).json({
        success: true,
        sessionId: result.sessionId,
        result: result.result,
        duration: result.duration
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] TODO list processing failed:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get session status
   * GET /api/auto-finish/sessions/:sessionId
   */
  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      this.logger.info('[AutoFinishController] Getting session status', { sessionId, userId });

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }

      // Find session
      const session = await this.taskSessionRepository.findById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check authorization
      if (userId && session.userId && session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      return res.status(200).json({
        success: true,
        session: session.getSummary()
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get session status:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user sessions
   * GET /api/auto-finish/sessions
   */
  async getUserSessions(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 20, offset = 0, status } = req.query;

      this.logger.info('[AutoFinishController] Getting user sessions', { userId, limit, offset, status });

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Find user sessions
      const sessions = await this.taskSessionRepository.findByUserId(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      });

      return res.status(200).json({
        success: true,
        sessions: sessions.map(session => session.getSummary()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: sessions.length
        }
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get user sessions:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get project sessions
   * GET /api/projects/:projectId/auto-finish/sessions
   */
  async getProjectSessions(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;
      const { limit = 20, offset = 0, status } = req.query;

      this.logger.info('[AutoFinishController] Getting project sessions', { projectId, userId, limit, offset, status });

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required'
        });
      }

      // Find project sessions
      const sessions = await this.taskSessionRepository.findByProjectId(projectId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      });

      return res.status(200).json({
        success: true,
        sessions: sessions.map(session => session.getSummary()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: sessions.length
        }
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get project sessions:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cancel session
   * POST /api/auto-finish/sessions/:sessionId/cancel
   */
  async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      this.logger.info('[AutoFinishController] Cancelling session', { sessionId, userId });

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }

      // Find session
      const session = await this.taskSessionRepository.findById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check authorization
      if (userId && session.userId && session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if session can be cancelled
      if (!session.isActive()) {
        return res.status(400).json({
          success: false,
          error: 'Session cannot be cancelled (not active)'
        });
      }

      // Cancel session
      session.cancel();
      await this.taskSessionRepository.save(session);

      // Cancel in auto-finish system
      if (this.autoFinishSystem) {
        this.autoFinishSystem.cancelSession(sessionId);
      }

      this.logger.info('[AutoFinishController] Session cancelled successfully', { sessionId });

      return res.status(200).json({
        success: true,
        session: session.getSummary()
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to cancel session:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system statistics
   * GET /api/auto-finish/stats
   */
  async getSystemStats(req, res) {
    try {
      const userId = req.user?.id;

      this.logger.info('[AutoFinishController] Getting system stats', { userId });

      const stats = {
        repository: await this.taskSessionRepository.getStats(),
        autoFinishSystem: this.autoFinishSystem ? this.autoFinishSystem.getStats() : null
      };

      return res.status(200).json({
        success: true,
        stats
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get system stats:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supported patterns
   * GET /api/auto-finish/patterns
   */
  async getSupportedPatterns(req, res) {
    try {
      this.logger.info('[AutoFinishController] Getting supported patterns');

      if (!this.autoFinishSystem) {
        return res.status(503).json({
          success: false,
          error: 'Auto-finish system not available'
        });
      }

      const patterns = this.autoFinishSystem.todoParser.getSupportedPatterns();

      return res.status(200).json({
        success: true,
        patterns
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get supported patterns:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get task type keywords
   * GET /api/auto-finish/task-types
   */
  async getTaskTypeKeywords(req, res) {
    try {
      this.logger.info('[AutoFinishController] Getting task type keywords');

      if (!this.autoFinishSystem) {
        return res.status(503).json({
          success: false,
          error: 'Auto-finish system not available'
        });
      }

      const taskTypes = this.autoFinishSystem.todoParser.getTaskTypeKeywords();

      return res.status(200).json({
        success: true,
        taskTypes
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Failed to get task type keywords:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check
   * GET /api/auto-finish/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
          commandBus: !!this.commandBus,
          taskSessionRepository: !!this.taskSessionRepository,
          autoFinishSystem: !!this.autoFinishSystem
        }
      };

      // Check auto-finish system health
      if (this.autoFinishSystem) {
        try {
          const systemStats = this.autoFinishSystem.getStats();
          health.autoFinishSystem = {
            activeSessions: systemStats.totalSessions,
            maxConcurrentSessions: systemStats.maxConcurrentSessions
          };
        } catch (error) {
          health.status = 'degraded';
          health.autoFinishSystem = { error: error.message };
        }
      }

      return res.status(200).json({
        success: true,
        health
      });

    } catch (error) {
      this.logger.error('[AutoFinishController] Health check failed:', error.message);

      return res.status(503).json({
        success: false,
        health: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Setup routes
   * @param {Express.Router} router - Express router
   */
  setupRoutes(router) {
    // Process TODO list
    router.post('/process', this.processTodoList.bind(this));

    // Session management
    router.get('/sessions', this.getUserSessions.bind(this));
    router.get('/sessions/:sessionId', this.getSessionStatus.bind(this));
    router.post('/sessions/:sessionId/cancel', this.cancelSession.bind(this));

    // System information
    router.get('/stats', this.getSystemStats.bind(this));
    router.get('/patterns', this.getSupportedPatterns.bind(this));
    router.get('/task-types', this.getTaskTypeKeywords.bind(this));
    router.get('/health', this.healthCheck.bind(this));

    this.logger.info('[AutoFinishController] Routes setup completed');
  }
}

module.exports = AutoFinishController; 