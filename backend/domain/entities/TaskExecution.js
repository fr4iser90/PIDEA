/**
 * TaskExecution Entity
 * Tracks task execution with comprehensive monitoring and logging
 */
const { v4: uuidv4 } = require('uuid');
const TaskStatus = require('@/domain/value-objects/TaskStatus');

class TaskExecution {
  constructor(
    id = uuidv4(),
    taskId,
    status = TaskStatus.PENDING,
    startedAt = null,
    completedAt = null,
    result = null,
    error = null,
    logs = [],
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this._id = id;
    this._taskId = taskId;
    this._status = new TaskStatus(status);
    this._startedAt = startedAt ? new Date(startedAt) : null;
    this._completedAt = completedAt ? new Date(completedAt) : null;
    this._result = result;
    this._error = error;
    this._logs = [...logs];
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._progress = 0;
    this._currentStep = null;
    this._steps = [];
    this._performanceMetrics = {
      cpuUsage: [],
      memoryUsage: [],
      executionTime: 0
    };

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get taskId() { return this._taskId; }
  get status() { return this._status; }
  get startedAt() { return this._startedAt ? new Date(this._startedAt) : null; }
  get completedAt() { return this._completedAt ? new Date(this._completedAt) : null; }
  get result() { return this._result; }
  get error() { return this._error; }
  get logs() { return [...this._logs]; }
  get metadata() { return { ...this._metadata }; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get progress() { return this._progress; }
  get currentStep() { return this._currentStep; }
  get steps() { return [...this._steps]; }
  get performanceMetrics() { return { ...this._performanceMetrics }; }

  // Domain methods
  isPending() {
    return this._status.isPending();
  }

  isInProgress() {
    return this._status.isInProgress();
  }

  isCompleted() {
    return this._status.isCompleted();
  }

  isFailed() {
    return this._status.isFailed();
  }

  isCancelled() {
    return this._status.isCancelled();
  }

  isRunning() {
    return this.isInProgress() && this._startedAt && !this._completedAt;
  }

  hasStarted() {
    return this._startedAt !== null;
  }

  hasCompleted() {
    return this._completedAt !== null;
  }

  hasError() {
    return this._error !== null;
  }

  getDuration() {
    if (!this._startedAt) {
      return 0;
    }

    const endTime = this._completedAt || new Date();
    return Math.floor((endTime - this._startedAt) / 1000);
  }

  getFormattedDuration() {
    const duration = this.getDuration();
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // State transitions
  start() {
    if (this.hasStarted()) {
      throw new Error('Task execution has already started');
    }

    this._status = this._status.transitionTo(TaskStatus.IN_PROGRESS);
    this._startedAt = new Date();
    this._updatedAt = new Date();
    this._progress = 0;
    this._addLog('info', 'Task execution started');
  }

  complete(result = null) {
    if (!this.isRunning()) {
      throw new Error('Cannot complete task execution that is not running');
    }

    this._status = this._status.transitionTo(TaskStatus.COMPLETED);
    this._completedAt = new Date();
    this._updatedAt = new Date();
    this._result = result;
    this._progress = 100;
    this._currentStep = null;
    this._addLog('info', 'Task execution completed successfully', { result });
  }

  fail(error) {
    if (!this.isRunning()) {
      throw new Error('Cannot fail task execution that is not running');
    }

    this._status = this._status.transitionTo(TaskStatus.FAILED);
    this._completedAt = new Date();
    this._updatedAt = new Date();
    this._error = error;
    this._currentStep = null;
    this._addLog('error', 'Task execution failed', { error: error.message || error });
  }

  cancel(reason = null) {
    if (this.hasCompleted()) {
      throw new Error('Cannot cancel completed task execution');
    }

    this._status = this._status.transitionTo(TaskStatus.CANCELLED);
    this._completedAt = new Date();
    this._updatedAt = new Date();
    this._currentStep = null;
    this._addLog('warn', 'Task execution cancelled', { reason });
  }

  retry() {
    if (!this.isFailed()) {
      throw new Error('Can only retry failed task executions');
    }

    this._status = this._status.transitionTo(TaskStatus.PENDING);
    this._startedAt = null;
    this._completedAt = null;
    this._result = null;
    this._error = null;
    this._progress = 0;
    this._currentStep = null;
    this._updatedAt = new Date();
    this._addLog('info', 'Task execution retry initiated');
  }

  // Progress management
  updateProgress(progress, step = null) {
    if (!this.isRunning()) {
      throw new Error('Cannot update progress for non-running task execution');
    }

    this._progress = Math.max(0, Math.min(100, progress));
    this._currentStep = step;
    this._updatedAt = new Date();

    if (step) {
      this._addLog('info', `Progress updated: ${progress}%`, { step, progress });
    }
  }

  addStep(step) {
    this._steps.push({
      name: step,
      startedAt: new Date(),
      completedAt: null,
      status: 'pending'
    });
    this._currentStep = step;
    this._addLog('info', `Step started: ${step}`);
  }

  completeStep(step, result = null) {
    const stepIndex = this._steps.findIndex(s => s.name === step);
    if (stepIndex === -1) {
      throw new Error(`Step ${step} not found`);
    }

    this._steps[stepIndex].completedAt = new Date();
    this._steps[stepIndex].status = 'completed';
    this._steps[stepIndex].result = result;
    this._currentStep = null;
    this._addLog('info', `Step completed: ${step}`, { result });
  }

  failStep(step, error = null) {
    const stepIndex = this._steps.findIndex(s => s.name === step);
    if (stepIndex === -1) {
      throw new Error(`Step ${step} not found`);
    }

    this._steps[stepIndex].completedAt = new Date();
    this._steps[stepIndex].status = 'failed';
    this._steps[stepIndex].error = error;
    this._currentStep = null;
    this._addLog('error', `Step failed: ${step}`, { error: error?.message || error });
  }

  // Logging
  addLog(level, message, data = null) {
    this._logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
    this._updatedAt = new Date();
  }

  getLogsByLevel(level) {
    return this._logs.filter(log => log.level === level);
  }

  getRecentLogs(limit = 10) {
    return this._logs.slice(-limit);
  }

  getErrorLogs() {
    return this.getLogsByLevel('error');
  }

  getWarningLogs() {
    return this.getLogsByLevel('warn');
  }

  getInfoLogs() {
    return this.getLogsByLevel('info');
  }

  // Performance monitoring
  addPerformanceMetric(type, value) {
    if (!this._performanceMetrics[type]) {
      this._performanceMetrics[type] = [];
    }
    
    this._performanceMetrics[type].push({
      timestamp: new Date(),
      value
    });
  }

  getAveragePerformanceMetric(type) {
    const metrics = this._performanceMetrics[type] || [];
    if (metrics.length === 0) {
      return 0;
    }
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  getPeakPerformanceMetric(type) {
    const metrics = this._performanceMetrics[type] || [];
    if (metrics.length === 0) {
      return 0;
    }
    
    return Math.max(...metrics.map(metric => metric.value));
  }

  // Metadata management
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

  // Business rules
  _validate() {
    if (!this._taskId || typeof this._taskId !== 'string') {
      throw new Error('Task ID is required and must be a string');
    }

    if (this._progress < 0 || this._progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    if (this._startedAt && this._completedAt && this._startedAt > this._completedAt) {
      throw new Error('Start time cannot be after completion time');
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      taskId: this._taskId,
      status: this._status.value,
      startedAt: this._startedAt ? this._startedAt.toISOString() : null,
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      result: this._result,
      error: this._error,
      logs: this._logs,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      progress: this._progress,
      currentStep: this._currentStep,
      steps: this._steps,
      performanceMetrics: this._performanceMetrics,
      duration: this.getDuration(),
      formattedDuration: this.getFormattedDuration(),
      isRunning: this.isRunning(),
      hasError: this.hasError()
    };
  }

  static fromJSON(data) {
    return new TaskExecution(
      data.id,
      data.taskId,
      data.status,
      data.startedAt,
      data.completedAt,
      data.result,
      data.error,
      data.logs,
      data.metadata,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(taskId, metadata = {}) {
    return new TaskExecution(
      null,
      taskId,
      TaskStatus.PENDING,
      null,
      null,
      null,
      null,
      [],
      metadata
    );
  }
}

module.exports = TaskExecution; 