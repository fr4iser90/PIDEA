/**
 * WorkflowValidator - Implementation of IWorkflowValidator
 * Provides rule-based validation with detailed results
 */
const IWorkflowValidator = require('../../../application/handlers/workflow/interfaces/IWorkflowValidator');
const ValidationResult = require('./ValidationResult');

class WorkflowValidator extends IWorkflowValidator {
  constructor() {
    super();
    this._errors = [];
    this._warnings = [];
  }

  // IWorkflowValidator implementation
  isValid() {
    return this._errors.length === 0;
  }

  getErrors() {
    return [...this._errors];
  }

  getWarnings() {
    return [...this._warnings];
  }

  getMessages() {
    return [...this._errors, ...this._warnings];
  }

  addError(field, message, code = null, data = null) {
    this._errors.push({
      id: this._generateMessageId(),
      field,
      message,
      code,
      data,
      timestamp: new Date(),
      type: 'error'
    });
  }

  addWarning(field, message, code = null, data = null) {
    this._warnings.push({
      id: this._generateMessageId(),
      field,
      message,
      code,
      data,
      timestamp: new Date(),
      type: 'warning'
    });
  }

  hasErrors() {
    return this._errors.length > 0;
  }

  hasWarnings() {
    return this._warnings.length > 0;
  }

  getErrorCount() {
    return this._errors.length;
  }

  getWarningCount() {
    return this._warnings.length;
  }

  getMessageCount() {
    return this._errors.length + this._warnings.length;
  }

  getErrorsByField(field) {
    return this._errors.filter(error => error.field === field);
  }

  getWarningsByField(field) {
    return this._warnings.filter(warning => warning.field === field);
  }

  getMessagesByField(field) {
    return this.getMessages().filter(message => message.field === field);
  }

  getErrorsByCode(code) {
    return this._errors.filter(error => error.code === code);
  }

  getWarningsByCode(code) {
    return this._warnings.filter(warning => warning.code === code);
  }

  clear() {
    this._errors = [];
    this._warnings = [];
  }

  clearErrors() {
    this._errors = [];
  }

  clearWarnings() {
    this._warnings = [];
  }

  merge(validator) {
    if (!(validator instanceof WorkflowValidator)) {
      throw new Error('Can only merge with another WorkflowValidator instance');
    }

    this._errors.push(...validator.getErrors());
    this._warnings.push(...validator.getWarnings());
  }

  getSummary() {
    return {
      isValid: this.isValid(),
      errorCount: this.getErrorCount(),
      warningCount: this.getWarningCount(),
      totalCount: this.getMessageCount(),
      fieldsWithErrors: [...new Set(this._errors.map(e => e.field))],
      fieldsWithWarnings: [...new Set(this._warnings.map(w => w.field))],
      errorCodes: [...new Set(this._errors.map(e => e.code).filter(Boolean))],
      warningCodes: [...new Set(this._warnings.map(w => w.code).filter(Boolean))]
    };
  }

  toJSON() {
    return {
      isValid: this.isValid(),
      errors: this._errors,
      warnings: this._warnings,
      summary: this.getSummary()
    };
  }

  static fromJSON(data) {
    const validator = new WorkflowValidator();
    validator._errors = data.errors || [];
    validator._warnings = data.warnings || [];
    return validator;
  }

  // Additional convenience methods
  addFieldRequiredError(field) {
    this.addError(field, `Field '${field}' is required`, 'FIELD_REQUIRED');
  }

  addFieldTypeError(field, expectedType, actualType) {
    this.addError(
      field, 
      `Field '${field}' must be of type '${expectedType}', got '${actualType}'`, 
      'INVALID_TYPE',
      { expectedType, actualType }
    );
  }

  addFieldLengthError(field, minLength, maxLength, actualLength) {
    if (minLength && maxLength) {
      this.addError(
        field,
        `Field '${field}' must be between ${minLength} and ${maxLength} characters, got ${actualLength}`,
        'LENGTH_VIOLATION',
        { minLength, maxLength, actualLength }
      );
    } else if (minLength) {
      this.addError(
        field,
        `Field '${field}' must be at least ${minLength} characters, got ${actualLength}`,
        'MIN_LENGTH_VIOLATION',
        { minLength, actualLength }
      );
    } else if (maxLength) {
      this.addError(
        field,
        `Field '${field}' must be at most ${maxLength} characters, got ${actualLength}`,
        'MAX_LENGTH_VIOLATION',
        { maxLength, actualLength }
      );
    }
  }

  addFieldPatternError(field, pattern) {
    this.addError(
      field,
      `Field '${field}' does not match required pattern`,
      'PATTERN_MISMATCH',
      { pattern: pattern.toString() }
    );
  }

  addFieldRangeError(field, min, max, actual) {
    if (min !== undefined && max !== undefined) {
      this.addError(
        field,
        `Field '${field}' must be between ${min} and ${max}, got ${actual}`,
        'RANGE_VIOLATION',
        { min, max, actual }
      );
    } else if (min !== undefined) {
      this.addError(
        field,
        `Field '${field}' must be at least ${min}, got ${actual}`,
        'MIN_RANGE_VIOLATION',
        { min, actual }
      );
    } else if (max !== undefined) {
      this.addError(
        field,
        `Field '${field}' must be at most ${max}, got ${actual}`,
        'MAX_RANGE_VIOLATION',
        { max, actual }
      );
    }
  }

  addFieldEnumError(field, allowedValues, actualValue) {
    this.addError(
      field,
      `Field '${field}' must be one of: ${allowedValues.join(', ')}, got '${actualValue}'`,
      'ENUM_VIOLATION',
      { allowedValues, actualValue }
    );
  }

