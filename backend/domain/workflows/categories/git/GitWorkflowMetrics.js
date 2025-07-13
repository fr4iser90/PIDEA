/**
 * GitWorkflowMetrics - Metrics collection for Git workflow operations
 * Tracks performance, success rates, and operational metrics
 */
class GitWorkflowMetrics {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.timers = new Map();
    this.histograms = new Map();
    
    // Initialize default metrics
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default metrics
   */
  initializeDefaultMetrics() {
    // Workflow execution metrics
    this.initializeCounter('workflow.executions.total');
    this.initializeCounter('workflow.executions.success');
    this.initializeCounter('workflow.executions.failure');
    this.initializeCounter('workflow.executions.skipped');
    
    // Step execution metrics
    this.initializeCounter('workflow.steps.branch.created');
    this.initializeCounter('workflow.steps.branch.failed');
    this.initializeCounter('workflow.steps.workflow.executed');
    this.initializeCounter('workflow.steps.workflow.failed');
    this.initializeCounter('workflow.steps.pull_request.created');
    this.initializeCounter('workflow.steps.pull_request.failed');
    this.initializeCounter('workflow.steps.review.completed');
    this.initializeCounter('workflow.steps.review.failed');
    this.initializeCounter('workflow.steps.merge.completed');
    this.initializeCounter('workflow.steps.merge.failed');
    
    // Performance metrics
    this.initializeTimer('workflow.duration.total');
    this.initializeTimer('workflow.duration.branch');
    this.initializeTimer('workflow.duration.workflow');
    this.initializeTimer('workflow.duration.pull_request');
    this.initializeTimer('workflow.duration.review');
    this.initializeTimer('workflow.duration.merge');
    
    // Error metrics
    this.initializeCounter('workflow.errors.validation');
    this.initializeCounter('workflow.errors.git_service');
    this.initializeCounter('workflow.errors.permission');
    this.initializeCounter('workflow.errors.network');
    this.initializeCounter('workflow.errors.unknown');
    
    // Strategy metrics
    this.initializeCounter('strategy.branch.feature');
    this.initializeCounter('strategy.branch.hotfix');
    this.initializeCounter('strategy.branch.release');
    this.initializeCounter('strategy.merge.squash');
    this.initializeCounter('strategy.merge.merge');
    this.initializeCounter('strategy.merge.rebase');
    this.initializeCounter('strategy.merge.fast_forward');
  }

  /**
   * Initialize a counter metric
   * @param {string} name - Metric name
   * @param {number} initialValue - Initial value
   */
  initializeCounter(name, initialValue = 0) {
    this.counters.set(name, initialValue);
  }

  /**
   * Initialize a timer metric
   * @param {string} name - Metric name
   */
  initializeTimer(name) {
    this.timers.set(name, {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
      average: 0
    });
  }

  /**
   * Initialize a histogram metric
   * @param {string} name - Metric name
   * @param {Array<number>} buckets - Histogram buckets
   */
  initializeHistogram(name, buckets = [10, 50, 100, 500, 1000, 5000]) {
    this.histograms.set(name, {
      buckets: buckets,
      counts: new Array(buckets.length + 1).fill(0),
      sum: 0,
      count: 0
    });
  }

  /**
   * Increment a counter
   * @param {string} name - Counter name
   * @param {number} value - Increment value
   */
  incrementCounter(name, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a timer measurement
   * @param {string} name - Timer name
   * @param {number} duration - Duration in milliseconds
   */
  recordTimer(name, duration) {
    const timer = this.timers.get(name);
    if (!timer) {
      this.initializeTimer(name);
    }
    
    const currentTimer = this.timers.get(name);
    currentTimer.count++;
    currentTimer.total += duration;
    currentTimer.min = Math.min(currentTimer.min, duration);
    currentTimer.max = Math.max(currentTimer.max, duration);
    currentTimer.average = currentTimer.total / currentTimer.count;
  }

  /**
   * Record a histogram value
   * @param {string} name - Histogram name
   * @param {number} value - Value to record
   */
  recordHistogram(name, value) {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      this.initializeHistogram(name);
    }
    
    const currentHistogram = this.histograms.get(name);
    currentHistogram.count++;
    currentHistogram.sum += value;
    
    // Find appropriate bucket
    let bucketIndex = currentHistogram.buckets.length;
    for (let i = 0; i < currentHistogram.buckets.length; i++) {
      if (value <= currentHistogram.buckets[i]) {
        bucketIndex = i;
        break;
      }
    }
    
    currentHistogram.counts[bucketIndex]++;
  }

  /**
   * Record workflow execution metrics
   * @param {Object} task - Task object
   * @param {number} duration - Execution duration
   * @param {Object} results - Step results
   */
  recordWorkflowExecution(task, duration, results = {}) {
    const taskType = task.type?.value || 'unknown';
    const automationLevel = task.metadata?.automationLevel || 'unknown';
    
    // Increment total executions
    this.incrementCounter('workflow.executions.total');
    
    // Record total duration
    this.recordTimer('workflow.duration.total', duration);
    
    // Record step-specific metrics
    if (results.branchResult) {
      this.recordStepMetrics('branch', results.branchResult);
    }
    
    if (results.workflowResult) {
      this.recordStepMetrics('workflow', results.workflowResult);
    }
    
    if (results.prResult) {
      this.recordStepMetrics('pull_request', results.prResult);
    }
    
    if (results.reviewResult) {
      this.recordStepMetrics('review', results.reviewResult);
    }
    
    if (results.mergeResult) {
      this.recordStepMetrics('merge', results.mergeResult);
    }
    
    // Record task type metrics
    this.incrementCounter(`task.type.${taskType}`);
    
    // Record automation level metrics
    this.incrementCounter(`automation.level.${automationLevel}`);
  }

