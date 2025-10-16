/**
 * AnalysisResult Domain Entity
 * Represents the result of an analysis with categories and metrics
 */
import { AnalysisCategory } from '../value-objects/AnalysisCategory.js';

export class AnalysisResult {
  constructor(id, projectId, category, options = {}) {
    this._id = id;
    this._projectId = projectId;
    this._category = category instanceof AnalysisCategory ? category : new AnalysisCategory(category);
    this._status = options.status || 'pending';
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._completedAt = options.completedAt || null;
    this._summary = options.summary || null;
    this._recommendations = options.recommendations || [];
    this._issues = options.issues || [];
    this._metrics = options.metrics || {};
    this._results = options.results || null;
    this._error = options.error || null;
    this._metadata = options.metadata || {};
    
    this.validateInvariants();
  }

  get id() {
    return this._id;
  }

  get projectId() {
    return this._projectId;
  }

  get category() {
    return this._category;
  }

  get status() {
    return this._status;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get completedAt() {
    return this._completedAt;
  }

  get summary() {
    return this._summary;
  }

  get recommendations() {
    return [...this._recommendations];
  }

  get issues() {
    return [...this._issues];
  }

  get metrics() {
    return { ...this._metrics };
  }

  get results() {
    return this._results;
  }

  get error() {
    return this._error;
  }

  get metadata() {
    return { ...this._metadata };
  }

  validateInvariants() {
    if (!this._id) {
      throw new Error('AnalysisResult must have a valid ID');
    }
    if (!this._projectId) {
      throw new Error('AnalysisResult must belong to a project');
    }
    if (!this._category) {
      throw new Error('AnalysisResult must have a valid category');
    }
    if (!Array.isArray(this._recommendations)) {
      throw new Error('Recommendations must be an array');
    }
    if (!Array.isArray(this._issues)) {
      throw new Error('Issues must be an array');
    }
  }

  start() {
    if (this._status !== 'pending') {
      throw new Error('Only pending analyses can be started');
    }
    this._status = 'running';
    this._updatedAt = new Date();
  }

  complete(summary, recommendations, issues, metrics, results) {
    if (this._status !== 'running') {
      throw new Error('Only running analyses can be completed');
    }
    
    this._status = 'completed';
    this._completedAt = new Date();
    this._summary = summary || null;
    this._recommendations = recommendations || [];
    this._issues = issues || [];
    this._metrics = metrics || {};
    this._results = results || null;
    this._updatedAt = new Date();
  }

  fail(error) {
    if (this._status !== 'running') {
      throw new Error('Only running analyses can be failed');
    }
    
    this._status = 'failed';
    this._error = error;
    this._updatedAt = new Date();
  }

  addRecommendation(recommendation) {
    if (!recommendation || typeof recommendation !== 'object') {
      throw new Error('Recommendation must be a valid object');
    }
    
    this._recommendations.push({
      id: recommendation.id || this.generateRecommendationId(),
      title: recommendation.title || '',
      description: recommendation.description || '',
      priority: recommendation.priority || 'medium',
      category: recommendation.category || this._category.value,
      timestamp: recommendation.timestamp || new Date(),
      metadata: recommendation.metadata || {}
    });
    
    this._updatedAt = new Date();
  }

  addIssue(issue) {
    if (!issue || typeof issue !== 'object') {
      throw new Error('Issue must be a valid object');
    }
    
    this._issues.push({
      id: issue.id || this.generateIssueId(),
      title: issue.title || '',
      description: issue.description || '',
      severity: issue.severity || 'medium',
      category: issue.category || this._category.value,
      source: issue.source || '',
      scanner: issue.scanner || '',
      timestamp: issue.timestamp || new Date(),
      metadata: issue.metadata || {}
    });
    
    this._updatedAt = new Date();
  }

  updateMetrics(metrics) {
    this._metrics = { ...this._metrics, ...metrics };
    this._updatedAt = new Date();
  }

  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    this._updatedAt = new Date();
  }

  generateRecommendationId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  isCompleted() {
    return this._status === 'completed';
  }

  isFailed() {
    return this._status === 'failed';
  }

  isRunning() {
    return this._status === 'running';
  }

  isPending() {
    return this._status === 'pending';
  }

  equals(other) {
    return other instanceof AnalysisResult && this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id,
      projectId: this._projectId,
      category: this._category.value,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      summary: this._summary,
      recommendations: this._recommendations,
      issues: this._issues,
      metrics: this._metrics,
      results: this._results,
      error: this._error,
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    return new AnalysisResult(
      data.id,
      data.projectId,
      data.category,
      {
        status: data.status,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        summary: data.summary,
        recommendations: data.recommendations || [],
        issues: data.issues || [],
        metrics: data.metrics || {},
        results: data.results,
        error: data.error,
        metadata: data.metadata || {}
      }
    );
  }
}
