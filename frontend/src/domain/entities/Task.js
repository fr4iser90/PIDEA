/**
 * Task Domain Entity
 * Represents a task with its business rules and state management
 */
import { TaskType } from '../value-objects/TaskType.js';

export class Task {
  constructor(id, type, projectId, options = {}) {
    this._id = id;
    this._type = type instanceof TaskType ? type : new TaskType(type);
    this._projectId = projectId;
    this._title = this.validateTitle(options.title || '');
    this._description = options.description || '';
    this._status = options.status || 'pending';
    this._priority = options.priority || 'medium';
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._startedAt = options.startedAt || null;
    this._completedAt = options.completedAt || null;
    this._progress = options.progress || 0;
    this._metadata = options.metadata || {};
    this._error = options.error || null;
    
    this.validateInvariants();
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }

  get projectId() {
    return this._projectId;
  }

  get title() {
    return this._title;
  }

  get description() {
    return this._description;
  }

  get status() {
    return this._status;
  }

  get priority() {
    return this._priority;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get startedAt() {
    return this._startedAt;
  }

  get completedAt() {
    return this._completedAt;
  }

  get progress() {
    return this._progress;
  }

  get metadata() {
    return { ...this._metadata };
  }

  get error() {
    return this._error;
  }

  validateTitle(title) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Task title must be a non-empty string');
    }
    if (title.length > 200) {
      throw new Error('Task title must be less than 200 characters');
    }
    return title.trim();
  }

  validateInvariants() {
    if (!this._id) {
      throw new Error('Task must have a valid ID');
    }
    if (!this._type) {
      throw new Error('Task must have a valid type');
    }
    if (!this._projectId) {
      throw new Error('Task must belong to a project');
    }
    if (this._progress < 0 || this._progress > 100) {
      throw new Error('Task progress must be between 0 and 100');
    }
  }

  start() {
    if (this._status !== 'pending') {
      throw new Error('Only pending tasks can be started');
    }
    this._status = 'running';
    this._startedAt = new Date();
    this._updatedAt = new Date();
  }

  pause() {
    if (this._status !== 'running') {
      throw new Error('Only running tasks can be paused');
    }
    this._status = 'paused';
    this._updatedAt = new Date();
  }

  resume() {
    if (this._status !== 'paused') {
      throw new Error('Only paused tasks can be resumed');
    }
    this._status = 'running';
    this._updatedAt = new Date();
  }

  complete() {
    if (this._status !== 'running' && this._status !== 'paused') {
      throw new Error('Only running or paused tasks can be completed');
    }
    this._status = 'completed';
    this._completedAt = new Date();
    this._progress = 100;
    this._updatedAt = new Date();
  }

  fail(error) {
    if (this._status !== 'running' && this._status !== 'paused') {
      throw new Error('Only running or paused tasks can be failed');
    }
    this._status = 'failed';
    this._error = error;
    this._updatedAt = new Date();
  }

  cancel() {
    if (this._status === 'completed' || this._status === 'failed') {
      throw new Error('Completed or failed tasks cannot be cancelled');
    }
    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  updateProgress(progress) {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    if (this._status !== 'running') {
      throw new Error('Only running tasks can have their progress updated');
    }
    this._progress = progress;
    this._updatedAt = new Date();
  }

  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    this._updatedAt = new Date();
  }

  isRunning() {
    return this._status === 'running';
  }

  isCompleted() {
    return this._status === 'completed';
  }

  isFailed() {
    return this._status === 'failed';
  }

  isPending() {
    return this._status === 'pending';
  }

  equals(other) {
    return other instanceof Task && this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id,
      type: this._type.value,
      projectId: this._projectId,
      title: this._title,
      description: this._description,
      status: this._status,
      priority: this._priority,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      startedAt: this._startedAt ? this._startedAt.toISOString() : null,
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      progress: this._progress,
      metadata: this._metadata,
      error: this._error
    };
  }

  static fromJSON(data) {
    return new Task(
      data.id,
      data.type,
      data.projectId,
      {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        progress: data.progress,
        metadata: data.metadata,
        error: data.error
      }
    );
  }
}
