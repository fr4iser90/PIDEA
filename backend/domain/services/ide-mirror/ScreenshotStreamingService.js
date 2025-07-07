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
    
    console.log('[ScreenshotStreamingService] Initialized with port-based architecture, default FPS:', this.defaultFPS);
  }

  /**
   * Start streaming for a specific IDE port
   * @param {number} port - IDE port to stream from
   * @param {Object} options - Streaming options
   * @returns {Promise<Object>} Streaming port info
   */
  async startStreaming(port, options = {}) {
    try {
      console.log(`[ScreenshotStreamingService] Starting streaming for port ${port}`);
      
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
      this.activePorts.set(port, streamingPort);
      
      // Start frame capture loop
      const frameInterval = 1000 / portOptions.fps;
      console.log(`[ScreenshotStreamingService] Streaming started for port ${port} at ${portOptions.fps} FPS`);
      
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
      console.error(`[ScreenshotStreamingService] Failed to start streaming for port ${port}:`, error.message);
      return {
        success: false,
        port,
        error: error.message
      };
    }
  }

  /**
   * Stop streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Stop result
   */
  async stopStreaming(port) {
    try {
      console.log(`[ScreenshotStreamingService] Stopping streaming for port ${port}`);
      
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
      
      console.log(`[ScreenshotStreamingService] Streaming stopped for port ${port}`);
      
      return {
        success: true,
        port,
        status: streamingPort.status,
        duration: streamingPort.getDuration(),
        frameCount: streamingPort.frameCount
      };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error stopping streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start frame capture loop for a port
   * @param {number} port - Port identifier
   * @param {number} frameInterval - Interval between frames in milliseconds
   */
  startFrameCaptureLoop(port, frameInterval) {
    const streamingPort = this.activePorts.get(port);
    if (!streamingPort) {
      console.error(`[ScreenshotStreamingService] Port ${port} not found for frame capture loop`);
      return;
    }
    
    console.log(`[ScreenshotStreamingService] Starting frame capture loop for port ${port} with ${frameInterval}ms interval`);
    
    const captureLoop = async () => {
      if (!this.activePorts.has(port)) {
        console.log(`[ScreenshotStreamingService] Port ${port} stopped, ending capture loop`);
        return;
      }
      
      try {
        await this.captureAndStreamFrame(port);
      } catch (error) {
        console.error(`[ScreenshotStreamingService] Frame capture error in loop for port ${port}:`, error.message);
      }
      
      // Schedule next frame
      setTimeout(captureLoop, frameInterval);
    };
    
    // Start the loop
    captureLoop();
  }

  /**
   * Capture and stream a single frame
   * @param {number} port - Port identifier
   * @returns {Promise<boolean>} Success status
   */
  async captureAndStreamFrame(port) {
    const streamingPort = this.activePorts.get(port);
    if (!streamingPort) {
      console.warn(`[ScreenshotStreamingService] Port ${port} not found for frame capture`);
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
        console.warn(`[ScreenshotStreamingService] Failed to add frame to buffer for port ${port}`);
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
      console.error(`[ScreenshotStreamingService] Frame capture error for port ${port}:`, error.message);
      
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
   * @param {number} port - Port identifier
   * @param {Object} frameData - Frame data to stream
   * @returns {Promise<void>}
   */
  async streamFrame(port, frameData) {
    try {
      if (!this.webSocketManager) {
        console.warn('[ScreenshotStreamingService] WebSocket manager not available');
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
      console.error(`[ScreenshotStreamingService] WebSocket streaming error for port ${port}:`, error.message);
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
   * Pause streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Pause result
   */
  async pauseStreaming(port) {
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
      
      console.log(`[ScreenshotStreamingService] Streaming paused for port ${port}`);
      
      return { success: true, port, status: streamingPort.status };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error pausing streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume streaming for a port
   * @param {number} port - Port identifier
   * @returns {Promise<Object>} Resume result
   */
  async resumeStreaming(port) {
    try {
      const streamingPort = this.activePorts.get(port);
      if (!streamingPort) {
        return { success: false, error: 'Port not found' };
      }
      
      streamingPort.resume();
      
      // Restart streaming interval
      const intervalMs = 1000 / streamingPort.fps;
      const streamingInterval = setInterval(async () => {
        await this.captureAndStreamFrame(port);
      }, intervalMs);
      
      this.streamingIntervals.set(port, streamingInterval);
      
      console.log(`[ScreenshotStreamingService] Streaming resumed for port ${port}`);
      
      return { success: true, port, status: streamingPort.status };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error resuming streaming for port ${port}:`, error.message);
      return { success: false, error: error.message };
    }
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
      
      console.log(`[ScreenshotStreamingService] Updated configuration for port ${port}`);
      
      return { success: true, port, config: streamingPort.toJSON() };
      
    } catch (error) {
      console.error(`[ScreenshotStreamingService] Error updating port config for ${port}:`, error.message);
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
      ports: this.getAllPorts()
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
      
      console.log(`[ScreenshotStreamingService] Stopped all streaming ports: ${stoppedCount} ports`);
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