  addFieldFormatError(field, format, actualValue) {
    this.addError(
      field,
      `Field '${field}' must be in format '${format}', got '${actualValue}'`,
      'FORMAT_VIOLATION',
      { format, actualValue }
    );
  }

  addFieldUniqueError(field, duplicateValue) {
    this.addError(
      field,
      `Field '${field}' must be unique, duplicate value: '${duplicateValue}'`,
      'UNIQUE_VIOLATION',
      { duplicateValue }
    );
  }

  addFieldReferenceError(field, referencedField, referencedValue) {
    this.addError(
      field,
      `Field '${field}' references non-existent '${referencedField}': '${referencedValue}'`,
      'REFERENCE_VIOLATION',
      { referencedField, referencedValue }
    );
  }

  addFieldDependencyError(field, dependencyField) {
    this.addError(
      field,
      `Field '${field}' requires field '${dependencyField}' to be present`,
      'DEPENDENCY_VIOLATION',
      { dependencyField }
    );
  }

  addFieldConstraintError(field, constraint, actualValue) {
    this.addError(
      field,
      `Field '${field}' violates constraint '${constraint}', got '${actualValue}'`,
      'CONSTRAINT_VIOLATION',
      { constraint, actualValue }
    );
  }

  addWarning(field, message, code = null, data = null) {
    this._warnings.push({
      id: this._generateMessageId(),
      field,
      message,
      code,
      data,
      timestamp: new Date(),
      type: 'warning'
    });
  }

  addFieldDeprecatedWarning(field, alternative = null) {
    this.addWarning(
      field,
      `Field '${field}' is deprecated${alternative ? `, use '${alternative}' instead` : ''}`,
      'FIELD_DEPRECATED',
      { alternative }
    );
  }

  addFieldFormatWarning(field, format, actualValue) {
    this.addWarning(
      field,
      `Field '${field}' should be in format '${format}', got '${actualValue}'`,
      'FORMAT_WARNING',
      { format, actualValue }
    );
  }

  addFieldLengthWarning(field, recommendedLength, actualLength) {
    this.addWarning(
      field,
      `Field '${field}' is ${actualLength} characters, recommended: ${recommendedLength}`,
      'LENGTH_WARNING',
      { recommendedLength, actualLength }
    );
  }

  addFieldPerformanceWarning(field, issue) {
    this.addWarning(
      field,
      `Field '${field}' may cause performance issues: ${issue}`,
      'PERFORMANCE_WARNING',
      { issue }
    );
  }

  addFieldSecurityWarning(field, issue) {
    this.addWarning(
      field,
      `Field '${field}' may have security implications: ${issue}`,
      'SECURITY_WARNING',
      { issue }
    );
  }

  // Validation helpers
  validateRequired(value, field) {
    if (value === null || value === undefined || value === '') {
      this.addFieldRequiredError(field);
      return false;
    }
    return true;
  }

  validateType(value, field, expectedType) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      this.addFieldTypeError(field, expectedType, actualType);
      return false;
    }
    return true;
  }

  validateLength(value, field, minLength = null, maxLength = null) {
    if (typeof value !== 'string') {
      this.addFieldTypeError(field, 'string', typeof value);
      return false;
    }

    const length = value.length;
    if ((minLength !== null && length < minLength) || 
        (maxLength !== null && length > maxLength)) {
      this.addFieldLengthError(field, minLength, maxLength, length);
      return false;
    }
    return true;
  }

  validatePattern(value, field, pattern) {
    if (typeof value !== 'string') {
      this.addFieldTypeError(field, 'string', typeof value);
      return false;
    }

    if (!pattern.test(value)) {
      this.addFieldPatternError(field, pattern);
      return false;
    }
    return true;
  }

  validateRange(value, field, min = null, max = null) {
    if (typeof value !== 'number') {
      this.addFieldTypeError(field, 'number', typeof value);
      return false;
    }

    if ((min !== null && value < min) || (max !== null && value > max)) {
      this.addFieldRangeError(field, min, max, value);
      return false;
    }
    return true;
  }

  validateEnum(value, field, allowedValues) {
    if (!allowedValues.includes(value)) {
      this.addFieldEnumError(field, allowedValues, value);
      return false;
    }
    return true;
  }

  validateUnique(value, field, existingValues) {
    if (existingValues.includes(value)) {
      this.addFieldUniqueError(field, value);
      return false;
    }
    return true;
  }

  validateReference(value, field, validReferences) {
    if (!validReferences.includes(value)) {
      this.addFieldReferenceError(field, field, value);
      return false;
    }
    return true;
  }

  validateDependency(value, field, dependencyValue, dependencyField) {
    if (value !== null && value !== undefined && 
        (dependencyValue === null || dependencyValue === undefined)) {
      this.addFieldDependencyError(field, dependencyField);
      return false;
    }
    return true;
  }

  // Utility methods
  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Factory methods
  static create() {
    return new WorkflowValidator();
  }

  static createWithErrors(errors) {
    const validator = new WorkflowValidator();
    errors.forEach(error => {
      if (typeof error === 'string') {
        validator.addError('', error);
      } else {
        validator.addError(error.field, error.message, error.code, error.data);
      }
    });
    return validator;
  }

  static createWithWarnings(warnings) {
    const validator = new WorkflowValidator();
    warnings.forEach(warning => {
      if (typeof warning === 'string') {
        validator.addWarning('', warning);
      } else {
        validator.addWarning(warning.field, warning.message, warning.code, warning.data);
      }
    });
    return validator;
  }

  static createValid() {
    return new WorkflowValidator();
  }

  static createInvalid(errors) {
    return WorkflowValidator.createWithErrors(errors);
  }
}

module.exports = WorkflowValidator; 