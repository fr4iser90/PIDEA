/**
 * Request Analytics Service
 * 
 * Backend request analytics and monitoring for performance insights,
 * bottleneck detection, and system health monitoring.
 */

const Logger = require('@logging/Logger');
const logger = new Logger('RequestAnalyticsService');

class RequestAnalyticsService {
  constructor(options = {}) {
    this.requests = new Map();
    this.endpointStats = new Map();
    this.userStats = new Map();
    this.systemMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      peakConcurrentRequests: 0,
      currentConcurrentRequests: 0,
      startTime: Date.now()
    };
    
    // Performance thresholds
    this.thresholds = {
      slowRequest: options.slowRequest || 1000, // 1 second
      errorRate: options.errorRate || 0.05, // 5%
      concurrentLimit: options.concurrentLimit || 50
    };
    
    // Alerts
    this.alerts = [];
    this.maxAlerts = options.maxAlerts || 100;
    
    // Export configuration
    this.exportFormats = ['json', 'csv'];
  }

  /**
   * Track incoming request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  trackRequest(req, res, next) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    const userId = req.user?.id || 'anonymous';
    const endpoint = `${req.method} ${req.path}`;
    
    // Track request start
    const request = {
      id: requestId,
      endpoint,
      userId,
      method: req.method,
      path: req.path,
      startTime,
      status: 'pending',
      responseTime: null,
      success: null,
      error: null,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    this.requests.set(requestId, request);
    this.systemMetrics.totalRequests++;
    this.systemMetrics.currentConcurrentRequests++;
    
    // Update peak concurrent requests
    if (this.systemMetrics.currentConcurrentRequests > this.systemMetrics.peakConcurrentRequests) {
      this.systemMetrics.peakConcurrentRequests = this.systemMetrics.currentConcurrentRequests;
    }
    
    // Update endpoint and user stats
    this.updateEndpointStats(endpoint, 'start');
    this.updateUserStats(userId, 'start');
    
    // Check for high concurrent requests
    this.checkConcurrentRequests();
    
    // Override response methods to track completion
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let responseSent = false;
    let responseStatus = 200;
    
    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };
    
    res.send = function(data) {
      if (!responseSent) {
        responseSent = true;
        this.trackResponseCompletion(requestId, responseStatus < 400, Date.now() - startTime, data);
      }
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      if (!responseSent) {
        responseSent = true;
        this.trackResponseCompletion(requestId, responseStatus < 400, Date.now() - startTime, data);
      }
      return originalJson.call(this, data);
    };
    
    // Bind tracking method to response object
    res.trackResponseCompletion = this.trackResponseCompletion.bind(this);
    
    next();
  }

  /**
   * Track response completion
   * @param {string} requestId - Request ID
   * @param {boolean} success - Whether request was successful
   * @param {number} responseTime - Response time in milliseconds
   * @param {*} result - Response result
   */
  trackResponseCompletion(requestId, success, responseTime, result = null) {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`Request not found for completion tracking: ${requestId}`);
      return;
    }
    
    request.status = 'completed';
    request.responseTime = responseTime;
    request.success = success;
    request.endTime = Date.now();
    request.responseStatus = success ? 200 : 500;
    
    if (success) {
      request.result = result;
      this.systemMetrics.successfulRequests++;
    } else {
      request.error = result;
      this.systemMetrics.failedRequests++;
    }
    
    this.systemMetrics.totalResponseTime += responseTime;
    this.systemMetrics.averageResponseTime = 
      this.systemMetrics.totalResponseTime / this.systemMetrics.totalRequests;
    
    this.systemMetrics.currentConcurrentRequests--;
    
    // Update endpoint and user stats
    this.updateEndpointStats(request.endpoint, 'complete', success);
    this.updateUserStats(request.userId, 'complete', success);
    
    // Check for performance issues
    this.checkPerformanceIssues(request);
    
    logger.debug(`Request completed: ${requestId}, success: ${success}, time: ${responseTime}ms`);
  }

  /**
   * Update endpoint statistics
   * @param {string} endpoint - API endpoint
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateEndpointStats(endpoint, action, success = null) {
    if (!this.endpointStats.has(endpoint)) {
      this.endpointStats.set(endpoint, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        lastRequest: null,
        slowRequests: 0
      });
    }
    
    const stats = this.endpointStats.get(endpoint);
    
    switch (action) {
      case 'start':
        stats.totalRequests++;
        stats.lastRequest = Date.now();
        break;
      case 'complete':
        if (success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }
        break;
    }
    
    this.endpointStats.set(endpoint, stats);
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateUserStats(userId, action, success = null) {
    if (!this.userStats.has(userId)) {
      this.userStats.set(userId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        lastRequest: null,
        endpoints: new Set()
      });
    }
    
    const stats = this.userStats.get(userId);
    
    switch (action) {
      case 'start':
        stats.totalRequests++;
        stats.lastRequest = Date.now();
        break;
      case 'complete':
        if (success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }
        break;
    }
    
    this.userStats.set(userId, stats);
  }

  /**
   * Check for performance issues
   * @param {Object} request - Request object
   */
  checkPerformanceIssues(request) {
    // Check for slow requests
    if (request.responseTime > this.thresholds.slowRequest) {
      this.createAlert('slow_request', {
        requestId: request.id,
        endpoint: request.endpoint,
        responseTime: request.responseTime,
        threshold: this.thresholds.slowRequest
      });
    }
    
    // Check for high error rate
    const errorRate = this.systemMetrics.failedRequests / this.systemMetrics.totalRequests;
    if (errorRate > this.thresholds.errorRate) {
      this.createAlert('high_error_rate', {
        errorRate: errorRate.toFixed(4),
        threshold: this.thresholds.errorRate,
        totalRequests: this.systemMetrics.totalRequests,
        failedRequests: this.systemMetrics.failedRequests
      });
    }
  }

  /**
   * Check concurrent requests
   */
  checkConcurrentRequests() {
    if (this.systemMetrics.currentConcurrentRequests > this.thresholds.concurrentLimit) {
      this.createAlert('high_concurrent_requests', {
        current: this.systemMetrics.currentConcurrentRequests,
        limit: this.thresholds.concurrentLimit
      });
    }
  }

  /**
   * Create alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  createAlert(type, data) {
    const alert = {
      id: this.generateAlertId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };
    
    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
    
    logger.warn(`Performance alert: ${type}`, data);
  }

  /**
   * Get alert severity
   * @param {string} type - Alert type
   * @returns {string} Severity level
   */
  getAlertSeverity(type) {
    const severityMap = {
      slow_request: 'warning',
      high_error_rate: 'critical',
      high_concurrent_requests: 'warning'
    };
    
    return severityMap[type] || 'info';
  }

  /**
   * Analyze system performance
   * @returns {Object} Performance analysis
   */
  analyzePerformance() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const successRate = this.systemMetrics.totalRequests > 0 
      ? (this.systemMetrics.successfulRequests / this.systemMetrics.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      system: {
        ...this.systemMetrics,
        uptime,
        successRate: `${successRate}%`,
        averageResponseTime: Math.round(this.systemMetrics.averageResponseTime),
        requestsPerSecond: this.calculateRequestsPerSecond()
      },
      endpoints: this.getEndpointAnalysis(),
      users: this.getUserAnalysis(),
      alerts: this.getAlerts(),
      bottlenecks: this.detectBottlenecks()
    };
  }

  /**
   * Calculate requests per second
   * @returns {number} Requests per second
   */
  calculateRequestsPerSecond() {
    const uptime = (Date.now() - this.systemMetrics.startTime) / 1000;
    return uptime > 0 ? (this.systemMetrics.totalRequests / uptime).toFixed(2) : 0;
  }

  /**
   * Get endpoint analysis
   * @returns {Object} Endpoint analysis
   */
  getEndpointAnalysis() {
    const analysis = {};
    
    for (const [endpoint, data] of this.endpointStats.entries()) {
      const successRate = data.totalRequests > 0 
        ? (data.successfulRequests / data.totalRequests * 100).toFixed(2)
        : 0;
      
      analysis[endpoint] = {
        ...data,
        successRate: `${successRate}%`,
        slowRequestRate: data.totalRequests > 0 
          ? (data.slowRequests / data.totalRequests * 100).toFixed(2)
          : 0
      };
    }
    
    return analysis;
  }

  /**
   * Get user analysis
   * @returns {Object} User analysis
   */
  getUserAnalysis() {
    const analysis = {};
    
    for (const [userId, data] of this.userStats.entries()) {
      const successRate = data.totalRequests > 0 
        ? (data.successfulRequests / data.totalRequests * 100).toFixed(2)
        : 0;
      
      analysis[userId] = {
        ...data,
        successRate: `${successRate}%`,
        endpoints: Array.from(data.endpoints)
      };
    }
    
    return analysis;
  }

  /**
   * Get alerts
   * @returns {Array} Recent alerts
   */
  getAlerts() {
    return this.alerts.slice(0, 20); // Return last 20 alerts
  }

  /**
   * Detect performance bottlenecks
   * @returns {Array} Bottleneck analysis
   */
  detectBottlenecks() {
    const bottlenecks = [];
    
    // Check for slow endpoints
    for (const [endpoint, stats] of this.endpointStats.entries()) {
      if (stats.averageResponseTime > this.thresholds.slowRequest) {
        bottlenecks.push({
          type: 'slow_endpoint',
          endpoint,
          averageResponseTime: stats.averageResponseTime,
          threshold: this.thresholds.slowRequest
        });
      }
    }
    
    // Check for high error rate endpoints
    for (const [endpoint, stats] of this.endpointStats.entries()) {
      const errorRate = stats.failedRequests / stats.totalRequests;
      if (errorRate > this.thresholds.errorRate) {
        bottlenecks.push({
          type: 'high_error_rate_endpoint',
          endpoint,
          errorRate: errorRate.toFixed(4),
          threshold: this.thresholds.errorRate
        });
      }
    }
    
    return bottlenecks;
  }

  /**
   * Generate comprehensive analytics report
   * @returns {Object} Analytics report
   */
  getAnalytics() {
    return {
      performance: this.analyzePerformance(),
      requests: {
        total: this.requests.size,
        pending: Array.from(this.requests.values()).filter(r => r.status === 'pending').length,
        completed: Array.from(this.requests.values()).filter(r => r.status === 'completed').length
      },
      recentRequests: this.getRecentRequests(50),
      slowRequests: this.getSlowRequests(),
      failedRequests: this.getFailedRequests()
    };
  }

  /**
   * Get recent requests
   * @param {number} limit - Number of requests to return
   * @returns {Array} Recent requests
   */
  getRecentRequests(limit = 50) {
    const requests = Array.from(this.requests.values());
    return requests
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Get slow requests
   * @returns {Array} Slow requests
   */
  getSlowRequests() {
    return Array.from(this.requests.values())
      .filter(r => r.responseTime && r.responseTime > this.thresholds.slowRequest)
      .sort((a, b) => b.responseTime - a.responseTime);
  }

  /**
   * Get failed requests
   * @returns {Array} Failed requests
   */
  getFailedRequests() {
    return Array.from(this.requests.values())
      .filter(r => r.success === false)
      .sort((a, b) => b.endTime - a.endTime);
  }

  /**
   * Export analytics report
   * @param {string} format - Export format
   * @returns {string} Exported report
   */
  exportReport(format = 'json') {
    if (!this.exportFormats.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    const data = {
      analytics: this.getAnalytics(),
      timestamp: new Date().toISOString()
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(data);
    }
  }

  /**
   * Convert data to CSV format
   * @param {Object} data - Data to convert
   * @returns {string} CSV data
   */
  convertToCSV(data) {
    const requests = data.analytics.recentRequests;
    if (!requests.length) return '';
    
    const headers = Object.keys(requests[0]).join(',');
    const rows = requests.map(req => 
      Object.values(req).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.requests.clear();
    this.endpointStats.clear();
    this.userStats.clear();
    this.alerts = [];
    this.systemMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      peakConcurrentRequests: 0,
      currentConcurrentRequests: 0,
      startTime: Date.now()
    };
    
    logger.info('Request analytics statistics reset');
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    this.requests.clear();
    this.endpointStats.clear();
    this.userStats.clear();
    this.alerts = [];
    
    logger.info('RequestAnalyticsService destroyed');
  }
}

// Create singleton instance
const requestAnalyticsService = new RequestAnalyticsService();

module.exports = requestAnalyticsService; 