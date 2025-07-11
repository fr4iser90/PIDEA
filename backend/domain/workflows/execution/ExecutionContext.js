/**
 * ExecutionContext - Manages execution context for workflow execution
 * Provides execution-specific context and state management
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Execution context for workflow execution
 */
class ExecutionContext {
  constructor(options = {}) {
    this.id = options.id || uuidv4();
    this.workflow = options.workflow;
    this.context = options.context;
    this.strategy = options.strategy;
    this.startTime = options.startTime || Date.now();
    this.options = { ...options.options };
    
    // Execution state
    this.status = 'initialized';
    this.currentStep = 0;
    this.totalSteps = 0;
    this.results = [];
    this.errors = [];
    this.metrics = {};
    this.logs = [];
    
    // Performance tracking
    this.stepStartTimes = new Map();
    this.stepDurations = new Map();
    
    // Dependencies and constraints
    this.dependencies = options.dependencies || [];
    this.constraints = options.constraints || {};
    
    this._validate();
  }

  /**
   * Validate execution context
   * @private
   */
  _validate() {
    if (!this.workflow) {
      throw new Error('Workflow is required for execution context');
    }
    
    if (!this.context) {
      throw new Error('Context is required for execution context');
    }
    
    if (!this.strategy) {
      throw new Error('Strategy is required for execution context');
    }
  }

  /**
   * Get execution ID
   * @returns {string} Execution ID
   */
  getId() {
    return this.id;
  }

  /**
   * Get workflow
   * @returns {IWorkflow} Workflow
   */
  getWorkflow() {
    return this.workflow;
  }

  /**
   * Get context
   * @returns {WorkflowContext} Workflow context
   */
  getContext() {
    return this.context;
  }

  /**
   * Get strategy
   * @returns {ExecutionStrategy} Execution strategy
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Get execution status
   * @returns {string} Execution status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Set execution status
   * @param {string} status - New status
   */
  setStatus(status) {
    this.status = status;
    this.addLog('info', `Execution status changed to: ${status}`);
  }

  /**
   * Get current step
   * @returns {number} Current step index
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * Set current step
   * @param {number} step - Step index
   */
  setCurrentStep(step) {
    this.currentStep = step;
  }

  /**
   * Get total steps
   * @returns {number} Total number of steps
   */
  getTotalSteps() {
    return this.totalSteps;
  }

  /**
   * Set total steps
   * @param {number} total - Total number of steps
   */
  setTotalSteps(total) {
    this.totalSteps = total;
  }

  /**
   * Get execution results
   * @returns {Array} Execution results
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Add execution result
   * @param {Object} result - Execution result
   */
  addResult(result) {
    this.results.push({
      ...result,
      timestamp: new Date(),
      stepIndex: this.currentStep
    });
  }

