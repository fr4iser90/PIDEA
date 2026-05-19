/**
 * ErrorHandlingService - Secure error handling utility
 * Provides safe error responses that don't leak sensitive information
 */

const Logger = require('@logging/Logger');
const logger = new Logger('ErrorHandlingService');

class ErrorHandlingService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableDetailedErrors = process.env.DEBUG_MODE === 'true';
  }

  /**
   * Generate safe error response for API clients
   * @param {Error} error - The original error
   * @param {string} context - Context for logging
   * @param {string} defaultMessage - Default message for client
   * @param {number} statusCode - HTTP status code
   * @returns {Object} Safe error response
   */
  createSafeErrorResponse(error, context = 'Unknown', defaultMessage = 'An error occurred', statusCode = 500) {
    // Log detailed error internally
    logger.error(`❌ ${context} - Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // SECURITY FIX: Don't leak sensitive information in production
    if (this.isProduction && !this.enableDetailedErrors) {
      return {
        success: false,
        error: defaultMessage,
        code: this.getErrorCode(error, context),
        statusCode: statusCode,
        timestamp: new Date().toISOString()
      };
    }

    // In development/debug mode, include limited error details
    return {
      success: false,
      error: defaultMessage,
      message: this.sanitizeErrorMessage(error),
      code: this.getErrorCode(error, context),
      statusCode: statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get error code based on error type and context
   * @param {Error} error - The original error
   * @param {string} context - Context for error classification
   * @returns {string} Error code
   */
  getErrorCode(error, context) {
    // Handle specific error types
    if (error.code === 'ENOENT') {
      return 'FILE_NOT_FOUND';
    }
    
    if (error.code === 'EACCES' || error.code === 'EISDIR') {
      return 'PERMISSION_DENIED';
    }

    if (error.code === 'SQLITE_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      return 'DATABASE_ERROR';
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'CONNECTION_ERROR';
    }

    if (error.message && error.message.toLowerCase().includes('validation')) {
      return 'VALIDATION_ERROR';
    }

    if (error.message && error.message.toLowerCase().includes('authentication')) {
      return 'AUTHENTICATION_ERROR';
    }

    if (error.message && error.message.toLowerCase().includes('authorization')) {
      return 'AUTHORIZATION_ERROR';
    }

    // Default error code
    return `${context.toUpperCase().replace(/\s+/g, '_')}_ERROR`;
  }

  /**
   * Sanitize error message to prevent information leakage
   * @param {Error} error - The original error
   * @returns {string} Sanitized error message
   */
  sanitizeErrorMessage(error) {
    if (!error || !error.message) {
      return 'An unexpected error occurred';
    }

    let message = error.message;

    // SECURITY FIX: Remove sensitive information from error messages
    const sensitivePatterns = [
      /password\s*[:=]\s*[^,;}]+/gi,        // Passwords
      /token\s*[:=]\s*[^,;}]+/gi,           // Tokens
      /secret\s*[:=]\s*[^,;}]+/gi,          // Secrets
      /api[_-]?key\s*[:=]\s*[^,;}]+/gi,     // API keys
      /private[_-]?key\s*[:=]\s*[^,;}]+/gi, // Private keys
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,    // Credit card numbers
      /\b\d{9}[- ]?\d{2}[- ]?\d{4}\b/g,    // SSN-like patterns
      /\/[\w\-]+\/\.(env|git|ssh)/gi,       // Sensitive file paths
      /connection\s*to\s*\S+/i,             // Connection details
      /query\s*[:=]\s*.*SELECT.*FROM/i,     // SQL queries
      /stack\s*trace:/i,                    // Stack traces
      /\b(?:admin|root|superuser)\b/i,      // User roles
    ];

    for (const pattern of sensitivePatterns) {
      message = message.replace(pattern, '[REDACTED]');
    }

    // Remove stack traces
    message = message.replace(/at\s+.*$/gm, '[Stack trace omitted]');
    
    // Limit message length to prevent DoS
    if (message.length > 200) {
      message = message.substring(0, 200) + '...';
    }

    return message;
  }

  /**
   * Create validation error response
   * @param {string} fieldName - Name of the field that failed validation
   * @param {string} reason - Reason for validation failure
   * @returns {Object} Validation error response
   */
  createValidationError(fieldName, reason) {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: [{
        field: fieldName,
        message: reason,
        type: 'validation'
      }],
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create authentication error response
   * @param {string} reason - Reason for authentication failure
   * @returns {Object} Authentication error response
   */
  createAuthError(reason = 'Authentication failed') {
    return {
      success: false,
      error: reason,
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create authorization error response
   * @param {string} reason - Reason for authorization failure
   * @returns {Object} Authorization error response
   */
  createAuthzError(reason = 'Authorization failed') {
    return {
      success: false,
      error: reason,
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create not found error response
   * @param {string} resourceType - Type of resource not found
   * @param {string} resourceId - ID of the resource
   * @returns {Object} Not found error response
   */
  createNotFoundError(resourceType = 'Resource', resourceId = null) {
    const message = resourceId 
      ? `${resourceType} with ID ${resourceId} not found`
      : `${resourceType} not found`;
    
    return {
      success: false,
      error: message,
      code: 'NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create conflict error response
   * @param {string} message - Conflict description
   * @returns {Object} Conflict error response
   */
  createConflictError(message = 'Resource already exists') {
    return {
      success: false,
      error: message,
      code: 'CONFLICT',
      statusCode: 409,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create rate limit error response
   * @param {number} retryAfter - Seconds until retry is allowed
   * @returns {Object} Rate limit error response
   */
  createRateLimitError(retryAfter = 60) {
    return {
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter,
      statusCode: 429,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create security violation error response
   * @param {string} violation - Type of security violation
   * @param {string} message - Detailed message (only in debug mode)
   * @returns {Object} Security violation error response
   */
  createSecurityViolation(violation = 'Security violation', message = null) {
    const response = {
      success: false,
      error: 'Security violation detected',
      code: 'SECURITY_VIOLATION',
      violation: violation,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };

    // Only include message in debug mode
    if (this.enableDetailedErrors && message) {
      response.message = this.sanitizeErrorMessage(new Error(message));
    }

    return response;
  }
}

module.exports = new ErrorHandlingService();
