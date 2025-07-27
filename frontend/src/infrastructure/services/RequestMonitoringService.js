/**
 * Request Monitoring Service
 * 
 * Comprehensive request tracking and analytics for performance insights,
 * user behavior analysis, and real-time monitoring capabilities.
 */

import { logger } from '@/infrastructure/logging/Logger';

class RequestMonitoringService {
  constructor(options = {}) {
    this.requests = new Map();
    this.endpointStats = new Map();
    this.userStats = new Map();
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };
    
    // Configuration
    this.maxRequests = options.maxRequests || 1000;
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes
    this.exportFormats = ['json', 'csv'];
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Track request start
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID
   * @param {Object} options - Request options
   * @returns {string} Request ID
   */
  trackRequestStart(endpoint, userId, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const request = {
      id: requestId,
      endpoint,
      userId,
      startTime,
      options,
      status: 'pending',
      responseTime: null,
      success: null,
      error: null
    };
    
    this.requests.set(requestId, request);
    this.performanceMetrics.totalRequests++;
    
    // Update endpoint stats
    this.updateEndpointMetrics(endpoint, 'start');
    
    // Update user stats
    this.updateUserMetrics(userId, 'start');
    
    logger.debug(`Request started: ${requestId} for endpoint: ${endpoint}`);
    return requestId;
  }

  /**
   * Track request completion
   * @param {string} requestId - Request ID
   * @param {boolean} success - Whether request was successful
   * @param {number} responseTime - Response time in milliseconds
   * @param {*} result - Request result or error
   */
  trackRequestComplete(requestId, success, responseTime, result = null) {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`Request not found for completion tracking: ${requestId}`);
      return;
    }
    
    request.status = 'completed';
    request.responseTime = responseTime;
    request.success = success;
    request.endTime = Date.now();
    
    if (success) {
      request.result = result;
      this.performanceMetrics.successfulRequests++;
    } else {
      request.error = result;
      this.performanceMetrics.failedRequests++;
    }
    
    this.performanceMetrics.totalResponseTime += responseTime;
    this.performanceMetrics.averageResponseTime = 
      this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;
    
    // Update endpoint stats
    this.updateEndpointMetrics(request.endpoint, 'complete', success);
    
    // Update user stats
    this.updateUserMetrics(request.userId, 'complete', success);
    
    logger.debug(`Request completed: ${requestId}, success: ${success}, time: ${responseTime}ms`);
  }

  /**
   * Track duplicate request
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID
   */
  trackDuplicateRequest(endpoint, userId) {
    this.updateEndpointMetrics(endpoint, 'duplicate');
    this.updateUserMetrics(userId, 'duplicate');
    
    logger.debug(`Duplicate request tracked for endpoint: ${endpoint}, user: ${userId}`);
  }

  /**
   * Update endpoint metrics
   * @param {string} endpoint - API endpoint
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateEndpointMetrics(endpoint, action, success = null) {
    if (!this.endpointStats.has(endpoint)) {
      this.endpointStats.set(endpoint, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duplicateRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        lastRequest: null
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
      case 'duplicate':
        stats.duplicateRequests++;
        break;
    }
    
    this.endpointStats.set(endpoint, stats);
  }

  /**
   * Update user metrics
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateUserMetrics(userId, action, success = null) {
    if (!this.userStats.has(userId)) {
      this.userStats.set(userId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duplicateRequests: 0,
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
      case 'duplicate':
        stats.duplicateRequests++;
        break;
    }
    
    this.userStats.set(userId, stats);
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const uptime = Date.now() - this.performanceMetrics.startTime;
    const successRate = this.performanceMetrics.totalRequests > 0 
      ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      performance: {
        ...this.performanceMetrics,
        uptime,
        successRate: `${successRate}%`,
        averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime)
      },
      endpoints: this.getEndpointStats(),
      users: this.getUserStats(),
      requests: {
        total: this.requests.size,
        pending: Array.from(this.requests.values()).filter(r => r.status === 'pending').length,
        completed: Array.from(this.requests.values()).filter(r => r.status === 'completed').length
      }
    };
  }

  /**
   * Get endpoint statistics
   * @returns {Object} Endpoint statistics
   */
  getEndpointStats() {
    const stats = {};
    
    for (const [endpoint, data] of this.endpointStats.entries()) {
      const successRate = data.totalRequests > 0 
        ? (data.successfulRequests / data.totalRequests * 100).toFixed(2)
        : 0;
      
      stats[endpoint] = {
        ...data,
        successRate: `${successRate}%`,
        duplicateRate: data.totalRequests > 0 
          ? (data.duplicateRequests / data.totalRequests * 100).toFixed(2)
          : 0
      };
    }
    
    return stats;
  }

  /**
   * Get user statistics
   * @returns {Object} User statistics
   */
  getUserStats() {
    const stats = {};
    
    for (const [userId, data] of this.userStats.entries()) {
      const successRate = data.totalRequests > 0 
        ? (data.successfulRequests / data.totalRequests * 100).toFixed(2)
        : 0;
      
      stats[userId] = {
        ...data,
        successRate: `${successRate}%`,
        duplicateRate: data.totalRequests > 0 
          ? (data.duplicateRequests / data.totalRequests * 100).toFixed(2)
          : 0,
        endpoints: Array.from(data.endpoints)
      };
    }
    
    return stats;
  }

  /**
   * Get request details
   * @param {string} requestId - Request ID
   * @returns {Object|null} Request details
   */
  getRequestDetails(requestId) {
    return this.requests.get(requestId) || null;
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
   * @param {number} threshold - Response time threshold in milliseconds
   * @returns {Array} Slow requests
   */
  getSlowRequests(threshold = 1000) {
    return Array.from(this.requests.values())
      .filter(r => r.responseTime && r.responseTime > threshold)
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
   * Export data
   * @param {string} format - Export format (json, csv)
   * @returns {string} Exported data
   */
  exportData(format = 'json') {
    if (!this.exportFormats.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    const data = {
      stats: this.getStats(),
      requests: Array.from(this.requests.values()),
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
    const requests = data.requests;
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
   * Clean up old requests
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let removedCount = 0;
    
    for (const [requestId, request] of this.requests.entries()) {
      if (now - request.startTime > maxAge) {
        this.requests.delete(requestId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old requests`);
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.requests.clear();
    this.endpointStats.clear();
    this.userStats.clear();
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };
    
    logger.info('Request monitoring statistics reset');
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    this.stopCleanupInterval();
    this.requests.clear();
    this.endpointStats.clear();
    this.userStats.clear();
    
    logger.info('RequestMonitoringService destroyed');
  }
}

// Create singleton instance
const requestMonitoringService = new RequestMonitoringService();

export default requestMonitoringService; 