  /**
   * Get execution errors
   * @returns {Array} Execution errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Add execution error
   * @param {Error} error - Execution error
   */
  addError(error) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      stepIndex: this.currentStep
    });
  }

  /**
   * Get execution metrics
   * @returns {Object} Execution metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Set execution metric
   * @param {string} key - Metric key
   * @param {*} value - Metric value
   */
  setMetric(key, value) {
    this.metrics[key] = value;
  }

  /**
   * Get execution metric
   * @param {string} key - Metric key
   * @param {*} defaultValue - Default value
   * @returns {*} Metric value
   */
  getMetric(key, defaultValue = null) {
    return this.metrics[key] !== undefined ? this.metrics[key] : defaultValue;
  }

  /**
   * Increment execution metric
   * @param {string} key - Metric key
   * @param {number} amount - Amount to increment
   */
  incrementMetric(key, amount = 1) {
    const currentValue = this.getMetric(key, 0);
    this.setMetric(key, currentValue + amount);
  }

  /**
   * Get execution logs
   * @returns {Array} Execution logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Add execution log
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Log data
   */
  addLog(level, message, data = null) {
    this.logs.push({
      id: uuidv4(),
      level,
      message,
      data,
      timestamp: new Date(),
      stepIndex: this.currentStep
    });
  }

  /**
   * Get logs by level
   * @param {string} level - Log level
   * @returns {Array} Logs with specified level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs
   * @param {number} count - Number of recent logs to return
   * @returns {Array} Recent logs
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Get logs in time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Array} Logs in time range
   */
  getLogsInRange(startTime, endTime) {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Get execution duration
   * @returns {number} Execution duration in milliseconds
   */
  getDuration() {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted duration
   * @returns {string} Formatted duration
   */
  getFormattedDuration() {
    const duration = this.getDuration();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Start step timing
   * @param {number} stepIndex - Step index
   */
  startStepTiming(stepIndex) {
    this.stepStartTimes.set(stepIndex, Date.now());
  }

  /**
   * End step timing
   * @param {number} stepIndex - Step index
   * @returns {number} Step duration in milliseconds
   */
  endStepTiming(stepIndex) {
    const startTime = this.stepStartTimes.get(stepIndex);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.stepDurations.set(stepIndex, duration);
      this.stepStartTimes.delete(stepIndex);
      return duration;
    }
    return 0;
  }

  /**
   * Get step duration
   * @param {number} stepIndex - Step index
   * @returns {number} Step duration in milliseconds
   */
  getStepDuration(stepIndex) {
    return this.stepDurations.get(stepIndex) || 0;
  }

  /**
   * Get all step durations
   * @returns {Map} Step durations
   */
  getAllStepDurations() {
    return new Map(this.stepDurations);
  }

  /**
   * Get execution summary
   * @returns {Object} Execution summary
   */
  getSummary() {
    return {
      id: this.id,
      status: this.status,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      duration: this.getDuration(),
      formattedDuration: this.getFormattedDuration(),
      resultsCount: this.results.length,
      errorsCount: this.errors.length,
      logsCount: this.logs.length,
      metrics: this.getMetrics(),
      strategy: this.strategy?.name || 'unknown'
    };
  }

  /**
   * Check if execution is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled';
  }

  /**
   * Check if execution is running
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.status === 'running';
  }

  /**
   * Check if execution failed
   * @returns {boolean} True if failed
   */
  isFailed() {
    return this.status === 'failed';
  }

  /**
   * Get execution option
   * @param {string} key - Option key
   * @param {*} defaultValue - Default value
   * @returns {*} Option value
   */
  getOption(key, defaultValue = null) {
    return this.options[key] !== undefined ? this.options[key] : defaultValue;
  }

  /**
   * Set execution option
   * @param {string} key - Option key
   * @param {*} value - Option value
   */
  setOption(key, value) {
    this.options[key] = value;
  }

  /**
   * Get all execution options
   * @returns {Object} All options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Get dependencies
   * @returns {Array} Dependencies
   */
  getDependencies() {
    return [...this.dependencies];
  }

  /**
   * Add dependency
   * @param {string} dependency - Dependency
   */
  addDependency(dependency) {
    if (!this.dependencies.includes(dependency)) {
      this.dependencies.push(dependency);
    }
  }

  /**
   * Get constraints
   * @returns {Object} Constraints
   */
  getConstraints() {
    return { ...this.constraints };
  }

  /**
   * Set constraint
   * @param {string} key - Constraint key
   * @param {*} value - Constraint value
   */
  setConstraint(key, value) {
    this.constraints[key] = value;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      workflowId: this.workflow?.getMetadata()?.id,
      strategy: this.strategy?.name,
      startTime: this.startTime,
      status: this.status,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      results: this.results,
      errors: this.errors,
      metrics: this.metrics,
      logs: this.logs,
      options: this.options,
      dependencies: this.dependencies,
      constraints: this.constraints,
      duration: this.getDuration()
    };
  }

  /**
   * Create from JSON
   * @param {Object} data - JSON data
   * @returns {ExecutionContext} Execution context
   */
  static fromJSON(data) {
    return new ExecutionContext({
      id: data.id,
      workflow: data.workflow,
      context: data.context,
      strategy: data.strategy,
      startTime: data.startTime,
      options: data.options,
      dependencies: data.dependencies,
      constraints: data.constraints
    });
  }
}

module.exports = ExecutionContext; 