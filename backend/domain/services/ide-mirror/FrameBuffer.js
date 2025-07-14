const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * FrameBuffer Service
 * 
 * Manages frame buffering for streaming sessions with memory management,
 * frame prioritization, and cleanup mechanisms.
 */
class FrameBuffer {
  constructor(options = {}) {
    this.maxBufferSize = options.maxBufferSize || 100 * 1024 * 1024; // 100MB default
    this.maxFramesPerSession = options.maxFramesPerSession || 100; // Max frames per session
    this.buffers = new Map(); // sessionId -> frame array
    this.currentBufferSize = 0;
    this.frameCount = 0;
    this.totalFramesProcessed = 0;
    
    // Performance tracking
    this.stats = {
      totalFramesAdded: 0,
      totalFramesRemoved: 0,
      totalMemoryUsed: 0,
      averageFrameSize: 0,
      bufferOverflows: 0,
      cleanupOperations: 0
    };
    
    // Cleanup interval
    this.cleanupInterval = null;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 30000; // 30 seconds
    
    this.startCleanupInterval();
  }

  /**
   * Add a frame to the buffer
   * @param {string} sessionId - Session identifier
   * @param {Object} frame - Frame data
   * @returns {boolean} Whether frame was added successfully
   */
  addFrame(sessionId, frame) {
    try {
      if (!sessionId || !frame) {
        throw new Error('Session ID and frame are required');
      }

      if (!frame.data || !Buffer.isBuffer(frame.data)) {
        throw new Error('Frame must contain valid buffer data');
      }

      const frameSize = frame.data.length;
      const frameInfo = {
        data: frame.data,
        timestamp: frame.timestamp || Date.now(),
        size: frameSize,
        format: frame.format || 'webp',
        quality: frame.quality || 0.8,
        frameNumber: frame.frameNumber || this.getNextFrameNumber(sessionId),
        metadata: frame.metadata || {}
      };

      // Initialize session buffer if needed
      if (!this.buffers.has(sessionId)) {
        this.buffers.set(sessionId, []);
      }

      const sessionBuffer = this.buffers.get(sessionId);
      
      // Check if adding this frame would exceed limits
      if (this.wouldExceedLimits(sessionId, frameSize)) {
        this.performCleanup(sessionId);
        
        // If still too large after cleanup, reject frame
        if (this.wouldExceedLimits(sessionId, frameSize)) {
          this.stats.bufferOverflows++;
          logger.warn(`[FrameBuffer] Buffer overflow for session ${sessionId}, frame rejected`);
          return false;
        }
      }

      // Add frame to buffer
      sessionBuffer.push(frameInfo);
      this.currentBufferSize += frameSize;
      this.frameCount++;
      this.totalFramesProcessed++;
      this.stats.totalFramesAdded++;

      // Update average frame size
      this.updateAverageFrameSize(frameSize);

      return true;

    } catch (error) {
      logger.error(`[FrameBuffer] Error adding frame for session ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Get the latest frame for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Latest frame or null if not found
   */
  getLatestFrame(sessionId) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (!sessionBuffer || sessionBuffer.length === 0) {
        return null;
      }

      return sessionBuffer[sessionBuffer.length - 1];

    } catch (error) {
      logger.error(`[FrameBuffer] Error getting latest frame for session ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Get multiple recent frames for a session
   * @param {string} sessionId - Session identifier
   * @param {number} count - Number of frames to retrieve
   * @returns {Array} Array of recent frames
   */
  getRecentFrames(sessionId, count = 5) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (!sessionBuffer || sessionBuffer.length === 0) {
        return [];
      }

      const startIndex = Math.max(0, sessionBuffer.length - count);
      return sessionBuffer.slice(startIndex);

    } catch (error) {
      logger.error(`[FrameBuffer] Error getting recent frames for session ${sessionId}:`, error.message);
      return [];
    }
  }

  /**
   * Get frame by number for a session
   * @param {string} sessionId - Session identifier
   * @param {number} frameNumber - Frame number to retrieve
   * @returns {Object|null} Frame or null if not found
   */
  getFrameByNumber(sessionId, frameNumber) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (!sessionBuffer) {
        return null;
      }

      return sessionBuffer.find(frame => frame.frameNumber === frameNumber) || null;

    } catch (error) {
      logger.error(`[FrameBuffer] Error getting frame by number for session ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Clear buffer for a specific session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Whether buffer was cleared successfully
   */
  clearBuffer(sessionId) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (sessionBuffer) {
        const removedSize = sessionBuffer.reduce((sum, frame) => sum + frame.size, 0);
        this.currentBufferSize -= removedSize;
        this.frameCount -= sessionBuffer.length;
        this.stats.totalFramesRemoved += sessionBuffer.length;
        
        this.buffers.delete(sessionId);
        logger.info(`[FrameBuffer] Cleared buffer for session ${sessionId}, freed ${removedSize} bytes`);
        return true;
      }
      return false;

    } catch (error) {
      logger.error(`[FrameBuffer] Error clearing buffer for session ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Clear all buffers
   * @returns {number} Number of sessions cleared
   */
  clearAllBuffers() {
    try {
      const sessionIds = Array.from(this.buffers.keys());
      let clearedCount = 0;

      for (const sessionId of sessionIds) {
        if (this.clearBuffer(sessionId)) {
          clearedCount++;
        }
      }

      logger.info(`[FrameBuffer] Cleared all buffers, ${clearedCount} sessions affected`);
      return clearedCount;

    } catch (error) {
      logger.error('[FrameBuffer] Error clearing all buffers:', error.message);
      return 0;
    }
  }

  /**
   * Perform cleanup for a session
   * @param {string} sessionId - Session identifier
   * @returns {number} Number of frames removed
   */
  performCleanup(sessionId) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (!sessionBuffer) {
        return 0;
      }

      let removedCount = 0;
      let removedSize = 0;

      // Remove oldest frames until we're under limits
      while (sessionBuffer.length > this.maxFramesPerSession / 2) {
        const removedFrame = sessionBuffer.shift();
        removedSize += removedFrame.size;
        removedCount++;
      }

      if (removedCount > 0) {
        this.currentBufferSize -= removedSize;
        this.frameCount -= removedCount;
        this.stats.totalFramesRemoved += removedCount;
        this.stats.cleanupOperations++;
        
        logger.info(`[FrameBuffer] Cleanup for session ${sessionId}: removed ${removedCount} frames, freed ${removedSize} bytes`);
      }

      return removedCount;

    } catch (error) {
      logger.error(`[FrameBuffer] Error during cleanup for session ${sessionId}:`, error.message);
      return 0;
    }
  }

