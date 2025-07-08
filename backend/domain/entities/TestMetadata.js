/**
 * TestMetadata Entity - Test file metadata and status tracking
 * Tracks test file information, status, versioning, and legacy detection
 */
const { v4: uuidv4 } = require('uuid');

class TestMetadata {
  constructor(
    id = uuidv4(),
    filePath,
    fileName,
    testName,
    status = 'unknown',
    version = '1.0.0',
    isLegacy = false,
    lastRunAt = null,
    lastModifiedAt = null,
    executionCount = 0,
    successCount = 0,
    failureCount = 0,
    averageDuration = 0,
    tags = [],
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this.id = id;
    this._filePath = filePath;
    this._fileName = fileName;
    this._testName = testName;
    this._status = status;
    this._version = version;
    this._isLegacy = isLegacy;
    this._lastRunAt = lastRunAt ? new Date(lastRunAt) : null;
    this._lastModifiedAt = lastModifiedAt ? new Date(lastModifiedAt) : null;
    this._executionCount = executionCount;
    this._successCount = successCount;
    this._failureCount = failureCount;
    this._averageDuration = averageDuration;
    this._tags = [...tags];
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._legacyScore = 0;
    this._complexityScore = 0;
    this._maintenanceScore = 0;

    this._validate();
  }

