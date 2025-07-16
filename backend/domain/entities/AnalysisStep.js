/**
 * AnalysisStep Entity
 * Represents an individual analysis step with status tracking and progress monitoring
 */
class AnalysisStep {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.projectId = data.projectId;
    this.analysisType = data.analysisType; // 'code-quality', 'security', 'performance', 'architecture'
    this.status = data.status || 'pending'; // 'pending', 'running', 'completed', 'failed', 'cancelled'
    this.progress = data.progress || 0; // 0-100 percentage
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.error = data.error || null;
    this.result = data.result || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Step-specific configuration
    this.config = data.config || {};
    this.timeout = data.timeout || 300000; // 5 minutes default
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries || 2;
    
    // Performance tracking
    this.memoryUsage = data.memoryUsage || null;
    this.executionTime = data.executionTime || null;
    this.fileCount = data.fileCount || null;
    this.lineCount = data.lineCount || null;
  }

  /**
   * Generate unique ID for the step
   */
  generateId() {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the analysis step
   */
  start() {
    this.status = 'running';
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this.progress = 0;
    this.error = null;
  }

  /**
   * Update progress
   */
  updateProgress(progress, metadata = {}) {
    this.progress = Math.min(Math.max(progress, 0), 100);
    this.updatedAt = new Date();
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Complete the analysis step successfully
   */
  complete(result, metadata = {}) {
    this.status = 'completed';
    this.progress = 100;
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.result = result;
    this.metadata = { ...this.metadata, ...metadata };
    this.executionTime = this.completedAt - this.startedAt;
  }

  /**
   * Mark the analysis step as failed
   */
  fail(error, metadata = {}) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.error = error;
    this.metadata = { ...this.metadata, ...metadata };
    this.executionTime = this.completedAt - this.startedAt;
  }

  /**
   * Cancel the analysis step
   */
  cancel(reason = 'User cancelled') {
    this.status = 'cancelled';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.error = { message: reason, type: 'cancelled' };
  }

  /**
   * Retry the analysis step
   */
  retry() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.status = 'pending';
      this.startedAt = null;
      this.completedAt = null;
      this.error = null;
      this.progress = 0;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Check if step is active (running or pending)
   */
  isActive() {
    return this.status === 'running' || this.status === 'pending';
  }

  /**
   * Check if step is completed successfully
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Check if step has failed
   */
  isFailed() {
    return this.status === 'failed';
  }

  /**
   * Check if step can be retried
   */
  canRetry() {
    return this.isFailed() && this.retryCount < this.maxRetries;
  }

  /**
   * Get step duration in milliseconds
   */
  getDuration() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || new Date();
    return endTime - this.startedAt;
  }

  /**
   * Get step duration in human readable format
   */
  getDurationFormatted() {
    const duration = this.getDuration();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`;
  }

  /**
   * Get step summary for API responses
   */
  toSummary() {
    return {
      id: this.id,
      projectId: this.projectId,
      analysisType: this.analysisType,
      status: this.status,
      progress: this.progress,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
      executionTime: this.executionTime,
      retryCount: this.retryCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      analysisType: this.analysisType,
      status: this.status,
      progress: this.progress,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
      result: this.result,
      metadata: this.metadata,
      config: this.config,
      timeout: this.timeout,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      memoryUsage: this.memoryUsage,
      executionTime: this.executionTime,
      fileCount: this.fileCount,
      lineCount: this.lineCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    return new AnalysisStep(data);
  }

  /**
   * Create a new analysis step
   */
  static create(projectId, analysisType, config = {}) {
    return new AnalysisStep({
      projectId,
      analysisType,
      config,
      timeout: config.timeout || 300000,
      maxRetries: config.maxRetries || 2
    });
  }
}

module.exports = AnalysisStep; 