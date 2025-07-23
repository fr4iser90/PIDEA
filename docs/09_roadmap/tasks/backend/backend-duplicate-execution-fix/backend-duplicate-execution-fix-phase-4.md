# Phase 4: Analytics and Monitoring Implementation

## 📋 Phase Overview
- **Phase**: 4 of 5
- **Duration**: 3 hours
- **Priority**: Medium
- **Status**: Planning
- **Dependencies**: Phase 1-3 completion, EventBus, existing logging system

## 🎯 Objectives
1. Create ExecutionAnalyticsService
2. Implement real-time execution monitoring
3. Add performance metrics collection
4. Create analytics dashboard endpoints
5. Implement alerting for excessive duplicates

## 📁 Files to Create

### 1. ExecutionAnalyticsService.js
**Path**: `backend/domain/services/ExecutionAnalyticsService.js`

**Purpose**: Core analytics service for execution monitoring

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionAnalyticsService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new Logger('ExecutionAnalyticsService');
    this.eventBus = dependencies.eventBus;
    this.executionRepository = dependencies.executionRepository;
    
    // Analytics data storage
    this.metrics = {
      totalExecutions: 0,
      duplicateExecutions: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      stepExecutions: new Map(),
      hourlyStats: new Map(),
      dailyStats: new Map()
    };
    
    // Alert thresholds
    this.alertThresholds = {
      duplicateRate: 0.1, // 10% duplicate rate triggers alert
      responseTime: 5000, // 5 seconds average response time
      cacheMissRate: 0.3, // 30% cache miss rate
      errorRate: 0.05 // 5% error rate
    };
    
    // Alert state
    this.alerts = new Map();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Record step execution
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @param {Object} result - Execution result
   * @param {number} duration - Execution duration
   */
  recordExecution(stepName, context, result, duration) {
    const timestamp = new Date();
    const hourKey = this.getHourKey(timestamp);
    const dayKey = this.getDayKey(timestamp);
    
    // Update total executions
    this.metrics.totalExecutions++;
    
    // Update step-specific metrics
    if (!this.metrics.stepExecutions.has(stepName)) {
      this.metrics.stepExecutions.set(stepName, {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        averageDuration: 0,
        duplicates: 0
      });
    }
    
    const stepMetrics = this.metrics.stepExecutions.get(stepName);
    stepMetrics.total++;
    stepMetrics.totalDuration += duration;
    stepMetrics.averageDuration = stepMetrics.totalDuration / stepMetrics.total;
    
    if (result.success) {
      stepMetrics.successful++;
    } else {
      stepMetrics.failed++;
    }
    
    // Update hourly stats
    if (!this.metrics.hourlyStats.has(hourKey)) {
      this.metrics.hourlyStats.set(hourKey, {
        executions: 0,
        duplicates: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalDuration: 0
      });
    }
    
    const hourlyStats = this.metrics.hourlyStats.get(hourKey);
    hourlyStats.executions++;
    hourlyStats.totalDuration += duration;
    
    if (!result.success) {
      hourlyStats.errors++;
    }
    
    // Update daily stats
    if (!this.metrics.dailyStats.has(dayKey)) {
      this.metrics.dailyStats.set(dayKey, {
        executions: 0,
        duplicates: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalDuration: 0
      });
    }
    
    const dailyStats = this.metrics.dailyStats.get(dayKey);
    dailyStats.executions++;
    dailyStats.totalDuration += duration;
    
    if (!result.success) {
      dailyStats.errors++;
    }
    
    // Update average response time
    this.updateAverageResponseTime(duration);
    
    // Check for alerts
    this.checkAlerts();
    
    // Store in database if repository is available
    if (this.executionRepository) {
      this.storeExecutionRecord(stepName, context, result, duration, timestamp);
    }
  }

  /**
   * Record duplicate execution
   * @param {string} stepName - Step name
   * @param {string} fingerprint - Request fingerprint
   */
  recordDuplicate(stepName, fingerprint) {
    this.metrics.duplicateExecutions++;
    
    // Update step metrics
    if (this.metrics.stepExecutions.has(stepName)) {
      this.metrics.stepExecutions.get(stepName).duplicates++;
    }
    
    // Update hourly stats
    const hourKey = this.getHourKey(new Date());
    if (this.metrics.hourlyStats.has(hourKey)) {
      this.metrics.hourlyStats.get(hourKey).duplicates++;
    }
    
    // Update daily stats
    const dayKey = this.getDayKey(new Date());
    if (this.metrics.dailyStats.has(dayKey)) {
      this.metrics.dailyStats.get(dayKey).duplicates++;
    }
    
    this.logger.info('ExecutionAnalyticsService: Recorded duplicate execution', {
      stepName,
      fingerprint: fingerprint.substring(0, 8),
      totalDuplicates: this.metrics.duplicateExecutions
    });
  }

  /**
   * Record cache operation
   * @param {boolean} isHit - Whether it was a cache hit
   * @param {string} stepName - Step name (optional)
   */
  recordCacheOperation(isHit, stepName = null) {
    if (isHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // Update hourly stats
    const hourKey = this.getHourKey(new Date());
    if (this.metrics.hourlyStats.has(hourKey)) {
      if (isHit) {
        this.metrics.hourlyStats.get(hourKey).cacheHits++;
      } else {
        this.metrics.hourlyStats.get(hourKey).cacheMisses++;
      }
    }
    
    // Update daily stats
    const dayKey = this.getDayKey(new Date());
    if (this.metrics.dailyStats.has(dayKey)) {
      if (isHit) {
        this.metrics.dailyStats.get(dayKey).cacheHits++;
      } else {
        this.metrics.dailyStats.get(dayKey).cacheMisses++;
      }
    }
  }

  /**
   * Get comprehensive analytics data
   * @returns {Object} Analytics data
   */
  getAnalytics() {
    const now = new Date();
    const currentHour = this.getHourKey(now);
    const currentDay = this.getDayKey(now);
    
    return {
      overview: {
        totalExecutions: this.metrics.totalExecutions,
        duplicateExecutions: this.metrics.duplicateExecutions,
        duplicateRate: this.getDuplicateRate(),
        cacheHits: this.metrics.cacheHits,
        cacheMisses: this.metrics.cacheMisses,
        cacheHitRate: this.getCacheHitRate(),
        averageResponseTime: this.metrics.averageResponseTime,
        totalErrors: this.getTotalErrors(),
        errorRate: this.getErrorRate()
      },
      stepMetrics: this.getStepMetrics(),
      hourlyStats: this.getHourlyStats(),
      dailyStats: this.getDailyStats(),
      currentHour: this.metrics.hourlyStats.get(currentHour) || {},
      currentDay: this.metrics.dailyStats.get(currentDay) || {},
      alerts: this.getActiveAlerts(),
      timestamp: now
    };
  }

  /**
   * Get step-specific metrics
   * @returns {Array} Step metrics
   */
  getStepMetrics() {
    const stepMetrics = [];
    
    for (const [stepName, metrics] of this.metrics.stepExecutions.entries()) {
      stepMetrics.push({
        stepName,
        total: metrics.total,
        successful: metrics.successful,
        failed: metrics.failed,
        duplicates: metrics.duplicates,
        duplicateRate: metrics.total > 0 ? metrics.duplicates / metrics.total : 0,
        averageDuration: metrics.averageDuration,
        successRate: metrics.total > 0 ? metrics.successful / metrics.total : 0
      });
    }
    
    return stepMetrics.sort((a, b) => b.total - a.total);
  }

  /**
   * Get hourly statistics
   * @param {number} hours - Number of hours to return (default: 24)
   * @returns {Array} Hourly stats
   */
  getHourlyStats(hours = 24) {
    const stats = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourKey = this.getHourKey(date);
      const hourStats = this.metrics.hourlyStats.get(hourKey) || {
        executions: 0,
        duplicates: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalDuration: 0
      };
      
      stats.push({
        hour: hourKey,
        timestamp: date,
        ...hourStats,
        averageDuration: hourStats.executions > 0 ? hourStats.totalDuration / hourStats.executions : 0,
        duplicateRate: hourStats.executions > 0 ? hourStats.duplicates / hourStats.executions : 0,
        errorRate: hourStats.executions > 0 ? hourStats.errors / hourStats.executions : 0,
        cacheHitRate: (hourStats.cacheHits + hourStats.cacheMisses) > 0 ? 
          hourStats.cacheHits / (hourStats.cacheHits + hourStats.cacheMisses) : 0
      });
    }
    
    return stats;
  }

  /**
   * Get daily statistics
   * @param {number} days - Number of days to return (default: 7)
   * @returns {Array} Daily stats
   */
  getDailyStats(days = 7) {
    const stats = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayKey = this.getDayKey(date);
      const dayStats = this.metrics.dailyStats.get(dayKey) || {
        executions: 0,
        duplicates: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalDuration: 0
      };
      
      stats.push({
        day: dayKey,
        timestamp: date,
        ...dayStats,
        averageDuration: dayStats.executions > 0 ? dayStats.totalDuration / dayStats.executions : 0,
        duplicateRate: dayStats.executions > 0 ? dayStats.duplicates / dayStats.executions : 0,
        errorRate: dayStats.executions > 0 ? dayStats.errors / dayStats.executions : 0,
        cacheHitRate: (dayStats.cacheHits + dayStats.cacheMisses) > 0 ? 
          dayStats.cacheHits / (dayStats.cacheHits + dayStats.cacheMisses) : 0
      });
    }
    
    return stats;
  }

  /**
   * Check for alert conditions
   */
  checkAlerts() {
    const duplicateRate = this.getDuplicateRate();
    const errorRate = this.getErrorRate();
    const cacheMissRate = this.getCacheMissRate();
    
    // Check duplicate rate alert
    if (duplicateRate > this.alertThresholds.duplicateRate) {
      this.triggerAlert('high_duplicate_rate', {
        current: duplicateRate,
        threshold: this.alertThresholds.duplicateRate,
        message: `Duplicate execution rate (${(duplicateRate * 100).toFixed(1)}%) exceeds threshold (${(this.alertThresholds.duplicateRate * 100).toFixed(1)}%)`
      });
    } else {
      this.clearAlert('high_duplicate_rate');
    }
    
    // Check error rate alert
    if (errorRate > this.alertThresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        current: errorRate,
        threshold: this.alertThresholds.errorRate,
        message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.alertThresholds.errorRate * 100).toFixed(1)}%)`
      });
    } else {
      this.clearAlert('high_error_rate');
    }
    
    // Check cache miss rate alert
    if (cacheMissRate > this.alertThresholds.cacheMissRate) {
      this.triggerAlert('high_cache_miss_rate', {
        current: cacheMissRate,
        threshold: this.alertThresholds.cacheMissRate,
        message: `Cache miss rate (${(cacheMissRate * 100).toFixed(1)}%) exceeds threshold (${(this.alertThresholds.cacheMissRate * 100).toFixed(1)}%)`
      });
    } else {
      this.clearAlert('high_cache_miss_rate');
    }
  }

  /**
   * Trigger an alert
   * @param {string} alertType - Alert type
   * @param {Object} alertData - Alert data
   */
  triggerAlert(alertType, alertData) {
    const alert = {
      type: alertType,
      data: alertData,
      timestamp: new Date(),
      active: true
    };
    
    this.alerts.set(alertType, alert);
    
    this.logger.warn('ExecutionAnalyticsService: Alert triggered', {
      alertType,
      alertData
    });
    
    // Publish alert event
    if (this.eventBus) {
      this.eventBus.publish('analytics.alert.triggered', alert);
    }
  }

  /**
   * Clear an alert
   * @param {string} alertType - Alert type
   */
  clearAlert(alertType) {
    if (this.alerts.has(alertType)) {
      const alert = this.alerts.get(alertType);
      alert.active = false;
      alert.clearedAt = new Date();
      
      this.logger.info('ExecutionAnalyticsService: Alert cleared', {
        alertType
      });
      
      // Publish alert cleared event
      if (this.eventBus) {
        this.eventBus.publish('analytics.alert.cleared', alert);
      }
    }
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    const activeAlerts = [];
    
    for (const [alertType, alert] of this.alerts.entries()) {
      if (alert.active) {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.subscribe('step.executed', (eventData) => {
        this.recordExecution(
          eventData.stepName,
          eventData.context,
          eventData.result,
          eventData.duration
        );
      });
      
      this.eventBus.subscribe('step.duplicate', (eventData) => {
        this.recordDuplicate(eventData.stepName, eventData.fingerprint);
      });
      
      this.eventBus.subscribe('cache.hit', () => {
        this.recordCacheOperation(true);
      });
      
      this.eventBus.subscribe('cache.miss', () => {
        this.recordCacheOperation(false);
      });
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour
    
    // Reset daily stats at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyStats();
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const now = new Date();
    const cutoffHour = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    const cutoffDay = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    
    // Clean up hourly stats older than 24 hours
    for (const [hourKey] of this.metrics.hourlyStats.entries()) {
      const hourDate = this.parseHourKey(hourKey);
      if (hourDate < cutoffHour) {
        this.metrics.hourlyStats.delete(hourKey);
      }
    }
    
    // Clean up daily stats older than 7 days
    for (const [dayKey] of this.metrics.dailyStats.entries()) {
      const dayDate = this.parseDayKey(dayKey);
      if (dayDate < cutoffDay) {
        this.metrics.dailyStats.delete(dayKey);
      }
    }
    
    this.logger.debug('ExecutionAnalyticsService: Cleaned up old data');
  }

  /**
   * Reset daily stats
   */
  resetDailyStats() {
    this.metrics.dailyStats.clear();
    this.logger.info('ExecutionAnalyticsService: Reset daily stats');
  }

  /**
   * Store execution record in database
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @param {Object} result - Execution result
   * @param {number} duration - Execution duration
   * @param {Date} timestamp - Execution timestamp
   */
  async storeExecutionRecord(stepName, context, result, duration, timestamp) {
    try {
      await this.executionRepository.create({
        stepName,
        context: JSON.stringify(context),
        result: JSON.stringify(result),
        duration,
        timestamp,
        success: result.success,
        error: result.error || null
      });
    } catch (error) {
      this.logger.error('ExecutionAnalyticsService: Failed to store execution record', error);
    }
  }

  // Utility methods
  getDuplicateRate() {
    return this.metrics.totalExecutions > 0 ? 
      this.metrics.duplicateExecutions / this.metrics.totalExecutions : 0;
  }

  getCacheHitRate() {
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    return totalCacheOps > 0 ? this.metrics.cacheHits / totalCacheOps : 0;
  }

  getCacheMissRate() {
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    return totalCacheOps > 0 ? this.metrics.cacheMisses / totalCacheOps : 0;
  }

  getTotalErrors() {
    let totalErrors = 0;
    for (const metrics of this.metrics.stepExecutions.values()) {
      totalErrors += metrics.failed;
    }
    return totalErrors;
  }

  getErrorRate() {
    return this.metrics.totalExecutions > 0 ? 
      this.getTotalErrors() / this.metrics.totalExecutions : 0;
  }

  updateAverageResponseTime(duration) {
    const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalExecutions - 1) + duration;
    this.metrics.averageResponseTime = totalDuration / this.metrics.totalExecutions;
  }

  getHourKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
  }

  getDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  parseHourKey(hourKey) {
    const [year, month, day, hour] = hourKey.split('-').map(Number);
    return new Date(year, month - 1, day, hour);
  }

  parseDayKey(dayKey) {
    const [year, month, day] = dayKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}

module.exports = ExecutionAnalyticsService;
```

