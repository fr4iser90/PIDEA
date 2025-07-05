/**
 * TaskStatus - Value object for task status
 */
class TaskStatus {
  static PENDING = 'pending';
  static IN_PROGRESS = 'in_progress';
  static COMPLETED = 'completed';
  static CANCELLED = 'cancelled';
  static FAILED = 'failed';
  static PAUSED = 'paused';
  static SCHEDULED = 'scheduled';

  constructor(value = TaskStatus.PENDING) {
    this.value = value;
  }

  isPending() {
    return this.value === TaskStatus.PENDING;
  }

  isInProgress() {
    return this.value === TaskStatus.IN_PROGRESS;
  }

  isCompleted() {
    return this.value === TaskStatus.COMPLETED;
  }

  isCancelled() {
    return this.value === TaskStatus.CANCELLED;
  }

  isFailed() {
    return this.value === TaskStatus.FAILED;
  }

  isPaused() {
    return this.value === TaskStatus.PAUSED;
  }

  isScheduled() {
    return this.value === TaskStatus.SCHEDULED;
  }

  transitionTo(newStatus) {
    return new TaskStatus(newStatus);
  }

  static isValid(status) {
    return Object.values(TaskStatus).includes(status);
  }

  static getAll() {
    return [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
      TaskStatus.FAILED,
      TaskStatus.PAUSED,
      TaskStatus.SCHEDULED
    ];
  }
}

module.exports = TaskStatus; 