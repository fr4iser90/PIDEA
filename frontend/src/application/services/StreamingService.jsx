/**
 * StreamingService
 * 
 * Frontend service for managing IDE screenshot streaming connections,
 * frame processing, and WebSocket communication.
 */
class StreamingService {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.activeSessions = new Map(); // sessionId -> session info
    this.frameHandlers = new Map(); // sessionId -> frame handler function
    this.errorHandlers = new Map(); // sessionId -> error handler function
    this.isConnected = false;
    
    // Performance tracking
    this.stats = {
      totalFramesReceived: 0,
      totalErrors: 0,
      averageLatency: 0,
      startTime: Date.now()
    };
    
    this.setupWebSocketHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    if (!this.webSocketService) {
      console.warn('[StreamingService] WebSocket service not available');
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
      console.log('[StreamingService] WebSocket connection established');
    });

    this.webSocketService.on('disconnect', () => {
      this.isConnected = false;
      console.log('[StreamingService] WebSocket connection lost');
    });
  }

  /**
   * Start streaming for a specific IDE port
   * @param {string} sessionId - Session identifier
   * @param {number} port - IDE port
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Start result
   */
  async startStreaming(sessionId, port, options = {}) {
    try {
      console.log(`[StreamingService] Starting streaming for session ${sessionId} on port ${port}`);
      
      // Validate inputs
      if (!sessionId || !port) {
        throw new Error('Session ID and port are required');
      }

      // Check if session already exists
      if (this.activeSessions.has(sessionId)) {
        throw new Error(`Session ${sessionId} already exists`);
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
          sessionId,
          ...options
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start streaming');
      }

      // Register session
      this.activeSessions.set(sessionId, {
        sessionId,
        port,
        status: 'active',
        options,
        startTime: Date.now(),
        frameCount: 0,
        lastFrameTime: null
      });

      console.log(`[StreamingService] Streaming started for session ${sessionId}`);
      
      return data;

    } catch (error) {
      console.error(`[StreamingService] Error starting streaming for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop streaming for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreaming(sessionId) {
    try {
      console.log(`[StreamingService] Stopping streaming for session ${sessionId}`);
      
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Stop streaming via API
      const response = await fetch(`/api/ide-mirror/${session.port}/stream/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to stop streaming');
      }

      // Clean up session
      this.activeSessions.delete(sessionId);
      this.frameHandlers.delete(sessionId);
      this.errorHandlers.delete(sessionId);

      console.log(`[StreamingService] Streaming stopped for session ${sessionId}`);
      
      return data;

    } catch (error) {
      console.error(`[StreamingService] Error stopping streaming for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Pause streaming for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreaming(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const response = await fetch(`/api/ide-mirror/${session.port}/stream/session/${sessionId}/pause`, {
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
      console.error(`[StreamingService] Error pausing streaming for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Resume streaming for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreaming(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const response = await fetch(`/api/ide-mirror/${session.port}/stream/session/${sessionId}/resume`, {
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
      console.error(`[StreamingService] Error resuming streaming for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update session configuration
   * @param {string} sessionId - Session identifier
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} Update result
   */
  async updateSessionConfig(sessionId, config) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const response = await fetch(`/api/ide-mirror/${session.port}/stream/session/${sessionId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      // Update session options
      session.options = { ...session.options, ...config };

      return data;

    } catch (error) {
      console.error(`[StreamingService] Error updating config for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Register frame handler for a session
   * @param {string} sessionId - Session identifier
   * @param {Function} handler - Frame handler function
   */
  registerFrameHandler(sessionId, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Frame handler must be a function');
    }
    
    this.frameHandlers.set(sessionId, handler);
    console.log(`[StreamingService] Frame handler registered for session ${sessionId}`);
  }

  /**
   * Register error handler for a session
   * @param {string} sessionId - Session identifier
   * @param {Function} handler - Error handler function
   */
  registerErrorHandler(sessionId, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Error handler must be a function');
    }
    
    this.errorHandlers.set(sessionId, handler);
    console.log(`[StreamingService] Error handler registered for session ${sessionId}`);
  }

  /**
   * Handle incoming frame messages
   * @param {Object} data - Frame message data
   */
  handleFrameMessage(data) {
    try {
      const { sessionId, frameNumber, timestamp, format, size, data: frameData } = data;
      
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`[StreamingService] Received frame for unknown session ${sessionId}`);
        return;
      }

      // Update session statistics
      session.frameCount++;
      session.lastFrameTime = timestamp;

      // Update service statistics
      this.stats.totalFramesReceived++;
      const latency = Date.now() - timestamp;
      this.updateAverageLatency(latency);

      // Call frame handler if registered
      const frameHandler = this.frameHandlers.get(sessionId);
      if (frameHandler) {
        try {
          frameHandler({
            sessionId,
            frameNumber,
            timestamp,
            format,
            size,
            data: frameData,
            latency
          });
        } catch (error) {
          console.error(`[StreamingService] Error in frame handler for session ${sessionId}:`, error.message);
          this.handleError(sessionId, error);
        }
      }

    } catch (error) {
      console.error('[StreamingService] Error handling frame message:', error.message);
      this.stats.totalErrors++;
    }
  }

  /**
   * Handle incoming topic messages
   * @param {Object} data - Topic message data
   */
  handleTopicMessage(data) {
    try {
      const { topic, data: topicData } = data;
      
      // Handle mirror frame topics
      if (topic.startsWith('mirror-') && topic.endsWith('-frames')) {
        const port = topic.replace('mirror-', '').replace('-frames', '');
        console.log(`[StreamingService] Received frame for port ${port}`);
        
        // Find session by port
        for (const [sessionId, session] of this.activeSessions) {
          if (session.port.toString() === port) {
            this.handleFrameMessage(topicData);
            break;
          }
        }
      }

    } catch (error) {
      console.error('[StreamingService] Error handling topic message:', error.message);
      this.stats.totalErrors++;
    }
  }

  /**
   * Handle errors for a session
   * @param {string} sessionId - Session identifier
   * @param {Error} error - Error object
   */
  handleError(sessionId, error) {
    console.error(`[StreamingService] Error for session ${sessionId}:`, error.message);
    this.stats.totalErrors++;

    // Call error handler if registered
    const errorHandler = this.errorHandlers.get(sessionId);
    if (errorHandler) {
      try {
        errorHandler(error, sessionId);
      } catch (handlerError) {
        console.error(`[StreamingService] Error in error handler for session ${sessionId}:`, handlerError.message);
      }
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
   * Get session information
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session information
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of active sessions
   */
  getAllSessions() {
    return Array.from(this.activeSessions.values());
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
          console.error(`[StreamingService] Error stopping session ${sessionId}:`, error.message);
        }
      }

      console.log(`[StreamingService] Stopped ${stoppedCount} streaming sessions`);
      return stoppedCount;

    } catch (error) {
      console.error('[StreamingService] Error stopping all streaming:', error.message);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    try {
      console.log('[StreamingService] Cleaning up resources...');
      
      // Stop all sessions
      this.stopAllStreaming();
      
      // Clear handlers
      this.frameHandlers.clear();
      this.errorHandlers.clear();
      
      console.log('[StreamingService] Cleanup completed');
      
    } catch (error) {
      console.error('[StreamingService] Error during cleanup:', error.message);
    }
  }
}

export default StreamingService; 