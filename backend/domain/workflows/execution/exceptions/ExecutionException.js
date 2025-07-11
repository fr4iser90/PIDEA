/**
 * ExecutionException - Execution-related exceptions
 * Provides specific exception types for workflow execution errors
 */

/**
 * Base execution exception
 */
class ExecutionException extends Error {
  constructor(message, cause = null, context = {}) {
    super(message);
    this.name = 'ExecutionException';
    this.cause = cause;
    this.context = context;
    this.timestamp = new Date();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionException);
    }
  }

  /**
   * Get exception context
   * @returns {Object} Exception context
   */
  getContext() {
    return { ...this.context };
  }

  /**
   * Get exception cause
   * @returns {Error|null} Exception cause
   */
  getCause() {
    return this.cause;
  }

  /**
   * Get exception timestamp
   * @returns {Date} Exception timestamp
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause?.message || null,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create workflow execution failed exception
   * @param {string} message - Error message
   * @param {Error} cause - Original error
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static workflowExecutionFailed(message, cause = null, context = {}) {
    return new ExecutionException(message, cause, {
      ...context,
      type: 'workflow_execution_failed'
    });
  }

  /**
   * Create strategy execution failed exception
   * @param {string} message - Error message
   * @param {Error} cause - Original error
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static strategyExecutionFailed(message, cause = null, context = {}) {
    return new ExecutionException(message, cause, {
      ...context,
      type: 'strategy_execution_failed'
    });
  }

  /**
   * Create step execution failed exception
   * @param {string} message - Error message
   * @param {Error} cause - Original error
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static stepExecutionFailed(message, cause = null, context = {}) {
    return new ExecutionException(message, cause, {
      ...context,
      type: 'step_execution_failed'
    });
  }

  /**
   * Create timeout exception
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static timeout(message, context = {}) {
    return new ExecutionException(message, null, {
      ...context,
      type: 'execution_timeout'
    });
  }

  /**
   * Create resource unavailable exception
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static resourceUnavailable(message, context = {}) {
    return new ExecutionException(message, null, {
      ...context,
      type: 'resource_unavailable'
    });
  }

  /**
   * Create dependency failed exception
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static dependencyFailed(message, context = {}) {
    return new ExecutionException(message, null, {
      ...context,
      type: 'dependency_failed'
    });
  }

  /**
   * Create validation failed exception
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @returns {ExecutionException} Execution exception
   */
  static validationFailed(message, context = {}) {
    return new ExecutionException(message, null, {
      ...context,
      type: 'validation_failed'
    });
  }
}

/**
 * Strategy execution exception
 */
class StrategyExecutionException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'StrategyExecutionException';
  }
}

/**
 * Step execution exception
 */
class StepExecutionException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'StepExecutionException';
  }
}

/**
 * Timeout exception
 */
class ExecutionTimeoutException extends ExecutionException {
  constructor(message, context = {}) {
    super(message, null, context);
    this.name = 'ExecutionTimeoutException';
  }
}

/**
 * Resource exception
 */
class ResourceException extends ExecutionException {
  constructor(message, context = {}) {
    super(message, null, context);
    this.name = 'ResourceException';
  }
}

/**
 * Dependency exception
 */
class DependencyException extends ExecutionException {
  constructor(message, context = {}) {
    super(message, null, context);
    this.name = 'DependencyException';
  }
}

/**
 * Validation exception
 */
class ValidationException extends ExecutionException {
  constructor(message, context = {}) {
    super(message, null, context);
    this.name = 'ValidationException';
  }
}

module.exports = {
  ExecutionException,
  StrategyExecutionException,
  StepExecutionException,
  ExecutionTimeoutException,
  ResourceException,
  DependencyException,
  ValidationException
}; 