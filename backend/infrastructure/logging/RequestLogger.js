/**
 * Request Logger
 * 
 * Enhanced request logging with detailed metrics, performance timing,
 * error tracking, and structured logging for analytics.
 */

const Logger = require('@logging/Logger');
const logger = new Logger('RequestLogger');

class RequestLogger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logLevel = options.logLevel || 'info';
    this.includeHeaders = options.includeHeaders || false;
    this.includeBody = options.includeBody || false;
    this.maxBodyLength = options.maxBodyLength || 1000;
    this.sensitiveFields = options.sensitiveFields || ['password', 'token', 'secret'];
    
    // Performance tracking
    this.performanceMetrics = {
      totalRequests: 0,
      slowRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    // Request correlation
    this.correlationIds = new Map();
  }

  /**
   * Generate correlation ID
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log request start
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  logRequestStart(req, res, next) {
    if (!this.enabled) {
      return next();
    }

    const correlationId = this.generateCorrelationId();
    const startTime = process.hrtime.bigint();
    
    // Store correlation ID and start time
    this.correlationIds.set(correlationId, { startTime, req });
    
    // Add correlation ID to request
    req.correlationId = correlationId;
    req.startTime = startTime;
    
    // Log request details
    const logData = {
      correlationId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Add headers if enabled
    if (this.includeHeaders) {
      logData.headers = this.sanitizeHeaders(req.headers);
    }
    
    // Add body if enabled
    if (this.includeBody && req.body) {
      logData.body = this.sanitizeBody(req.body);
    }
    
    logger.info('Request started', logData);
    
    // Override response methods to track completion
    this.overrideResponseMethods(req, res, correlationId);
    
    next();
  }

  /**
   * Override response methods to track completion
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} correlationId - Correlation ID
   */
  overrideResponseMethods(req, res, correlationId) {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let responseSent = false;
    let responseStatus = 200;
    let responseData = null;
    
    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };
    
    res.send = function(data) {
      if (!responseSent) {
        responseSent = true;
        responseData = data;
        this.logResponseCompletion(req, res, correlationId, responseStatus, data);
      }
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      if (!responseSent) {
        responseSent = true;
        responseData = data;
        this.logResponseCompletion(req, res, correlationId, responseStatus, data);
      }
      return originalJson.call(this, data);
    };
    
    // Bind logging method to response object
    res.logResponseCompletion = this.logResponseCompletion.bind(this);
  }

  /**
   * Log response completion
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} correlationId - Correlation ID
   * @param {number} status - Response status
   * @param {*} data - Response data
   */
  logResponseCompletion(req, res, correlationId, status, data) {
    const correlationData = this.correlationIds.get(correlationId);
    if (!correlationData) {
      logger.warn(`Correlation data not found for: ${correlationId}`);
      return;
    }
    
    const { startTime } = correlationData;
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000; // Convert to milliseconds
    
    // Update performance metrics
    this.updatePerformanceMetrics(responseTime, status);
    
    // Determine log level
    const logLevel = this.getLogLevel(status, responseTime);
    
    // Prepare log data
    const logData = {
      correlationId,
      method: req.method,
      url: req.url,
      path: req.path,
      status,
      responseTime: responseTime.toFixed(2),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
      success: status < 400,
      slow: responseTime > 1000 // Flag slow requests
    };
    
    // Add response data for errors
    if (status >= 400) {
      logData.error = this.sanitizeError(data);
    }
    
    // Log based on level
    switch (logLevel) {
      case 'error':
        logger.error('Request completed with error', logData);
        break;
      case 'warn':
        logger.warn('Request completed with warning', logData);
        break;
      case 'debug':
        logger.debug('Request completed', logData);
        break;
      default:
        logger.info('Request completed', logData);
    }
    
    // Clean up correlation data
    this.correlationIds.delete(correlationId);
  }

  /**
   * Determine log level based on status and response time
   * @param {number} status - Response status
   * @param {number} responseTime - Response time in milliseconds
   * @returns {string} Log level
   */
  getLogLevel(status, responseTime) {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    if (responseTime > 1000) return 'warn';
    if (this.logLevel === 'debug') return 'debug';
    return 'info';
  }

  /**
   * Update performance metrics
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} status - Response status
   */
  updatePerformanceMetrics(responseTime, status) {
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.totalResponseTime += responseTime;
    this.performanceMetrics.averageResponseTime = 
      this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;
    
    if (responseTime > 1000) {
      this.performanceMetrics.slowRequests++;
    }
    
    if (status >= 400) {
      this.performanceMetrics.errorRequests++;
    }
  }

  /**
   * Sanitize headers
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize request body
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  sanitizeBody(body) {
    if (typeof body !== 'object' || body === null) {
      return body;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > this.maxBodyLength) {
        sanitized[key] = value.substring(0, this.maxBodyLength) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize error data
   * @param {*} error - Error data
   * @returns {Object} Sanitized error
   */
  sanitizeError(error) {
    if (typeof error === 'string') {
      return error.length > this.maxBodyLength 
        ? error.substring(0, this.maxBodyLength) + '...'
        : error;
    }
    
    if (error && typeof error === 'object') {
      return {
        message: error.message || 'Unknown error',
        stack: error.stack ? error.stack.split('\n')[0] : undefined
      };
    }
    
    return error;
  }

  /**
   * Log error
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  logError(error, req, res, next) {
    if (!this.enabled) {
      return next(error);
    }

    const correlationId = req.correlationId || 'unknown';
    
    logger.error('Request error', {
      correlationId,
      method: req.method,
      url: req.url,
      path: req.path,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
    
    next(error);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const errorRate = this.performanceMetrics.totalRequests > 0 
      ? (this.performanceMetrics.errorRequests / this.performanceMetrics.totalRequests * 100).toFixed(2)
      : 0;
    
    const slowRequestRate = this.performanceMetrics.totalRequests > 0 
      ? (this.performanceMetrics.slowRequests / this.performanceMetrics.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.performanceMetrics,
      errorRate: `${errorRate}%`,
      slowRequestRate: `${slowRequestRate}%`,
      averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime)
    };
  }

  /**
   * Get active requests
   * @returns {Array} Active requests
   */
  getActiveRequests() {
    const active = [];
    
    for (const [correlationId, data] of this.correlationIds.entries()) {
      const duration = Number(process.hrtime.bigint() - data.startTime) / 1000;
      
      active.push({
        correlationId,
        method: data.req.method,
        url: data.req.url,
        path: data.req.path,
        userId: data.req.user?.id || 'anonymous',
        duration: duration.toFixed(2),
        timestamp: new Date().toISOString()
      });
    }
    
    return active;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      slowRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    logger.info('Request logger metrics reset');
  }

  /**
   * Destroy logger and cleanup
   */
  destroy() {
    this.correlationIds.clear();
    logger.info('RequestLogger destroyed');
  }
}

// Create singleton instance
const requestLogger = new RequestLogger();

module.exports = requestLogger; 