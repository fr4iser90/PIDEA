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
      
      // Validate inputs
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Valid session ID is required');
      }
      
      if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
        throw new Error('Valid port number (1-65535) is required');
      }
      
      // Check if session already exists
      if (this.activeSessions.has(sessionId)) {
        throw new Error(`Streaming session ${sessionId} already exists`);
      }
      
      // Create streaming session
      const sessionOptions = {
        fps: options.fps || this.defaultFPS,
        quality: options.quality || this.defaultQuality,
        format: options.format || 'webp',
        maxFrameSize: options.maxFrameSize || this.maxFrameSize,
        enableRegionDetection: options.enableRegionDetection || false
      };
      
      const session = StreamingSession.create(sessionId, port, sessionOptions);
      
      // Ensure browser is connected to the correct port
      await this.ensureBrowserConnection(port);
      
      // Start the session
      session.start();
      this.activeSessions.set(sessionId, session);
      this.frameCounters.set(sessionId, 0);
      
      // Start streaming loop
      const intervalMs = 1000 / session.fps;
      const streamingInterval = setInterval(async () => {
        await this.captureAndStreamFrame(sessionId);
      }, intervalMs);
      
      this.streamingIntervals.set(sessionId, streamingInterval);
      
      // Activate session
      session.activate();
      
      // Update statistics
      this.stats.totalSessions++;
      this.stats.activeSessions++;
      
      console.log(`[ScreenshotStreamingService] Streaming started for session ${sessionId} at ${session.fps} FPS`);
      
      return {
        success: true,
        sessionId,
        port,
        fps: session.fps,
        quality: session.quality,
        format: session.format,
        status: session.status
      };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Failed to start streaming for session ${sessionId}:`, error.message);
      
      // Cleanup on failure
      await this.stopStreaming(sessionId);
      
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
   * Capture and stream a single frame
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} Whether frame was captured and streamed successfully
   */
  async captureAndStreamFrame(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive()) {
      return false;
    }
    
    const frameNumber = (this.frameCounters.get(sessionId) || 0) + 1;
    this.frameCounters.set(sessionId, frameNumber);
    
    const metrics = FrameMetrics.create(sessionId, frameNumber);
    const startTime = Date.now();
    
    try {
      // Start capture
      metrics.startCapture();
      
      // Capture screenshot
      const screenshot = await this.captureScreenshot(session.port);
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }
      
      metrics.endCapture(screenshot.length);
      
      // Start compression
      metrics.startCompression();
      
      // Compress frame
      const compressedFrame = await this.compressionEngine.compress(screenshot, {
        format: session.format,
        quality: session.quality,
        maxSize: session.maxFrameSize
      });
      
      metrics.endCompression(compressedFrame.size, compressedFrame.format, compressedFrame.quality);
      
      // Region detection (if enabled)
      if (session.enableRegionDetection) {
        const previousFrame = this.frameBuffer.getLatestFrame(sessionId);
        if (previousFrame) {
          const regionResult = this.regionDetector.detectChangedRegions(screenshot, previousFrame.data);
          metrics.setRegionDetection(regionResult.regions, regionResult.fullFrame);
        }
      }
      
      // Add to frame buffer
      const frameData = {
        data: compressedFrame.data,
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
      
      // Start streaming
      metrics.startStreaming();
      
      // Stream via WebSocket
      await this.streamFrame(sessionId, frameData);
      
      metrics.endStreaming();
      
      // Update session metrics
      const totalLatency = Date.now() - startTime;
      session.updateFrame(compressedFrame.size, totalLatency);
      
      // Update service statistics
      this.stats.totalFramesStreamed++;
      this.updateAverageLatency(totalLatency);
      
      return true;
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Frame capture error for session ${sessionId}:`, error.message);
      
      metrics.setError(error.message);
      session.error(error.message);
      this.stats.totalErrors++;
      
      // Retry logic
      if (frameNumber <= this.maxRetries) {
        console.log(`[ScreenshotStreamingService] Retrying frame capture for session ${sessionId} (attempt ${frameNumber})`);
        setTimeout(() => this.captureAndStreamFrame(sessionId), this.retryDelay);
      }
      
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
      
      // Capture screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false, // Only visible area for better performance
        quality: 100 // Full quality before compression
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