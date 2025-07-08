/**
 * TaskPriority - Value object for task priority
 */
class TaskPriority {
  static LOW = 'low';
  static MEDIUM = 'medium';
  static HIGH = 'high';
  static CRITICAL = 'critical';

  constructor(value = TaskPriority.MEDIUM) {
    if (!TaskPriority.isValid(value)) {
      throw new Error(`Invalid task priority: ${value}`);
    }
    this.value = value;
  }

  isHigh() {
    return this.value === TaskPriority.HIGH;
  }

  isCritical() {
    return this.value === TaskPriority.CRITICAL;
  }

  static isValid(priority) {
    return [
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.CRITICAL
    ].includes(priority);
  }

  static getAll() {
    return [
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.CRITICAL
    ];
  }

  static getWeight(priority) {
    const weights = {
      [TaskPriority.LOW]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.CRITICAL]: 4
    };
    return weights[priority] || 0;
  }

  static getDefault() {
    return TaskPriority.MEDIUM;
  }
}

module.exports = TaskPriority; 