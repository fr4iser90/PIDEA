
/**
 * StreamingController
 * 
 * REST API controller for IDE screenshot streaming operations.
 * Updated to use Application Service layer for proper architecture.
 */
const Logger = require('@logging/Logger');
const logger = new Logger('StreamingController');

class StreamingController {
  constructor(dependencies = {}) {
    this.streamingApplicationService = dependencies.streamingApplicationService;
    if (!this.streamingApplicationService) {
      throw new Error('StreamingController requires streamingApplicationService dependency');
    }
  }

  /**
   * Start streaming for a specific IDE port
   * POST /api/ide-mirror/:port/stream/start
   */
  async startStreaming(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      const { projectId, fps, quality, format, maxFrameSize, enableRegionDetection } = req.body;
      
      // Validate port parameter
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port number. Must be between 1 and 65535.'
        });
      }
      
      const result = await this.streamingApplicationService.startPortStreaming(
        projectId || 'default', 
        port, 
        userId
      );
      
      res.status(200).json({
        success: result.success,
        port: port,
        data: result.data,
        message: 'Streaming started successfully'
      });
      
    } catch (error) {
      logger.error('Error starting streaming:', error.message);
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
      
      const userId = req.user?.id;
      const { projectId } = req.body;
      
      const result = await this.streamingApplicationService.stopPortStreaming(
        projectId || 'default', 
        port, 
        userId
      );
      
      res.status(200).json({
        success: result.success,
        port: port,
        data: result.data,
        message: 'Streaming stopped successfully'
      });
      
    } catch (error) {
      logger.error('Error stopping streaming:', error.message);
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
      
      // Get port information via application service
      const result = await this.streamingApplicationService.getPortStatus(port, req.user?.id);
      const portInfo = result.data;
      
      if (!result.success) {
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
      logger.error('Error getting port status:', error.message);
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
      const result = await this.streamingApplicationService.getAllPorts(req.user?.id);
      const ports = result.data;
      
      res.status(200).json({
        success: true,
        ports: ports,
        count: ports.length
      });
      
    } catch (error) {
      logger.error('Error getting all ports:', error.message);
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
      logger.error('Error updating port config:', error.message);
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
      logger.error('Error pausing streaming:', error.message);
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
      logger.error('Error resuming streaming:', error.message);
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
      const result = await this.streamingApplicationService.getStreamingStats(req.user?.id);
      const stats = result.data;
      
      res.status(200).json({
        success: true,
        stats: stats
      });
      
    } catch (error) {
      logger.error('Error getting stats:', error.message);
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
      const result = await this.streamingApplicationService.stopAllStreaming(req.user?.id);
      const stoppedCount = result.data.stoppedCount;
      
      res.status(200).json({
        success: true,
        stoppedCount: stoppedCount,
        message: `Stopped ${stoppedCount} streaming sessions`
      });
      
    } catch (error) {
      logger.error('Error stopping all streaming:', error.message);
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
      const result = await this.streamingApplicationService.getStreamingStats(req.user?.id);
      const stats = result.data;
      const isHealthy = stats.activeStreams >= 0; // Basic health check
      
      res.status(200).json({
        success: true,
        healthy: isHealthy,
        activeSessions: stats.activeSessions,
        uptime: stats.uptime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Health check error:', error.message);
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