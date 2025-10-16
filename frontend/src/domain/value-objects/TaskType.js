/**
 * TaskType Value Object
 * Represents the type of a task with validation
 */
export class TaskType {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('TaskType must be a non-empty string');
    }
    
    if (!this.isValidTaskType(value)) {
      throw new Error(`Invalid task type: ${value}`);
    }
    
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof TaskType && this._value === other._value;
  }

  toString() {
    return this._value;
  }

  isValidTaskType(value) {
    const validTypes = [
      'analysis',
      'refactoring',
      'testing',
      'deployment',
      'security',
      'optimization',
      'documentation',
      'custom'
    ];
    return validTypes.includes(value);
  }

  static ANALYSIS = new TaskType('analysis');
  static REFACTORING = new TaskType('refactoring');
  static TESTING = new TaskType('testing');
  static DEPLOYMENT = new TaskType('deployment');
  static SECURITY = new TaskType('security');
  static OPTIMIZATION = new TaskType('optimization');
  static DOCUMENTATION = new TaskType('documentation');
  static CUSTOM = new TaskType('custom');

  static fromString(value) {
    return new TaskType(value);
  }
}