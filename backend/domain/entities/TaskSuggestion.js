/**
 * TaskSuggestion Entity
 * Manages AI-generated task suggestions with comprehensive business logic
 */
const { v4: uuidv4 } = require('uuid');
const AISuggestion = require('@value-objects/AISuggestion');
const TaskType = require('@value-objects/TaskType');
const TaskPriority = require('@value-objects/TaskPriority');

class TaskSuggestion {
  constructor(
    id = uuidv4(),
    content,
    type,
    confidence = AISuggestion.CONFIDENCE_MEDIUM,
    projectId = null,
    userId = null,
    metadata = {},
    status = 'pending',
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this._id = id;
    this._content = content;
    this._type = new TaskType(type);
    this._confidence = new AISuggestion(null, null, confidence, {}).confidence;
    this._projectId = projectId;
    this._userId = userId;
    this._metadata = { ...metadata };
    this._status = status;
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._aiSuggestion = new AISuggestion(type, content, confidence, metadata);
    this._appliedAt = null;
    this._appliedBy = null;
    this._rejectedAt = null;
    this._rejectedBy = null;
    this._rejectionReason = null;
    this._taskId = null;
    this._score = 0;
    this._tags = [];
    this._category = null;

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get content() { return this._content; }
  get type() { return this._type; }
  get confidence() { return this._confidence; }
  get projectId() { return this._projectId; }
  get userId() { return this._userId; }
  get metadata() { return { ...this._metadata }; }
  get status() { return this._status; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get aiSuggestion() { return this._aiSuggestion; }
  get appliedAt() { return this._appliedAt ? new Date(this._appliedAt) : null; }
  get appliedBy() { return this._appliedBy; }
  get rejectedAt() { return this._rejectedAt ? new Date(this._rejectedAt) : null; }
  get rejectedBy() { return this._rejectedBy; }
  get rejectionReason() { return this._rejectionReason; }
  get taskId() { return this._taskId; }
  get score() { return this._score; }
  get tags() { return [...this._tags]; }
  get category() { return this._category; }

  // Domain methods
  isPending() {
    return this._status === 'pending';
  }

  isApplied() {
    return this._status === 'applied';
  }

  isRejected() {
    return this._status === 'rejected';
  }

  isExpired() {
    const expirationHours = 24; // Suggestions expire after 24 hours
    const expirationTime = new Date(this._createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
    return new Date() > expirationTime;
  }

  isHighConfidence() {
    return this._aiSuggestion.isHighConfidence();
  }

  isMediumConfidence() {
    return this._aiSuggestion.isMediumConfidence();
  }

  isLowConfidence() {
    return this._aiSuggestion.isLowConfidence();
  }

  requiresHumanReview() {
    return this._aiSuggestion.requiresHumanReview();
  }

  canAutoApply() {
    return this._aiSuggestion.canAutoApply() && !this.isExpired();
  }

  getPriority() {
    return this._aiSuggestion.getPriority();
  }

  getEstimatedImpact() {
    return this._aiSuggestion.getEstimatedImpact();
  }

  getEstimatedEffort() {
    return this._aiSuggestion.getEstimatedEffort();
  }

  // State transitions
  apply(userId = null, taskId = null) {
    if (this.isApplied()) {
      throw new Error('Suggestion has already been applied');
    }

    if (this.isRejected()) {
      throw new Error('Cannot apply a rejected suggestion');
    }

    if (this.isExpired()) {
      throw new Error('Cannot apply an expired suggestion');
    }

    this._status = 'applied';
    this._appliedAt = new Date();
    this._appliedBy = userId;
    this._taskId = taskId;
    this._updatedAt = new Date();
  }

  reject(userId = null, reason = null) {
    if (this.isRejected()) {
      throw new Error('Suggestion has already been rejected');
    }

    if (this.isApplied()) {
      throw new Error('Cannot reject an applied suggestion');
    }

    this._status = 'rejected';
    this._rejectedAt = new Date();
    this._rejectedBy = userId;
    this._rejectionReason = reason;
    this._updatedAt = new Date();
  }

  // Score management
  setScore(score) {
    this._score = Math.max(0, Math.min(100, score));
    this._updatedAt = new Date();
  }

  increaseScore(increment = 1) {
    this.setScore(this._score + increment);
  }

  decreaseScore(decrement = 1) {
    this.setScore(this._score - decrement);
  }

  // Tags management
  addTag(tag) {
    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._updatedAt = new Date();
    }
  }

  removeTag(tag) {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  hasTag(tag) {
    return this._tags.includes(tag);
  }

  // Category management
  setCategory(category) {
    this._category = category;
    this._updatedAt = new Date();
  }

  removeCategory() {
    this._category = null;
    this._updatedAt = new Date();
  }

  // Metadata management
  setMetadata(key, value) {
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  getMetadata(key) {
    return this._metadata[key];
  }

  removeMetadata(key) {
    delete this._metadata[key];
    this._updatedAt = new Date();
  }

  // Task conversion
  toTask(projectId = null, userId = null) {
    const taskData = this._aiSuggestion.toTaskData();
    
    return {
      title: taskData.title,
      description: taskData.description,
      type: taskData.type,
      priority: taskData.priority,
      estimatedDuration: taskData.estimatedDuration,
      projectId: projectId || this._projectId,
      userId: userId || this._userId,
      metadata: {
        ...taskData.metadata,
        suggestionId: this._id,
        aiGenerated: true,
        confidence: this._confidence,
        confidenceScore: this._aiSuggestion.getConfidenceScore()
      }
    };
  }

  // Quality assessment
  assessQuality() {
    let qualityScore = 0;

    // Confidence score (0-40 points)
    qualityScore += this._aiSuggestion.getConfidenceScore() * 40;

    // Content length score (0-20 points)
    const contentLength = this._content.length;
    if (contentLength > 100 && contentLength < 1000) {
      qualityScore += 20;
    } else if (contentLength > 50 && contentLength < 2000) {
      qualityScore += 15;
    } else if (contentLength > 20) {
      qualityScore += 10;
    }

    // Type relevance score (0-20 points)
    if (this._type.requiresAI()) {
      qualityScore += 20;
    } else if (this._type.requiresExecution()) {
      qualityScore += 15;
    } else {
      qualityScore += 10;
    }

    // Metadata completeness score (0-20 points)
    const metadataKeys = Object.keys(this._metadata);
    if (metadataKeys.length >= 3) {
      qualityScore += 20;
    } else if (metadataKeys.length >= 1) {
      qualityScore += 10;
    }

    return Math.min(100, Math.max(0, qualityScore));
  }

  // Business rules
  _validate() {
    if (!this._content || typeof this._content !== 'string' || this._content.trim().length === 0) {
      throw new Error('Suggestion content is required and must be a non-empty string');
    }

    if (!this._type) {
      throw new Error('Suggestion type is required');
    }

    if (!['pending', 'applied', 'rejected'].includes(this._status)) {
      throw new Error('Invalid suggestion status');
    }

    if (this._score < 0 || this._score > 100) {
      throw new Error('Suggestion score must be between 0 and 100');
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      content: this._content,
      type: this._type.value,
      confidence: this._confidence,
      projectId: this._projectId,
      userId: this._userId,
      metadata: this._metadata,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      appliedAt: this._appliedAt ? this._appliedAt.toISOString() : null,
      appliedBy: this._appliedBy,
      rejectedAt: this._rejectedAt ? this._rejectedAt.toISOString() : null,
      rejectedBy: this._rejectedBy,
      rejectionReason: this._rejectionReason,
      taskId: this._taskId,
      score: this._score,
      tags: this._tags,
      category: this._category,
      isExpired: this.isExpired(),
      isHighConfidence: this.isHighConfidence(),
      isMediumConfidence: this.isMediumConfidence(),
      isLowConfidence: this.isLowConfidence(),
      requiresHumanReview: this.requiresHumanReview(),
      canAutoApply: this.canAutoApply(),
      priority: this.getPriority(),
      estimatedImpact: this.getEstimatedImpact(),
      estimatedEffort: this.getEstimatedEffort(),
      qualityScore: this.assessQuality()
    };
  }

  static fromJSON(data) {
    return new TaskSuggestion(
      data.id,
      data.content,
      data.type,
      data.confidence,
      data.projectId,
      data.userId,
      data.metadata,
      data.status,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(
    content,
    type,
    confidence = AISuggestion.CONFIDENCE_MEDIUM,
    projectId = null,
    userId = null,
    metadata = {}
  ) {
    return new TaskSuggestion(
      null,
      content,
      type,
      confidence,
      projectId,
      userId,
      metadata
    );
  }

  static createFromAISuggestion(aiSuggestion, projectId = null, userId = null) {
    return new TaskSuggestion(
      null,
      aiSuggestion.content,
      aiSuggestion.type,
      aiSuggestion.confidence,
      projectId,
      userId,
      aiSuggestion.metadata
    );
  }
}

module.exports = TaskSuggestion; 