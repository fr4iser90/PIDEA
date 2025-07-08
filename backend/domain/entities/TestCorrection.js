const { v4: uuidv4 } = require('uuid');

class TestCorrection {
  constructor({
    id = uuidv4(),
    testFile,
    testName,
    originalError,
    fixStrategy,
    fixApplied,
    status = 'pending',
    priority = 'normal',
    complexity = 0,
    estimatedTime = 0,
    actualTime = 0,
    attempts = 0,
    maxAttempts = 3,
    createdAt = new Date(),
    updatedAt = new Date(),
    completedAt = null,
    metadata = {},
    tags = []
  }) {
    this.id = id;
    this.testFile = testFile;
    this.testName = testName;
    this.originalError = originalError;
    this.fixStrategy = fixStrategy;
    this.fixApplied = fixApplied;
    this.status = status;
    this.priority = priority;
    this.complexity = complexity;
    this.estimatedTime = estimatedTime;
    this.actualTime = actualTime;
    this.attempts = attempts;
    this.maxAttempts = maxAttempts;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.completedAt = completedAt;
    this.metadata = metadata;
    this.tags = tags;

    this.validate();
  }

  validate() {
    if (!this.testFile) {
      throw new Error('Test file is required');
    }
    if (!this.testName) {
      throw new Error('Test name is required');
    }
    if (!this.originalError) {
      throw new Error('Original error is required');
    }
    if (!this.fixStrategy) {
      throw new Error('Fix strategy is required');
    }
  }

  // Status management
  isPending() {
    return this.status === 'pending';
  }

  isInProgress() {
    return this.status === 'in_progress';
  }

  isCompleted() {
    return this.status === 'completed';
  }

  isFailed() {
    return this.status === 'failed';
  }

  isSkipped() {
    return this.status === 'skipped';
  }

  // Priority management
  isHighPriority() {
    return this.priority === 'high';
  }

  isCriticalPriority() {
    return this.priority === 'critical';
  }

  // Attempt management
  canRetry() {
    return this.attempts < this.maxAttempts;
  }

  incrementAttempts() {
    this.attempts++;
    this.updatedAt = new Date();
  }

  // Status transitions
  start() {
    if (!this.isPending()) {
      throw new Error(`Cannot start test correction with status: ${this.status}`);
    }
    this.status = 'in_progress';
    this.updatedAt = new Date();
  }

  complete(fixApplied) {
    if (!this.isInProgress()) {
      throw new Error(`Cannot complete test correction with status: ${this.status}`);
    }
    this.status = 'completed';
    this.fixApplied = fixApplied;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  fail(error) {
    this.status = 'failed';
    this.metadata.lastError = error;
    this.updatedAt = new Date();
  }

  skip(reason) {
    this.status = 'skipped';
    this.metadata.skipReason = reason;
    this.updatedAt = new Date();
  }

  // Time tracking
  setActualTime(timeInMs) {
    this.actualTime = timeInMs;
    this.updatedAt = new Date();
  }

  getTimeDifference() {
    return this.actualTime - this.estimatedTime;
  }

  // Complexity assessment
  setComplexity(complexity) {
    this.complexity = Math.max(0, Math.min(100, complexity));
    this.updatedAt = new Date();
  }

  isComplex() {
    return this.complexity > 70;
  }

  // Metadata management
  addMetadata(key, value) {
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  getMetadata(key) {
    return this.metadata[key];
  }

  // Tag management
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.updatedAt = new Date();
  }

  hasTag(tag) {
    return this.tags.includes(tag);
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      testFile: this.testFile,
      testName: this.testName,
      originalError: this.originalError,
      fixStrategy: this.fixStrategy,
      fixApplied: this.fixApplied,
      status: this.status,
      priority: this.priority,
      complexity: this.complexity,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      metadata: this.metadata,
      tags: this.tags
    };
  }

  static fromJSON(data) {
    return new TestCorrection(data);
  }

  // Factory methods
  static createForFailingTest(testFile, testName, error, fixStrategy) {
    return new TestCorrection({
      testFile,
      testName,
      originalError: error,
      fixStrategy,
      priority: 'high',
      complexity: TestCorrection.assessComplexity(error, fixStrategy),
      estimatedTime: TestCorrection.estimateTime(fixStrategy)
    });
  }

  static createForLegacyTest(testFile, testName) {
    return new TestCorrection({
      testFile,
      testName,
      originalError: 'Legacy test pattern detected',
      fixStrategy: 'migrate',
      priority: 'medium',
      complexity: 50,
      estimatedTime: 300000, // 5 minutes
      tags: ['legacy']
    });
  }

  static createForComplexTest(testFile, testName, complexity) {
    return new TestCorrection({
      testFile,
      testName,
      originalError: 'High complexity test detected',
      fixStrategy: 'refactor',
      priority: 'normal',
      complexity,
      estimatedTime: TestCorrection.estimateTime('refactor'),
      tags: ['complex']
    });
  }

  // Utility methods
  static assessComplexity(error, fixStrategy) {
    let complexity = 0;
    
    // Error complexity
    if (error.includes('TypeError') || error.includes('ReferenceError')) {
      complexity += 20;
    }
    if (error.includes('Cannot read properties')) {
      complexity += 30;
    }
    if (error.includes('expect(received)')) {
      complexity += 15;
    }
    
    // Strategy complexity
    switch (fixStrategy) {
      case 'simple_fix':
        complexity += 10;
        break;
      case 'mock_fix':
        complexity += 25;
        break;
      case 'refactor':
        complexity += 50;
        break;
      case 'migrate':
        complexity += 40;
        break;
      case 'rewrite':
        complexity += 70;
        break;
    }
    
    return Math.min(100, complexity);
  }

  static estimateTime(fixStrategy) {
    const timeEstimates = {
      simple_fix: 60000,      // 1 minute
      mock_fix: 120000,       // 2 minutes
      refactor: 300000,       // 5 minutes
      migrate: 600000,        // 10 minutes
      rewrite: 900000         // 15 minutes
    };
    
    return timeEstimates[fixStrategy] || 120000;
  }
}

module.exports = TestCorrection; 