/**
 * ContextException - Exception for context-specific errors
 * Extends WorkflowException for workflow context-related errors
 */
const WorkflowException = require('./WorkflowException');

class ContextException extends WorkflowException {
  constructor(
    message,
    contextId = null,
    contextType = null,
    field = null,
    code = 'CONTEXT_ERROR',
    context = null,
    cause = null,
    metadata = {}
  ) {
    super(message, code, context, cause, metadata);
    
    this.name = 'ContextException';
    this.contextId = contextId;
    this.contextType = contextType;
    this.field = field;
    this.contextData = null; // For test compatibility
    this.operation = null; // For test compatibility
    this.key = null; // For test compatibility

    // Ensure proper inheritance
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextException);
    }
  }

  // Context ID management
  setContextId(contextId) {
    this.contextId = contextId;
    return this;
  }

  getContextId() {
    return this.contextId;
  }

  hasContextId() {
    return this.contextId !== null && this.contextId !== undefined;
  }

  // Context type management
  setContextType(contextType) {
    this.contextType = contextType;
    return this;
  }

  getContextType() {
    return this.contextType;
  }

  hasContextType() {
    return this.contextType !== null && this.contextType !== undefined;
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

  // Utility methods
  getContextInfo() {
    const info = {};
    if (this.hasContextId()) info.contextId = this.contextId;
    if (this.hasContextType()) info.contextType = this.contextType;
    if (this.hasField()) info.field = this.field;
    return info;
  }

  getFullMessage() {
    let message = this.message;
    const contextInfo = this.getContextInfo();
    
    if (Object.keys(contextInfo).length > 0) {
      const contextParts = [];
      if (contextInfo.contextId) contextParts.push(`context: ${contextInfo.contextId}`);
      if (contextInfo.contextType) contextParts.push(`type: ${contextInfo.contextType}`);
      if (contextInfo.field) contextParts.push(`field: ${contextInfo.field}`);
      
      message += ` (${contextParts.join(', ')})`;
    }
    
    return message;
  }

  // Serialization
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      name: this.name,
      contextId: this.contextId,
      contextType: this.contextType,
      field: this.field,
      contextInfo: this.getContextInfo(),
      fullMessage: this.getFullMessage()
    };
  }

  static fromJSON(data) {
    const exception = new ContextException(
      data.message,
      data.contextId,
      data.contextType,
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
  static create(message, contextId = null, contextType = null, field = null, context = null) {
    return new ContextException(message, contextId, contextType, field, 'CONTEXT_ERROR', context);
  }

  static createContextNotFound(contextId, contextType = null, context = null) {
    return new ContextException(
      `Context not found: ${contextId}`,
      contextId,
      contextType,
      null,
      'CONTEXT_NOT_FOUND',
      context
    );
  }

  static createContextInvalid(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Context is invalid: ${reason}`,
      contextId,
      contextType,
      null,
      'CONTEXT_INVALID',
      context
    );
  }

  static createContextExpired(contextId, contextType = null, context = null) {
    return new ContextException(
      `Context has expired: ${contextId}`,
      contextId,
      contextType,
      null,
      'CONTEXT_EXPIRED',
      context
    );
  }

  static createContextCorrupted(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Context is corrupted: ${reason}`,
      contextId,
      contextType,
      null,
      'CONTEXT_CORRUPTED',
      context
    );
  }

  static createFieldNotFound(contextId, field, contextType = null, context = null) {
    return new ContextException(
      `Field '${field}' not found in context`,
      contextId,
      contextType,
      field,
      'FIELD_NOT_FOUND',
      context
    );
  }

  static createFieldInvalid(contextId, field, reason, contextType = null, context = null) {
    return new ContextException(
      `Field '${field}' is invalid: ${reason}`,
      contextId,
      contextType,
      field,
      'FIELD_INVALID',
      context
    );
  }

  static createFieldRequired(contextId, field, contextType = null, context = null) {
    return new ContextException(
      `Field '${field}' is required in context`,
      contextId,
      contextType,
      field,
      'FIELD_REQUIRED',
      context
    );
  }

  static createStateInvalid(contextId, state, reason, contextType = null, context = null) {
    return new ContextException(
      `Context state is invalid: ${reason}`,
      contextId,
      contextType,
      'state',
      'STATE_INVALID',
      context
    );
  }

  static createStateTransitionInvalid(contextId, fromState, toState, contextType = null, context = null) {
    return new ContextException(
      `Invalid state transition from '${fromState}' to '${toState}'`,
      contextId,
      contextType,
      'state',
      'STATE_TRANSITION_INVALID',
      context
    );
  }

  static createMetadataInvalid(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Context metadata is invalid: ${reason}`,
      contextId,
      contextType,
      'metadata',
      'METADATA_INVALID',
      context
    );
  }

  static createDataInvalid(contextId, field, reason, contextType = null, context = null) {
    return new ContextException(
      `Context data is invalid: ${reason}`,
      contextId,
      contextType,
      field,
      'DATA_INVALID',
      context
    );
  }

  static createDependencyMissing(contextId, dependency, contextType = null, context = null) {
    return new ContextException(
      `Required dependency '${dependency}' is missing in context`,
      contextId,
      contextType,
      'dependencies',
      'DEPENDENCY_MISSING',
      context
    );
  }

  static createDependencyInvalid(contextId, dependency, reason, contextType = null, context = null) {
    return new ContextException(
      `Dependency '${dependency}' is invalid: ${reason}`,
      contextId,
      contextType,
      'dependencies',
      'DEPENDENCY_INVALID',
      context
    );
  }

  static createPermissionDenied(contextId, operation, contextType = null, context = null) {
    return new ContextException(
      `Permission denied for operation '${operation}' on context`,
      contextId,
      contextType,
      'permissions',
      'PERMISSION_DENIED',
      context
    );
  }

  static createAccessDenied(contextId, resource, contextType = null, context = null) {
    return new ContextException(
      `Access denied to resource '${resource}' in context`,
      contextId,
      contextType,
      'access',
      'ACCESS_DENIED',
      context
    );
  }

  static createTimeout(contextId, operation, timeout, contextType = null, context = null) {
    return new ContextException(
      `Operation '${operation}' timed out after ${timeout}ms`,
      contextId,
      contextType,
      'timeout',
      'CONTEXT_TIMEOUT',
      context
    );
  }

  static createResourceUnavailable(contextId, resource, contextType = null, context = null) {
    return new ContextException(
      `Resource '${resource}' is unavailable in context`,
      contextId,
      contextType,
      'resources',
      'RESOURCE_UNAVAILABLE',
      context
    );
  }

  static createConfigurationError(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Configuration error: ${reason}`,
      contextId,
      contextType,
      'configuration',
      'CONFIGURATION_ERROR',
      context
    );
  }

  static createSerializationError(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Serialization error: ${reason}`,
      contextId,
      contextType,
      'serialization',
      'SERIALIZATION_ERROR',
      context
    );
  }

  static createDeserializationError(contextId, reason, contextType = null, context = null) {
    return new ContextException(
      `Deserialization error: ${reason}`,
      contextId,
      contextType,
      'deserialization',
      'DESERIALIZATION_ERROR',
      context
    );
  }

  // Static utility methods
  static isContextException(error) {
    return error instanceof ContextException;
  }

  static fromWorkflowException(workflowException, contextId = null, contextType = null, field = null) {
    if (!(workflowException instanceof WorkflowException)) {
      throw new Error('Input must be a WorkflowException');
    }

    return new ContextException(
      workflowException.message,
      contextId,
      contextType,
      field,
      workflowException.code,
      workflowException.context,
      workflowException.cause,
      workflowException.metadata
    );
  }

  static wrapContextError(error, contextId = null, contextType = null, field = null, context = null) {
    if (ContextException.isContextException(error)) {
      if (contextId) error.setContextId(contextId);
      if (contextType) error.setContextType(contextType);
      if (field) error.setField(field);
      if (context) error.setContext(context);
      return error;
    }

    if (WorkflowException.isWorkflowException(error)) {
      return ContextException.fromWorkflowException(error, contextId, contextType, field);
    }

    return new ContextException(
      error.message || 'Context error occurred',
      contextId,
      contextType,
      field,
      'CONTEXT_ERROR',
      context,
      error
    );
  }

  // Aliases for test compatibility
  static contextNotFound(contextId, contextType = null, context = null) {
    return this.createContextNotFound(contextId, contextType, context);
  }
  static keyNotFound(key, contextId = null, contextType = null, context = null) {
    return this.createFieldNotFound(contextId, key, contextType, context);
  }
  static stateInvalid(state, contextId = null, contextType = null, context = null) {
    return this.createStateInvalid(contextId, state, 'Invalid state', contextType, context);
  }

  // Common context error codes
  static CODES = {
    CONTEXT_ERROR: 'CONTEXT_ERROR',
    CONTEXT_NOT_FOUND: 'CONTEXT_NOT_FOUND',
    CONTEXT_INVALID: 'CONTEXT_INVALID',
    CONTEXT_EXPIRED: 'CONTEXT_EXPIRED',
    CONTEXT_CORRUPTED: 'CONTEXT_CORRUPTED',
    FIELD_NOT_FOUND: 'FIELD_NOT_FOUND',
    FIELD_INVALID: 'FIELD_INVALID',
    FIELD_REQUIRED: 'FIELD_REQUIRED',
    STATE_INVALID: 'STATE_INVALID',
    STATE_TRANSITION_INVALID: 'STATE_TRANSITION_INVALID',
    METADATA_INVALID: 'METADATA_INVALID',
    DATA_INVALID: 'DATA_INVALID',
    DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
    DEPENDENCY_INVALID: 'DEPENDENCY_INVALID',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    CONTEXT_TIMEOUT: 'CONTEXT_TIMEOUT',
    RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
    DESERIALIZATION_ERROR: 'DESERIALIZATION_ERROR'
  };
}

module.exports = ContextException; 