  // Getters
  get filePath() { return this._filePath; }
  get fileName() { return this._fileName; }
  get testName() { return this._testName; }
  get status() { return this._status; }
  get version() { return this._version; }
  get isLegacy() { return this._isLegacy; }
  get lastRunAt() { return this._lastRunAt ? new Date(this._lastRunAt) : null; }
  get lastModifiedAt() { return this._lastModifiedAt ? new Date(this._lastModifiedAt) : null; }
  get executionCount() { return this._executionCount; }
  get successCount() { return this._successCount; }
  get failureCount() { return this._failureCount; }
  get averageDuration() { return this._averageDuration; }
  get tags() { return [...this._tags]; }
  get metadata() { return { ...this._metadata }; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get legacyScore() { return this._legacyScore; }
  get complexityScore() { return this._complexityScore; }
  get maintenanceScore() { return this._maintenanceScore; }

  // Domain methods
  isPassing() {
    return this._status === 'passing';
  }

  isFailing() {
    return this._status === 'failing';
  }

  isSkipped() {
    return this._status === 'skipped';
  }

  isPending() {
    return this._status === 'pending';
  }

  isUnknown() {
    return this._status === 'unknown';
  }

  hasBeenRun() {
    return this._lastRunAt !== null;
  }

  getSuccessRate() {
    if (this._executionCount === 0) return 0;
    return (this._successCount / this._executionCount) * 100;
  }

  getFailureRate() {
    if (this._executionCount === 0) return 0;
    return (this._failureCount / this._executionCount) * 100;
  }

  isRecentlyModified(days = 30) {
    if (!this._lastModifiedAt) return false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this._lastModifiedAt > cutoffDate;
  }

  isFrequentlyRun(minRuns = 5) {
    return this._executionCount >= minRuns;
  }

  isStable(minSuccessRate = 80) {
    return this.getSuccessRate() >= minSuccessRate;
  }

  needsMaintenance() {
    return this._maintenanceScore > 70;
  }

  isHighComplexity() {
    return this._complexityScore > 80;
  }

  // State transitions
  markAsPassing(duration = 0) {
    this._status = 'passing';
    this._lastRunAt = new Date();
    this._executionCount++;
    this._successCount++;
    this._updateAverageDuration(duration);
    this._updatedAt = new Date();
  }

  markAsFailing(duration = 0, error = null) {
    this._status = 'failing';
    this._lastRunAt = new Date();
    this._executionCount++;
    this._failureCount++;
    this._updateAverageDuration(duration);
    if (error) {
      this._metadata.lastError = error;
    }
    this._updatedAt = new Date();
  }

  markAsSkipped() {
    this._status = 'skipped';
    this._lastRunAt = new Date();
    this._updatedAt = new Date();
  }

  markAsPending() {
    this._status = 'pending';
    this._updatedAt = new Date();
  }

  markAsLegacy(score = 100) {
    this._isLegacy = true;
    this._legacyScore = Math.min(score, 100);
    this._updatedAt = new Date();
  }

  updateVersion(version) {
    this._version = version;
    this._updatedAt = new Date();
  }

  updateLastModified() {
    this._lastModifiedAt = new Date();
    this._updatedAt = new Date();
  }

  setComplexityScore(score) {
    this._complexityScore = Math.min(Math.max(score, 0), 100);
    this._updatedAt = new Date();
  }

  setMaintenanceScore(score) {
    this._maintenanceScore = Math.min(Math.max(score, 0), 100);
    this._updatedAt = new Date();
  }

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

  // Utility methods
  _updateAverageDuration(duration) {
    if (duration > 0) {
      const totalDuration = this._averageDuration * (this._executionCount - 1) + duration;
      this._averageDuration = totalDuration / this._executionCount;
    }
  }

  _validate() {
    if (!this._filePath) {
      throw new Error('File path is required for TestMetadata');
    }
    if (!this._fileName) {
      throw new Error('File name is required for TestMetadata');
    }
    if (!this._testName) {
      throw new Error('Test name is required for TestMetadata');
    }
    if (this._executionCount < 0) {
      throw new Error('Execution count cannot be negative');
    }
    if (this._successCount < 0) {
      throw new Error('Success count cannot be negative');
    }
    if (this._failureCount < 0) {
      throw new Error('Failure count cannot be negative');
    }
    if (this._averageDuration < 0) {
      throw new Error('Average duration cannot be negative');
    }
  }

  toJSON() {
    return {
      id: this.id,
      filePath: this._filePath,
      fileName: this._fileName,
      testName: this._testName,
      status: this._status,
      version: this._version,
      isLegacy: this._isLegacy,
      lastRunAt: this._lastRunAt,
      lastModifiedAt: this._lastModifiedAt,
      executionCount: this._executionCount,
      successCount: this._successCount,
      failureCount: this._failureCount,
      averageDuration: this._averageDuration,
      tags: [...this._tags],
      metadata: { ...this._metadata },
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      legacyScore: this._legacyScore,
      complexityScore: this._complexityScore,
      maintenanceScore: this._maintenanceScore
    };
  }

  static fromJSON(data) {
    const instance = new TestMetadata(
      data.id,
      data.filePath,
      data.fileName,
      data.testName,
      data.status,
      data.version,
      data.isLegacy,
      data.lastRunAt,
      data.lastModifiedAt,
      data.executionCount,
      data.successCount,
      data.failureCount,
      data.averageDuration,
      data.tags,
      data.metadata,
      data.createdAt,
      data.updatedAt
    );
    if (typeof data.legacyScore === 'number') instance._legacyScore = data.legacyScore;
    if (typeof data.complexityScore === 'number') instance._complexityScore = data.complexityScore;
    if (typeof data.maintenanceScore === 'number') instance._maintenanceScore = data.maintenanceScore;
    return instance;
  }

  static create(filePath, fileName, testName, metadata = {}) {
    return new TestMetadata(
      undefined,
      filePath,
      fileName,
      testName,
      'unknown',
      '1.0.0',
      false,
      null,
      null,
      0,
      0,
      0,
      0,
      [],
      metadata
    );
  }

  // Comparison methods
  equals(other) {
    return this.id === other.id;
  }

  isSameTest(other) {
    return this._filePath === other._filePath && this._testName === other._testName;
  }

  // Analytics methods
  getHealthScore() {
    let score = 100;
    
    // Deduct points for failures
    if (this._failureCount > 0) {
      score -= (this._failureCount / this._executionCount) * 50;
    }
    
    // Deduct points for legacy status
    if (this._isLegacy) {
      score -= this._legacyScore * 0.3;
    }
    
    // Deduct points for high complexity
    if (this._complexityScore > 80) {
      score -= (this._complexityScore - 80) * 0.2;
    }
    
    // Deduct points for maintenance needs
    if (this._maintenanceScore > 70) {
      score -= (this._maintenanceScore - 70) * 0.3;
    }
    
    return Math.max(0, Math.round(score));
  }

  getPriority() {
    const healthScore = this.getHealthScore();
    if (healthScore < 30) return 'critical';
    if (healthScore < 60) return 'high';
    if (healthScore < 80) return 'medium';
    return 'low';
  }
}

module.exports = TestMetadata; 