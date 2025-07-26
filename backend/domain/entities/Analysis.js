/**
 * Analysis Entity - Unified Analysis Management
 * Consolidates all analysis functionality into a single entity
 * Replaces AnalysisResult, ProjectAnalysis, and TaskSuggestion entities
 * Based on analysis_steps structure with integrated recommendations
 */
const { v4: uuidv4 } = require('uuid');

class Analysis {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.projectId = data.projectId;
    this.analysisType = data.analysisType; // 'security', 'code-quality', 'performance', 'architecture', 'layer-violations'
    this.status = data.status || 'pending'; // 'pending', 'running', 'completed', 'failed', 'cancelled'
    this.progress = data.progress || 0; // 0-100 percentage
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.error = data.error || null; // JSON error information
    this.result = data.result || null; // JSON analysis result data (INCLUDES recommendations!)
    this.metadata = data.metadata || {}; // JSON additional metadata
    this.config = data.config || {}; // JSON step configuration
    this.timeout = data.timeout || 300000; // 5 minutes default
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries || 2;
    
    // Performance tracking
    this.memoryUsage = data.memoryUsage || null; // Memory usage in bytes
    this.executionTime = data.executionTime || null; // Execution time in milliseconds
    this.fileCount = data.fileCount || null; // Number of files processed
    this.lineCount = data.lineCount || null; // Number of lines processed
    
