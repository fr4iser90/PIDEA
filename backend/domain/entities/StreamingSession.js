/**
 * StreamingSession Entity
 * 
 * Manages streaming sessions for IDE mirror functionality with performance tracking
 * and session lifecycle management.
 */
class StreamingSession {
  constructor(id, port, options = {}) {
    this.id = id;
    this.port = port;
    this.status = 'created'; // created, starting, active, paused, stopped, error
    this.createdAt = new Date();
    this.startedAt = null;
    this.stoppedAt = null;
    this.lastFrameAt = null;
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = null;
    
    // Configuration
    this.fps = options.fps || 10;
    this.quality = options.quality || 0.8;
    this.format = options.format || 'webp';
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

  validate() {
    if (!this.id || typeof this.id !== 'string') {
      throw new Error('StreamingSession requires a valid string ID');
    }
    
    if (!this.port || typeof this.port !== 'number' || this.port < 1 || this.port > 65535) {
      throw new Error('StreamingSession requires a valid port number (1-65535)');
    }
    
    if (this.fps < 1 || this.fps > 60) {
      throw new Error('FPS must be between 1 and 60');
    }
    
    if (this.quality < 0.1 || this.quality > 1.0) {
      throw new Error('Quality must be between 0.1 and 1.0');
    }
    
    if (!['webp', 'jpeg'].includes(this.format)) {
      throw new Error('Format must be either "webp" or "jpeg"');
    }
  }

  start() {
    if (this.status === 'active') {
      throw new Error('Session is already active');
    }
    
    this.status = 'starting';
    this.startedAt = new Date();
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = null;
  }

  activate() {
    if (this.status !== 'starting') {
      throw new Error('Session must be in starting state to activate');
    }
    
    this.status = 'active';
  }

  pause() {
    if (this.status !== 'active') {
      throw new Error('Session must be active to pause');
    }
    
    this.status = 'paused';
  }

  resume() {
    if (this.status !== 'paused') {
      throw new Error('Session must be paused to resume');
    }
    
    this.status = 'active';
  }

  stop() {
    if (['stopped', 'error'].includes(this.status)) {
      return; // Already stopped
    }
    
    this.status = 'stopped';
    this.stoppedAt = new Date();
  }

  error(error) {
    this.status = 'error';
    this.lastError = error;
    this.errorCount++;
    this.stoppedAt = new Date();
  }

  updateFrame(frameSize, latency) {
    if (this.status !== 'active') {
      return;
    }
    
    this.frameCount++;
    this.lastFrameAt = new Date();
    
    // Update average metrics
    this.updateAverageMetrics(frameSize, latency);
  }

  incrementFrameCount() {
    this.frameCount++;
    return this.frameCount;
  }

  updateAverageMetrics(frameSize, latency) {
    // Simple moving average calculation
    const alpha = 0.1; // Smoothing factor
    
    this.averageFrameSize = this.averageFrameSize * (1 - alpha) + frameSize * alpha;
    this.averageLatency = this.averageLatency * (1 - alpha) + latency * alpha;
    
    // Calculate bandwidth usage (bytes per second)
    this.bandwidthUsage = this.averageFrameSize * this.fps;
  }

  updateMemoryUsage(memoryBytes) {
    this.memoryUsage = memoryBytes;
  }

  isActive() {
    return this.status === 'active';
  }

  isStopped() {
    return ['stopped', 'error'].includes(this.status);
  }

  getDuration() {
    if (!this.startedAt) {
      return 0;
    }
    
    const endTime = this.stoppedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  getUptime() {
    if (!this.startedAt || this.isStopped()) {
      return 0;
    }
    
    return Date.now() - this.startedAt.getTime();
  }

  getFrameRate() {
    if (!this.startedAt || this.frameCount === 0) {
      return 0;
    }
    
    const duration = this.getDuration() / 1000; // Convert to seconds
    return duration > 0 ? this.frameCount / duration : 0;
  }

  getErrorRate() {
    if (this.frameCount === 0) {
      return 0;
    }
    
    return this.errorCount / this.frameCount;
  }

  toJSON() {
    return {
      id: this.id,
      port: this.port,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      startedAt: this.startedAt?.toISOString(),
      stoppedAt: this.stoppedAt?.toISOString(),
      lastFrameAt: this.lastFrameAt?.toISOString(),
      frameCount: this.frameCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      fps: this.fps,
      quality: this.quality,
      format: this.format,
      averageFrameSize: Math.round(this.averageFrameSize),
      averageLatency: Math.round(this.averageLatency),
      bandwidthUsage: Math.round(this.bandwidthUsage),
      memoryUsage: this.memoryUsage,
      duration: this.getDuration(),
      uptime: this.getUptime(),
      frameRate: Math.round(this.getFrameRate() * 100) / 100,
      errorRate: Math.round(this.getErrorRate() * 1000) / 1000
    };
  }

  static create(id, port, options = {}) {
    return new StreamingSession(id, port, options);
  }

  static fromJSON(data) {
    const session = new StreamingSession(data.id, data.port, {
      fps: data.fps,
      quality: data.quality,
      format: data.format,
      maxFrameSize: data.maxFrameSize,
      enableRegionDetection: data.enableRegionDetection
    });
    
    session.status = data.status;
    session.createdAt = new Date(data.createdAt);
    session.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    session.stoppedAt = data.stoppedAt ? new Date(data.stoppedAt) : null;
    session.lastFrameAt = data.lastFrameAt ? new Date(data.lastFrameAt) : null;
    session.frameCount = data.frameCount || 0;
    session.errorCount = data.errorCount || 0;
    session.lastError = data.lastError;
    session.averageFrameSize = data.averageFrameSize || 0;
    session.averageLatency = data.averageLatency || 0;
    session.bandwidthUsage = data.bandwidthUsage || 0;
    session.memoryUsage = data.memoryUsage || 0;
    
    return session;
  }
}

module.exports = StreamingSession; 