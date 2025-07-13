const { logger } = require('@infrastructure/logging/Logger');

/**
 * StreamingPort Entity
 * 
 * Manages streaming state for a specific IDE port with performance tracking
 * and port lifecycle management. Replaces session-based approach with
 * simpler port-based architecture.
 */
class StreamingPort {
  constructor(port, options = {}) {
    this.port = port;
    this.status = 'inactive'; // inactive, starting, active, paused, stopped, error
    this.createdAt = new Date();
    this.startedAt = null;
    this.stoppedAt = null;
    this.lastFrameAt = null;
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = null;
    
    // Configuration
    this.fps = options.fps !== undefined ? options.fps : 10;
    this.quality = options.quality !== undefined ? options.quality : 0.8;
    this.format = options.format || 'jpeg';
    this.maxFrameSize = options.maxFrameSize || 50 * 1024; // 50KB
    this.enableRegionDetection = options.enableRegionDetection || false;
    
    // Performance metrics
    this.averageFrameSize = 0;
    this.averageLatency = 0;
    this.bandwidthUsage = 0;
    this.memoryUsage = 0;
    
    // Validation
    this.validate();
  }

  /**
   * Validate port configuration
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.port || typeof this.port !== 'number' || this.port < 1 || this.port > 65535) {
      throw new Error('Valid port number (1-65535) is required');
    }
    
    if (this.fps < 1 || this.fps > 60) {
      throw new Error('FPS must be between 1 and 60');
    }
    
    if (this.quality < 0.1 || this.quality > 1.0) {
      throw new Error('Quality must be between 0.1 and 1.0');
    }
    
    if (!['jpeg', 'webp'].includes(this.format)) {
      throw new Error('Format must be either "jpeg" or "webp"');
    }
  }

  /**
   * Start streaming for this port
   */
  start() {
    if (this.status === 'active') {
      throw new Error(`Port ${this.port} is already streaming`);
    }
    
    this.status = 'starting';
    this.startedAt = new Date();
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = null;
    
    logger.log(`[StreamingPort] Started streaming for port ${this.port}`);
  }

  /**
   * Stop streaming for this port
   */
  stop() {
    if (this.status === 'stopped') {
      throw new Error(`Port ${this.port} is already stopped`);
    }
    
    this.status = 'stopped';
    this.stoppedAt = new Date();
    
    logger.log(`[StreamingPort] Stopped streaming for port ${this.port}`);
  }

  /**
   * Pause streaming for this port
   */
  pause() {
    if (this.status !== 'active') {
      throw new Error(`Port ${this.port} is not active and cannot be paused`);
    }
    
    this.status = 'paused';
    logger.log(`[StreamingPort] Paused streaming for port ${this.port}`);
  }

  /**
   * Resume streaming for this port
   */
  resume() {
    if (this.status !== 'paused') {
      throw new Error(`Port ${this.port} is not paused and cannot be resumed`);
    }
    
    this.status = 'active';
    logger.log(`[StreamingPort] Resumed streaming for port ${this.port}`);
  }

  /**
   * Update frame information
   * @param {number} frameSize - Size of the frame in bytes
   * @param {number} latency - Frame processing latency in milliseconds
   */
  updateFrame(frameSize, latency) {
    this.frameCount++;
    this.lastFrameAt = new Date();
    
    // Update average frame size
    this.averageFrameSize = (this.averageFrameSize * (this.frameCount - 1) + frameSize) / this.frameCount;
    
    // Update average latency
    this.averageLatency = (this.averageLatency * (this.frameCount - 1) + latency) / this.frameCount;
    
    // Update bandwidth usage (bytes per second)
    if (this.startedAt) {
      const duration = (Date.now() - this.startedAt.getTime()) / 1000;
      this.bandwidthUsage = (this.frameCount * this.averageFrameSize) / duration;
    }
  }

