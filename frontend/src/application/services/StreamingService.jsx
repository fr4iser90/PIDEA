import { logger } from "@/infrastructure/logging/Logger";
/**
 * StreamingService
 * 
 * Frontend service for managing IDE screenshot streaming connections,
 * frame processing, and WebSocket communication.
 * Updated to use port-based architecture instead of session-based.
 */
import webSocketService from '../../infrastructure/services/WebSocketService';



class StreamingService {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.activeStreams = new Map(); // port -> stream info
    this.frameHandlers = new Map(); // port -> frame handler function
    this.errorHandlers = new Map(); // port -> error handler function
    this.isConnected = false;
    
    // Performance tracking
    this.stats = {
      totalFramesReceived: 0,
      totalErrors: 0,
      averageLatency: 0,
      startTime: Date.now()
    };
    
    if (webSocketService) {
      this.setupWebSocketHandlers();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    if (!this.webSocketService) {
      logger.warn('[StreamingService] WebSocket service not available');
      return;
    }

    // Handle frame messages
    this.webSocketService.on('frame', (data) => {
      this.handleFrameMessage(data);
    });

    // Handle topic messages
    this.webSocketService.on('topic', (data) => {
      this.handleTopicMessage(data);
    });

    // Handle connection events
    this.webSocketService.on('connection-established', () => {
      this.isConnected = true;
      logger.info('[StreamingService] WebSocket connection established');
    });

    this.webSocketService.on('disconnect', () => {
      this.isConnected = false;
      logger.info('[StreamingService] WebSocket connection lost');
    });
  }

