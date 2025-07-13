
/**
 * ScreenshotStreamingService
 * 
 * Core service for continuous IDE screenshot streaming with compression,
 * buffering, and WebSocket delivery. Manages streaming ports and
 * coordinates between BrowserManager, CompressionEngine, and FrameBuffer.
 * Updated to use port-based architecture instead of session-based.
 */
const StreamingPort = require('../../entities/StreamingPort');
const FrameMetrics = require('../../entities/FrameMetrics');
const CompressionEngine = require('./CompressionEngine');
const FrameBuffer = require('./FrameBuffer');
const RegionDetector = require('./RegionDetector');
const { logger } = require('@infrastructure/logging/Logger');

class ScreenshotStreamingService {
  constructor(browserManager, webSocketManager, options = {}) {
    this.browserManager = browserManager;
    this.webSocketManager = webSocketManager;
    
    // Core services
    this.compressionEngine = new CompressionEngine();
    this.frameBuffer = new FrameBuffer(options.frameBuffer || {});
    this.regionDetector = new RegionDetector();
    
    // Port management
    this.activePorts = new Map(); // port -> StreamingPort
    this.streamingIntervals = new Map(); // port -> interval
    this.frameCounters = new Map(); // port -> frame counter
    
    // Configuration
    this.defaultFPS = options.defaultFPS || 10;
    this.maxFPS = options.maxFPS || 30;
    this.defaultQuality = options.defaultQuality || 0.8;
    this.maxFrameSize = options.maxFrameSize || 50 * 1024; // 50KB
    
    // Performance tracking
    this.stats = {
      totalPorts: 0,
      activePorts: 0,
      totalFramesStreamed: 0,
      totalErrors: 0,
      averageLatency: 0,
      startTime: Date.now()
    };
    
    // Error handling
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    logger.log('[ScreenshotStreamingService] Initialized with port-based architecture, default FPS:', this.defaultFPS);
  }

  /**
   * Start streaming for a specific IDE port
   * @param {number} port - IDE port to stream from
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Streaming port info
   */
  async startStreaming(port, options = {}) {
    logger.log(`[ScreenshotStreamingService] Starting streaming for port ${port}`);
    
    // Validate port number
    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error('Valid port number (1-65535) is required');
    }
    
    // Check if port is already streaming
    if (this.activePorts.has(port)) {
      throw new Error(`Streaming port ${port} already exists`);
    }
    