    // Analysis metrics
    this.overallScore = data.overallScore || 0; // 0-100 score
    this.criticalIssuesCount = data.criticalIssuesCount || 0;
    this.warningsCount = data.warningsCount || 0;
    this.recommendationsCount = data.recommendationsCount || 0; // Quick count
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    this._validate();
  }

  /**
   * Generate unique ID for analysis
   */
  generateId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate analysis data
   */
  _validate() {
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }
    if (!this.analysisType) {
      throw new Error('Analysis type is required');
    }
    if (this.progress < 0 || this.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    if (this.overallScore < 0 || this.overallScore > 100) {
      throw new Error('Overall score must be between 0 and 100');
    }
  }

  /**
   * Create new analysis instance
   */
  static create(projectId, analysisType, options = {}) {
    return new Analysis({
      projectId,
      analysisType,
      ...options
    });
  }

  /**
   * Start analysis execution
   */
  start() {
    this.status = 'running';
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this.progress = 0;
    this.error = null;
  }

  /**
   * Complete analysis execution
   */
  complete(result, options = {}) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.progress = 100;
    this.result = result;
    this.error = null;
    
    // Update metrics from result
    if (result) {
      this.overallScore = result.overallScore || this.overallScore;
      this.criticalIssuesCount = result.criticalIssuesCount || this.criticalIssuesCount;
      this.warningsCount = result.warningsCount || this.warningsCount;
      this.recommendationsCount = result.recommendationsCount || this.recommendationsCount;
      this.executionTime = result.executionTime || this.executionTime;
      this.memoryUsage = result.memoryUsage || this.memoryUsage;
      this.fileCount = result.fileCount || this.fileCount;
      this.lineCount = result.lineCount || this.lineCount;
    }
    
    // Apply additional options
    Object.assign(this, options);
  }

  /**
   * Fail analysis execution
   */
  fail(error, options = {}) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.error = typeof error === 'string' ? error : JSON.stringify(error);
    
    // Apply additional options
    Object.assign(this, options);
  }

  /**
   * Cancel analysis execution
   */
  cancel(reason = 'Cancelled by user') {
    this.status = 'cancelled';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    this.error = reason;
  }

  /**
   * Update progress
   */
  updateProgress(progress, metadata = {}) {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    this.progress = progress;
    this.updatedAt = new Date();
    
    // Update metadata
    if (metadata) {
      this.metadata = { ...this.metadata, ...metadata };
    }
  }

  /**
   * Add recommendation to result
   */
  addRecommendation(recommendation) {
    if (!this.result) {
      this.result = {};
    }
    
    if (!this.result.recommendations) {
      this.result.recommendations = [];
    }
    
    this.result.recommendations.push({
      id: uuidv4(),
      ...recommendation,
      createdAt: new Date()
    });
    
    this.recommendationsCount = this.result.recommendations.length;
    this.updatedAt = new Date();
  }

  /**
   * Get recommendations from result
   */
  getRecommendations() {
    return this.result?.recommendations || [];
  }

  /**
   * Get analysis summary
   */
  getSummary() {
    return {
      id: this.id,
      projectId: this.projectId,
      analysisType: this.analysisType,
      status: this.status,
      progress: this.progress,
      overallScore: this.overallScore,
      criticalIssuesCount: this.criticalIssuesCount,
      warningsCount: this.warningsCount,
      recommendationsCount: this.recommendationsCount,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      executionTime: this.executionTime,
      createdAt: this.createdAt
    };
  }

  /**
   * Check if analysis is active
   */
  isActive() {
    return ['pending', 'running'].includes(this.status);
  }

  /**
   * Check if analysis is completed
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Check if analysis failed
   */
  isFailed() {
    return ['failed', 'cancelled'].includes(this.status);
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      id: this.id,
      project_id: this.projectId,
      analysis_type: this.analysisType,
      status: this.status,
      progress: this.progress,
      started_at: this.startedAt,
      completed_at: this.completedAt,
      error: this.error,
      result: this.result,
      metadata: this.metadata,
      config: this.config,
      timeout: this.timeout,
      retry_count: this.retryCount,
      max_retries: this.maxRetries,
      memory_usage: this.memoryUsage,
      execution_time: this.executionTime,
      file_count: this.fileCount,
      line_count: this.lineCount,
      overall_score: this.overallScore,
      critical_issues_count: this.criticalIssuesCount,
      warnings_count: this.warningsCount,
      recommendations_count: this.recommendationsCount,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    return new Analysis({
      id: data.id,
      projectId: data.project_id || data.projectId,
      analysisType: data.analysis_type || data.analysisType,
      status: data.status,
      progress: data.progress,
      startedAt: data.started_at || data.startedAt,
      completedAt: data.completed_at || data.completedAt,
      error: data.error,
      result: data.result,
      metadata: data.metadata,
      config: data.config,
      timeout: data.timeout,
      retryCount: data.retry_count || data.retryCount,
      maxRetries: data.max_retries || data.maxRetries,
      memoryUsage: data.memory_usage || data.memoryUsage,
      executionTime: data.execution_time || data.executionTime,
      fileCount: data.file_count || data.fileCount,
      lineCount: data.line_count || data.lineCount,
      overallScore: data.overall_score || data.overallScore,
      criticalIssuesCount: data.critical_issues_count || data.criticalIssuesCount,
      warningsCount: data.warnings_count || data.warningsCount,
      recommendationsCount: data.recommendations_count || data.recommendationsCount,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    });
  }

  /**
   * Create from legacy AnalysisResult
   */
  static fromAnalysisResult(analysisResult) {
    return new Analysis({
      id: analysisResult.id,
      projectId: analysisResult.projectId,
      analysisType: analysisResult.analysisType,
      status: analysisResult.status,
      progress: 100, // AnalysisResult is always completed
      startedAt: analysisResult.startedAt,
      completedAt: analysisResult.completedAt,
      result: analysisResult.resultData,
      metadata: { summary: analysisResult.summary },
      executionTime: analysisResult.durationMs,
      overallScore: analysisResult.overallScore,
      criticalIssuesCount: analysisResult.criticalIssuesCount,
      warningsCount: analysisResult.warningsCount,
      recommendationsCount: analysisResult.recommendationsCount,
      createdAt: analysisResult.createdAt
    });
  }

  /**
   * Create from legacy ProjectAnalysis
   */
  static fromProjectAnalysis(projectAnalysis) {
    return new Analysis({
      id: projectAnalysis.id,
      projectId: projectAnalysis.projectId,
      analysisType: projectAnalysis.analysisType,
      status: projectAnalysis.status || 'completed',
      progress: 100, // ProjectAnalysis is always completed
      startedAt: projectAnalysis.startedAt,
      completedAt: projectAnalysis.completedAt,
      result: projectAnalysis.analysisData,
      metadata: projectAnalysis.metadata,
      executionTime: projectAnalysis.durationMs,
      overallScore: projectAnalysis.overallScore,
      criticalIssuesCount: projectAnalysis.criticalIssuesCount,
      warningsCount: projectAnalysis.warningsCount,
      recommendationsCount: projectAnalysis.recommendationsCount,
      createdAt: projectAnalysis.createdAt,
      updatedAt: projectAnalysis.updatedAt
    });
  }
}

module.exports = Analysis; 