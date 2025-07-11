/**
 * ValidationException - Exception for validation-specific errors
 * Extends WorkflowException with validation result information
 */
const WorkflowException = require('./WorkflowException');
const ValidationResult = require('../validation/ValidationResult');

class ValidationException extends WorkflowException {
  constructor(
    message,
    validationResult = null,
    field = null,
    code = 'VALIDATION_ERROR',
    context = null,
    cause = null,
    metadata = {}
  ) {
    super(message, code, context, cause, metadata);
    
    this.name = 'ValidationException';
    this.validationResult = validationResult;
    this.field = field;
    this.rule = null; // For test compatibility

    // Ensure proper inheritance
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationException);
    }
  }

  // Validation result management
  setValidationResult(validationResult) {
    this.validationResult = validationResult;
    return this;
  }

  getValidationResult() {
    return this.validationResult;
  }

  hasValidationResult() {
    return this.validationResult !== null && this.validationResult !== undefined;
  }

  // Field management
  setField(field) {
    this.field = field;
    return this;
  }

  getField() {
    return this.field;
  }

  hasField() {
    return this.field !== null && this.field !== undefined;
  }

  // Validation error access
  getErrors() {
    return this.hasValidationResult() ? this.validationResult.getErrors() : [];
  }

  getWarnings() {
    return this.hasValidationResult() ? this.validationResult.getWarnings() : [];
  }

  getErrorCount() {
    return this.hasValidationResult() ? this.validationResult.getErrorCount() : 0;
  }

  getWarningCount() {
    return this.hasValidationResult() ? this.validationResult.getWarningCount() : 0;
  }

  getFirstError() {
    return this.hasValidationResult() ? this.validationResult.getFirstError() : null;
  }

  getFirstWarning() {
    return this.hasValidationResult() ? this.validationResult.getFirstWarning() : null;
  }

  getErrorsByField(field) {
    return this.hasValidationResult() ? this.validationResult.getErrorsByField(field) : [];
  }

  getWarningsByField(field) {
    return this.hasValidationResult() ? this.validationResult.getWarningsByField(field) : [];
  }

  getErrorsByCode(code) {
    return this.hasValidationResult() ? this.validationResult.getErrorsByCode(code) : [];
  }

  getWarningsByCode(code) {
    return this.hasValidationResult() ? this.validationResult.getWarningsByCode(code) : [];
  }

  // Utility methods
  getValidationSummary() {
    return this.hasValidationResult() ? this.validationResult.getSummary() : null;
  }

  getFieldErrors() {
    if (!this.hasField()) {
      return [];
    }
    return this.getErrorsByField(this.field);
  }

  getFieldWarnings() {
    if (!this.hasField()) {
      return [];
    }
    return this.getWarningsByField(this.field);
  }

  hasFieldErrors() {
    return this.getFieldErrors().length > 0;
  }

  hasFieldWarnings() {
    return this.getFieldWarnings().length > 0;
  }

  // Serialization
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      name: this.name,
      validationResult: this.hasValidationResult() ? this.validationResult.toJSON() : null,
      field: this.field,
      errorCount: this.getErrorCount(),
      warningCount: this.getWarningCount(),
      validationSummary: this.getValidationSummary()
    };
  }

  static fromJSON(data) {
    const exception = new ValidationException(
      data.message,
      data.validationResult ? ValidationResult.fromJSON(data.validationResult) : null,
      data.field,
      data.code,
      data.context,
      data.cause ? WorkflowException.fromJSON(data.cause) : null,
      data.metadata
    );
    
    exception.timestamp = new Date(data.timestamp);
    exception.stack = data.stack;
    
    return exception;
  }

  // Factory methods
  static create(message, validationResult = null, field = null, context = null) {
    return new ValidationException(message, validationResult, field, 'VALIDATION_ERROR', context);
  }

  static createWithValidationResult(validationResult, field = null, context = null) {
    const message = validationResult.hasErrors() 
      ? `Validation failed with ${validationResult.getErrorCount()} error(s)`
      : 'Validation failed';
    
    return new ValidationException(message, validationResult, field, 'VALIDATION_ERROR', context);
  }

  static createFieldRequired(field, context = null) {
    const validationResult = ValidationResult.createFieldRequired(field);
    return new ValidationException(
      `Field '${field}' is required`,
      validationResult,
      field,
      'FIELD_REQUIRED',
      context
    );
  }

  static createFieldTypeError(field, expectedType, actualType, context = null) {
    const validationResult = ValidationResult.createFieldTypeError(field, expectedType, actualType);
    return new ValidationException(
      `Field '${field}' must be of type '${expectedType}', got '${actualType}'`,
      validationResult,
      field,
      'INVALID_TYPE',
      context
    );
  }

  static createFieldLengthError(field, minLength, maxLength, actualLength, context = null) {
    const validationResult = ValidationResult.createFieldLengthError(field, minLength, maxLength, actualLength);
    let message;
    if (minLength && maxLength) {
      message = `Field '${field}' must be between ${minLength} and ${maxLength} characters, got ${actualLength}`;
    } else if (minLength) {
      message = `Field '${field}' must be at least ${minLength} characters, got ${actualLength}`;
    } else if (maxLength) {
      message = `Field '${field}' must be at most ${maxLength} characters, got ${actualLength}`;
    } else {
      message = `Field '${field}' has invalid length: ${actualLength}`;
    }
    
    return new ValidationException(
      message,
      validationResult,
      field,
      'LENGTH_VIOLATION',
      context
    );
  }

  static createFieldPatternError(field, pattern, context = null) {
    const validationResult = ValidationResult.createFieldPatternError(field, pattern);
    return new ValidationException(
      `Field '${field}' does not match required pattern`,
      validationResult,
      field,
      'PATTERN_MISMATCH',
      context
    );
  }

  static createFieldRangeError(field, min, max, actual, context = null) {
    const validationResult = ValidationResult.createFieldRangeError(field, min, max, actual);
    let message;
    if (min !== undefined && max !== undefined) {
      message = `Field '${field}' must be between ${min} and ${max}, got ${actual}`;
    } else if (min !== undefined) {
      message = `Field '${field}' must be at least ${min}, got ${actual}`;
    } else if (max !== undefined) {
      message = `Field '${field}' must be at most ${max}, got ${actual}`;
    } else {
      message = `Field '${field}' has invalid value: ${actual}`;
    }
    
    return new ValidationException(
      message,
      validationResult,
      field,
      'RANGE_VIOLATION',
      context
    );
  }

  static createFieldEnumError(field, allowedValues, actualValue, context = null) {
    const validationResult = ValidationResult.createFieldEnumError(field, allowedValues, actualValue);
    return new ValidationException(
      `Field '${field}' must be one of: ${allowedValues.join(', ')}, got '${actualValue}'`,
      validationResult,
      field,
      'ENUM_VIOLATION',
      context
    );
  }

  static createSchemaValidationError(schema, errors, context = null) {
    const validationResult = ValidationResult.createWithErrors(errors);
    return new ValidationException(
      `Schema validation failed with ${errors.length} error(s)`,
      validationResult,
      null,
      'SCHEMA_VALIDATION_ERROR',
      context
    );
  }

  static createRuleValidationError(ruleName, field, error, context = null) {
    const validationResult = ValidationResult.createWithError(field, error);
    return new ValidationException(
      `Validation rule '${ruleName}' failed for field '${field}': ${error}`,
      validationResult,
      field,
      'RULE_VALIDATION_ERROR',
      context
    );
  }

  static createMultipleValidationErrors(errors, context = null) {
    const validationResult = ValidationResult.createWithErrors(errors);
    return new ValidationException(
      `Multiple validation errors occurred (${errors.length} errors)`,
      validationResult,
      null,
      'MULTIPLE_VALIDATION_ERRORS',
      context
    );
  }

  // Static utility methods
  static isValidationException(error) {
    return error instanceof ValidationException;
  }

  static fromValidationResult(validationResult, field = null, context = null) {
    if (!validationResult || validationResult.isValid) {
      throw new Error('Cannot create ValidationException from valid validation result');
    }

    // Extract field from validation result if not provided
    if (!field && validationResult.hasErrors()) {
      const firstError = validationResult.getFirstError();
      if (firstError && firstError.field) {
        field = firstError.field;
      }
    }

    return ValidationException.createWithValidationResult(validationResult, field, context);
  }

  static fromWorkflowException(workflowException, validationResult = null, field = null) {
    if (!(workflowException instanceof WorkflowException)) {
      throw new Error('Input must be a WorkflowException');
    }

    return new ValidationException(
      workflowException.message,
      validationResult,
      field,
      workflowException.code,
      workflowException.context,
      workflowException.cause,
      workflowException.metadata
    );
  }

  static wrapValidationError(error, field = null, context = null) {
    if (ValidationException.isValidationException(error)) {
      if (field) error.setField(field);
      if (context) error.setContext(context);
      return error;
    }

    if (WorkflowException.isWorkflowException(error)) {
      return ValidationException.fromWorkflowException(error, null, field);
    }

    return new ValidationException(
      error.message || 'Validation error occurred',
      null,
      field,
      'VALIDATION_ERROR',
      context,
      error
    );
  }

  // Common validation error codes
  static CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FIELD_REQUIRED: 'FIELD_REQUIRED',
    INVALID_TYPE: 'INVALID_TYPE',
    LENGTH_VIOLATION: 'LENGTH_VIOLATION',
    PATTERN_MISMATCH: 'PATTERN_MISMATCH',
    RANGE_VIOLATION: 'RANGE_VIOLATION',
    ENUM_VIOLATION: 'ENUM_VIOLATION',
    SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
    RULE_VALIDATION_ERROR: 'RULE_VALIDATION_ERROR',
    MULTIPLE_VALIDATION_ERRORS: 'MULTIPLE_VALIDATION_ERRORS',
    CUSTOM_VALIDATION_ERROR: 'CUSTOM_VALIDATION_ERROR'
  };

  // Aliases for test compatibility
  static fieldRequired(field, context = null) {
    return this.createFieldRequired(field, context);
  }
  static fieldInvalid(field, message = null, context = null) {
    return this.createFieldTypeError(field, message || 'Invalid', typeof message, context);
  }
  static fieldTooShort(field, minLength, context = null) {
    return this.createFieldLengthError(field, minLength, null, 0, context);
  }
}

module.exports = ValidationException; 