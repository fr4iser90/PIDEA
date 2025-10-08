/**
 * ExecutionException - Comprehensive exception hierarchy for workflow execution
 * Provides specific exception types for different execution error scenarios
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
    this.executionId = context.executionId || null;
    this.workflowName = context.workflowName || null;
    this.stepIndex = context.stepIndex || null;
    this.stepName = context.stepName || null;
    
    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionException);
    }
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      name: this.name,
      message: this.message,
      executionId: this.executionId,
      workflowName: this.workflowName,
      stepIndex: this.stepIndex,
      stepName: this.stepName,
      timestamp: this.timestamp,
      context: this.context
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...this.getSummary(),
      stack: this.stack,
      cause: this.cause ? this.cause.message : null
    };
  }
}

/**
 * Strategy execution exception
 */
class StrategyExecutionException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'StrategyExecutionException';
    this.strategyName = context.strategyName || null;
    this.strategyType = context.strategyType || null;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      strategyName: this.strategyName,
      strategyType: this.strategyType
    };
  }
}

/**
 * Step execution exception
 */
class StepExecutionException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'StepExecutionException';
    this.stepType = context.stepType || null;
    this.stepMetadata = context.stepMetadata || null;
    this.attemptNumber = context.attemptNumber || 1;
    this.maxAttempts = context.maxAttempts || 1;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      stepType: this.stepType,
      attemptNumber: this.attemptNumber,
      maxAttempts: this.maxAttempts
    };
  }

  /**
   * Check if step can be retried
   * @returns {boolean} Can be retried
   */
  canRetry() {
    return this.attemptNumber < this.maxAttempts;
  }

  /**
   * Increment attempt number
   */
  incrementAttempt() {
    this.attemptNumber++;
  }
}

/**
 * Execution timeout exception
 */
class ExecutionTimeoutException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ExecutionTimeoutException';
    this.timeout = context.timeout || 0;
    this.elapsedTime = context.elapsedTime || 0;
    this.timeoutType = context.timeoutType || 'execution'; // execution, step, resource
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      timeout: this.timeout,
      elapsedTime: this.elapsedTime,
      timeoutType: this.timeoutType
    };
  }
}

/**
 * Resource exception
 */
class ResourceException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ResourceException';
    this.resourceType = context.resourceType || null; // memory, cpu, network, disk
    this.requiredAmount = context.requiredAmount || 0;
    this.availableAmount = context.availableAmount || 0;
    this.resourceId = context.resourceId || null;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      resourceType: this.resourceType,
      requiredAmount: this.requiredAmount,
      availableAmount: this.availableAmount,
      resourceId: this.resourceId
    };
  }
}

/**
 * Dependency exception
 */
class DependencyException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'DependencyException';
    this.dependencyType = context.dependencyType || null; // step, resource, service
    this.dependencyId = context.dependencyId || null;
    this.missingDependencies = context.missingDependencies || [];
    this.circularDependencies = context.circularDependencies || [];
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      dependencyType: this.dependencyType,
      dependencyId: this.dependencyId,
      missingDependencies: this.missingDependencies,
      circularDependencies: this.circularDependencies
    };
  }
}

/**
 * Validation exception
 */
class ValidationException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ValidationException';
    this.validationType = context.validationType || null; // workflow, step, context, input
    this.validationErrors = context.validationErrors || [];
    this.validationWarnings = context.validationWarnings || [];
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      validationType: this.validationType,
      validationErrors: this.validationErrors,
      validationWarnings: this.validationWarnings
    };
  }
}

/**
 * Optimization exception
 */
class OptimizationException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'OptimizationException';
    this.optimizationType = context.optimizationType || null; // step_combination, reordering, parallel, resource
    this.optimizationData = context.optimizationData || {};
    this.optimizationRisks = context.optimizationRisks || [];
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      optimizationType: this.optimizationType,
      optimizationRisks: this.optimizationRisks
    };
  }
}

/**
 * Cache exception
 */
class CacheException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'CacheException';
    this.cacheType = context.cacheType || null; // result, step, resource
    this.cacheKey = context.cacheKey || null;
    this.cacheOperation = context.cacheOperation || null; // get, set, invalidate
    this.cacheSize = context.cacheSize || 0;
    this.maxCacheSize = context.maxCacheSize || 0;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      cacheType: this.cacheType,
      cacheKey: this.cacheKey,
      cacheOperation: this.cacheOperation,
      cacheSize: this.cacheSize,
      maxCacheSize: this.maxCacheSize
    };
  }
}

