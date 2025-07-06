/**
 * ScreenshotStreamingService
 * 
 * Core service for continuous IDE screenshot streaming with compression,
 * buffering, and WebSocket delivery. Manages streaming sessions and
 * coordinates between BrowserManager, CompressionEngine, and FrameBuffer.
 */
const StreamingSession = require('../../entities/StreamingSession');
const FrameMetrics = require('../../entities/FrameMetrics');
const CompressionEngine = require('./CompressionEngine');
const FrameBuffer = require('./FrameBuffer');
const RegionDetector = require('./RegionDetector');

class ScreenshotStreamingService {
  constructor(browserManager, webSocketManager, options = {}) {
    this.browserManager = browserManager;
    this.webSocketManager = webSocketManager;
    
    // Core services
    this.compressionEngine = new CompressionEngine();
    this.frameBuffer = new FrameBuffer(options.frameBuffer || {});
    this.regionDetector = new RegionDetector();
    
    // Session management
    this.activeSessions = new Map(); // sessionId -> StreamingSession
    this.streamingIntervals = new Map(); // sessionId -> interval
    this.frameCounters = new Map(); // sessionId -> frame counter
    
    // Configuration
    this.defaultFPS = options.defaultFPS || 10;
    this.maxFPS = options.maxFPS || 30;
    this.defaultQuality = options.defaultQuality || 0.8;
    this.maxFrameSize = options.maxFrameSize || 50 * 1024; // 50KB
    
    // Performance tracking
    this.stats = {
      totalSessions: 0,
      activeSessions: 0,
      totalFramesStreamed: 0,
      totalErrors: 0,
      averageLatency: 0,
      startTime: Date.now()
    };
    
    // Error handling
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    console.log('[ScreenshotStreamingService] Initialized with default FPS:', this.defaultFPS);
  }

