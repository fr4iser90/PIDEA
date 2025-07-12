/**
 * ValidationResult - Detailed validation result information
 * Provides structured validation results with errors and warnings
 */
const { v4: uuidv4 } = require('uuid');

class ValidationResult {
  constructor(
    id = uuidv4(),
    isValid = true,
    errors = [],
    warnings = [],
    metadata = {},
    createdAt = new Date()
  ) {
    this._id = id;
    this._isValid = isValid;
    this._errors = [...errors];
    this._warnings = [...warnings];
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get isValid() { return this._isValid; }
  get errors() { return [...this._errors]; }
  get warnings() { return [...this._warnings]; }
  get metadata() { return { ...this._metadata }; }
  get createdAt() { return new Date(this._createdAt); }

  // Validation status
  hasErrors() {
    return this._errors.length > 0;
  }

  hasWarnings() {
    return this._warnings.length > 0;
  }

  hasMessages() {
    return this._errors.length > 0 || this._warnings.length > 0;
  }

  // Message counts
  getErrorCount() {
    return this._errors.length;
  }

  getWarningCount() {
    return this._warnings.length;
  }

  getMessageCount() {
    return this._errors.length + this._warnings.length;
  }

  // Message filtering
  getErrorsByField(field) {
    return this._errors.filter(error => error.field === field);
  }

  getWarningsByField(field) {
    return this._warnings.filter(warning => warning.field === field);
  }

  getMessagesByField(field) {
    return [...this.getErrorsByField(field), ...this.getWarningsByField(field)];
  }

  getErrorsByCode(code) {
    return this._errors.filter(error => error.code === code);
  }

  getWarningsByCode(code) {
    return this._warnings.filter(warning => warning.code === code);
  }

  getMessagesByCode(code) {
    return [...this.getErrorsByCode(code), ...this.getWarningsByCode(code)];
  }

  getErrorsByLevel(level) {
    return this._errors.filter(error => error.level === level);
  }

  getWarningsByLevel(level) {
    return this._warnings.filter(warning => warning.level === level);
  }

  // Message operations
  addError(error, message, code) {
    if (typeof error === 'string' && typeof message === 'string') {
      this._errors.push({
        id: this._generateMessageId(),
        field: error,
        message: message,
        code: code || '_ERROR',
        level: 'error',
        timestamp: new Date()
      });
      this._isValid = false;
      return;
    }
    if (typeof error === 'string') {
      this._errors.push({
        id: this._generateMessageId(),
        field: '',
        message: error,
        code: '_ERROR',
        level: 'error',
        timestamp: new Date()
      });
    } else {
      this._errors.push({
        id: this._generateMessageId(),
        field: error.field || '',
        message: error.message || error.field || 'Unknown error',
        code: error.code || '_ERROR',
        data: error.data,
        level: error.level || 'error',
        timestamp: new Date()
      });
    }
    this._isValid = false;
  }

  addWarning(warning, message, code) {
    if (typeof warning === 'string' && typeof message === 'string') {
      this._warnings.push({
        id: this._generateMessageId(),
        field: warning,
        message: message,
        code: code || '_WARNING',
        level: 'warning',
        timestamp: new Date()
      });
      return;
    }
    if (typeof warning === 'string') {
      this._warnings.push({
        id: this._generateMessageId(),
        field: '',
        message: warning,
        code: '_WARNING',
        level: 'warning',
        timestamp: new Date()
      });
    } else {
      this._warnings.push({
        id: this._generateMessageId(),
        field: warning.field || '',
        message: warning.message || warning.field || 'Unknown warning',
        code: warning.code || '_WARNING',
        data: warning.data,
        level: warning.level || 'warning',
        timestamp: new Date()
      });
    }
  }

  removeError(errorId) {
    const index = this._errors.findIndex(error => error.id === errorId);
    if (index > -1) {
      this._errors.splice(index, 1);
      this._updateValidity();
    }
  }

  removeWarning(warningId) {
    const index = this._warnings.findIndex(warning => warning.id === warningId);
    if (index > -1) {
      this._warnings.splice(index, 1);
    }
  }

  clearErrors() {
    this._errors = [];
    this._updateValidity();
  }

  clearWarnings() {
    this._warnings = [];
  }

  clear() {
    this._errors = [];
    this._warnings = [];
    this._isValid = true;
  }

  // Metadata operations
  setMetadata(key, value) {
    this._metadata[key] = value;
  }

  getMetadata(key, defaultValue = null) {
    return this._metadata[key] !== undefined ? this._metadata[key] : defaultValue;
  }

  hasMetadata(key) {
    return this._metadata[key] !== undefined;
  }

  removeMetadata(key) {
    delete this._metadata[key];
  }

  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
  }

  // Merging
  merge(other) {
    if (!(other instanceof ValidationResult)) {
      throw new Error('Can only merge with another ValidationResult instance');
    }

    this._errors.push(...other.errors);
    this._warnings.push(...other.warnings);
    this._metadata = { ...this._metadata, ...other.metadata };
    this._updateValidity();
  }

