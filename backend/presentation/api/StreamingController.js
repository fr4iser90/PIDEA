/**
 * StreamingController
 * 
 * REST API controller for IDE screenshot streaming operations.
 */
const StartStreamingCommand = require('../../application/commands/StartStreamingCommand');
const StopStreamingCommand = require('../../application/commands/StopStreamingCommand');
const StartStreamingHandler = require('../../application/handlers/StartStreamingHandler');
const StopStreamingHandler = require('../../application/handlers/StopStreamingHandler');

class StreamingController {
  constructor(screenshotStreamingService, eventBus = null) {
    this.screenshotStreamingService = screenshotStreamingService;
    this.eventBus = eventBus;
    
    // Initialize handlers
    this.startStreamingHandler = new StartStreamingHandler(screenshotStreamingService, eventBus);
    this.stopStreamingHandler = new StopStreamingHandler(screenshotStreamingService, eventBus);
  }

  /**
   * Start streaming for a specific IDE port
   * POST /api/ide-mirror/:port/stream/start
   */
  async startStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId, fps, quality, format, maxFrameSize, enableRegionDetection } = req.body;
      
      // Validate port parameter
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Generate session ID if not provided
      const finalSessionId = sessionId || `stream-${port}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create command
      const command = new StartStreamingCommand(finalSessionId, port, {
        fps: fps || 10,
        quality: quality || 0.8,
        format: format || 'webp',
        maxFrameSize: maxFrameSize || 50 * 1024,
        enableRegionDetection: enableRegionDetection || false
      });
      
      // Execute command
      const result = await this.startStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          sessionId: finalSessionId,
          port: port,
          result: result.result,
          message: 'Streaming started successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          sessionId: finalSessionId
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error starting streaming:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Stop streaming for a session
   * POST /api/ide-mirror/:port/stream/stop
   */
  async stopStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId } = req.body;
      
      // Validate port parameter
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Validate session ID
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Create command
      const command = new StopStreamingCommand(sessionId);
      
      // Execute command
      const result = await this.stopStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          sessionId: sessionId,
          result: result.result,
          message: 'Streaming stopped successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          sessionId: sessionId
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error stopping streaming:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get streaming session information
   * GET /api/ide-mirror/:port/stream/session/:sessionId
   */
  async getSession(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId } = req.params;
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Get session information
      const session = this.screenshotStreamingService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          sessionId: sessionId
        });
      }
      
      res.status(200).json({
        success: true,
        session: session
      });
      
    } catch (error) {
      console.error('[StreamingController] Error getting session:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get all active streaming sessions
   * GET /api/ide-mirror/stream/sessions
   */
  async getAllSessions(req, res) {
    try {
      const sessions = this.screenshotStreamingService.getAllSessions();
      
      res.status(200).json({
        success: true,
        sessions: sessions,
        count: sessions.length
      });
      
    } catch (error) {
      console.error('[StreamingController] Error getting all sessions:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Update streaming session configuration
   * PUT /api/ide-mirror/:port/stream/session/:sessionId/config
   */
  async updateSessionConfig(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId } = req.params;
      const { fps, quality, format, maxFrameSize, enableRegionDetection } = req.body;
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Update session configuration
      const result = await this.screenshotStreamingService.updateSessionConfig(sessionId, {
        fps,
        quality,
        format,
        maxFrameSize,
        enableRegionDetection
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          sessionId: sessionId,
          config: result.config,
          message: 'Session configuration updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          sessionId: sessionId
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error updating session config:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Pause streaming for a session
   * POST /api/ide-mirror/:port/stream/session/:sessionId/pause
   */
  async pauseStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId } = req.params;
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Pause streaming
      const result = await this.screenshotStreamingService.pauseStreaming(sessionId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          sessionId: sessionId,
          status: result.status,
          message: 'Streaming paused successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          sessionId: sessionId
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error pausing streaming:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Resume streaming for a session
   * POST /api/ide-mirror/:port/stream/session/:sessionId/resume
   */
  async resumeStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { sessionId } = req.params;
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Resume streaming
      const result = await this.screenshotStreamingService.resumeStreaming(sessionId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          sessionId: sessionId,
          status: result.status,
          message: 'Streaming resumed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          sessionId: sessionId
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error resuming streaming:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get streaming service statistics
   * GET /api/ide-mirror/stream/stats
   */
  async getStats(req, res) {
    try {
      const stats = this.screenshotStreamingService.getStats();
      
      res.status(200).json({
        success: true,
        stats: stats
      });
      
    } catch (error) {
      console.error('[StreamingController] Error getting stats:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Stop all streaming sessions
   * POST /api/ide-mirror/stream/stop-all
   */
  async stopAllStreaming(req, res) {
    try {
      const stoppedCount = await this.screenshotStreamingService.stopAllStreaming();
      
      res.status(200).json({
        success: true,
        stoppedCount: stoppedCount,
        message: `Stopped ${stoppedCount} streaming sessions`
      });
      
    } catch (error) {
      console.error('[StreamingController] Error stopping all streaming:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/ide-mirror/stream/health
   */
  async healthCheck(req, res) {
    try {
      const stats = this.screenshotStreamingService.getStats();
      const isHealthy = stats.activeSessions >= 0; // Basic health check
      
      res.status(200).json({
        success: true,
        healthy: isHealthy,
        activeSessions: stats.activeSessions,
        uptime: stats.uptime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[StreamingController] Health check error:', error.message);
      res.status(500).json({
        success: false,
        healthy: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
}

module.exports = StreamingController; 