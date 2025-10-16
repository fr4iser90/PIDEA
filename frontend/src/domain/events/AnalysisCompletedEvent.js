/**
 * AnalysisCompletedEvent Domain Event
 * Raised when an analysis is completed
 */
export class AnalysisCompletedEvent {
  constructor(analysisId, projectId, category, completedAt, duration, issuesCount, recommendationsCount) {
    this._analysisId = analysisId;
    this._projectId = projectId;
    this._category = category;
    this._completedAt = completedAt || new Date();
    this._duration = duration; // in milliseconds
    this._issuesCount = issuesCount || 0;
    this._recommendationsCount = recommendationsCount || 0;
    this._eventType = 'AnalysisCompleted';
  }

  get analysisId() {
    return this._analysisId;
  }

  get projectId() {
    return this._projectId;
  }

  get category() {
    return this._category;
  }

  get completedAt() {
    return this._completedAt;
  }

  get duration() {
    return this._duration;
  }

  get issuesCount() {
    return this._issuesCount;
  }

  get recommendationsCount() {
    return this._recommendationsCount;
  }

  get eventType() {
    return this._eventType;
  }

  toJSON() {
    return {
      eventType: this._eventType,
      analysisId: this._analysisId,
      projectId: this._projectId,
      category: this._category,
      completedAt: this._completedAt.toISOString(),
      duration: this._duration,
      issuesCount: this._issuesCount,
      recommendationsCount: this._recommendationsCount
    };
  }

  static fromJSON(data) {
    return new AnalysisCompletedEvent(
      data.analysisId,
      data.projectId,
      data.category,
      new Date(data.completedAt),
      data.duration,
      data.issuesCount,
      data.recommendationsCount
    );
  }
}