  /**
   * Check if adding a frame would exceed limits
   * @param {string} sessionId - Session identifier
   * @param {number} frameSize - Size of frame to add
   * @returns {boolean} Whether limits would be exceeded
   */
  wouldExceedLimits(sessionId, frameSize) {
    const sessionBuffer = this.buffers.get(sessionId);
    const currentSessionFrames = sessionBuffer ? sessionBuffer.length : 0;
    
    return (
      this.currentBufferSize + frameSize > this.maxBufferSize ||
      currentSessionFrames >= this.maxFramesPerSession
    );
  }

  /**
   * Get next frame number for a session
   * @param {string} sessionId - Session identifier
   * @returns {number} Next frame number
   */
  getNextFrameNumber(sessionId) {
    const sessionBuffer = this.buffers.get(sessionId);
    if (!sessionBuffer || sessionBuffer.length === 0) {
      return 1;
    }
    
    const maxFrameNumber = Math.max(...sessionBuffer.map(frame => frame.frameNumber || 0));
    return maxFrameNumber + 1;
  }

  /**
   * Update average frame size
   * @param {number} frameSize - Size of new frame
   */
  updateAverageFrameSize(frameSize) {
    const alpha = 0.1; // Smoothing factor
    this.stats.averageFrameSize = this.stats.averageFrameSize * (1 - alpha) + frameSize * alpha;
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * Perform periodic cleanup across all sessions
   */
  performPeriodicCleanup() {
    try {
      const sessionIds = Array.from(this.buffers.keys());
      let totalRemoved = 0;

      for (const sessionId of sessionIds) {
        totalRemoved += this.performCleanup(sessionId);
      }

      if (totalRemoved > 0) {
        logger.info(`[FrameBuffer] Periodic cleanup completed: removed ${totalRemoved} frames`);
      }

    } catch (error) {
      logger.error('[FrameBuffer] Error during periodic cleanup:', error.message);
    }
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer statistics
   */
  getStats() {
    const sessionCount = this.buffers.size;
    const totalFrames = this.frameCount;
    const memoryUsageMB = Math.round(this.currentBufferSize / (1024 * 1024) * 100) / 100;
    const averageFrameSizeKB = Math.round(this.stats.averageFrameSize / 1024 * 100) / 100;

    return {
      sessionCount,
      totalFrames,
      currentBufferSize: this.currentBufferSize,
      memoryUsageMB,
      averageFrameSizeKB,
      maxBufferSize: this.maxBufferSize,
      maxFramesPerSession: this.maxFramesPerSession,
      totalFramesProcessed: this.totalFramesProcessed,
      ...this.stats
    };
  }

  /**
   * Get session-specific statistics
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session statistics or null if not found
   */
  getSessionStats(sessionId) {
    try {
      const sessionBuffer = this.buffers.get(sessionId);
      if (!sessionBuffer) {
        return null;
      }

      const totalSize = sessionBuffer.reduce((sum, frame) => sum + frame.size, 0);
      const averageSize = sessionBuffer.length > 0 ? totalSize / sessionBuffer.length : 0;

      return {
        sessionId,
        frameCount: sessionBuffer.length,
        totalSize,
        averageFrameSize: Math.round(averageSize),
        oldestFrame: sessionBuffer[0]?.timestamp,
        newestFrame: sessionBuffer[sessionBuffer.length - 1]?.timestamp
      };

    } catch (error) {
      logger.error(`[FrameBuffer] Error getting stats for session ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalFramesAdded: 0,
      totalFramesRemoved: 0,
      totalMemoryUsed: 0,
      averageFrameSize: 0,
      bufferOverflows: 0,
      cleanupOperations: 0
    };
    this.totalFramesProcessed = 0;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clearAllBuffers();
  }
}

module.exports = FrameBuffer; 