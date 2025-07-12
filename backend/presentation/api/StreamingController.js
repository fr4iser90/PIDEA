/**
 * StreamingController
 * 
 * REST API controller for IDE screenshot streaming operations.
 * Updated to use port-based architecture instead of session-based.
 */
const PortStreamingCommand = require('@commands/categories/management/PortStreamingCommand');
const PortStreamingHandler = require('@handlers/categories/management/PortStreamingHandler');

class StreamingController {
  constructor(screenshotStreamingService, eventBus = null) {
    this.screenshotStreamingService = screenshotStreamingService;
    this.eventBus = eventBus;
    
    // Initialize port-based handler
    this.portStreamingHandler = new PortStreamingHandler(screenshotStreamingService, eventBus);
  }

  /**
   * Start streaming for a specific IDE port
   * POST /api/ide-mirror/:port/stream/start
   */
  async startStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { fps, quality, format, maxFrameSize, enableRegionDetection } = req.body;
      
      // Validate port parameter
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Create port-based command
      const command = PortStreamingCommand.createStartCommand(port, {
        fps: fps || 10,
        quality: quality || 0.8,
        format: format || 'jpeg',
        maxFrameSize: maxFrameSize || 50 * 1024,
        enableRegionDetection: enableRegionDetection || false
      });
      
      // Execute command
      const result = await this.portStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          port: port,
          result: result.result,
          message: 'Streaming started successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          port: port
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
   * Stop streaming for a port
   * POST /api/ide-mirror/:port/stream/stop
   */
  async stopStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      // Validate port parameter
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Create port-based command
      const command = PortStreamingCommand.createStopCommand(port);
      
      // Execute command
      const result = await this.portStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          port: port,
          result: result.result,
          message: 'Streaming stopped successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          port: port
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
   * Get streaming port information
   * GET /api/ide-mirror/:port/stream/status
   */
  async getPortStatus(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Get port information
      const portInfo = this.screenshotStreamingService.getPort(port);
      
      if (!portInfo) {
        return res.status(404).json({
          success: false,
          error: 'Port not found',
          port: port
        });
      }
      
      res.status(200).json({
        success: true,
        port: port,
        status: portInfo
      });
      
    } catch (error) {
      console.error('[StreamingController] Error getting port status:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get all active streaming ports
   * GET /api/ide-mirror/stream/ports
   */
  async getAllPorts(req, res) {
    try {
      const ports = this.screenshotStreamingService.getAllPorts();
      
      res.status(200).json({
        success: true,
        ports: ports,
        count: ports.length
      });
      
    } catch (error) {
      console.error('[StreamingController] Error getting all ports:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Update streaming port configuration
   * PUT /api/ide-mirror/:port/stream/config
   */
  async updatePortConfig(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { fps, quality, format, maxFrameSize, enableRegionDetection } = req.body;
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Create port-based command
      const command = PortStreamingCommand.createConfigCommand(port, {
        fps,
        quality,
        format,
        maxFrameSize,
        enableRegionDetection
      });
      
      // Execute command
      const result = await this.portStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          port: port,
          config: result.result,
          message: 'Port configuration updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          port: port
        });
      }
      
    } catch (error) {
      console.error('[StreamingController] Error updating port config:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Pause streaming for a port
   * POST /api/ide-mirror/:port/stream/pause
   */
  async pauseStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Create port-based command
      const command = PortStreamingCommand.createPauseCommand(port);
      
      // Execute command
      const result = await this.portStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          port: port,
          status: result.result.status,
          message: 'Streaming paused successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          port: port
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
   * Resume streaming for a port
   * POST /api/ide-mirror/:port/stream/resume
   */
  async resumeStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      // Validate parameters
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      // Create port-based command
      const command = PortStreamingCommand.createResumeCommand(port);
      
      // Execute command
      const result = await this.portStreamingHandler.handle(command);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          port: port,
          status: result.result.status,
          message: 'Streaming resumed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          port: port
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