    try {
      // Ensure browser connection to the port
      await this.ensureBrowserConnection(port);
      
      // Default options with JPEG only
      const defaultOptions = {
        fps: 10,
        quality: 0.4, // Compressed for small frames
        format: 'jpeg', // JPEG only
        maxFrameSize: 3 * 1024 * 1024, // 3MB for testing
        enableRegionDetection: false,
        retryAttempts: 3,
        retryDelay: 1000
      };
      
      const portOptions = { ...defaultOptions, ...options, format: 'jpeg' };
      
      // Create streaming port
      const streamingPort = new StreamingPort(port, portOptions);
      streamingPort.start();
      this.activePorts.set(port, streamingPort);
      
      // Start frame capture loop
      const frameInterval = 1000 / portOptions.fps;
      logger.log(`[ScreenshotStreamingService] Streaming started for port ${port} at ${portOptions.fps} FPS`);
      
      // Publish streaming started event
      if (this.eventBus) {
        this.eventBus.publish('streaming.port.started', {
          port,
          options: { ...portOptions, format: 'jpeg' },
          result: {
            success: true,
            port,
            fps: portOptions.fps,
            quality: portOptions.quality,
            format: 'jpeg',
            status: 'active'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Start frame capture loop
      this.startFrameCaptureLoop(port, frameInterval);
      
      return {
        success: true,
        port,
        result: streamingPort.toJSON()
      };
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Failed to start streaming for port ${port}:`, error.message);
      
      // Re-throw validation errors to maintain proper error handling
      if (error.message.includes('FPS must be between') || 
          error.message.includes('Quality must be between') ||
          error.message.includes('Format must be') ||
          error.message.includes('Valid port number')) {
        throw error;
      }
      
      return {
        success: false,
        port,
        error: error.message
      };
    }
  }

  /**
   * Start streaming for a session (compatibility method)
   * @param {string} sessionId - Session identifier
   * @param {number} port - Port identifier
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Start result
   */
  async startStreamingSession(sessionId, port, options = {}) {
    try {
      logger.log(`[ScreenshotStreamingService] Starting streaming for session ${sessionId} on port ${port}`);
      
      // Validate session ID
      if (!sessionId || typeof sessionId !== 'string') {
        return { success: false, error: 'Valid session ID is required' };
      }
      
      // Check if session already exists
      const existingSession = this.getSession(sessionId);
      if (existingSession) {
        return { success: false, error: `Session ${sessionId} already exists` };
      }
      
      // Start streaming using port
      const result = await this.startStreaming(port, options);
      
      if (result.success) {
        // Update the result to include session ID
        return {
          ...result,
          sessionId,
          success: true
        };
      }
      
      return result;
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Error starting streaming for session ${sessionId}:`, error.message);
      return { success: false, error: error.message };
    }
  }



  /**
   * Stop streaming for a session (compatibility method)
   * @param {string} sessionId - Session ID (format: session-{port})
   * @returns {Promise<Object>} Stop result
   */
  async stopSession(sessionId) {
    const portMatch = sessionId.match(/^session-(\d+)$/);
    if (!portMatch) {
      return { success: false, error: 'Invalid session ID format' };
    }
    
    const port = parseInt(portMatch[1]);
    return await this.stopStreamingPort(port);
  }

  /**
   * Start frame capture loop for a port
   * @param {number} port - Port identifier
   * @param {number} frameInterval - Interval between frames in milliseconds
   */
  startFrameCaptureLoop(port, frameInterval) {
    const streamingPort = this.activePorts.get(port);
    if (!streamingPort) {
      logger.error(`[ScreenshotStreamingService] Port ${port} not found for frame capture loop`);
      return;
    }
    
    logger.log(`[ScreenshotStreamingService] Starting frame capture loop for port ${port} with ${frameInterval}ms interval`);
    
    const captureLoop = async () => {
      if (!this.activePorts.has(port)) {
        logger.log(`[ScreenshotStreamingService] Port ${port} stopped, ending capture loop`);
        return;
      }
      
      try {
        await this.captureAndStreamFrame(port);
      } catch (error) {
        logger.error(`[ScreenshotStreamingService] Frame capture error in loop for port ${port}:`, error.message);
      }
    };
    
    // COMMENTED OUT: Continuous frame capture causes filesystem/performance issues
    // Use simple command-based screenshots instead
    /*
    // Start the interval and store the ID
    const intervalId = setInterval(captureLoop, frameInterval);
    this.streamingIntervals.set(port, intervalId);
    
    // Start the loop immediately
    captureLoop();
    */
    
    logger.log(`[ScreenshotStreamingService] Frame capture setup complete (no continuous streaming to avoid filesystem errors) for port ${port}`);
  }

  /**
   * Capture and stream a single frame
   * @param {number} port - Port identifier
   * @returns {Promise<boolean>} Success status
   */
  async captureAndStreamFrame(port) {
    const streamingPort = this.activePorts.get(port);
    if (!streamingPort) {
      logger.warn(`[ScreenshotStreamingService] Port ${port} not found for frame capture`);
      return false;
    }
    
    const startTime = Date.now();
    const frameNumber = streamingPort.frameCount + 1;
    
    try {
      // Capture screenshot
      const screenshot = await this.captureScreenshot(port);
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }
      
      // Compress frame with adaptive quality
      const compressedFrame = await this.compressionEngine.compress(screenshot, {
        format: streamingPort.format,
        quality: streamingPort.quality,
        maxSize: streamingPort.maxFrameSize
      });
      
      // Add to frame buffer
      const frameData = {
        data: compressedFrame.buffer,
        timestamp: Date.now(),
        size: compressedFrame.size,
        format: compressedFrame.format,
        quality: compressedFrame.quality,
        frameNumber: frameNumber,
        metadata: {
          port: port,
          compressionTime: compressedFrame.compressionTime,
          originalSize: compressedFrame.originalSize,
          compressionRatio: compressedFrame.compressionRatio
        }
      };
      
      const bufferSuccess = this.frameBuffer.addFrame(port, frameData);
      if (!bufferSuccess) {
        logger.warn(`[ScreenshotStreamingService] Failed to add frame to buffer for port ${port}`);
      }
      
      // Stream via WebSocket
      await this.streamFrame(port, frameData);
      
      // Update port metrics
      const totalLatency = Date.now() - startTime;
      streamingPort.updateFrame(compressedFrame.size, totalLatency);
      
      // Update service statistics
      this.stats.totalFramesStreamed++;
      this.updateAverageLatency(totalLatency);
      
      return true;
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Frame capture error for port ${port}:`, error.message);
      
      streamingPort.error(error.message);
      this.stats.totalErrors++;
      
      return false;
    }
  }

  /**
   * Capture screenshot from IDE
   * @param {number} port - IDE port
   * @returns {Promise<Buffer|null>} Screenshot buffer or null on failure
   */
  async captureScreenshot(port) {
    try {
      // Ensure browser is connected to the correct port
      await this.ensureBrowserConnection(port);
      
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }
      
      // Check if page is still connected
      if (page.isClosed && page.isClosed()) {
        logger.log('[ScreenshotStreamingService] Page closed, reconnecting...');
        await this.browserManager.reconnect();
        const newPage = await this.browserManager.getPage();
        if (!newPage) {
          throw new Error('Could not reconnect to browser');
        }
        return await this.captureScreenshot(port); // Retry with new page
      }
      
      // Capture screenshot - use PNG format without quality option
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false // Only visible area for better performance
      });
      
      return screenshotBuffer;
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Screenshot capture failed for port ${port}:`, error.message);
      return null;
    }
  }