  // Utility methods
  getSummary() {
    return {
      id: this._id,
      isValid: this._isValid,
      errorCount: this.getErrorCount(),
      warningCount: this.getWarningCount(),
      totalCount: this.getMessageCount(),
      fieldsWithErrors: [...new Set(this._errors.map(e => e.field))],
      fieldsWithWarnings: [...new Set(this._warnings.map(w => w.field))],
      errorCodes: [...new Set(this._errors.map(e => e.code).filter(Boolean))],
      warningCodes: [...new Set(this._warnings.map(w => w.code).filter(Boolean))],
      createdAt: this._createdAt,
      metadata: this._metadata
    };
  }

  getFirstError() {
    return this._errors.length > 0 ? this._errors[0] : null;
  }

  getFirstWarning() {
    return this._warnings.length > 0 ? this._warnings[0] : null;
  }

  getFirstMessage() {
    if (this._errors.length > 0) {
      return this._errors[0];
    }
    if (this._warnings.length > 0) {
      return this._warnings[0];
    }
    return null;
  }

  getErrorMessages() {
    return this._errors.map(error => error.message);
  }

  getWarningMessages() {
    return this._warnings.map(warning => warning.message);
  }

  getAllMessages() {
    return [
      ...this._errors.map(error => ({ ...error, type: 'error' })),
      ...this._warnings.map(warning => ({ ...warning, type: 'warning' }))
    ];
  }

  // Validation
  _validate() {
    if (typeof this._isValid !== 'boolean') {
      throw new Error('isValid must be a boolean');
    }

    if (!Array.isArray(this._errors)) {
      throw new Error('errors must be an array');
    }

    if (!Array.isArray(this._warnings)) {
      throw new Error('warnings must be an array');
    }

    if (typeof this._metadata !== 'object') {
      throw new Error('metadata must be an object');
    }
  }

  _updateValidity() {
    this._isValid = this._errors.length === 0;
  }

  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      isValid: this._isValid,
      errors: this._errors,
      warnings: this._warnings,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      summary: this.getSummary()
    };
  }

  static fromJSON(data) {
    return new ValidationResult(
      data.id,
      data.isValid,
      data.errors,
      data.warnings,
      data.metadata,
      new Date(data.createdAt)
    );
  }

  // Factory methods
  static create() {
    return new ValidationResult();
  }

  static createValid(metadata = {}) {
    return new ValidationResult(uuidv4(), true, [], [], metadata);
  }

  static createInvalid(errors = [], warnings = [], metadata = {}) {
    return new ValidationResult(uuidv4(), false, errors, warnings, metadata);
  }

  static createWithErrors(errors, metadata = {}) {
    return new ValidationResult(uuidv4(), false, errors, [], metadata);
  }

  static createWithWarnings(warnings, metadata = {}) {
    return new ValidationResult(uuidv4(), true, [], warnings, metadata);
  }

  static createWithError(field, message, code = null, data = null) {
    const error = {
      field,
      message,
      code,
      data
    };
    return ValidationResult.createWithErrors([error]);
  }

  static createWithWarning(field, message, code = null, data = null) {
    const warning = {
      field,
      message,
      code,
      data
    };
    return ValidationResult.createWithWarnings([warning]);
  }

  static createFieldRequired(field) {
    return ValidationResult.createWithError(
      field,
      `Field '${field}' is required`,
      'FIELD_REQUIRED'
    );
  }

  static createFieldTypeError(field, expectedType, actualType) {
    return ValidationResult.createWithError(
      field,
      `Field '${field}' must be of type '${expectedType}', got '${actualType}'`,
      'INVALID_TYPE',
      { expectedType, actualType }
    );
  }

  static createFieldLengthError(field, minLength, maxLength, actualLength) {
    let message;
    if (minLength && maxLength) {
      message = `Field '${field}' must be between ${minLength} and ${maxLength} characters, got ${actualLength}`;
    } else if (minLength) {
      message = `Field '${field}' must be at least ${minLength} characters, got ${actualLength}`;
    } else if (maxLength) {
      message = `Field '${field}' must be at most ${maxLength} characters, got ${actualLength}`;
    } else {
      return ValidationResult.createValid();
    }

    return ValidationResult.createWithError(
      field,
      message,
      'LENGTH_VIOLATION',
      { minLength, maxLength, actualLength }
    );
  }

  static createFieldPatternError(field, pattern) {
    return ValidationResult.createWithError(
      field,
      `Field '${field}' does not match required pattern`,
      'PATTERN_MISMATCH',
      { pattern: pattern.toString() }
    );
  }

  static createFieldRangeError(field, min, max, actual) {
    let message;
    if (min !== undefined && max !== undefined) {
      message = `Field '${field}' must be between ${min} and ${max}, got ${actual}`;
    } else if (min !== undefined) {
      message = `Field '${field}' must be at least ${min}, got ${actual}`;
    } else if (max !== undefined) {
      message = `Field '${field}' must be at most ${max}, got ${actual}`;
    } else {
      return ValidationResult.createValid();
    }

    return ValidationResult.createWithError(
      field,
      message,
      'RANGE_VIOLATION',
      { min, max, actual }
    );
  }

  static createFieldEnumError(field, allowedValues, actualValue) {
    return ValidationResult.createWithError(
      field,
      `Field '${field}' must be one of: ${allowedValues.join(', ')}, got '${actualValue}'`,
      'ENUM_VIOLATION',
      { allowedValues, actualValue }
    );
  }
}

module.exports = ValidationResult; 