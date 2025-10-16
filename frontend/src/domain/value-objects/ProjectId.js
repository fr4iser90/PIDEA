/**
 * ProjectId Value Object
 * Represents a unique identifier for a project
 */
export class ProjectId {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('ProjectId must be a non-empty string');
    }
    
    if (!this.isValidProjectId(value)) {
      throw new Error('ProjectId must be a valid identifier');
    }
    
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ProjectId && this._value === other._value;
  }

  toString() {
    return this._value;
  }

  isValidProjectId(value) {
    // Allow alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(value);
  }

  static fromString(value) {
    return new ProjectId(value);
  }

  static generate() {
    // Generate a unique project ID based on timestamp and random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new ProjectId(`proj_${timestamp}_${random}`);
  }
}
