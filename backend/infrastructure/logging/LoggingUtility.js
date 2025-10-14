/**
 * Centralized Logging Utility
 * Eliminates DRY violations in logging patterns across all services
 * Provides consistent logging with context and structured data
 */

const Logger = require("@logging/Logger");

class LoggingUtility {
  constructor(serviceName) {
    this.logger = new Logger(serviceName);
    this.serviceName = serviceName;
  }

  /**
   * Log operation start with context
   * @param {string} operation - Operation name
   * @param {Object} context - Additional context
   */
  logOperationStart(operation, context = {}) {
    this.logger.info(`${operation} started`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log operation completion with results
   * @param {string} operation - Operation name
   * @param {Object} results - Operation results
   * @param {Object} context - Additional context
   */
  logOperationComplete(operation, results = {}, context = {}) {
    this.logger.info(`${operation} completed`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      results: this._summarizeResults(results),
      ...context,
    });
  }

  /**
   * Log operation failure with error details
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logOperationError(operation, error, context = {}) {
    this.logger.error(`${operation} failed`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...context,
    });
  }

  /**
   * Log validation failure
   * @param {string} operation - Operation name
   * @param {Array} validationErrors - Validation errors
   * @param {Object} context - Additional context
   */
  logValidationError(operation, validationErrors, context = {}) {
    this.logger.warn(`${operation} validation failed`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      validationErrors,
      ...context,
    });
  }

  /**
   * Log authentication/authorization events
   * @param {string} event - Event type (login, logout, access_denied, etc.)
   * @param {Object} context - Additional context
   */
  logAuthEvent(event, context = {}) {
    this.logger.info(`Auth event: ${event}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metrics - Additional metrics
   * @param {Object} context - Additional context
   */
  logPerformance(operation, duration, metrics = {}, context = {}) {
    this.logger.info(`${operation} performance`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      duration,
      ...metrics,
      ...context,
    });
  }

  /**
   * Log data access operations
   * @param {string} operation - Operation name (create, read, update, delete)
   * @param {string} resource - Resource type
   * @param {Object} context - Additional context
   */
  logDataAccess(operation, resource, context = {}) {
    this.logger.debug(`Data ${operation}: ${resource}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      operation,
      resource,
      ...context,
    });
  }

  /**
   * Log external service calls
   * @param {string} service - External service name
   * @param {string} operation - Operation name
   * @param {Object} context - Additional context
   */
  logExternalService(service, operation, context = {}) {
    this.logger.info(`External service: ${service}.${operation}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      externalService: service,
      operation,
      ...context,
    });
  }

  /**
   * Log workflow/step execution
   * @param {string} stepName - Step name
   * @param {string} status - Step status (started, completed, failed)
   * @param {Object} context - Additional context
   */
  logWorkflowStep(stepName, status, context = {}) {
    this.logger.info(`Workflow step: ${stepName} ${status}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      stepName,
      status,
      ...context,
    });
  }

  /**
   * Log configuration changes
   * @param {string} configKey - Configuration key
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   * @param {Object} context - Additional context
   */
  logConfigChange(configKey, oldValue, newValue, context = {}) {
    this.logger.info(`Configuration changed: ${configKey}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      configKey,
      oldValue,
      newValue,
      ...context,
    });
  }

  /**
   * Summarize results for logging (avoid logging large objects)
   * @param {Object} results - Results object
   * @returns {Object} Summarized results
   * @private
   */
  _summarizeResults(results) {
    if (!results || typeof results !== 'object') {
      return results;
    }

    const summary = {};
    
    for (const [key, value] of Object.entries(results)) {
      if (Array.isArray(value)) {
        summary[key] = {
          count: value.length,
          type: 'array'
        };
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = {
          keys: Object.keys(value),
          type: 'object'
        };
      } else {
        summary[key] = value;
      }
    }

    return summary;
  }

  /**
   * Create a child logger for a specific component
   * @param {string} component - Component name
   * @returns {LoggingUtility} New logging utility instance
   */
  child(component) {
    return new LoggingUtility(`${this.serviceName}.${component}`);
  }
}

module.exports = LoggingUtility;