### 2. ExecutionAnalyticsApplicationService.js
**Path**: `backend/application/services/ExecutionAnalyticsApplicationService.js`

**Purpose**: Application layer service for analytics operations

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionAnalyticsApplicationService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new Logger('ExecutionAnalyticsApplicationService');
    this.executionAnalyticsService = dependencies.executionAnalyticsService;
    this.executionRepository = dependencies.executionRepository;
  }

  /**
   * Get comprehensive analytics data
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(options = {}) {
    try {
      const { hours = 24, days = 7, includeDetails = false } = options;
      
      this.logger.info('Getting execution analytics', { hours, days, includeDetails });
      
      const analytics = this.executionAnalyticsService.getAnalytics();
      
      // Add detailed data if requested
      if (includeDetails) {
        analytics.detailedStats = await this.getDetailedStats();
      }
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      this.logger.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Get step-specific analytics
   * @param {string} stepName - Step name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Step analytics
   */
  async getStepAnalytics(stepName, options = {}) {
    try {
      const { hours = 24, includeExecutions = false } = options;
      
      this.logger.info('Getting step analytics', { stepName, hours, includeExecutions });
      
      const analytics = this.executionAnalyticsService.getAnalytics();
      const stepMetrics = analytics.stepMetrics.find(step => step.stepName === stepName);
      
      if (!stepMetrics) {
        return {
          success: false,
          error: 'Step not found'
        };
      }
      
      const result = {
        stepName,
        metrics: stepMetrics,
        hourlyStats: analytics.hourlyStats
      };
      
      // Add execution details if requested
      if (includeExecutions && this.executionRepository) {
        result.executions = await this.getStepExecutions(stepName, hours);
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Failed to get step analytics:', error);
      throw error;
    }
  }

  /**
   * Get active alerts
   * @returns {Promise<Object>} Active alerts
   */
  async getActiveAlerts() {
    try {
      this.logger.info('Getting active alerts');
      
      const alerts = this.executionAnalyticsService.getActiveAlerts();
      
      return {
        success: true,
        data: {
          alerts,
          count: alerts.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get active alerts:', error);
      throw error;
    }
  }

  /**
   * Get performance recommendations
   * @returns {Promise<Object>} Performance recommendations
   */
  async getPerformanceRecommendations() {
    try {
      this.logger.info('Generating performance recommendations');
      
      const analytics = this.executionAnalyticsService.getAnalytics();
      const recommendations = [];
      
      // Check duplicate rate
      if (analytics.overview.duplicateRate > 0.05) {
        recommendations.push({
          type: 'duplicate_rate',
          severity: 'high',
          message: 'High duplicate execution rate detected. Consider implementing better deduplication.',
          current: analytics.overview.duplicateRate,
          threshold: 0.05
        });
      }
      
      // Check cache hit rate
      if (analytics.overview.cacheHitRate < 0.7) {
        recommendations.push({
          type: 'cache_hit_rate',
          severity: 'medium',
          message: 'Low cache hit rate. Consider optimizing cache strategy.',
          current: analytics.overview.cacheHitRate,
          threshold: 0.7
        });
      }
      
      // Check error rate
      if (analytics.overview.errorRate > 0.02) {
        recommendations.push({
          type: 'error_rate',
          severity: 'high',
          message: 'High error rate detected. Review error handling and step implementations.',
          current: analytics.overview.errorRate,
          threshold: 0.02
        });
      }
      
      // Check response time
      if (analytics.overview.averageResponseTime > 2000) {
        recommendations.push({
          type: 'response_time',
          severity: 'medium',
          message: 'High average response time. Consider optimizing step implementations.',
          current: analytics.overview.averageResponseTime,
          threshold: 2000
        });
      }
      
      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get performance recommendations:', error);
      throw error;
    }
  }

  /**
   * Get detailed statistics from database
   * @returns {Promise<Object>} Detailed stats
   */
  async getDetailedStats() {
    try {
      if (!this.executionRepository) {
        return {};
      }
      
      const stats = await this.executionRepository.getDetailedStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get detailed stats:', error);
      return {};
    }
  }

  /**
   * Get step executions from database
   * @param {string} stepName - Step name
   * @param {number} hours - Hours to look back
   * @returns {Promise<Array>} Step executions
   */
  async getStepExecutions(stepName, hours = 24) {
    try {
      if (!this.executionRepository) {
        return [];
      }
      
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      const executions = await this.executionRepository.findByStepName(stepName, cutoffTime);
      
      return executions.map(execution => ({
        id: execution.id,
        timestamp: execution.timestamp,
        duration: execution.duration,
        success: execution.success,
        error: execution.error
      }));
    } catch (error) {
      this.logger.error('Failed to get step executions:', error);
      return [];
    }
  }
}

module.exports = ExecutionAnalyticsApplicationService;
```

### 3. ExecutionAnalyticsController.js
**Path**: `backend/presentation/api/ExecutionAnalyticsController.js`

**Purpose**: REST API endpoints for analytics

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionAnalyticsController {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new Logger('ExecutionAnalyticsController');
    this.executionAnalyticsApplicationService = dependencies.executionAnalyticsApplicationService;
  }

  /**
   * Get analytics overview
   * GET /api/analytics/overview
   */
  async getAnalyticsOverview(req, res) {
    try {
      const { hours = 24, days = 7, includeDetails = false } = req.query;
      const userId = req.user?.id;

      this.logger.info('Getting analytics overview', { userId, hours, days, includeDetails });

      const result = await this.executionAnalyticsApplicationService.getAnalytics({
        hours: parseInt(hours),
        days: parseInt(days),
        includeDetails: includeDetails === 'true'
      });

      res.json({
        success: true,
        data: result.data,
        message: 'Analytics overview retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get analytics overview:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get analytics overview',
        message: error.message
      });
    }
  }

  /**
   * Get step-specific analytics
   * GET /api/analytics/steps/:stepName
   */
  async getStepAnalytics(req, res) {
    try {
      const { stepName } = req.params;
      const { hours = 24, includeExecutions = false } = req.query;
      const userId = req.user?.id;

      this.logger.info('Getting step analytics', { stepName, userId, hours, includeExecutions });

      const result = await this.executionAnalyticsApplicationService.getStepAnalytics(stepName, {
        hours: parseInt(hours),
        includeExecutions: includeExecutions === 'true'
      });

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Step analytics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get step analytics:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get step analytics',
        message: error.message
      });
    }
  }

  /**
   * Get active alerts
   * GET /api/analytics/alerts
   */
  async getActiveAlerts(req, res) {
    try {
      const userId = req.user?.id;

      this.logger.info('Getting active alerts', { userId });

      const result = await this.executionAnalyticsApplicationService.getActiveAlerts();

      res.json({
        success: true,
        data: result.data,
        message: 'Active alerts retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get active alerts:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get active alerts',
        message: error.message
      });
    }
  }

  /**
   * Get performance recommendations
   * GET /api/analytics/recommendations
   */
  async getPerformanceRecommendations(req, res) {
    try {
      const userId = req.user?.id;

      this.logger.info('Getting performance recommendations', { userId });

      const result = await this.executionAnalyticsApplicationService.getPerformanceRecommendations();

      res.json({
        success: true,
        data: result.data,
        message: 'Performance recommendations retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get performance recommendations:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get performance recommendations',
        message: error.message
      });
    }
  }

  /**
   * Get hourly statistics
   * GET /api/analytics/stats/hourly
   */
  async getHourlyStats(req, res) {
    try {
      const { hours = 24 } = req.query;
      const userId = req.user?.id;

      this.logger.info('Getting hourly stats', { userId, hours });

      const analytics = this.executionAnalyticsApplicationService.executionAnalyticsService.getAnalytics();
      const hourlyStats = this.executionAnalyticsApplicationService.executionAnalyticsService.getHourlyStats(parseInt(hours));

      res.json({
        success: true,
        data: {
          stats: hourlyStats,
          hours: parseInt(hours)
        },
        message: 'Hourly statistics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get hourly stats:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get hourly statistics',
        message: error.message
      });
    }
  }

  /**
   * Get daily statistics
   * GET /api/analytics/stats/daily
   */
  async getDailyStats(req, res) {
    try {
      const { days = 7 } = req.query;
      const userId = req.user?.id;

      this.logger.info('Getting daily stats', { userId, days });

      const analytics = this.executionAnalyticsApplicationService.executionAnalyticsService.getAnalytics();
      const dailyStats = this.executionAnalyticsApplicationService.executionAnalyticsService.getDailyStats(parseInt(days));

      res.json({
        success: true,
        data: {
          stats: dailyStats,
          days: parseInt(days)
        },
        message: 'Daily statistics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get daily stats:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get daily statistics',
        message: error.message
      });
    }
  }
}

module.exports = ExecutionAnalyticsController;
```

## 📁 Files to Modify

### 1. StepRegistry.js Analytics Integration
**Path**: `backend/domain/steps/StepRegistry.js`

**Key Modifications**:
```javascript
class StepRegistry {
  constructor(serviceRegistry = null) {
    // ... existing constructor code ...
    
    // Add analytics service reference
    this.analyticsService = null;
  }

  // Enhanced executeStep with analytics
  async executeStep(name, context = {}, options = {}) {
    try {
      const step = this.getStep(name);
      
      if (step.status !== 'active') {
        throw new Error(`Step "${step.name}" is not active (status: ${step.status})`);
      }

      // Get executor
      const executor = this.executors.get(step.name);
      if (!executor) {
        throw new Error(`No executor found for step "${step.name}"`);
      }

      // Enhance context with services from DI container
      const enhancedContext = this.enhanceContextWithServices(context);

      // Execute step
      this.logger.info(`🚀 Executing step "${step.name}"...`);
      const startTime = Date.now();
      
      const result = await executor(enhancedContext, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update step statistics
      step.executionCount++;
      step.lastExecuted = new Date();
      step.lastDuration = duration;

      // Record analytics if service is available
      if (this.analyticsService) {
        this.analyticsService.recordExecution(step.name, context, result, duration);
      }

      // Publish execution event
      if (this.eventBus) {
        this.eventBus.publish('step.executed', {
          stepName: step.name,
          context,
          result,
          duration,
          timestamp: new Date()
        });
      }

      this.logger.info(`✅ Step "${step.name}" executed successfully in ${duration}ms`);
      return {
        success: true,
        result,
        duration,
        step: step.name,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`❌ Failed to execute step "${name}":`, error.message);
      
      // Update step statistics
      const step = this.steps.get(name);
      if (step) {
        step.executionCount++;
        step.lastExecuted = new Date();
        step.lastError = error.message;
      }

      // Record analytics for failed execution
      if (this.analyticsService) {
        this.analyticsService.recordExecution(name, context, {
          success: false,
          error: error.message
        }, Date.now() - startTime);
      }

      return {
        success: false,
        error: error.message,
        step: name,
        timestamp: new Date()
      };
    }
  }

  // Method to set analytics service
  setAnalyticsService(analyticsService) {
    this.analyticsService = analyticsService;
    this.logger.info('StepRegistry: Analytics service configured');
  }

  // ... existing methods remain unchanged ...
}
```

## 🧪 Testing Strategy

### Unit Tests
**File**: `tests/unit/ExecutionAnalytics.test.js`

**Test Cases**:
- Analytics data collection
- Alert triggering and clearing
- Metrics calculation
- Data cleanup
- Event handling

### Integration Tests
**File**: `tests/integration/ExecutionAnalytics.test.js`

**Test Cases**:
- End-to-end analytics flow
- API endpoint functionality
- Real-time monitoring
- Performance recommendations

## 📊 Success Metrics
- [ ] Real-time analytics data collection
- [ ] Alert system functioning correctly
- [ ] API endpoints responding within 200ms
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Dashboard data accuracy > 95%

## 🔄 Next Phase
After completing Phase 4, proceed to [Phase 5: Testing and Documentation](./backend-duplicate-execution-fix-phase-5.md) to complete the implementation.

## 📝 Notes
- This phase provides comprehensive monitoring and analytics
- Real-time alerts help identify issues quickly
- Performance recommendations guide optimization efforts
- The analytics system is extensible for future enhancements
- All data is stored efficiently with automatic cleanup 