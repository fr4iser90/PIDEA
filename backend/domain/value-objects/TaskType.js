/**
 * TaskType - Value object for task type
 */
class TaskType {
  static FEATURE = 'feature';
  static BUG = 'bug';
  static REFACTOR = 'refactor';
  static DOCUMENTATION = 'documentation';
  static TEST = 'test';
  static OPTIMIZATION = 'optimization';
  static SECURITY = 'security';
  static ANALYSIS = 'analysis';

  constructor(value = TaskType.FEATURE) {
    if (!TaskType.isValid(value)) {
      throw new Error(`Invalid task type: ${value}`);
    }
    this.value = value;
  }

  requiresAI() {
    return [TaskType.FEATURE, TaskType.BUG, TaskType.OPTIMIZATION, TaskType.SECURITY, TaskType.ANALYSIS].includes(this.value);
  }

  requiresExecution() {
    return [TaskType.FEATURE, TaskType.BUG, TaskType.REFACTOR, TaskType.OPTIMIZATION, TaskType.SECURITY, TaskType.DOCUMENTATION, TaskType.ANALYSIS].includes(this.value);
  }

  requiresHumanReview() {
    return [TaskType.SECURITY, TaskType.BUG].includes(this.value);
  }

  isFeature() {
    return this.value === TaskType.FEATURE;
  }

  isBug() {
    return this.value === TaskType.BUG;
  }

  isRefactor() {
    return this.value === TaskType.REFACTOR;
  }

  isDocumentation() {
    return this.value === TaskType.DOCUMENTATION;
  }

  isTest() {
    return this.value === TaskType.TEST;
  }

  isOptimization() {
    return this.value === TaskType.OPTIMIZATION;
  }

  isSecurity() {
    return this.value === TaskType.SECURITY;
  }

  isAnalysis() {
    return this.value === TaskType.ANALYSIS;
  }

  static isValid(type) {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
      TaskType.TEST,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS
    ].includes(type);
  }

  static getAll() {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
      TaskType.TEST,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS
    ];
  }
}

module.exports = TaskType; 