  /**
   * Start streaming for a specific IDE port
   * @param {number} port - IDE port
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Start result
   */
  async startStreaming(port, options = {}) {
    try {
      logger.info(`[StreamingService] Starting streaming for port ${port}`);
      
      // Validate inputs
      if (!port) {
        throw new Error('Port is required');
      }

      // Check if port already exists
      if (this.activeStreams.has(port)) {
        throw new Error(`Port ${port} already streaming`);
      }

      // Ensure WebSocket connection
      if (!this.isConnected) {
        await this.ensureConnection();
      }

      // Start streaming via API
      const response = await fetch(`/api/ide-mirror/${port}/stream/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...options
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start streaming');
      }

      // Register port
      this.activeStreams.set(port, {
        port,
        status: 'active',
        options,
        startTime: Date.now(),
        frameCount: 0,
        lastFrameTime: null
      });

      logger.info(`[StreamingService] Streaming started for port ${port}`);
      
      return data;

    } catch (error) {
      logger.error(`[StreamingService] Error starting streaming for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreaming(port) {
    try {
      logger.info(`[StreamingService] Stopping streaming for port ${port}`);
      
      const session = this.activeStreams.get(port);
      if (!session) {
        throw new Error(`Port ${port} not streaming`);
      }

      // Stop streaming via API
      const response = await fetch(`/api/ide-mirror/${port}/stream/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ port })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to stop streaming');
      }

      // Clean up port
      this.activeStreams.delete(port);
      this.frameHandlers.delete(port);
      this.errorHandlers.delete(port);

      logger.info(`[StreamingService] Streaming stopped for port ${port}`);
      
      return data;

    } catch (error) {
      logger.error(`[StreamingService] Error stopping streaming for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Pause streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreaming(port) {
    try {
      const session = this.activeStreams.get(port);
      if (!session) {
        throw new Error(`Port ${port} not found`);
      }
      const response = await fetch(`/api/ide-mirror/${port}/stream/pause`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to pause streaming');
      }
      // Update session status
      session.status = 'paused';
      return data;
    } catch (error) {
      logger.error(`[StreamingService] Error pausing streaming for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Resume streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreaming(port) {
    try {
      const session = this.activeStreams.get(port);
      if (!session) {
        throw new Error(`Port ${port} not found`);
      }
      const response = await fetch(`/api/ide-mirror/${port}/stream/resume`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to resume streaming');
      }
      // Update session status
      session.status = 'active';
      return data;
    } catch (error) {
      logger.error(`[StreamingService] Error resuming streaming for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Update streaming config for a port
   * @param {number} port - Port identifier
   * @param {Object} config - Config object
   * @returns {Promise<Object>} Update result
   */
  async updateStreamConfig(port, config) {
    try {
      const session = this.activeStreams.get(port);
      if (!session) {
        throw new Error(`Port ${port} not found`);
      }
      const response = await fetch(`/api/ide-mirror/${port}/stream/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update config');
      }
      // Update session options
      session.options = { ...session.options, ...config };
      return data;
    } catch (error) {
      logger.error(`[StreamingService] Error updating config for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Register frame handler for a port
   * @param {number} port - Port identifier
   * @param {function} handler - Frame handler function
   */
  registerFrameHandler(port, handler) {
    if (!port) {
      logger.error('[StreamingService] Port is required for registerFrameHandler');
      return;
    }
    if (typeof handler !== 'function') {
      logger.error('[StreamingService] Handler must be a function');
      return;
    }
    this.frameHandlers.set(String(port), handler);
    logger.info(`[StreamingService] Frame handler registered for port ${port}`);
  }

  /**
   * Register error handler for a port
   * @param {number} port - Port identifier
   * @param {function} handler - Error handler function
   */
  registerErrorHandler(port, handler) {
    this.errorHandlers.set(String(port), handler);
    logger.info(`[StreamingService] Error handler registered for port ${port}`);
  }

  /**
   * Handle frame message (from WebSocket)
   * @param {Object} data - Frame data
   */
  handleFrameMessage(data) {
    const { port, frameNumber, timestamp, format, size, data: frameData } = data;
    const session = this.activeStreams.get(port);
    if (!session) {
      logger.warn(`[StreamingService] Received frame for unknown port ${port}`);
      return;
    }
    // Update session statistics
    session.frameCount++;
    session.lastFrameTime = timestamp;
    this.stats.totalFramesReceived++;
    // Call frame handler
    const frameHandler = this.frameHandlers.get(String(port));
    if (frameHandler) {
      try {
        frameHandler({ port, frameNumber, timestamp, format, size, frameData });
      } catch (error) {
        logger.error(`[StreamingService] Error in frame handler for port ${port}:`, error.message);
        this.handleError(port, error);
      }
    }
  }

  /**
   * Handle errors for a port
   * @param {number} port - Port identifier
   * @param {Error} error - Error object
   */
  handleError(port, error) {
    logger.error(`[StreamingService] Error for port ${port}:`, error.message);
    this.stats.totalErrors++;
    const errorHandler = this.errorHandlers.get(String(port));
    if (errorHandler) {
      errorHandler(error);
    }
  }

  /**
   * Get session info for a port
   * @param {number} port - Port identifier
   * @returns {Object|null} Session info
   */
  getSession(port) {
    return this.activeStreams.get(port) || null;
  }

  /**
   * Get all active sessions (by port)
   * @returns {Array<Object>} Array of session info
   */
  getAllSessions() {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Handle incoming topic messages
   * @param {Object} data - Topic message data
   */
  handleTopicMessage(data) {
    try {
      const { topic, data: topicData } = data;
      logger.info('[StreamingService] Processing topic:', topic, 'with data:', topicData);
      
      // Handle mirror frame topics
      if (topic.startsWith('mirror-') && topic.endsWith('-frames')) {
        const port = topic.replace('mirror-', '').replace('-frames', '');
        logger.info(`[StreamingService] Received frame for port ${port}:`, topicData);
        
        // Get port-based frame handler
        const frameHandler = this.frameHandlers.get(String(port));
        logger.info(`[StreamingService] Looking for handler for port: ${port}`);
        logger.info(`[StreamingService] Available handlers:`, Array.from(this.frameHandlers.keys()));
        
        if (frameHandler) {
          logger.info(`[StreamingService] ✅ Found handler! Calling frame handler for port ${port} with frame:`, {
            frameNumber: topicData.frameNumber,
            format: topicData.format,
            size: topicData.size,
            dataLength: topicData.data?.length
          });
          frameHandler(topicData);
        } else {
          logger.error(`[StreamingService] ❌ NO HANDLER FOUND for port ${port}!`);
          logger.error(`[StreamingService] Available handlers:`, Array.from(this.frameHandlers.keys()));
        }
      }
    } catch (error) {
      logger.error('[StreamingService] Error handling topic message:', error);
    }
  }

  /**
   * Ensure WebSocket connection
   * @returns {Promise<void>}
   */
  async ensureConnection() {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not available');
    }

    if (!this.isConnected) {
      await this.webSocketService.connect();
    }
  }

  /**
   * Update average latency
   * @param {number} latency - New latency measurement
   */
  updateAverageLatency(latency) {
    const alpha = 0.1; // Smoothing factor
    this.stats.averageLatency = this.stats.averageLatency * (1 - alpha) + latency * alpha;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      uptime,
      activeSessions: this.activeSessions.size,
      averageLatency: Math.round(this.stats.averageLatency)
    };
  }

  /**
   * Stop all streaming sessions
   * @returns {Promise<number>} Number of sessions stopped
   */
  async stopAllStreaming() {
    try {
      const sessionIds = Array.from(this.activeSessions.keys());
      let stoppedCount = 0;

      for (const sessionId of sessionIds) {
        try {
          await this.stopStreaming(sessionId);
          stoppedCount++;
        } catch (error) {
          logger.error(`[StreamingService] Error stopping session ${sessionId}:`, error.message);
        }
      }

      logger.info(`[StreamingService] Stopped ${stoppedCount} streaming sessions`);
      return stoppedCount;

    } catch (error) {
      logger.error('[StreamingService] Error stopping all streaming:', error.message);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    try {
      logger.info('[StreamingService] Cleaning up resources...');
      
      // Stop all sessions
      this.stopAllStreaming();
      
      // Clear handlers
      this.frameHandlers.clear();
      this.errorHandlers.clear();
      
      logger.info('[StreamingService] Cleanup completed');
      
    } catch (error) {
      logger.error('[StreamingService] Error during cleanup:', error.message);
    }
  }

  getFrameHandler(port) {
    return this.frameHandlers.get(String(port));
  }

  processFrame(frameData) {
    const port = String(frameData.metadata?.port || frameData.port);
    const handler = this.getFrameHandler(port);
    // ... existing code ...
  }
}

// Create singleton instance
const streamingServiceInstance = new StreamingService(webSocketService);

// Export both the class and the instance
export { StreamingService };
export default streamingServiceInstance; 