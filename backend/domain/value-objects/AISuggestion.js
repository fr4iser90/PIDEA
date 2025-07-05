/**
 * AISuggestion Value Object
 * Manages AI-generated suggestions with validation and business logic
 */
class AISuggestion {
  static TYPE_TASK = 'task';
  static TYPE_REFACTORING = 'refactoring';
  static TYPE_OPTIMIZATION = 'optimization';
  static TYPE_SECURITY = 'security';
  static TYPE_DOCUMENTATION = 'documentation';
  static TYPE_TEST = 'test';
  static TYPE_SCRIPT = 'script';

  static CONFIDENCE_LOW = 'low';
  static CONFIDENCE_MEDIUM = 'medium';
  static CONFIDENCE_HIGH = 'high';

  constructor(type, content, confidence = AISuggestion.CONFIDENCE_MEDIUM, metadata = {}) {
    this._validate(type, confidence);
    this._type = type;
    this._content = content;
    this._confidence = confidence;
    this._metadata = metadata;
    this._createdAt = new Date();
  }

  get type() {
    return this._type;
  }

  get content() {
    return this._content;
  }

  get confidence() {
    return this._confidence;
  }

  get metadata() {
    return { ...this._metadata };
  }

  get createdAt() {
    return new Date(this._createdAt);
  }

  isTaskSuggestion() {
    return this._type === AISuggestion.TYPE_TASK;
  }

  isRefactoringSuggestion() {
    return this._type === AISuggestion.TYPE_REFACTORING;
  }

  isOptimizationSuggestion() {
    return this._type === AISuggestion.TYPE_OPTIMIZATION;
  }

  isSecuritySuggestion() {
    return this._type === AISuggestion.TYPE_SECURITY;
  }

  isDocumentationSuggestion() {
    return this._type === AISuggestion.TYPE_DOCUMENTATION;
  }

  isTestSuggestion() {
    return this._type === AISuggestion.TYPE_TEST;
  }

  isScriptSuggestion() {
    return this._type === AISuggestion.TYPE_SCRIPT;
  }

  isHighConfidence() {
    return this._confidence === AISuggestion.CONFIDENCE_HIGH;
  }

  isMediumConfidence() {
    return this._confidence === AISuggestion.CONFIDENCE_MEDIUM;
  }

  isLowConfidence() {
    return this._confidence === AISuggestion.CONFIDENCE_LOW;
  }

  getConfidenceScore() {
    const confidenceMap = {
      [AISuggestion.CONFIDENCE_LOW]: 0.3,
      [AISuggestion.CONFIDENCE_MEDIUM]: 0.6,
      [AISuggestion.CONFIDENCE_HIGH]: 0.9
    };
    return confidenceMap[this._confidence] || 0.5;
  }

  requiresHumanReview() {
    return this.isLowConfidence() || this.isSecuritySuggestion();
  }

  canAutoApply() {
    return this.isHighConfidence() && !this.isSecuritySuggestion();
  }

  getPriority() {
    if (this.isSecuritySuggestion()) {
      return 'critical';
    }
    if (this.isHighConfidence()) {
      return 'high';
    }
    if (this.isMediumConfidence()) {
      return 'medium';
    }
    return 'low';
  }

  getEstimatedImpact() {
    const impactMap = {
      [AISuggestion.TYPE_SECURITY]: 'high',
      [AISuggestion.TYPE_OPTIMIZATION]: 'medium',
      [AISuggestion.TYPE_REFACTORING]: 'medium',
      [AISuggestion.TYPE_TASK]: 'low',
      [AISuggestion.TYPE_DOCUMENTATION]: 'low',
      [AISuggestion.TYPE_TEST]: 'low',
      [AISuggestion.TYPE_SCRIPT]: 'medium'
    };
    return impactMap[this._type] || 'low';
  }