  /**
   * Ensure browser is connected to the correct port
   * @param {number} port - Target port
   * @returns {Promise<void>}
   */
  async ensureBrowserConnection(port) {
    try {
      const currentPort = this.browserManager.getCurrentPort();
      
      if (currentPort !== port) {
        logger.log(`[ScreenshotStreamingService] Switching browser from port ${currentPort} to ${port}`);
        await this.browserManager.connectToPort(port);
      }
      
      // Ensure connection is active
      if (!this.browserManager.isConnected()) {
        logger.log(`[ScreenshotStreamingService] Reconnecting browser to port ${port}`);
        await this.browserManager.connectToPort(port);
      }
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Browser connection error for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Stream frame via WebSocket
   * @param {number} port - Port identifier
   * @param {Object} frameData - Frame data to stream
   * @returns {Promise<void>}
   */
  async streamFrame(port, frameData) {
    try {
      if (!this.webSocketManager) {
        logger.warn('[ScreenshotStreamingService] WebSocket manager not available');
        return;
      }
      
      const message = {
        type: 'frame',
        port: port,
        timestamp: frameData.timestamp,
        frameNumber: frameData.frameNumber,
        format: frameData.format,
        size: frameData.size,
        quality: frameData.quality,
        data: frameData.data.toString('base64'), // Convert binary to base64 for JSON
        metadata: frameData.metadata
      };
      
      // Broadcast to all clients subscribed to this port
      this.webSocketManager.broadcastToTopic(`mirror-${port}-frames`, message);
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] WebSocket streaming error for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Get port information
   * @param {number} port - Port identifier
   * @returns {Object|null} Port information or null if not found
   */
  getPort(port) {
    const streamingPort = this.activePorts.get(port);
    return streamingPort ? streamingPort.toJSON() : null;
  }

  /**
   * Get all active ports
   * @returns {Array} Array of active port information
   */
  getAllPorts() {
    return Array.from(this.activePorts.values()).map(port => port.toJSON());
  }

  /**
   * Get all active sessions (compatibility method)
   * Maps port-based architecture to session-based interface
   * @returns {Array} Array of active session information
   */
  getAllSessions() {
    return Array.from(this.activePorts.values()).map(port => ({
      id: `session-${port.port}`,
      port: port.port,
      status: port.status,
      createdAt: port.createdAt,
      startedAt: port.startedAt,
      frameCount: port.frameCount,
      fps: port.fps,
      quality: port.quality,
      format: port.format,
      isActive: () => port.status === 'active',
      isStopped: () => ['stopped', 'error'].includes(port.status)
    }));
  }

  /**
   * Get session by ID (compatibility method)
   * Maps session ID to port-based lookup
   * @param {string} sessionId - Session ID (format: session-{port})
   * @returns {Object|null} Session object or null if not found
   */
  getSession(sessionId) {
    // Extract port from session ID (format: session-{port})
    const portMatch = sessionId.match(/^session-(\d+)$/);
    if (!portMatch) {
      return null;
    }
    
    const port = parseInt(portMatch[1]);
    const streamingPort = this.activePorts.get(port);
    
    if (!streamingPort) {
      return null;
    }
    
    return {
      id: sessionId,
      port: streamingPort.port,
      status: streamingPort.status,
      createdAt: streamingPort.createdAt,
      startedAt: streamingPort.startedAt,
      frameCount: streamingPort.frameCount,
      fps: streamingPort.fps,
      quality: streamingPort.quality,
      format: streamingPort.format,
      isActive: () => streamingPort.status === 'active',
      isStopped: () => ['stopped', 'error'].includes(streamingPort.status)
    };
  }



  /**
   * Pause streaming for a session (compatibility method)
   * @param {string} sessionId - Session ID (format: session-{port})
   * @returns {Promise<Object>} Pause result
   */
  async pauseSession(sessionId) {
    const portMatch = sessionId.match(/^session-(\d+)$/);
    if (!portMatch) {
      return { success: false, error: 'Invalid session ID format' };
    }
    
    const port = parseInt(portMatch[1]);
    return await this.pauseStreaming(port);
  }



  /**
   * Pause streaming for a session (compatibility method)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreamingSession(sessionId) {
    const port = this.extractPortFromSessionId(sessionId);
    if (!port) {
      return { success: false, error: 'Invalid session ID format' };
    }
    return this.pauseStreaming(port);
  }

  /**
   * Pause streaming for a session (alias for compatibility)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreaming(sessionId) {
    // If sessionId is a string, treat it as session ID
    if (typeof sessionId === 'string') {
      return this.pauseStreamingSession(sessionId);
    }
    // Otherwise treat it as port number
    return this.pauseStreamingPort(sessionId);
  }

  /**
   * Pause streaming for a port (internal method)
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreamingPort(port) {
    try {
      const streamingPort = this.activePorts.get(port);
      if (!streamingPort) {
        return { success: false, error: 'Port not found' };
      }
      
      streamingPort.pause();
      
      // Stop the streaming interval
      const interval = this.streamingIntervals.get(port);
      if (interval) {
        clearInterval(interval);
        this.streamingIntervals.delete(port);
      }
      
      logger.log(`[ScreenshotStreamingService] Streaming paused for port ${port}`);
      
      return { success: true, port, status: streamingPort.status };
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Error pausing streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume streaming for a session (compatibility method)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreamingSession(sessionId) {
    const port = this.extractPortFromSessionId(sessionId);
    if (!port) {
      return { success: false, error: 'Invalid session ID format' };
    }
    return this.resumeStreaming(port);
  }

  /**
   * Resume streaming for a session (alias for compatibility)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreaming(sessionId) {
    // If sessionId is a string, treat it as session ID
    if (typeof sessionId === 'string') {
      return this.resumeStreamingSession(sessionId);
    }
    // Otherwise treat it as port number
    return this.resumeStreamingPort(sessionId);
  }

  /**
   * Resume streaming for a port (internal method)
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreamingPort(port) {
    try {
      const streamingPort = this.activePorts.get(port);
      if (!streamingPort) {
        return { success: false, error: 'Port not found' };
      }
      
      streamingPort.resume();
      
      // COMMENTED OUT: Restart streaming interval causes filesystem issues
      // Use simple command-based capture instead
      /*
      const intervalMs = 1000 / streamingPort.fps;
      const streamingInterval = setInterval(async () => {
        await this.captureAndStreamFrame(port);
      }, intervalMs);
      
      this.streamingIntervals.set(port, streamingInterval);
      */
      
      logger.log(`[ScreenshotStreamingService] Streaming resumed for port ${port}`);
      
      return { success: true, port, status: streamingPort.status };
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Error resuming streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop streaming for a session (compatibility method)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreamingSession(sessionId) {
    const port = this.extractPortFromSessionId(sessionId);
    if (!port) {
      return { success: false, error: 'Invalid session ID format' };
    }
    return this.stopStreamingPort(port);
  }

  /**
   * Stop streaming for a session (alias for compatibility)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreaming(sessionId) {
    // If sessionId is a string, treat it as session ID
    if (typeof sessionId === 'string') {
      return this.stopStreamingSession(sessionId);
    }
    // Otherwise treat it as port number
    return this.stopStreamingPort(sessionId);
  }

  /**
   * Stop streaming for a port (internal method)
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreamingPort(port) {
    try {
      logger.log(`[ScreenshotStreamingService] Stopping streaming for port ${port}`);
      
      const streamingPort = this.activePorts.get(port);
      if (!streamingPort) {
        return { success: false, error: 'Port not found' };
      }
      
      // Stop the streaming interval
      const interval = this.streamingIntervals.get(port);
      if (interval) {
        clearInterval(interval);
        this.streamingIntervals.delete(port);
      }
      
      // Stop the port
      streamingPort.stop();
      
      // Clean up resources
      this.frameBuffer.clearBuffer(port);
      this.frameCounters.delete(port);
      this.activePorts.delete(port);
      
      // Update statistics
      this.stats.activePorts = Math.max(0, this.stats.activePorts - 1);
      
      logger.log(`[ScreenshotStreamingService] Streaming stopped for port ${port}`);
      
      return {
        success: true,
        port,
        status: streamingPort.status,
        duration: streamingPort.getDuration(),
        frameCount: streamingPort.frameCount
      };
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Error stopping streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract port number from session ID
   * @param {string} sessionId - Session identifier
   * @returns {number|null} Port number or null if invalid
   */
  extractPortFromSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return null;
    }
    
    // Handle session-{port} format
    const match = sessionId.match(/^session-(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Handle direct port number as session ID
    const port = parseInt(sessionId, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
    
    return null;
  }

  /**
   * Resume streaming for a session (compatibility method)
   * @param {string} sessionId - Session ID (format: session-{port})
   * @returns {Promise<Object>} Resume result
   */
  async resumeSession(sessionId) {
    const portMatch = sessionId.match(/^session-(\d+)$/);
    if (!portMatch) {
      return { success: false, error: 'Invalid session ID format' };
    }
    
    const port = parseInt(portMatch[1]);
    return await this.resumeStreaming(port);
  }

  /**
   * Update port configuration
   * @param {number} port - Port identifier
   * @param {Object} options - New configuration options
   * @returns {Promise<Object>} Update result
   */
  async updatePortConfig(port, options) {
    try {
      const streamingPort = this.activePorts.get(port);
      if (!streamingPort) {
        return { success: false, error: 'Port not found' };
      }
      
      // Update port configuration
      if (options.fps !== undefined) {
        streamingPort.fps = Math.min(Math.max(options.fps, 1), this.maxFPS);
      }
      
      if (options.quality !== undefined) {
        streamingPort.quality = Math.min(Math.max(options.quality, 0.1), 1.0);
      }
      
      if (options.format !== undefined) {
        streamingPort.format = options.format;
      }
      
      // COMMENTED OUT: Restart interval causes filesystem issues
      // Use simple command-based capture instead
      /*
      // Restart interval with new FPS if needed
      const interval = this.streamingIntervals.get(port);
      if (interval && options.fps !== undefined) {
        clearInterval(interval);
        const newIntervalMs = 1000 / streamingPort.fps;
        const newStreamingInterval = setInterval(async () => {
          await this.captureAndStreamFrame(port);
        }, newIntervalMs);
        this.streamingIntervals.set(port, newStreamingInterval);
      }
      */
      
      logger.log(`[ScreenshotStreamingService] Updated configuration for port ${port}`);
      
      return { success: true, port, config: streamingPort.toJSON() };
      
    } catch (error) {
      logger.error(`[ScreenshotStreamingService] Error updating port config for ${port}:`, error.message);
      return { success: false, error: error.message };
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
    
    // Safely get compression stats with fallback
    let compressionStats = {};
    try {
      if (this.compressionEngine && typeof this.compressionEngine.getStats === 'function') {
        compressionStats = this.compressionEngine.getStats() || {};
      }
    } catch (error) {
      logger.warn('[ScreenshotStreamingService] Error getting compression stats:', error.message);
      compressionStats = {};
    }
    
    // Safely get buffer stats with fallback
    let bufferStats = {};
    try {
      if (this.frameBuffer && typeof this.frameBuffer.getStats === 'function') {
        bufferStats = this.frameBuffer.getStats() || {};
      }
    } catch (error) {
      logger.warn('[ScreenshotStreamingService] Error getting buffer stats:', error.message);
      bufferStats = {};
    }
    
    // Safely get ports and sessions
    let ports = [];
    let sessions = [];
    try {
      ports = this.getAllPorts() || [];
      sessions = this.getAllSessions() || [];
    } catch (error) {
      logger.warn('[ScreenshotStreamingService] Error getting ports/sessions:', error.message);
    }
    
    return {
      ...this.stats,
      uptime,
      averageLatency: Math.round(this.stats.averageLatency || 0),
      compression: compressionStats,
      buffer: bufferStats,
      ports: ports,
      // Session-based compatibility statistics
      totalSessions: this.stats.totalPorts || 0,
      activeSessions: this.stats.activePorts || 0,
      sessions: sessions
    };
  }

  /**
   * Stop all streaming ports
   * @returns {Promise<number>} Number of ports stopped
   */
  async stopAllStreaming() {
    try {
      const ports = Array.from(this.activePorts.keys());
      let stoppedCount = 0;
      
      for (const port of ports) {
        const result = await this.stopStreaming(port);
        if (result.success) {
          stoppedCount++;
        }
      }
      
      logger.log(`[ScreenshotStreamingService] Stopped all streaming ports: ${stoppedCount} ports`);
      return stoppedCount;
      
    } catch (error) {
      logger.error('[ScreenshotStreamingService] Error stopping all streaming:', error.message);
      return 0;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      logger.log('[ScreenshotStreamingService] Cleaning up resources...');
      
      // Stop all streaming
      await this.stopAllStreaming();
      
      // Clean up services
      this.compressionEngine.cleanup();
      this.frameBuffer.cleanup();
      
      // Clear all maps
      this.activePorts.clear();
      this.streamingIntervals.clear();
      this.frameCounters.clear();
      
      logger.log('[ScreenshotStreamingService] Cleanup completed');
      
    } catch (error) {
      logger.error('[ScreenshotStreamingService] Error during cleanup:', error.message);
    }
  }
}

module.exports = ScreenshotStreamingService; 