/**
 * Monitoring exception
 */
class MonitoringException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'MonitoringException';
    this.monitoringType = context.monitoringType || null; // metrics, alerts, performance
    this.metricName = context.metricName || null;
    this.alertType = context.alertType || null;
    this.threshold = context.threshold || 0;
    this.currentValue = context.currentValue || 0;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      monitoringType: this.monitoringType,
      metricName: this.metricName,
      alertType: this.alertType,
      threshold: this.threshold,
      currentValue: this.currentValue
    };
  }
}

/**
 * Queue exception
 */
class QueueException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'QueueException';
    this.queueType = context.queueType || null; // execution, priority, retry
    this.queueSize = context.queueSize || 0;
    this.maxQueueSize = context.maxQueueSize || 0;
    this.queueOperation = context.queueOperation || null; // enqueue, dequeue, peek
    this.priority = context.priority || 0;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      queueType: this.queueType,
      queueSize: this.queueSize,
      maxQueueSize: this.maxQueueSize,
      queueOperation: this.queueOperation,
      priority: this.priority
    };
  }
}

/**
 * Scheduler exception
 */
class SchedulerException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'SchedulerException';
    this.schedulerType = context.schedulerType || null; // priority, round_robin, fair
    this.schedulingAlgorithm = context.schedulingAlgorithm || null;
    this.scheduleTime = context.scheduleTime || null;
    this.estimatedDuration = context.estimatedDuration || 0;
    this.actualDuration = context.actualDuration || 0;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      schedulerType: this.schedulerType,
      schedulingAlgorithm: this.schedulingAlgorithm,
      scheduleTime: this.scheduleTime,
      estimatedDuration: this.estimatedDuration,
      actualDuration: this.actualDuration
    };
  }
}

/**
 * Context exception
 */
class ContextException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ContextException';
    this.contextType = context.contextType || null; // workflow, step, execution
    this.missingData = context.missingData || [];
    this.invalidData = context.invalidData || [];
    this.dataType = context.dataType || null;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      contextType: this.contextType,
      missingData: this.missingData,
      invalidData: this.invalidData,
      dataType: this.dataType
    };
  }
}

/**
 * Result exception
 */
class ResultException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ResultException';
    this.resultType = context.resultType || null; // success, failure, partial
    this.expectedResult = context.expectedResult || null;
    this.actualResult = context.actualResult || null;
    this.resultValidation = context.resultValidation || [];
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      resultType: this.resultType,
      expectedResult: this.expectedResult,
      actualResult: this.actualResult,
      resultValidation: this.resultValidation
    };
  }
}

/**
 * External service exception
 */
class ExternalServiceException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ExternalServiceException';
    this.serviceName = context.serviceName || null;
    this.serviceEndpoint = context.serviceEndpoint || null;
    this.serviceResponse = context.serviceResponse || null;
    this.retryable = context.retryable !== false;
    this.retryCount = context.retryCount || 0;
    this.maxRetries = context.maxRetries || 3;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      serviceName: this.serviceName,
      serviceEndpoint: this.serviceEndpoint,
      retryable: this.retryable,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Check if service call can be retried
   * @returns {boolean} Can be retried
   */
  canRetry() {
    return this.retryable && this.retryCount < this.maxRetries;
  }

  /**
   * Increment retry count
   */
  incrementRetry() {
    this.retryCount++;
  }
}

/**
 * Configuration exception
 */
class ConfigurationException extends ExecutionException {
  constructor(message, cause = null, context = {}) {
    super(message, cause, context);
    this.name = 'ConfigurationException';
    this.configType = context.configType || null; // engine, strategy, resource, monitoring
    this.configKey = context.configKey || null;
    this.configValue = context.configValue || null;
    this.expectedType = context.expectedType || null;
    this.actualType = context.actualType || null;
  }

  /**
   * Get exception summary
   * @returns {Object} Exception summary
   */
  getSummary() {
    return {
      ...super.getSummary(),
      configType: this.configType,
      configKey: this.configKey,
      expectedType: this.expectedType,
      actualType: this.actualType
    };
  }
}

/**
 * Exception factory for creating specific exception types
 */
class ExecutionExceptionFactory {
  /**
   * Create strategy execution exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {StrategyExecutionException} Strategy execution exception
   */
  static createStrategyException(message, cause = null, context = {}) {
    return new StrategyExecutionException(message, cause, context);
  }

