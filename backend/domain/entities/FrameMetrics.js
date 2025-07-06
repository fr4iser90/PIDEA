/**
 * FrameMetrics Entity
 * 
 * Tracks detailed performance metrics for individual frames in the streaming system.
 * Used for performance analysis, optimization, and monitoring.
 */
class FrameMetrics {
  constructor(sessionId, frameNumber, options = {}) {
    this.sessionId = sessionId;
    this.frameNumber = frameNumber;
    this.timestamp = new Date();
    
    // Capture timing
    this.captureStartTime = options.captureStartTime || Date.now();
    this.captureEndTime = null;
    this.compressionStartTime = null;
    this.compressionEndTime = null;
    this.streamingStartTime = null;
    this.streamingEndTime = null;
    
    // Frame data
    this.originalSize = options.originalSize || 0;
    this.compressedSize = options.compressedSize || 0;
    this.format = options.format || 'webp';
    this.quality = options.quality || 0.8;
    
    // Performance metrics
    this.captureLatency = 0;
    this.compressionLatency = 0;
    this.streamingLatency = 0;
    this.totalLatency = 0;
    this.compressionRatio = 0;
    
    // Region detection (if enabled)
    this.hasRegionDetection = options.hasRegionDetection || false;
    this.changedRegions = options.changedRegions || [];
    this.isFullFrame = options.isFullFrame || true;
    
    // Error tracking
    this.hasError = false;
    this.error = null;
    this.retryCount = options.retryCount || 0;
    
    // Memory usage
    this.memoryUsageBefore = options.memoryUsageBefore || 0;
    this.memoryUsageAfter = options.memoryUsageAfter || 0;
    this.memoryDelta = 0;
  }

  startCapture() {
    this.captureStartTime = Date.now();
  }

  endCapture(originalSize) {
    this.captureEndTime = Date.now();
    this.originalSize = originalSize;
    this.captureLatency = this.captureEndTime - this.captureStartTime;
  }

  startCompression() {
    this.compressionStartTime = Date.now();
  }

  endCompression(compressedSize, format, quality) {
    this.compressionEndTime = Date.now();
    this.compressedSize = compressedSize;
    this.format = format;
    this.quality = quality;
    this.compressionLatency = this.compressionEndTime - this.compressionStartTime;
    this.compressionRatio = this.originalSize > 0 ? this.compressedSize / this.originalSize : 0;
  }

  startStreaming() {
    this.streamingStartTime = Date.now();
  }

  endStreaming() {
    this.streamingEndTime = Date.now();
    this.streamingLatency = this.streamingEndTime - this.streamingStartTime;
    this.totalLatency = this.captureLatency + this.compressionLatency + this.streamingLatency;
  }

  setRegionDetection(changedRegions, isFullFrame) {
    this.hasRegionDetection = true;
    this.changedRegions = changedRegions;
    this.isFullFrame = isFullFrame;
  }

  setError(error) {
    this.hasError = true;
    this.error = error;
  }

  setMemoryUsage(before, after) {
    this.memoryUsageBefore = before;
    this.memoryUsageAfter = after;
    this.memoryDelta = after - before;
  }

  incrementRetry() {
    this.retryCount++;
  }

  getCompressionEfficiency() {
    if (this.originalSize === 0) return 0;
    return (1 - this.compressionRatio) * 100; // Percentage reduction
  }

  getBandwidthUsage() {
    return this.compressedSize; // bytes per frame
  }

  getFPS() {
    if (this.totalLatency === 0) return 0;
    return 1000 / this.totalLatency; // frames per second
  }

  isSuccessful() {
    return !this.hasError && this.compressedSize > 0;
  }

  getPerformanceScore() {
    if (this.hasError) return 0;
    
    // Calculate performance score based on latency and compression
    const latencyScore = Math.max(0, 100 - (this.totalLatency / 10)); // 100ms = 0 score
    const compressionScore = this.getCompressionEfficiency();
    const sizeScore = this.compressedSize < 50 * 1024 ? 100 : Math.max(0, 100 - (this.compressedSize - 50 * 1024) / 1024);
    
    return Math.round((latencyScore + compressionScore + sizeScore) / 3);
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      frameNumber: this.frameNumber,
      timestamp: this.timestamp.toISOString(),
      captureLatency: this.captureLatency,
      compressionLatency: this.compressionLatency,
      streamingLatency: this.streamingLatency,
      totalLatency: this.totalLatency,
      originalSize: this.originalSize,
      compressedSize: this.compressedSize,
      format: this.format,
      quality: this.quality,
      compressionRatio: Math.round(this.compressionRatio * 1000) / 1000,
      compressionEfficiency: Math.round(this.getCompressionEfficiency() * 100) / 100,
      bandwidthUsage: this.getBandwidthUsage(),
      fps: Math.round(this.getFPS() * 100) / 100,
      hasRegionDetection: this.hasRegionDetection,
      changedRegions: this.changedRegions,
      isFullFrame: this.isFullFrame,
      hasError: this.hasError,
      error: this.error,
      retryCount: this.retryCount,
      memoryUsageBefore: this.memoryUsageBefore,
      memoryUsageAfter: this.memoryUsageAfter,
      memoryDelta: this.memoryDelta,
      performanceScore: this.getPerformanceScore(),
      isSuccessful: this.isSuccessful()
    };
  }

  static create(sessionId, frameNumber, options = {}) {
    return new FrameMetrics(sessionId, frameNumber, options);
  }

  static fromJSON(data) {
    const metrics = new FrameMetrics(data.sessionId, data.frameNumber, {
      captureStartTime: data.captureStartTime,
      originalSize: data.originalSize,
      compressedSize: data.compressedSize,
      format: data.format,
      quality: data.quality,
      hasRegionDetection: data.hasRegionDetection,
      changedRegions: data.changedRegions,
      isFullFrame: data.isFullFrame,
      retryCount: data.retryCount,
      memoryUsageBefore: data.memoryUsageBefore,
      memoryUsageAfter: data.memoryUsageAfter
    });
    
    metrics.timestamp = new Date(data.timestamp);
    metrics.captureEndTime = data.captureEndTime;
    metrics.compressionStartTime = data.compressionStartTime;
    metrics.compressionEndTime = data.compressionEndTime;
    metrics.streamingStartTime = data.streamingStartTime;
    metrics.streamingEndTime = data.streamingEndTime;
    metrics.captureLatency = data.captureLatency;
    metrics.compressionLatency = data.compressionLatency;
    metrics.streamingLatency = data.streamingLatency;
    metrics.totalLatency = data.totalLatency;
    metrics.compressionRatio = data.compressionRatio;
    metrics.hasError = data.hasError;
    metrics.error = data.error;
    metrics.memoryDelta = data.memoryDelta;
    
    return metrics;
  }
}

module.exports = FrameMetrics; 