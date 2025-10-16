/**
 * TaskCompletedEvent Domain Event
 * Raised when a task is completed
 */
export class TaskCompletedEvent {
  constructor(taskId, projectId, taskType, completedAt, duration) {
    this._taskId = taskId;
    this._projectId = projectId;
    this._taskType = taskType;
    this._completedAt = completedAt || new Date();
    this._duration = duration; // in milliseconds
    this._eventType = 'TaskCompleted';
  }

  get taskId() {
    return this._taskId;
  }

  get projectId() {
    return this._projectId;
  }

  get taskType() {
    return this._taskType;
  }

  get completedAt() {
    return this._completedAt;
  }

  get duration() {
    return this._duration;
  }

  get eventType() {
    return this._eventType;
  }

  toJSON() {
    return {
      eventType: this._eventType,
      taskId: this._taskId,
      projectId: this._projectId,
      taskType: this._taskType,
      completedAt: this._completedAt.toISOString(),
      duration: this._duration
    };
  }

  static fromJSON(data) {
    return new TaskCompletedEvent(
      data.taskId,
      data.projectId,
      data.taskType,
      new Date(data.completedAt),
      data.duration
    );
  }
}
