/**
 * HandlerException - Exception class for unified handler errors
 * 
 * This class provides a standardized exception type for handler-related
 * errors, including validation errors, execution errors, and system errors.
 */
class HandlerException extends Error {
  /**
   * Create a new handler exception
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @param {string} code - Error code
   * @param {string} type - Error type
   */
  constructor(message, details = {}, code = 'HANDLER_ERROR', type = 'GENERAL') {
    super(message);
    
    this.name = 'HandlerException';
    this.message = message;
    this.details = details;
    this.code = code;
    this.type = type;
    this.timestamp = new Date();
    this.stack = this.stack || new Error().stack;
  }

  /**
   * Create validation error
   * @param {string} message - Error message
   * @param {Object} details - Validation details
   * @returns {HandlerException} Validation exception
   */
  static validationError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'VALIDATION_ERROR',
      'VALIDATION'
    );
  }

  /**
   * Create execution error
   * @param {string} message - Error message
   * @param {Object} details - Execution details
   * @returns {HandlerException} Execution exception
   */
  static executionError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'EXECUTION_ERROR',
      'EXECUTION'
    );
  }

  /**
   * Create adapter error
   * @param {string} message - Error message
   * @param {Object} details - Adapter details
   * @returns {HandlerException} Adapter exception
   */
  static adapterError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'ADAPTER_ERROR',
      'ADAPTER'
    );
  }

  /**
   * Create registry error
   * @param {string} message - Error message
   * @param {Object} details - Registry details
   * @returns {HandlerException} Registry exception
   */
  static registryError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'REGISTRY_ERROR',
      'REGISTRY'
    );
  }

  /**
   * Create factory error
   * @param {string} message - Error message
   * @param {Object} details - Factory details
   * @returns {HandlerException} Factory exception
   */
  static factoryError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'FACTORY_ERROR',
      'FACTORY'
    );
  }

  /**
   * Create context error
   * @param {string} message - Error message
   * @param {Object} details - Context details
   * @returns {HandlerException} Context exception
   */
  static contextError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'CONTEXT_ERROR',
      'CONTEXT'
    );
  }

  /**
   * Create migration error
   * @param {string} message - Error message
   * @param {Object} details - Migration details
   * @returns {HandlerException} Migration exception
   */
  static migrationError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'MIGRATION_ERROR',
      'MIGRATION'
    );
  }

  /**
   * Create timeout error
   * @param {string} message - Error message
   * @param {Object} details - Timeout details
   * @returns {HandlerException} Timeout exception
   */
  static timeoutError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'TIMEOUT_ERROR',
      'TIMEOUT'
    );
  }

  /**
   * Create resource error
   * @param {string} message - Error message
   * @param {Object} details - Resource details
   * @returns {HandlerException} Resource exception
   */
  static resourceError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'RESOURCE_ERROR',
      'RESOURCE'
    );
  }

  /**
   * Create configuration error
   * @param {string} message - Error message
   * @param {Object} details - Configuration details
   * @returns {HandlerException} Configuration exception
   */
  static configurationError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'CONFIGURATION_ERROR',
      'CONFIGURATION'
    );
  }

  /**
   * Create dependency error
   * @param {string} message - Error message
   * @param {Object} details - Dependency details
   * @returns {HandlerException} Dependency exception
   */
  static dependencyError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'DEPENDENCY_ERROR',
      'DEPENDENCY'
    );
  }

  /**
   * Create health check error
   * @param {string} message - Error message
   * @param {Object} details - Health check details
   * @returns {HandlerException} Health check exception
   */
  static healthCheckError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'HEALTH_CHECK_ERROR',
      'HEALTH_CHECK'
    );
  }

  /**
   * Create metrics error
   * @param {string} message - Error message
   * @param {Object} details - Metrics details
   * @returns {HandlerException} Metrics exception
   */
  static metricsError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'METRICS_ERROR',
      'METRICS'
    );
  }

  /**
   * Create audit error
   * @param {string} message - Error message
   * @param {Object} details - Audit details
   * @returns {HandlerException} Audit exception
   */
  static auditError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'AUDIT_ERROR',
      'AUDIT'
    );
  }

  /**
   * Create optimization error
   * @param {string} message - Error message
   * @param {Object} details - Optimization details
   * @returns {HandlerException} Optimization exception
   */
  static optimizationError(message, details = {}) {
    return new HandlerException(
      message,
      details,
      'OPTIMIZATION_ERROR',
      'OPTIMIZATION'
    );
  }

  /**
   * Get error summary
   * @returns {Object} Error summary
   */
  getSummary() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      timestamp: this.timestamp,
      hasDetails: Object.keys(this.details).length > 0
    };
  }

  /**
   * Get error details
   * @returns {Object} Error details
   */
  getDetails() {
    return {
      ...this.details,
      stack: this.stack,
      timestamp: this.timestamp
    };
  }

  /**
   * Check if error is of specific type
   * @param {string} type - Error type to check
   * @returns {boolean} True if error is of specified type
   */
  isType(type) {
    return this.type === type;
  }

  /**
   * Check if error is of specific code
   * @param {string} code - Error code to check
   * @returns {boolean} True if error is of specified code
   */
  isCode(code) {
    return this.code === code;
  }

  /**
   * Check if error is validation error
   * @returns {boolean} True if validation error
   */
  isValidationError() {
    return this.isType('VALIDATION');
  }

  /**
   * Check if error is execution error
   * @returns {boolean} True if execution error
   */
  isExecutionError() {
    return this.isType('EXECUTION');
  }

  /**
   * Check if error is adapter error
   * @returns {boolean} True if adapter error
   */
  isAdapterError() {
    return this.isType('ADAPTER');
  }

  /**
   * Check if error is registry error
   * @returns {boolean} True if registry error
   */
  isRegistryError() {
    return this.isType('REGISTRY');
  }

  /**
   * Check if error is factory error
   * @returns {boolean} True if factory error
   */
  isFactoryError() {
    return this.isType('FACTORY');
  }

  /**
   * Check if error is context error
   * @returns {boolean} True if context error
   */
  isContextError() {
    return this.isType('CONTEXT');
  }

  /**
   * Check if error is migration error
   * @returns {boolean} True if migration error
   */
  isMigrationError() {
    return this.isType('MIGRATION');
  }

  /**
   * Check if error is timeout error
   * @returns {boolean} True if timeout error
   */
  isTimeoutError() {
    return this.isType('TIMEOUT');
  }

  /**
   * Check if error is resource error
   * @returns {boolean} True if resource error
   */
  isResourceError() {
    return this.isType('RESOURCE');
  }

  /**
   * Check if error is configuration error
   * @returns {boolean} True if configuration error
   */
  isConfigurationError() {
    return this.isType('CONFIGURATION');
  }

  /**
   * Check if error is dependency error
   * @returns {boolean} True if dependency error
   */
  isDependencyError() {
    return this.isType('DEPENDENCY');
  }

  /**
   * Check if error is health check error
   * @returns {boolean} True if health check error
   */
  isHealthCheckError() {
    return this.isType('HEALTH_CHECK');
  }

  /**
   * Check if error is metrics error
   * @returns {boolean} True if metrics error
   */
  isMetricsError() {
    return this.isType('METRICS');
  }

  /**
   * Check if error is audit error
   * @returns {boolean} True if audit error
   */
  isAuditError() {
    return this.isType('AUDIT');
  }

  /**
   * Check if error is optimization error
   * @returns {boolean} True if optimization error
   */
  isOptimizationError() {
    return this.isType('OPTIMIZATION');
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return `${this.name}: ${this.message} (${this.code})`;
  }

  /**
   * Get error severity level
   * @returns {string} Severity level
   */
  getSeverity() {
    const severityMap = {
      'VALIDATION': 'LOW',
      'CONFIGURATION': 'LOW',
      'CONTEXT': 'MEDIUM',
      'ADAPTER': 'MEDIUM',
      'REGISTRY': 'MEDIUM',
      'FACTORY': 'MEDIUM',
      'EXECUTION': 'HIGH',
      'MIGRATION': 'HIGH',
      'TIMEOUT': 'HIGH',
      'RESOURCE': 'HIGH',
      'DEPENDENCY': 'HIGH',
      'HEALTH_CHECK': 'HIGH',
      'METRICS': 'LOW',
      'AUDIT': 'LOW',
      'OPTIMIZATION': 'MEDIUM'
    };

    return severityMap[this.type] || 'MEDIUM';
  }

  /**
   * Check if error is critical
   * @returns {boolean} True if critical error
   */
  isCritical() {
    return this.getSeverity() === 'HIGH';
  }

  /**
   * Check if error is recoverable
   * @returns {boolean} True if recoverable error
   */
  isRecoverable() {
    return !this.isCritical() || this.isType('TIMEOUT') || this.isType('RESOURCE');
  }
}

module.exports = HandlerException; 