  /**
   * Record workflow failure metrics
   * @param {Object} task - Task object
   * @param {number} duration - Execution duration
   * @param {Error} error - Error object
   */
  recordWorkflowFailure(task, duration, error) {
    const taskType = task.type?.value || 'unknown';
    const errorType = this.categorizeError(error);
    
    // Increment failure counter
    this.incrementCounter('workflow.executions.failure');
    
    // Record error type
    this.incrementCounter(`workflow.errors.${errorType}`);
    
    // Record task type failure
    this.incrementCounter(`task.type.${taskType}.failure`);
    
    // Record duration even for failures
    this.recordTimer('workflow.duration.total', duration);
  }

  /**
   * Record step-specific metrics
   * @param {string} stepName - Step name
   * @param {Object} result - Step result
   */
  recordStepMetrics(stepName, result) {
    if (result.success) {
      this.incrementCounter(`workflow.steps.${stepName}.completed`);
    } else {
      this.incrementCounter(`workflow.steps.${stepName}.failed`);
    }
    
    if (result.duration) {
      this.recordTimer(`workflow.duration.${stepName}`, result.duration);
    }
    
    if (result.skipped) {
      this.incrementCounter(`workflow.steps.${stepName}.skipped`);
    }
  }

  /**
   * Record strategy usage metrics
   * @param {string} strategyType - Strategy type (branch or merge)
   * @param {string} strategyName - Strategy name
   */
  recordStrategyUsage(strategyType, strategyName) {
    this.incrementCounter(`strategy.${strategyType}.${strategyName}`);
  }

  /**
   * Categorize error for metrics
   * @param {Error} error - Error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (!error) {
      return 'unknown';
    }
    
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (message.includes('git') || message.includes('repository')) {
      return 'git_service';
    }
    
    if (message.includes('permission') || message.includes('access') || message.includes('unauthorized')) {
      return 'permission';
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'network';
    }
    
    return 'unknown';
  }

  /**
   * Get counter value
   * @param {string} name - Counter name
   * @returns {number} Counter value
   */
  getCounter(name) {
    return this.counters.get(name) || 0;
  }

  /**
   * Get timer statistics
   * @param {string} name - Timer name
   * @returns {Object} Timer statistics
   */
  getTimer(name) {
    return this.timers.get(name) || {
      count: 0,
      total: 0,
      min: 0,
      max: 0,
      average: 0
    };
  }

  /**
   * Get histogram statistics
   * @param {string} name - Histogram name
   * @returns {Object} Histogram statistics
   */
  getHistogram(name) {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      return {
        buckets: [],
        counts: [],
        sum: 0,
        count: 0,
        average: 0
      };
    }
    
    return {
      ...histogram,
      average: histogram.count > 0 ? histogram.sum / histogram.count : 0
    };
  }

  /**
   * Get all metrics
   * @returns {Object} All metrics
   */
  getAllMetrics() {
    const counters = {};
    const timers = {};
    const histograms = {};
    
    // Convert counters
    for (const [name, value] of this.counters.entries()) {
      counters[name] = value;
    }
    
    // Convert timers
    for (const [name, timer] of this.timers.entries()) {
      timers[name] = {
        ...timer,
        average: timer.count > 0 ? timer.total / timer.count : 0
      };
    }
    
    // Convert histograms
    for (const [name, histogram] of this.histograms.entries()) {
      histograms[name] = {
        ...histogram,
        average: histogram.count > 0 ? histogram.sum / histogram.count : 0
      };
    }
    
    return {
      counters,
      timers,
      histograms,
      timestamp: new Date()
    };
  }

  /**
   * Get workflow success rate
   * @returns {number} Success rate percentage
   */
  getSuccessRate() {
    const total = this.getCounter('workflow.executions.total');
    const success = this.getCounter('workflow.executions.success');
    
    if (total === 0) {
      return 0;
    }
    
    return Math.round((success / total) * 100);
  }

  /**
   * Get average workflow duration
   * @returns {number} Average duration in milliseconds
   */
  getAverageWorkflowDuration() {
    const timer = this.getTimer('workflow.duration.total');
    return timer.average;
  }

  /**
   * Get step success rates
   * @returns {Object} Step success rates
   */
  getStepSuccessRates() {
    const steps = ['branch', 'workflow', 'pull_request', 'review', 'merge'];
    const rates = {};
    
    for (const step of steps) {
      const completed = this.getCounter(`workflow.steps.${step}.completed`);
      const failed = this.getCounter(`workflow.steps.${step}.failed`);
      const total = completed + failed;
      
      rates[step] = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
    
    return rates;
  }

  /**
   * Get error distribution
   * @returns {Object} Error distribution
   */
  getErrorDistribution() {
    const errorTypes = ['validation', 'git_service', 'permission', 'network', 'unknown'];
    const distribution = {};
    
    for (const errorType of errorTypes) {
      distribution[errorType] = this.getCounter(`workflow.errors.${errorType}`);
    }
    
    return distribution;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.timers.clear();
    this.histograms.clear();
    this.initializeDefaultMetrics();
  }

  /**
   * Export metrics for external systems
   * @returns {Object} Exported metrics
   */
  export() {
    return {
      successRate: this.getSuccessRate(),
      averageDuration: this.getAverageWorkflowDuration(),
      stepSuccessRates: this.getStepSuccessRates(),
      errorDistribution: this.getErrorDistribution(),
      metrics: this.getAllMetrics(),
      timestamp: new Date()
    };
  }
}

module.exports = GitWorkflowMetrics; 