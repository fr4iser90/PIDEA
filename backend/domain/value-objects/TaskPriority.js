/**
 * TaskPriority - Value object for task priority
 */
class TaskPriority {
  static LOW = 'low';
  static MEDIUM = 'medium';
  static HIGH = 'high';
  static CRITICAL = 'critical';

  static isValid(priority) {
    return Object.values(TaskPriority).includes(priority);
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