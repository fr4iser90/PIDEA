/**
 * Task Entity - Project-based task management
 * Tasks are always associated with a specific project
 */
const { v4: uuidv4 } = require('uuid');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');

class Task {
  constructor(
    id = uuidv4(),
    projectId,
    title,
    description,
    status = TaskStatus.PENDING,
    priority = TaskPriority.getDefault(),
    type,
    category,
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
    this._category = category;
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._completedAt = null;
    this._progress = 0; // Progress percentage (0-100)
    this._dependencies = [];
    this._tags = [];
    this._assignee = null;
    this._dueDate = null;
    this._startedAt = null;
    this._executionHistory = [];
    this._workflowContext = null;

    this._validate();
  }

  // Getters
  get title() { return this._title; }
  get description() { return this._description; }
  get status() { return this._status; }
  get priority() { return this._priority; }
  get type() { return this._type; }
  get category() { return this._category; }
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
  get progress() { return this._progress; }
  get executionHistory() { return [...this._executionHistory]; }
  get workflowContext() { return this._workflowContext; }

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
    this._completedAt = new Date();
    
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
    this._completedAt = new Date();
    
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

  setCategory(category) {
    this._category = category;
    this._updatedAt = new Date();
  }

  getMetadata(key) {
    return this._metadata[key];
  }

  removeMetadata(key) {
    delete this._metadata[key];
    this._updatedAt = new Date();
  }

  // Workflow context management
  setWorkflowContext(context) {
    this._workflowContext = context;
    this._updatedAt = new Date();
    this._addExecutionHistory('workflow_context_set', { contextId: context?.id });
  }

  getWorkflowContext() {
    return this._workflowContext;
  }

  hasWorkflowContext() {
    return this._workflowContext !== null;
  }

  clearWorkflowContext() {
    this._workflowContext = null;
    this._updatedAt = new Date();
    this._addExecutionHistory('workflow_context_cleared');
  }

  updateWorkflowContext(context) {
    if (this._workflowContext) {
      this._workflowContext = context;
      this._updatedAt = new Date();
      this._addExecutionHistory('workflow_context_updated', { contextId: context?.id });
    }
  }

  // Workflow compatibility methods
  getWorkflowType() {
    return this._type.getWorkflowType();
  }

  getWorkflowSteps() {
    return this._type.getWorkflowSteps();
  }

  getWorkflowDependencies() {
    return this._type.getWorkflowDependencies();
  }

  getWorkflowMetadata() {
    return this._type.getWorkflowMetadata();
  }

  getEstimatedDuration() {
    return this._type.getEstimatedDuration();
  }

  getComplexity() {
    return this._type.getComplexity();
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
    if (!TaskPriority.isValid(this._priority.value)) {
      throw new Error(`Invalid task priority: ${this._priority.value}`);
    }
    if (!this._type || !this._type.value || typeof this._type.value !== 'string') {
      throw new Error('Task type is required');
    }
    if (!TaskType.isValid(this._type.value)) {
      throw new Error(`Invalid task type: ${this._type.value}`);
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
    const baseObject = {
      id: this.id,
      projectId: this.projectId,
      title: this._title,
      description: this._description,
      status: this._status.value,
      priority: this._priority.value,
      type: this._type.value,
      category: this._category,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      // ✅ FIXED: Add snake_case versions for frontend compatibility
      created_at: this._createdAt.toISOString(),
      updated_at: this._updatedAt.toISOString(),
      completed_at: this._completedAt ? this._completedAt.toISOString() : null,
      executionHistory: this._executionHistory,
      progress: this._progress,
      actualDuration: this.getActualDuration(),
      isOverdue: this.isOverdue(),
      requiresAI: this.requiresAI(),
      requiresExecution: this.requiresExecution(),
      requiresHumanReview: this.requiresHumanReview(),
      userId: this._metadata.createdBy || this._metadata.userId || null,
      estimatedDuration: this._metadata.estimatedDuration || null
    };

    // Extract common metadata fields to top level for frontend compatibility
    if (this._metadata) {
      // Lines information for refactoring tasks
      if (this._metadata.lines) {
        baseObject.lines = this._metadata.lines;
      }
      
      // File path information
      if (this._metadata.filePath) {
        baseObject.filePath = this._metadata.filePath;
      }
      
      // Refactoring steps
      if (this._metadata.refactoringSteps) {
        baseObject.refactoringSteps = this._metadata.refactoringSteps;
      }
      
      // Estimated time
      if (this._metadata.estimatedTime) {
        baseObject.estimatedTime = this._metadata.estimatedTime;
      }
    }

    return baseObject;
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
      data.category,
      data.metadata,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(idOrProjectId, projectIdOrTitle, titleOrDescription, descriptionOrPriority, priorityOrType, typeOrMetadata, metadataMaybe) {
    // Support: (id, projectId, title, description, priority, type, metadata)
    // Or: (projectId, title, description, priority, type, metadata)
    let id, projectId, title, description, priority, type, metadata;
    if (
      typeof idOrProjectId === 'string' &&
      typeof projectIdOrTitle === 'string' &&
      typeof titleOrDescription === 'string' &&
      typeof descriptionOrPriority === 'string' &&
      (typeof priorityOrType === 'string' || typeof priorityOrType === 'undefined') &&
      (typeof typeOrMetadata === 'string' || typeof typeOrMetadata === 'undefined')
    ) {
      // If idOrProjectId looks like a custom id, use it as id
      if (idOrProjectId.startsWith('task_') || idOrProjectId.startsWith('custom-') || idOrProjectId.startsWith('custom_')) {
        id = idOrProjectId;
        projectId = projectIdOrTitle;
        title = titleOrDescription;
        description = descriptionOrPriority;
        priority = priorityOrType;
        type = typeOrMetadata;
        metadata = metadataMaybe || {};
      } else {
        // (projectId, title, description, priority, type, metadata)
        id = `task_${idOrProjectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        projectId = idOrProjectId;
        title = projectIdOrTitle;
        description = titleOrDescription;
        priority = descriptionOrPriority;
        type = priorityOrType;
        metadata = typeOrMetadata || {};
      }
    } else {
      // fallback to old signature
      id = `task_${idOrProjectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      projectId = idOrProjectId;
      title = projectIdOrTitle;
      description = titleOrDescription;
      priority = descriptionOrPriority;
      type = priorityOrType;
      metadata = typeOrMetadata || {};
    }
    return new Task(
      id,
      projectId,
      title,
      description,
      TaskStatus.PENDING,
      priority,
      type,
      metadata.category,
      metadata
    );
  }

  belongsToProject(projectId) {
    // Case-insensitive comparison to handle different casing (e.g., 'aboutME' vs 'aboutme')
    return this.projectId.toLowerCase() === projectId.toLowerCase();
  }

  updateStatus(newStatus) {
    this._status = new TaskStatus(newStatus);
    this._updatedAt = new Date();
    
    if (newStatus === TaskStatus.COMPLETED) {
      this._completedAt = new Date();
      this._progress = 100; // Auto-set progress to 100% when completed
    }
  }

  updateProgress(newProgress) {
    if (newProgress < 0 || newProgress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    this._progress = newProgress;
    this._updatedAt = new Date();
    
    // Auto-update status based on progress
    if (newProgress === 100 && !this._status.isCompleted()) {
      this.updateStatus(TaskStatus.COMPLETED);
    } else if (newProgress > 0 && this._status.isPending()) {
      this.updateStatus(TaskStatus.IN_PROGRESS);
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