  /**
   * Start streaming for a specific IDE port
   * @param {string} sessionId - Unique session identifier
   * @param {number} port - IDE port to stream from
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Streaming session info
   */
  async startStreaming(sessionId, port, options = {}) {
    try {
      console.log(`[ScreenshotStreamingService] Starting streaming session ${sessionId} for port ${port}`);
      
      // Default options with JPEG only
      const defaultOptions = {
        fps: 10,
        quality: 0.4, // Komprimiert für kleine Frames
        format: 'jpeg', // Nur JPEG
        maxFrameSize: 3 * 1024 * 1024, // 3MB für Test
        enableRegionDetection: false,
        retryAttempts: 3,
        retryDelay: 1000
      };
      
      const sessionOptions = { ...defaultOptions, ...options, format: 'jpeg' };
      
      // Create streaming session
      const session = new StreamingSession(sessionId, port, sessionOptions);
      this.activeSessions.set(sessionId, session);
      
      // Start frame capture loop
      const frameInterval = 1000 / sessionOptions.fps;
      console.log(`[ScreenshotStreamingService] Streaming started for session ${sessionId} at ${sessionOptions.fps} FPS`);
      
      // Publish streaming started event
      if (this.eventBus) {
        this.eventBus.publish('streaming.started', {
          sessionId,
          port,
          options: { ...sessionOptions, format: 'jpeg' },
          result: {
            success: true,
            sessionId,
            port,
            fps: sessionOptions.fps,
            quality: sessionOptions.quality,
            format: 'jpeg',
            status: 'active'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Start frame capture loop
      this.startFrameCaptureLoop(sessionId, frameInterval);
      
      return {
        success: true,
        sessionId,
        port,
        result: session.toJSON()
      };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Failed to start streaming for session ${sessionId}:`, error.message);
      return {
        success: false,
        sessionId,
        port,
        error: error.message
      };
    }
  }

  /**
   * Stop streaming for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreaming(sessionId) {
    try {
      console.log(`[ScreenshotStreamingService] Stopping streaming session ${sessionId}`);
      
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      
      // Stop the streaming interval
      const interval = this.streamingIntervals.get(sessionId);
      if (interval) {
        clearInterval(interval);
        this.streamingIntervals.delete(sessionId);
      }
      
      // Stop the session
      session.stop();
      
      // Clean up resources
      this.frameBuffer.clearBuffer(sessionId);
      this.frameCounters.delete(sessionId);
      this.activeSessions.delete(sessionId);
      
      // Update statistics
      this.stats.activeSessions = Math.max(0, this.stats.activeSessions - 1);
      
      console.log(`[ScreenshotStreamingService] Streaming stopped for session ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        status: session.status,
        duration: session.getDuration(),
        frameCount: session.frameCount
      };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error stopping streaming for session ${sessionId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start frame capture loop for a session
   * @param {string} sessionId - Session identifier
   * @param {number} frameInterval - Interval between frames in milliseconds
   */
  startFrameCaptureLoop(sessionId, frameInterval) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error(`[ScreenshotStreamingService] Session ${sessionId} not found for frame capture loop`);
      return;
    }
    
    console.log(`[ScreenshotStreamingService] Starting frame capture loop for session ${sessionId} with ${frameInterval}ms interval`);
    
    const captureLoop = async () => {
      if (!this.activeSessions.has(sessionId)) {
        console.log(`[ScreenshotStreamingService] Session ${sessionId} stopped, ending capture loop`);
        return;
      }
      
      try {
        await this.captureAndStreamFrame(sessionId);
      } catch (error) {
        console.error(`[ScreenshotStreamingService] Frame capture error in loop for session ${sessionId}:`, error.message);
      }
      
      // Schedule next frame
      setTimeout(captureLoop, frameInterval);
    };
    
    // Start the loop
    captureLoop();
  }

  /**
   * Capture and stream a single frame
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} Success status
   */
  async captureAndStreamFrame(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`[ScreenshotStreamingService] Session ${sessionId} not found for frame capture`);
      return false;
    }
    
    const startTime = Date.now();
    const frameNumber = session.incrementFrameCount();
    
    try {
      // Capture screenshot
      const screenshot = await this.captureScreenshot(session.port);
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }
      
      // Compress frame with adaptive quality
      const compressedFrame = await this.compressionEngine.compress(screenshot, {
        format: session.format,
        quality: session.quality,
        maxSize: session.maxFrameSize
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
          sessionId,
          port: session.port,
          compressionTime: compressedFrame.compressionTime,
          originalSize: compressedFrame.originalSize,
          compressionRatio: compressedFrame.compressionRatio
        }
      };
      
      const bufferSuccess = this.frameBuffer.addFrame(sessionId, frameData);
      if (!bufferSuccess) {
        console.warn(`[ScreenshotStreamingService] Failed to add frame to buffer for session ${sessionId}`);
      }
      
      // Stream via WebSocket
      await this.streamFrame(sessionId, frameData);
      
      // Update session metrics
      const totalLatency = Date.now() - startTime;
      session.updateFrame(compressedFrame.size, totalLatency);
      
      // Update service statistics
      this.stats.totalFramesStreamed++;
      this.updateAverageLatency(totalLatency);
      
      return true;
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Frame capture error for session ${sessionId}:`, error.message);
      
      session.error(error.message);
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
        console.log('[ScreenshotStreamingService] Page closed, reconnecting...');
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
      console.error(`[ScreenshotStreamingService] Screenshot capture failed for port ${port}:`, error.message);
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
        console.log(`[ScreenshotStreamingService] Switching browser from port ${currentPort} to ${port}`);
        await this.browserManager.switchToPort(port);
      }
      
      // Ensure connection is active
      if (!this.browserManager.isConnected()) {
        console.log(`[ScreenshotStreamingService] Reconnecting browser to port ${port}`);
        await this.browserManager.connect(port);
      }
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Browser connection error for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Stream frame via WebSocket
   * @param {string} sessionId - Session identifier
   * @param {Object} frameData - Frame data to stream
   * @returns {Promise<void>}
   */
  async streamFrame(sessionId, frameData) {
    try {
      if (!this.webSocketManager) {
        console.warn('[ScreenshotStreamingService] WebSocket manager not available');
        return;
      }
      
      const message = {
        type: 'frame',
        sessionId: sessionId,
        timestamp: frameData.timestamp,
        frameNumber: frameData.frameNumber,
        format: frameData.format,
        size: frameData.size,
        quality: frameData.quality,
        data: frameData.data.toString('base64'), // Convert binary to base64 for JSON
        metadata: frameData.metadata
      };
      
      // Broadcast to all clients subscribed to this session
      this.webSocketManager.broadcastToTopic(`mirror-${frameData.metadata.port}-frames`, message);
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] WebSocket streaming error for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get session information
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session information or null if not found
   */
  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session ? session.toJSON() : null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of active session information
   */
  getAllSessions() {
    return Array.from(this.activeSessions.values()).map(session => session.toJSON());
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
        return { success: false, error: 'Session not found' };
      }
      
      session.pause();
      
      // Stop the streaming interval
      const interval = this.streamingIntervals.get(sessionId);
      if (interval) {
        clearInterval(interval);
        this.streamingIntervals.delete(sessionId);
      }
      
      console.log(`[ScreenshotStreamingService] Streaming paused for session ${sessionId}`);
      
      return { success: true, sessionId, status: session.status };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error pausing streaming for session ${sessionId}:`, error.message);
      return { success: false, error: error.message };
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
        return { success: false, error: 'Session not found' };
      }
      
      session.resume();
      
      // Restart streaming interval
      const intervalMs = 1000 / session.fps;
      const streamingInterval = setInterval(async () => {
        await this.captureAndStreamFrame(sessionId);
      }, intervalMs);
      
      this.streamingIntervals.set(sessionId, streamingInterval);
      
      console.log(`[ScreenshotStreamingService] Streaming resumed for session ${sessionId}`);
      
      return { success: true, sessionId, status: session.status };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error resuming streaming for session ${sessionId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update session configuration
   * @param {string} sessionId - Session identifier
   * @param {Object} options - New configuration options
   * @returns {Promise<Object>} Update result
   */
  async updateSessionConfig(sessionId, options) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      
      // Update session configuration
      if (options.fps !== undefined) {
        session.fps = Math.min(Math.max(options.fps, 1), this.maxFPS);
      }
      
      if (options.quality !== undefined) {
        session.quality = Math.min(Math.max(options.quality, 0.1), 1.0);
      }
      
      if (options.format !== undefined) {
        session.format = options.format;
      }
      
      // Restart interval with new FPS if needed
      const interval = this.streamingIntervals.get(sessionId);
      if (interval && options.fps !== undefined) {
        clearInterval(interval);
        const newIntervalMs = 1000 / session.fps;
        const newStreamingInterval = setInterval(async () => {
          await this.captureAndStreamFrame(sessionId);
        }, newIntervalMs);
        this.streamingIntervals.set(sessionId, newStreamingInterval);
      }
      
      console.log(`[ScreenshotStreamingService] Updated configuration for session ${sessionId}`);
      
      return { success: true, sessionId, config: session.toJSON() };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error updating session config for ${sessionId}:`, error.message);
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
    const compressionStats = this.compressionEngine.getStats();
    const bufferStats = this.frameBuffer.getStats();
    
    return {
      ...this.stats,
      uptime,
      averageLatency: Math.round(this.stats.averageLatency),
      compression: compressionStats,
      buffer: bufferStats,
      sessions: this.getAllSessions()
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
        const result = await this.stopStreaming(sessionId);
        if (result.success) {
          stoppedCount++;
        }
      }
      
      console.log(`[ScreenshotStreamingService] Stopped all streaming sessions: ${stoppedCount} sessions`);
      return stoppedCount;
      
    } catch (error) {
      console.error('[ScreenshotStreamingService] Error stopping all streaming:', error.message);
      return 0;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      console.log('[ScreenshotStreamingService] Cleaning up resources...');
      
      // Stop all streaming
      await this.stopAllStreaming();
      
      // Clean up services
      this.compressionEngine.cleanup();
      this.frameBuffer.cleanup();
      
      // Clear all maps
      this.activeSessions.clear();
      this.streamingIntervals.clear();
      this.frameCounters.clear();
      
      console.log('[ScreenshotStreamingService] Cleanup completed');
      
    } catch (error) {
      console.error('[ScreenshotStreamingService] Error during cleanup:', error.message);
    }
  }
}

module.exports = ScreenshotStreamingService; 