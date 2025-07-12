const { v4: uuidv4 } = require('uuid');

class AutoRefactorCommand {
  constructor({
    id = uuidv4(),
    projectPath,
    refactorType = 'complex_tests',
    scope = 'all',
    priority = 'normal',
    timeout = 1800000, // 30 minutes
    maxConcurrent = 3,
    dryRun = false,
    requestedBy,
    scheduledFor = null,
    metadata = {}
  }) {
    this.id = id;
    this.projectPath = projectPath;
    this.refactorType = refactorType;
    this.scope = scope;
    this.priority = priority;
    this.timeout = timeout;
    this.maxConcurrent = maxConcurrent;
    this.dryRun = dryRun;
    this.requestedBy = requestedBy;
    this.scheduledFor = scheduledFor;
    this.metadata = metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    this.validate();
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    if (!this.requestedBy) {
      throw new Error('Requested by is required');
    }
    if (!['complex_tests', 'legacy_tests', 'slow_tests', 'all'].includes(this.refactorType)) {
      throw new Error('Invalid refactor type');
    }
    if (!['all', 'unit', 'integration', 'e2e'].includes(this.scope)) {
      throw new Error('Invalid scope');
    }
    if (!['low', 'normal', 'high', 'critical'].includes(this.priority)) {
      throw new Error('Invalid priority');
    }
    if (this.timeout < 60000 || this.timeout > 7200000) {
      throw new Error('Timeout must be between 1 minute and 2 hours');
    }
    if (this.maxConcurrent < 1 || this.maxConcurrent > 10) {
      throw new Error('Max concurrent must be between 1 and 10');
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

  // Priority management
  isHighPriority() {
    return this.priority === 'high' || this.priority === 'critical';
  }

  isCriticalPriority() {
    return this.priority === 'critical';
  }

  // Refactor type management
  getRefactorStrategies() {
    const strategies = {
      complex_tests: [
        'extract_test_helpers',
        'split_large_tests',
        'simplify_assertions',
        'reduce_mocking_complexity'
      ],
      legacy_tests: [
        'update_jest_syntax',
        'modernize_test_structure',
        'improve_test_organization',
        'add_proper_setup_teardown'
      ],
      slow_tests: [
        'optimize_test_data',
        'reduce_external_dependencies',
        'improve_mocking_strategy',
        'parallelize_tests'
      ],
      all: [
        'extract_test_helpers',
        'split_large_tests',
        'simplify_assertions',
        'reduce_mocking_complexity',
        'update_jest_syntax',
        'modernize_test_structure',
        'optimize_test_data',
        'reduce_external_dependencies'
      ]
    };

    return strategies[this.refactorType] || strategies.all;
  }

  // Metadata management
  addMetadata(key, value) {
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  getMetadata(key) {
    return this.metadata[key];
  }

  // Business rules validation
  validateBusinessRules() {
    const errors = [];

    if (this.scheduledFor && this.scheduledFor < new Date()) {
      errors.push('Scheduled time cannot be in the past');
    }

    if (this.timeout > 3600000 && this.priority === 'critical') {
      errors.push('Critical priority tasks should not have timeout longer than 1 hour');
    }

    if (this.maxConcurrent > 5 && this.refactorType === 'complex_tests') {
      errors.push('Complex test refactoring should not exceed 5 concurrent operations');
    }

    return errors;
  }

  // Resource requirements
  getResourceRequirements() {
    return {
      memory: this.calculateMemoryRequirement(),
      cpu: this.calculateCpuRequirement(),
      disk: this.calculateDiskRequirement(),
      network: this.calculateNetworkRequirement()
    };
  }

  calculateMemoryRequirement() {
    let baseMemory = 512; // MB
    
    switch (this.refactorType) {
      case 'complex_tests':
        baseMemory *= 2;
        break;
      case 'legacy_tests':
        baseMemory *= 1.5;
        break;
      case 'slow_tests':
        baseMemory *= 1.2;
        break;
    }

    baseMemory *= this.maxConcurrent;
    
    return Math.min(baseMemory, 4096); // Cap at 4GB
  }

  calculateCpuRequirement() {
    let cpuCores = 1;
    
    if (this.maxConcurrent > 3) {
      cpuCores = 2;
    }
    
    if (this.refactorType === 'complex_tests') {
      cpuCores = Math.max(cpuCores, 2);
    }
    
    return cpuCores;
  }

  calculateDiskRequirement() {
    let diskSpace = 100; // MB
    
    switch (this.refactorType) {
      case 'complex_tests':
        diskSpace *= 3;
        break;
      case 'legacy_tests':
        diskSpace *= 2;
        break;
      case 'slow_tests':
        diskSpace *= 1.5;
        break;
    }
    
    return diskSpace;
  }

  calculateNetworkRequirement() {
    return this.refactorType === 'all' ? 'medium' : 'low';
  }

  // Estimated duration
  getEstimatedDuration() {
    let baseDuration = 300000; // 5 minutes
    
    switch (this.refactorType) {
      case 'complex_tests':
        baseDuration *= 3;
        break;
      case 'legacy_tests':
        baseDuration *= 2;
        break;
      case 'slow_tests':
        baseDuration *= 1.5;
        break;
      case 'all':
        baseDuration *= 4;
        break;
    }
    
    baseDuration *= this.maxConcurrent;
    
    return Math.min(baseDuration, this.timeout);
  }

  // Dependencies
  getDependencies() {
    return this.metadata.dependencies || [];
  }

  addDependency(dependency) {
    if (!this.metadata.dependencies) {
      this.metadata.dependencies = [];
    }
    
    if (!this.metadata.dependencies.includes(dependency)) {
      this.metadata.dependencies.push(dependency);
      this.updatedAt = new Date();
    }
  }

  removeDependency(dependency) {
    if (this.metadata.dependencies) {
      this.metadata.dependencies = this.metadata.dependencies.filter(d => d !== dependency);
      this.updatedAt = new Date();
    }
  }

  // Tags
  getTags() {
    const tags = ['auto-refactor', this.refactorType, this.scope];
    
    if (this.dryRun) {
      tags.push('dry-run');
    }
    
    if (this.isHighPriority()) {
      tags.push('high-priority');
    }
    
    return tags;
  }

  // Description
  getDescription() {
    const strategies = this.getRefactorStrategies().join(', ');
    return `Auto-refactor ${this.refactorType} tests in ${this.scope} scope using strategies: ${strategies}`;
  }

  // Priority calculation
  getPriority() {
    return this.priority;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      projectPath: this.projectPath,
      refactorType: this.refactorType,
      scope: this.scope,
      priority: this.priority,
      timeout: this.timeout,
      maxConcurrent: this.maxConcurrent,
      dryRun: this.dryRun,
      requestedBy: this.requestedBy,
      scheduledFor: this.scheduledFor,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new AutoRefactorCommand(data);
  }

  // Clone with new parameters
  clone(newParams = {}) {
    return new AutoRefactorCommand({
      ...this.toJSON(),
      ...newParams,
      id: undefined, // Generate new ID
      createdAt: undefined, // Reset creation time
      updatedAt: undefined // Reset update time
    });
  }

  // Static factory methods
  static createForComplexTests(projectPath, requestedBy, options = {}) {
    return new AutoRefactorCommand({
      projectPath,
      refactorType: 'complex_tests',
      requestedBy,
      priority: 'high',
      maxConcurrent: 3,
      ...options
    });
  }

  static createForLegacyTests(projectPath, requestedBy, options = {}) {
    return new AutoRefactorCommand({
      projectPath,
      refactorType: 'legacy_tests',
      requestedBy,
      priority: 'normal',
      maxConcurrent: 2,
      ...options
    });
  }

  static createForSlowTests(projectPath, requestedBy, options = {}) {
    return new AutoRefactorCommand({
      projectPath,
      refactorType: 'slow_tests',
      requestedBy,
      priority: 'normal',
      maxConcurrent: 4,
      ...options
    });
  }

  static createForAllTests(projectPath, requestedBy, options = {}) {
    return new AutoRefactorCommand({
      projectPath,
      refactorType: 'all',
      requestedBy,
      priority: 'high',
      maxConcurrent: 2,
      timeout: 3600000, // 1 hour
      ...options
    });
  }

  // Utility methods
  static validateRefactorType(refactorType) {
    return ['complex_tests', 'legacy_tests', 'slow_tests', 'all'].includes(refactorType);
  }

  static validateScope(scope) {
    return ['all', 'unit', 'integration', 'e2e'].includes(scope);
  }

  static getDefaultTimeout(refactorType) {
    const timeouts = {
      complex_tests: 900000, // 15 minutes
      legacy_tests: 600000,  // 10 minutes
      slow_tests: 450000,    // 7.5 minutes
      all: 1800000           // 30 minutes
    };
    
    return timeouts[refactorType] || 900000;
  }

  static getDefaultMaxConcurrent(refactorType) {
    const concurrent = {
      complex_tests: 3,
      legacy_tests: 2,
      slow_tests: 4,
      all: 2
    };
    
    return concurrent[refactorType] || 3;
  }
}

module.exports = AutoRefactorCommand; 