  /**
   * Create step execution exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {StepExecutionException} Step execution exception
   */
  static createStepException(message, cause = null, context = {}) {
    return new StepExecutionException(message, cause, context);
  }

  /**
   * Create timeout exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ExecutionTimeoutException} Timeout exception
   */
  static createTimeoutException(message, cause = null, context = {}) {
    return new ExecutionTimeoutException(message, cause, context);
  }

  /**
   * Create resource exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ResourceException} Resource exception
   */
  static createResourceException(message, cause = null, context = {}) {
    return new ResourceException(message, cause, context);
  }

  /**
   * Create dependency exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {DependencyException} Dependency exception
   */
  static createDependencyException(message, cause = null, context = {}) {
    return new DependencyException(message, cause, context);
  }

  /**
   * Create validation exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ValidationException} Validation exception
   */
  static createValidationException(message, cause = null, context = {}) {
    return new ValidationException(message, cause, context);
  }

  /**
   * Create optimization exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {OptimizationException} Optimization exception
   */
  static createOptimizationException(message, cause = null, context = {}) {
    return new OptimizationException(message, cause, context);
  }

  /**
   * Create cache exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {CacheException} Cache exception
   */
  static createCacheException(message, cause = null, context = {}) {
    return new CacheException(message, cause, context);
  }

  /**
   * Create monitoring exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {MonitoringException} Monitoring exception
   */
  static createMonitoringException(message, cause = null, context = {}) {
    return new MonitoringException(message, cause, context);
  }

  /**
   * Create queue exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {QueueException} Queue exception
   */
  static createQueueException(message, cause = null, context = {}) {
    return new QueueException(message, cause, context);
  }

  /**
   * Create scheduler exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {SchedulerException} Scheduler exception
   */
  static createSchedulerException(message, cause = null, context = {}) {
    return new SchedulerException(message, cause, context);
  }

  /**
   * Create context exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ContextException} Context exception
   */
  static createContextException(message, cause = null, context = {}) {
    return new ContextException(message, cause, context);
  }

  /**
   * Create result exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ResultException} Result exception
   */
  static createResultException(message, cause = null, context = {}) {
    return new ResultException(message, cause, context);
  }

  /**
   * Create external service exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ExternalServiceException} External service exception
   */
  static createExternalServiceException(message, cause = null, context = {}) {
    return new ExternalServiceException(message, cause, context);
  }

  /**
   * Create configuration exception
   * @param {string} message - Exception message
   * @param {Error} cause - Original error
   * @param {Object} context - Exception context
   * @returns {ConfigurationException} Configuration exception
   */
  static createConfigurationException(message, cause = null, context = {}) {
    return new ConfigurationException(message, cause, context);
  }

  /**
   * Create exception from error
   * @param {Error} error - Original error
   * @param {Object} context - Exception context
   * @returns {ExecutionException} Appropriate execution exception
   */
  static createFromError(error, context = {}) {
    if (error instanceof ExecutionException) {
      return error;
    }

    // Determine exception type based on error message or context
    const message = error.message || 'Unknown execution error';
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return this.createTimeoutException(message, error, context);
    }
    
    if (message.includes('resource') || message.includes('memory') || message.includes('cpu')) {
      return this.createResourceException(message, error, context);
    }
    
    if (message.includes('dependency') || message.includes('depends')) {
      return this.createDependencyException(message, error, context);
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return this.createValidationException(message, error, context);
    }
    
    if (message.includes('cache') || message.includes('cached')) {
      return this.createCacheException(message, error, context);
    }
    
    if (message.includes('service') || message.includes('api') || message.includes('http')) {
      return this.createExternalServiceException(message, error, context);
    }
    
    if (message.includes('config') || message.includes('configuration')) {
      return this.createConfigurationException(message, error, context);
    }
    
    // Default to base execution exception
    return new ExecutionException(message, error, context);
  }
}

module.exports = {
  ExecutionException,
  StrategyExecutionException,
  StepExecutionException,
  ExecutionTimeoutException,
  ResourceException,
  DependencyException,
  ValidationException,
  OptimizationException,
  CacheException,
  MonitoringException,
  QueueException,
  SchedulerException,
  ContextException,
  ResultException,
  ExternalServiceException,
  ConfigurationException,
  ExecutionExceptionFactory
}; 