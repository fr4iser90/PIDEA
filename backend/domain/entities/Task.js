/**
 * Task Entity - Project-based task management
 * Tasks are always associated with a specific project
 */
const { v4: uuidv4 } = require('uuid');
const TaskStatus = require('@domain/value-objects/TaskStatus');
const TaskPriority = require('@domain/value-objects/TaskPriority');
const TaskType = require('@domain/value-objects/TaskType');

class Task {
  constructor(
    id = uuidv4(),
    projectId,
    title,
    description,
    status = TaskStatus.PENDING,
    priority = TaskPriority.getDefault(),
    type,
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this.id = id;
    this._projectId = projectId;
    this._title = title;
    this._description = description;
    this._status = new TaskStatus(status);
    this._priority = new TaskPriority(priority);
    this._type = new TaskType(type);
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._completedAt = null;
    this._dependencies = [];
    this._tags = [];
    this._assignee = null;
    this._dueDate = null;
    this._startedAt = null;
    this._executionHistory = [];

    this._validate();
  }

  // Getters
  get title() { return this._title; }
  get description() { return this._description; }
  get status() { return this._status; }
  get priority() { return this._priority; }
  get type() { return this._type; }
  get projectId() { return this._projectId; }
  get metadata() { return { ...this._metadata }; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get dependencies() { return [...this._dependencies]; }
  get tags() { return [...this._tags]; }
  get assignee() { return this._assignee; }
  get dueDate() { return this._dueDate ? new Date(this._dueDate) : null; }
  get startedAt() { return this._startedAt ? new Date(this._startedAt) : null; }
  get completedAt() { return this._completedAt ? new Date(this._completedAt) : null; }
  get executionHistory() { return [...this._executionHistory]; }

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

  isPaused() {
    return this._status.isPaused();
  }

  isScheduled() {
    return this._status.isScheduled();
  }

  isOverdue() {
    return this._dueDate && new Date() > this._dueDate && !this.isCompleted() && !this.isCancelled();
  }

  isHighPriority() {
    return this._priority.isHigh() || this._priority.isCritical();
  }

  requiresAI() {
    return this._type.requiresAI();
  }

  requiresExecution() {
    return this._type.requiresExecution();
  }

  requiresHumanReview() {
    return this._type.requiresHumanReview();
  }

  canStart() {
    return this.isPending() || this.isScheduled();
  }

  canPause() {
    return this.isInProgress();
  }

  canResume() {
    return this.isPaused();
  }

  canComplete() {
    return this.isInProgress() || this.isPaused();
  }

  canCancel() {
    return !this.isCompleted() && !this.isCancelled();
  }

  canRetry() {
    return this.isFailed();
  }

  // State transitions
  start() {
    if (!this.canStart()) {
      throw new Error(`Cannot start task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.IN_PROGRESS);
    this._startedAt = new Date();
    this._updatedAt = new Date();
    this._addExecutionHistory('started');
  }

  pause() {
    if (!this.canPause()) {
      throw new Error(`Cannot pause task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.PAUSED);
    this._updatedAt = new Date();
    this._addExecutionHistory('paused');
  }

  resume() {
    if (!this.canResume()) {
      throw new Error(`Cannot resume task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.IN_PROGRESS);
    this._updatedAt = new Date();
    this._addExecutionHistory('resumed');
  }

  complete(result = null) {
    if (!this.canComplete()) {
      throw new Error(`Cannot complete task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.COMPLETED);
    this._completedAt = new Date();
    this._updatedAt = new Date();
    
    if (result) {
      this._metadata.result = result;
    }
    
    this._addExecutionHistory('completed', result);
  }

  fail(error = null) {
    this._status = this._status.transitionTo(TaskStatus.FAILED);
    this._updatedAt = new Date();
    
    if (error) {
      this._metadata.error = error;
    }
    
    this._addExecutionHistory('failed', error);
  }

  cancel(reason = null) {
    if (!this.canCancel()) {
      throw new Error(`Cannot cancel task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.CANCELLED);
    this._updatedAt = new Date();
    
    if (reason) {
      this._metadata.cancelReason = reason;
    }
    
    this._addExecutionHistory('cancelled', reason);
  }

  retry() {
    if (!this.canRetry()) {
      throw new Error(`Cannot retry task in ${this._status.value} status`);
    }

    this._status = this._status.transitionTo(TaskStatus.PENDING);
    this._updatedAt = new Date();
    this._addExecutionHistory('retried');
  }

  schedule(scheduledDate) {
    this._status = this._status.transitionTo(TaskStatus.SCHEDULED);
    this._metadata.scheduledDate = new Date(scheduledDate);
    this._updatedAt = new Date();
    this._addExecutionHistory('scheduled', { scheduledDate });
  }

  // Priority management
  upgradePriority() {
    this._priority = this._priority.upgrade();
    this._updatedAt = new Date();
    this._addExecutionHistory('priority_upgraded', { newPriority: this._priority.value });
  }

  downgradePriority() {
    this._priority = this._priority.downgrade();
    this._updatedAt = new Date();
    this._addExecutionHistory('priority_downgraded', { newPriority: this._priority.value });
  }

  setPriority(priority) {
    this._priority = new TaskPriority(priority);
    this._updatedAt = new Date();
    this._addExecutionHistory('priority_changed', { newPriority: priority });
  }

  // Dependencies management
  addDependency(taskId) {
    if (!this._dependencies.includes(taskId)) {
      this._dependencies.push(taskId);
      this._updatedAt = new Date();
    }
  }

  removeDependency(taskId) {
    const index = this._dependencies.indexOf(taskId);
    if (index > -1) {
      this._dependencies.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  hasDependencies() {
    return this._dependencies.length > 0;
  }

  // Tags management
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

  // Assignment management
  assign(userId) {
    this._assignee = userId;
    this._updatedAt = new Date();
    this._addExecutionHistory('assigned', { assignee: userId });
  }

  unassign() {
    this._assignee = null;
    this._updatedAt = new Date();
    this._addExecutionHistory('unassigned');
  }

  // Due date management
  setDueDate(dueDate) {
    this._dueDate = new Date(dueDate);
    this._updatedAt = new Date();
    this._addExecutionHistory('due_date_set', { dueDate: this._dueDate });
  }

  removeDueDate() {
    this._dueDate = null;
    this._updatedAt = new Date();
    this._addExecutionHistory('due_date_removed');
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

  // Duration and timing
  getActualDuration() {
    if (!this._startedAt) {
      return 0;
    }

    const endTime = this._completedAt || new Date();
    return Math.floor((endTime - this._startedAt) / 1000);
  }

  getProgress() {
    if (this.isCompleted()) {
      return 100;
    }
    if (this.isPending() || this.isScheduled()) {
      return 0;
    }
    if (this.isFailed() || this.isCancelled()) {
      return 0;
    }

    const actualDuration = this.getActualDuration();
    const estimatedDuration = this._type.getEstimatedDuration();
    
    if (estimatedDuration === 0) {
      return 50; // Default progress for tasks without duration estimate
    }

    return Math.min(95, Math.floor((actualDuration / estimatedDuration) * 100));
  }

  // Business rules
  _validate() {
    if (!this._title || typeof this._title !== 'string' || this._title.trim().length === 0) {
      throw new Error('Task title is required and must be a non-empty string');
    }

    if (!this._description || typeof this._description !== 'string' || this._description.trim().length === 0) {
      throw new Error('Task description is required and must be a non-empty string');
    }

    if (this._dueDate && this._dueDate < this._createdAt) {
      throw new Error('Task due date cannot be before creation date');
    }
  }

  _addExecutionHistory(action, data = null) {
    this._executionHistory.push({
      action,
      timestamp: new Date(),
      data
    });
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      title: this._title,
      description: this._description,
      status: this._status.value,
      priority: this._priority.value,
      type: this._type.value,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      executionHistory: this._executionHistory,
      progress: this.getProgress(),
      actualDuration: this.getActualDuration(),
      isOverdue: this.isOverdue(),
      requiresAI: this.requiresAI(),
      requiresExecution: this.requiresExecution(),
      requiresHumanReview: this.requiresHumanReview()
    };
  }

  static fromJSON(data) {
    return new Task(
      data.id,
      data.projectId,
      data.title,
      data.description,
      data.status,
      data.priority,
      data.type,
      data.metadata,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(projectId, title, description, priority = TaskPriority.MEDIUM, type = TaskType.FEATURE, metadata = {}) {
    if (!projectId) {
      throw new Error('Project ID is required for task creation');
    }
    
    const id = `task_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new Task(
      id,
      projectId,
      title,
      description,
      TaskStatus.PENDING,
      priority,
      type,
      metadata
    );
  }

  belongsToProject(projectId) {
    return this.projectId === projectId;
  }

  updateStatus(newStatus) {
    this._status = new TaskStatus(newStatus);
    this._updatedAt = new Date();
    
    if (newStatus === TaskStatus.COMPLETED) {
      this._completedAt = new Date();
    }
  }

  updatePriority(newPriority) {
    this._priority = new TaskPriority(newPriority);
    this._updatedAt = new Date();
  }

  updateMetadata(newMetadata) {
    this._metadata = { ...this._metadata, ...newMetadata };
    this._updatedAt = new Date();
  }

  getDuration() {
    if (!this._completedAt) {
      return Date.now() - this._createdAt.getTime();
    }
    return this._completedAt.getTime() - this._createdAt.getTime();
  }
}

module.exports = Task; 