/**
 * WorkflowException - Base exception for workflow-related errors
 * Provides context and cause information for workflow errors
 */
class WorkflowException extends Error {
  constructor(
    message,
    code = 'WORKFLOW_ERROR',
    context = null,
    cause = null,
    metadata = {}
  ) {
    super(message);
    
    this.name = 'WorkflowException';
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.metadata = { ...metadata };
    this.timestamp = new Date();
    this.stack = this.stack || new Error().stack;

    // Ensure proper inheritance
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowException);
    }
  }

  // Context management
  setContext(context) {
    this.context = context;
    return this;
  }

  getContext() {
    return this.context;
  }

  hasContext() {
    return this.context !== null && this.context !== undefined;
  }

  // Cause management
  setCause(cause) {
    this.cause = cause;
    return this;
  }

  getCause() {
    return this.cause;
  }

  hasCause() {
    return this.cause !== null && this.cause !== undefined;
  }

  // Metadata management
  setMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  getMetadata(key, defaultValue = null) {
    return this.metadata[key] !== undefined ? this.metadata[key] : defaultValue;
  }

  hasMetadata(key) {
    return this.metadata[key] !== undefined;
  }

  updateMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  // Error chain management
  getRootCause() {
    let current = this;
    while (current.hasCause && current.hasCause()) {
      current = current.getCause();
    }
    return current;
  }

  getErrorChain() {
    const chain = [this];
    let current = this;
    
    while (current.hasCause && current.hasCause()) {
      current = current.getCause();
      chain.push(current);
    }
    
    return chain;
  }

  getErrorChainMessages() {
    return this.getErrorChain().map(error => error.message);
  }

  getErrorChainCodes() {
    return this.getErrorChain().map(error => error.code);
  }

  // Utility methods
  isRecoverable() {
    return this.metadata.recoverable === true;
  }

  setRecoverable(recoverable = true) {
    this.metadata.recoverable = recoverable;
    return this;
  }

  isRetryable() {
    return this.metadata.retryable === true;
  }

  setRetryable(retryable = true) {
    this.metadata.retryable = retryable;
    return this;
  }

  getRetryCount() {
    return this.metadata.retryCount || 0;
  }

  incrementRetryCount() {
    this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
    return this;
  }

  getMaxRetries() {
    return this.metadata.maxRetries || 3;
  }

  setMaxRetries(maxRetries) {
    this.metadata.maxRetries = maxRetries;
    return this;
  }

  canRetry() {
    return this.isRetryable() && this.getRetryCount() < this.getMaxRetries();
  }

  // Serialization
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.hasCause() ? this.cause.toJSON() : null,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      errorChain: this.getErrorChain().map(error => ({
        name: error.name,
        message: error.message,
        code: error.code
      }))
    };
  }

  static fromJSON(data) {
    const exception = new WorkflowException(
      data.message,
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
  static create(message, code = 'WORKFLOW_ERROR', context = null, cause = null) {
    return new WorkflowException(message, code, context, cause);
  }

  static createWithContext(message, context, code = 'WORKFLOW_ERROR') {
    return new WorkflowException(message, code, context);
  }

  static createWithCause(message, cause, code = 'WORKFLOW_ERROR') {
    return new WorkflowException(message, code, null, cause);
  }

  static createRecoverable(message, code = 'WORKFLOW_ERROR', context = null) {
    return new WorkflowException(message, code, context).setRecoverable(true);
  }

  static createRetryable(message, code = 'WORKFLOW_ERROR', context = null, maxRetries = 3) {
    return new WorkflowException(message, code, context)
      .setRetryable(true)
      .setMaxRetries(maxRetries);
  }

  // Common error codes
  static CODES = {
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONTEXT_ERROR: 'CONTEXT_ERROR',
    STATE_ERROR: 'STATE_ERROR',
    EXECUTION_ERROR: 'EXECUTION_ERROR',
    ROLLBACK_ERROR: 'ROLLBACK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    RESOURCE_ERROR: 'RESOURCE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  // Static utility methods
  static isWorkflowException(error) {
    return error instanceof WorkflowException;
  }

  static getErrorCode(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  static getErrorMessage(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.message;
    }
    return error.message || 'Unknown error occurred';
  }

  static getErrorContext(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.context;
    }
    return null;
  }

  static isRecoverable(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.isRecoverable();
    }
    return false;
  }

  static isRetryable(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.isRetryable();
    }
    return false;
  }

  static canRetry(error) {
    if (WorkflowException.isWorkflowException(error)) {
      return error.canRetry();
    }
    return false;
  }

  static wrap(error, message = null, code = null, context = null) {
    if (WorkflowException.isWorkflowException(error)) {
      if (message) error.message = message;
      if (code) error.code = code;
      if (context) error.setContext(context);
      return error;
    }

    return new WorkflowException(
      message || error.message || 'Unknown error occurred',
      code || 'WORKFLOW_ERROR',
      context,
      error
    );
  }

  static chain(error, message, code = null, context = null) {
    return new WorkflowException(
      message,
      code || 'WORKFLOW_ERROR',
      context,
      error
    );
  }
}

module.exports = WorkflowException; 