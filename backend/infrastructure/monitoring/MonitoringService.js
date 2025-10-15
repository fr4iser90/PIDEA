/**
 * MonitoringService - Central monitoring and observability service
 * Provides comprehensive monitoring capabilities for DDD applications
 * 
 * Created: 2025-01-27
 * Purpose: Centralized monitoring, metrics, tracing, and health checks
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");

class MonitoringService {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("MonitoringService");
    this.eventBus = options.eventBus || new EventBus();
    
    // Metrics storage
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    
    // Tracing
    this.traces = new Map();
    this.activeSpans = new Map();
    
    // Health checks
    this.healthChecks = new Map();
    this.healthStatus = new Map();
    
    // Configuration
    this.enabled = options.enabled !== false;
    this.metricsRetention = options.metricsRetention || 3600000; // 1 hour
    this.traceRetention = options.traceRetention || 1800000; // 30 minutes
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    
    // Start periodic tasks
    if (this.enabled) {
      this.startPeriodicTasks();
    }
  }

  /**
   * Record a metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} tags - Metric tags
   */
  recordMetric(name, value, tags = {}) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    const metricKey = this.buildMetricKey(name, tags);
    
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }
    
    const metricData = {
      name,
      value,
      tags,
      timestamp
    };
    
    this.metrics.get(metricKey).push(metricData);
    
    // Emit metric event
    this.eventBus.emit('monitoring.metric.recorded', metricData);
    
    this.logger.debug(`Metric recorded: ${name} = ${value}`, tags);
  }

  /**
   * Increment a counter
   * @param {string} name - Counter name
   * @param {number} increment - Increment value (default: 1)
   * @param {Object} tags - Counter tags
   */
  incrementCounter(name, increment = 1, tags = {}) {
    if (!this.enabled) return;

    const counterKey = this.buildMetricKey(name, tags);
    const currentValue = this.counters.get(counterKey) || 0;
    const newValue = currentValue + increment;
    
    this.counters.set(counterKey, newValue);
    
    // Also record as metric
    this.recordMetric(name, newValue, { ...tags, type: 'counter' });
    
    this.logger.debug(`Counter incremented: ${name} by ${increment}`, tags);
  }

  /**
   * Set a gauge value
   * @param {string} name - Gauge name
   * @param {number} value - Gauge value
   * @param {Object} tags - Gauge tags
   */
  setGauge(name, value, tags = {}) {
    if (!this.enabled) return;

    const gaugeKey = this.buildMetricKey(name, tags);
    this.gauges.set(gaugeKey, value);
    
    // Also record as metric
    this.recordMetric(name, value, { ...tags, type: 'gauge' });
    
    this.logger.debug(`Gauge set: ${name} = ${value}`, tags);
  }

  /**
   * Record a histogram value
   * @param {string} name - Histogram name
   * @param {number} value - Value to record
   * @param {Object} tags - Histogram tags
   */
  recordHistogram(name, value, tags = {}) {
    if (!this.enabled) return;

    const histogramKey = this.buildMetricKey(name, tags);
    
    if (!this.histograms.has(histogramKey)) {
      this.histograms.set(histogramKey, []);
    }
    
    this.histograms.get(histogramKey).push(value);
    
    // Also record as metric
    this.recordMetric(name, value, { ...tags, type: 'histogram' });
    
    this.logger.debug(`Histogram recorded: ${name} = ${value}`, tags);
  }

  /**
   * Start a trace span
   * @param {string} operation - Operation name
   * @param {Object} context - Trace context
   * @returns {string} Span ID
   */
  startSpan(operation, context = {}) {
    if (!this.enabled) return null;

    const spanId = this.generateSpanId();
    const traceId = context.traceId || this.generateTraceId();
    
    const span = {
      spanId,
      traceId,
      operation,
      startTime: Date.now(),
      tags: context.tags || {},
      logs: [],
      parentSpanId: context.parentSpanId
    };
    
    this.activeSpans.set(spanId, span);
    
    // Emit span started event
    this.eventBus.emit('monitoring.span.started', span);
    
    this.logger.debug(`Span started: ${operation}`, { spanId, traceId });
    
    return spanId;
  }

  /**
   * Finish a trace span
   * @param {string} spanId - Span ID
   * @param {Object} result - Span result
   */
  finishSpan(spanId, result = {}) {
    if (!this.enabled || !spanId) return;

    const span = this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn(`Span not found: ${spanId}`);
      return;
    }
    
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.result = result;
    
    // Store completed span
    if (!this.traces.has(span.traceId)) {
      this.traces.set(span.traceId, []);
    }
    this.traces.get(span.traceId).push(span);
    
    // Remove from active spans
    this.activeSpans.delete(spanId);
    
    // Emit span finished event
    this.eventBus.emit('monitoring.span.finished', span);
    
    this.logger.debug(`Span finished: ${span.operation}`, { 
      spanId, 
      duration: span.duration 
    });
  }

  /**
   * Register a health check
   * @param {string} name - Health check name
   * @param {Function} checkFunction - Health check function
   * @param {Object} options - Health check options
   */
  registerHealthCheck(name, checkFunction, options = {}) {
    this.healthChecks.set(name, {
      checkFunction,
      timeout: options.timeout || 5000,
      interval: options.interval || this.healthCheckInterval,
      critical: options.critical !== false,
      lastCheck: null,
      lastResult: null
    });
    
    this.logger.info(`Health check registered: ${name}`);
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health status
   */
  async runHealthChecks() {
    const results = {};
    let overallHealthy = true;
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          healthCheck.checkFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
          )
        ]);
        
        const duration = Date.now() - startTime;
        
        results[name] = {
          status: 'healthy',
          duration,
          result,
          timestamp: new Date().toISOString()
        };
        
        healthCheck.lastCheck = new Date();
        healthCheck.lastResult = results[name];
        
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        if (healthCheck.critical) {
          overallHealthy = false;
        }
        
        healthCheck.lastCheck = new Date();
        healthCheck.lastResult = results[name];
      }
    }
    
    const healthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
    
    this.healthStatus.set('overall', healthStatus);
    
    // Emit health check event
    this.eventBus.emit('monitoring.health.check', healthStatus);
    
    return healthStatus;
  }

  /**
   * Get current metrics
   * @param {string} name - Metric name filter (optional)
   * @returns {Object} Current metrics
   */
  getMetrics(name = null) {
    const result = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms)
    };
    
    if (name) {
      // Filter by metric name
      const filtered = {};
      for (const [key, value] of Object.entries(result.counters)) {
        if (key.startsWith(name)) filtered[key] = value;
      }
      result.counters = filtered;
    }
    
    return result;
  }

  /**
   * Get active spans
   * @returns {Array} Active spans
   */
  getActiveSpans() {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get health status
   * @returns {Object} Current health status
   */
  getHealthStatus() {
    return this.healthStatus.get('overall') || { status: 'unknown' };
  }

  /**
   * Build metric key from name and tags
   * @param {string} name - Metric name
   * @param {Object} tags - Metric tags
   * @returns {string} Metric key
   */
  buildMetricKey(name, tags) {
    const sortedTags = Object.keys(tags)
      .sort()
      .map(key => `${key}=${tags[key]}`)
      .join(',');
    
    return sortedTags ? `${name}{${sortedTags}}` : name;
  }

  /**
   * Generate unique span ID
   * @returns {string} Span ID
   */
  generateSpanId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique trace ID
   * @returns {string} Trace ID
   */
  generateTraceId() {
    return Math.random().toString(36).substr(2, 16);
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicTasks() {
    // Clean up old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, this.metricsRetention);
    
    // Clean up old traces
    setInterval(() => {
      this.cleanupOldTraces();
    }, this.traceRetention);
    
    // Run health checks
    setInterval(() => {
      this.runHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.metricsRetention;
    
    for (const [key, metrics] of this.metrics) {
      const filtered = metrics.filter(metric => metric.timestamp > cutoffTime);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }

  /**
   * Clean up old traces
   */
  cleanupOldTraces() {
    const cutoffTime = Date.now() - this.traceRetention;
    
    for (const [traceId, spans] of this.traces) {
      const filtered = spans.filter(span => span.startTime > cutoffTime);
      if (filtered.length === 0) {
        this.traces.delete(traceId);
      } else {
        this.traces.set(traceId, filtered);
      }
    }
  }
}

module.exports = MonitoringService;