  /**
   * Record an error
   * @param {string} error - Error message
   */
  error(error) {
    this.errorCount++;
    this.lastError = error;
    this.status = 'error';
    
    logger.error(`[StreamingPort] Error for port ${this.port}:`, error);
  }

  /**
   * Get streaming duration in milliseconds
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    if (!this.startedAt) {
      return 0;
    }
    
    const endTime = this.stoppedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  /**
   * Get streaming duration in seconds
   * @returns {number} Duration in seconds
   */
  getDurationSeconds() {
    return Math.floor(this.getDuration() / 1000);
  }

  /**
   * Get current FPS based on recent frames
   * @returns {number} Current FPS
   */
  getCurrentFPS() {
    if (!this.lastFrameAt || !this.startedAt) {
      return 0;
    }
    
    const timeSinceStart = (this.lastFrameAt.getTime() - this.startedAt.getTime()) / 1000;
    return timeSinceStart > 0 ? this.frameCount / timeSinceStart : 0;
  }

  /**
   * Check if port is active
   * @returns {boolean} Whether port is actively streaming
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if port is paused
   * @returns {boolean} Whether port is paused
   */
  isPaused() {
    return this.status === 'paused';
  }

  /**
   * Check if port is stopped
   * @returns {boolean} Whether port is stopped
   */
  isStopped() {
    return this.status === 'stopped';
  }

  /**
   * Check if port has errors
   * @returns {boolean} Whether port has errors
   */
  hasErrors() {
    return this.status === 'error';
  }

  /**
   * Get port statistics
   * @returns {Object} Port statistics
   */
  getStats() {
    return {
      port: this.port,
      status: this.status,
      frameCount: this.frameCount,
      errorCount: this.errorCount,
      averageFrameSize: Math.round(this.averageFrameSize),
      averageLatency: Math.round(this.averageLatency),
      bandwidthUsage: Math.round(this.bandwidthUsage),
      currentFPS: Math.round(this.getCurrentFPS() * 100) / 100,
      duration: this.getDurationSeconds(),
      uptime: this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0
    };
  }

  /**
   * Convert port to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      port: this.port,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      startedAt: this.startedAt ? this.startedAt.toISOString() : null,
      stoppedAt: this.stoppedAt ? this.stoppedAt.toISOString() : null,
      lastFrameAt: this.lastFrameAt ? this.lastFrameAt.toISOString() : null,
      frameCount: this.frameCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      fps: this.fps,
      quality: this.quality,
      format: this.format,
      maxFrameSize: this.maxFrameSize,
      enableRegionDetection: this.enableRegionDetection,
      averageFrameSize: this.averageFrameSize,
      averageLatency: this.averageLatency,
      bandwidthUsage: this.bandwidthUsage,
      memoryUsage: this.memoryUsage,
      stats: this.getStats()
    };
  }

  /**
   * Create StreamingPort from JSON
   * @param {Object} data - JSON data
   * @returns {StreamingPort} StreamingPort instance
   */
  static fromJSON(data) {
    const port = new StreamingPort(data.port, {
      fps: data.fps,
      quality: data.quality,
      format: data.format,
      maxFrameSize: data.maxFrameSize,
      enableRegionDetection: data.enableRegionDetection
    });
    
    port.status = data.status;
    port.createdAt = new Date(data.createdAt);
    port.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    port.stoppedAt = data.stoppedAt ? new Date(data.stoppedAt) : null;
    port.lastFrameAt = data.lastFrameAt ? new Date(data.lastFrameAt) : null;
    port.frameCount = data.frameCount || 0;
    port.errorCount = data.errorCount || 0;
    port.lastError = data.lastError;
    port.averageFrameSize = data.averageFrameSize || 0;
    port.averageLatency = data.averageLatency || 0;
    port.bandwidthUsage = data.bandwidthUsage || 0;
    port.memoryUsage = data.memoryUsage || 0;
    
    return port;
  }
}

module.exports = StreamingPort; 