  getEstimatedEffort() {
    const effortMap = {
      [AISuggestion.TYPE_SECURITY]: 'high',
      [AISuggestion.TYPE_REFACTORING]: 'high',
      [AISuggestion.TYPE_OPTIMIZATION]: 'medium',
      [AISuggestion.TYPE_SCRIPT]: 'medium',
      [AISuggestion.TYPE_TASK]: 'low',
      [AISuggestion.TYPE_DOCUMENTATION]: 'low',
      [AISuggestion.TYPE_TEST]: 'low'
    };
    return effortMap[this._type] || 'low';
  }

  toTaskData() {
    return {
      type: this._type,
      title: this._metadata.title || `AI ${this._type} suggestion`,
      description: this._content,
      priority: this.getPriority(),
      estimatedDuration: this._getEstimatedDuration(),
      requiresAI: true,
      metadata: {
        ...this._metadata,
        aiSuggestion: true,
        confidence: this._confidence,
        confidenceScore: this.getConfidenceScore()
      }
    };
  }

  _getEstimatedDuration() {
    const durationMap = {
      [AISuggestion.TYPE_SECURITY]: 1800, // 30 minutes
      [AISuggestion.TYPE_REFACTORING]: 3600, // 1 hour
      [AISuggestion.TYPE_OPTIMIZATION]: 1800, // 30 minutes
      [AISuggestion.TYPE_SCRIPT]: 900, // 15 minutes
      [AISuggestion.TYPE_TASK]: 600, // 10 minutes
      [AISuggestion.TYPE_DOCUMENTATION]: 900, // 15 minutes
      [AISuggestion.TYPE_TEST]: 1200 // 20 minutes
    };
    return durationMap[this._type] || 900;
  }

  _validate(type, confidence) {
    const validTypes = [
      AISuggestion.TYPE_TASK,
      AISuggestion.TYPE_REFACTORING,
      AISuggestion.TYPE_OPTIMIZATION,
      AISuggestion.TYPE_SECURITY,
      AISuggestion.TYPE_DOCUMENTATION,
      AISuggestion.TYPE_TEST,
      AISuggestion.TYPE_SCRIPT
    ];

    const validConfidences = [
      AISuggestion.CONFIDENCE_LOW,
      AISuggestion.CONFIDENCE_MEDIUM,
      AISuggestion.CONFIDENCE_HIGH
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`Invalid AI suggestion type: ${type}`);
    }

    if (!validConfidences.includes(confidence)) {
      throw new Error(`Invalid AI suggestion confidence: ${confidence}`);
    }

    if (!this._content || typeof this._content !== 'string' || this._content.trim().length === 0) {
      throw new Error('AI suggestion content is required and must be a non-empty string');
    }
  }

  toString() {
    return `[${this._type.toUpperCase()}] ${this._content.substring(0, 100)}... (${this._confidence} confidence)`;
  }

  equals(other) {
    return other instanceof AISuggestion &&
           this._type === other._type &&
           this._content === other._content &&
           this._confidence === other._confidence;
  }

  static fromString(type, content, confidence = AISuggestion.CONFIDENCE_MEDIUM, metadata = {}) {
    return new AISuggestion(type, content, confidence, metadata);
  }

  static getAllTypes() {
    return [
      AISuggestion.TYPE_TASK,
      AISuggestion.TYPE_REFACTORING,
      AISuggestion.TYPE_OPTIMIZATION,
      AISuggestion.TYPE_SECURITY,
      AISuggestion.TYPE_DOCUMENTATION,
      AISuggestion.TYPE_TEST,
      AISuggestion.TYPE_SCRIPT
    ];
  }

  static getAllConfidences() {
    return [
      AISuggestion.CONFIDENCE_LOW,
      AISuggestion.CONFIDENCE_MEDIUM,
      AISuggestion.CONFIDENCE_HIGH
    ];
  }

  static getDefaultConfidence() {
    return AISuggestion.CONFIDENCE_MEDIUM;
  }
}

module.exports = AISuggestion; 