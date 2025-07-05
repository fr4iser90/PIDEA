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

  constructor(value = TaskType.FEATURE) {
    this.value = value;
  }

  requiresAI() {
    return [TaskType.FEATURE, TaskType.BUG, TaskType.OPTIMIZATION, TaskType.SECURITY].includes(this.value);
  }

  requiresExecution() {
    return [TaskType.FEATURE, TaskType.BUG, TaskType.REFACTOR, TaskType.OPTIMIZATION, TaskType.SECURITY].includes(this.value);
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

  static isValid(type) {
    return Object.values(TaskType).includes(type);
  }

  static getAll() {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
      TaskType.TEST,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY
    ];
  }
}

module.exports = TaskType; 