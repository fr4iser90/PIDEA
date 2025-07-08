/**
 * TaskType - Value object for task type
 */
class TaskType {
  static FEATURE = 'feature';
  static BUG = 'bug';
  static REFACTOR = 'refactor';
  static DOCUMENTATION = 'documentation';
  static TEST = 'test';
  static TESTING = 'testing';
  static TEST_FIX = 'test_fix';
  static TEST_COVERAGE = 'test_coverage';
  static TEST_REFACTOR = 'test_refactor';
  static TEST_STATUS = 'test_status';
  static TEST_REPORT = 'test_report';
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
    return [TaskType.FEATURE, TaskType.BUG, TaskType.OPTIMIZATION, TaskType.SECURITY, TaskType.ANALYSIS, TaskType.TEST, TaskType.TESTING, TaskType.TEST_FIX, TaskType.TEST_COVERAGE, TaskType.TEST_REFACTOR].includes(this.value);
  }

  requiresExecution() {
    return [TaskType.FEATURE, TaskType.BUG, TaskType.REFACTOR, TaskType.OPTIMIZATION, TaskType.SECURITY, TaskType.DOCUMENTATION, TaskType.ANALYSIS, TaskType.TEST, TaskType.TESTING, TaskType.TEST_FIX, TaskType.TEST_COVERAGE, TaskType.TEST_REFACTOR, TaskType.TEST_STATUS, TaskType.TEST_REPORT].includes(this.value);
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

  isTesting() {
    return this.value === TaskType.TESTING;
  }

  isTestFix() {
    return this.value === TaskType.TEST_FIX;
  }

  isTestCoverage() {
    return this.value === TaskType.TEST_COVERAGE;
  }

  isTestRefactor() {
    return this.value === TaskType.TEST_REFACTOR;
  }

  isTestStatus() {
    return this.value === TaskType.TEST_STATUS;
  }

  isTestReport() {
    return this.value === TaskType.TEST_REPORT;
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
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS,
      TaskType.TEST_REPORT,
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
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS,
      TaskType.TEST_REPORT,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS
    ];
  }
}

module.exports = TaskType; 