const { v4: uuidv4 } = require('uuid');

class CoverageTarget {
  constructor({
    id = uuidv4(),
    targetPercentage = 90,
    currentPercentage = 0,
    scope = 'all', // 'all', 'unit', 'integration', 'e2e'
    priority = 'high',
    deadline = null,
    status = 'pending',
    createdAt = new Date(),
    updatedAt = new Date(),
    achievedAt = null,
    metadata = {},
    strategies = []
  }) {
    this.id = id;
    this.targetPercentage = targetPercentage;
    this.currentPercentage = currentPercentage;
    this.scope = scope;
    this.priority = priority;
    this.deadline = deadline;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.achievedAt = achievedAt;
    this.metadata = metadata;
    this.strategies = strategies;

    this.validate();
  }

  validate() {
    if (this.targetPercentage < 0 || this.targetPercentage > 100) {
      throw new Error('Target percentage must be between 0 and 100');
    }
    if (this.currentPercentage < 0 || this.currentPercentage > 100) {
      throw new Error('Current percentage must be between 0 and 100');
    }
    if (!['all', 'unit', 'integration', 'e2e'].includes(this.scope)) {
      throw new Error('Invalid scope. Must be one of: all, unit, integration, e2e');
    }
  }

  // Status management
  isPending() {
    return this.status === 'pending';
  }

  isInProgress() {
    return this.status === 'in_progress';
  }

  isAchieved() {
    return this.status === 'achieved';
  }

  isOverdue() {
    return this.deadline && new Date() > this.deadline && !this.isAchieved();
  }

  // Progress calculation
  getProgress() {
    return (this.currentPercentage / this.targetPercentage) * 100;
  }

  getRemainingPercentage() {
    return Math.max(0, this.targetPercentage - this.currentPercentage);
  }

  isOnTrack() {
    if (!this.deadline) return true;
    
    const totalTime = this.deadline.getTime() - this.createdAt.getTime();
    const elapsedTime = new Date().getTime() - this.createdAt.getTime();
    const expectedProgress = (elapsedTime / totalTime) * 100;
    
    return this.getProgress() >= expectedProgress;
  }

  // Coverage updates
  updateCoverage(newPercentage) {
    this.currentPercentage = Math.max(0, Math.min(100, newPercentage));
    this.updatedAt = new Date();
    
    if (this.currentPercentage >= this.targetPercentage && !this.isAchieved()) {
      this.achieve();
    }
  }

  achieve() {
    this.status = 'achieved';
    this.achievedAt = new Date();
    this.updatedAt = new Date();
  }

  // Strategy management
  addStrategy(strategy) {
    if (!this.strategies.includes(strategy)) {
      this.strategies.push(strategy);
      this.updatedAt = new Date();
    }
  }

  removeStrategy(strategy) {
    this.strategies = this.strategies.filter(s => s !== strategy);
    this.updatedAt = new Date();
  }

  hasStrategy(strategy) {
    return this.strategies.includes(strategy);
  }

  // Metadata management
  addMetadata(key, value) {
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  getMetadata(key) {
    return this.metadata[key];
  }

  // Priority management
  isHighPriority() {
    return this.priority === 'high';
  }

  isCriticalPriority() {
    return this.priority === 'critical';
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      targetPercentage: this.targetPercentage,
      currentPercentage: this.currentPercentage,
      scope: this.scope,
      priority: this.priority,
      deadline: this.deadline,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      achievedAt: this.achievedAt,
      metadata: this.metadata,
      strategies: this.strategies
    };
  }

  static fromJSON(data) {
    return new CoverageTarget(data);
  }

  // Factory methods
  static createForProject(targetPercentage = 90, scope = 'all') {
    return new CoverageTarget({
      targetPercentage,
      scope,
      priority: 'high',
      strategies: CoverageTarget.getDefaultStrategies(scope)
    });
  }

  static createForUnitTests(targetPercentage = 95) {
    return new CoverageTarget({
      targetPercentage,
      scope: 'unit',
      priority: 'high',
      strategies: CoverageTarget.getDefaultStrategies('unit')
    });
  }

  static createForIntegrationTests(targetPercentage = 85) {
    return new CoverageTarget({
      targetPercentage,
      scope: 'integration',
      priority: 'medium',
      strategies: CoverageTarget.getDefaultStrategies('integration')
    });
  }

  static createForE2ETests(targetPercentage = 75) {
    return new CoverageTarget({
      targetPercentage,
      scope: 'e2e',
      priority: 'normal',
      strategies: CoverageTarget.getDefaultStrategies('e2e')
    });
  }

  // Utility methods
  static getDefaultStrategies(scope) {
    const strategies = {
      all: [
        'fix_failing_tests',
        'add_missing_tests',
        'improve_test_quality',
        'remove_legacy_tests',
        'optimize_slow_tests'
      ],
      unit: [
        'fix_unit_test_errors',
        'add_unit_test_cases',
        'improve_unit_test_coverage',
        'mock_external_dependencies'
      ],
      integration: [
        'fix_integration_test_errors',
        'add_integration_test_scenarios',
        'improve_integration_test_coverage',
        'optimize_test_data_setup'
      ],
      e2e: [
        'fix_e2e_test_errors',
        'add_e2e_test_scenarios',
        'improve_e2e_test_coverage',
        'optimize_browser_tests'
      ]
    };
    
    return strategies[scope] || strategies.all;
  }

  static calculateTimeToTarget(currentPercentage, targetPercentage, testsPerHour = 10) {
    const remainingPercentage = targetPercentage - currentPercentage;
    const estimatedTests = Math.ceil(remainingPercentage * 0.1); // Rough estimate
    const hoursNeeded = estimatedTests / testsPerHour;
    
    return Math.ceil(hoursNeeded);
  }

  static assessDifficulty(currentPercentage, targetPercentage) {
    const gap = targetPercentage - currentPercentage;
    
    if (gap <= 5) return 'easy';
    if (gap <= 15) return 'medium';
    if (gap <= 30) return 'hard';
    return 'very_hard';
  }
}

module.exports = CoverageTarget; 