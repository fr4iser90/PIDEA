/**
 * QueryMonitor - Query performance tracking and analysis
 * Provides detailed query execution monitoring and performance analysis
 */
const EventEmitter = require("events");
const Logger = require("@logging/Logger");

class QueryMonitor extends EventEmitter {
  constructor(databaseConnection, options = {}) {
    super();

    this.databaseConnection = databaseConnection;
    this.logger = new Logger("QueryMonitor");
    this.enabled = options.enabled !== false;
    this.trackExecutionPlans = options.trackExecutionPlans || false;
    this.maxQueryHistory = options.maxQueryHistory || 10000;

    // Query tracking
    this.activeQueries = new Map();
    this.queryHistory = [];
    this.queryStats = new Map();
    this.executionPlans = new Map();

    // Performance thresholds
    this.thresholds = {
      slowQuery: options.slowQueryThreshold || 1000,
      verySlowQuery: options.verySlowQueryThreshold || 5000,
      highMemoryUsage: options.highMemoryUsageThreshold || 100 * 1024 * 1024, // 100MB
      ...options.thresholds,
    };

    this.logger.info("QueryMonitor initialized");
  }

  /**
   * Start query monitoring
   */
  start() {
    if (!this.enabled) {
      this.logger.info("Query monitoring disabled");
      return;
    }

    this.logger.info("Starting query monitoring");
    this.emit("started");
  }

  /**
   * Stop query monitoring
   */
  stop() {
    this.logger.info("Query monitoring stopped");
    this.emit("stopped");
  }

  /**
   * Begin query tracking
   * @param {string} queryId - Unique query identifier
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {string} databaseType - Database type
   * @returns {Object} Query tracking info
   */
  beginQuery(queryId, query, params, databaseType) {
    if (!this.enabled) return null;

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    const queryInfo = {
      queryId,
      query: this.sanitizeQuery(query),
      params: params || [],
      databaseType,
      startTime,
      startMemory,
      timestamp: new Date().toISOString(),
    };

    this.activeQueries.set(queryId, queryInfo);

    this.emit("queryStarted", queryInfo);
    return queryInfo;
  }

  /**
   * End query tracking
   * @param {string} queryId - Unique query identifier
   * @param {Object} result - Query result
   * @param {Error} error - Query error if any
   * @returns {Object} Query performance data
   */
  endQuery(queryId, result, error = null) {
    if (!this.enabled) return null;

    const queryInfo = this.activeQueries.get(queryId);
    if (!queryInfo) {
      this.logger.warn(`Query ${queryId} not found in active queries`);
      return null;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const executionTime = Number(endTime - queryInfo.startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - queryInfo.startMemory.heapUsed;

    const performanceData = {
      ...queryInfo,
      executionTime,
      memoryDelta,
      rowsAffected: result?.rowCount || 0,
      rowsReturned: result?.rows?.length || 0,
      error: error?.message || null,
      success: !error,
      endTime: new Date().toISOString(),
    };

    // Store in history
    this.addToHistory(performanceData);

    // Update statistics
    this.updateStats(performanceData);

    // Check for performance issues
    this.checkPerformanceIssues(performanceData);

    // Clean up active query
    this.activeQueries.delete(queryId);

    this.emit("queryEnded", performanceData);
    return performanceData;
  }

  /**
   * Track query execution plan
   * @param {string} queryId - Query identifier
   * @param {Object} plan - Execution plan
   */
  trackExecutionPlan(queryId, plan) {
    if (!this.enabled || !this.trackExecutionPlans) return;

    this.executionPlans.set(queryId, {
      queryId,
      plan,
      timestamp: new Date().toISOString(),
    });

    this.emit("executionPlanTracked", { queryId, plan });
  }

  /**
   * Add query to history
   * @param {Object} performanceData - Query performance data
   */
  addToHistory(performanceData) {
    this.queryHistory.push(performanceData);

    // Limit history size
    if (this.queryHistory.length > this.maxQueryHistory) {
      this.queryHistory.shift();
    }
  }

  /**
   * Update query statistics
   * @param {Object} performanceData - Query performance data
   */
  updateStats(performanceData) {
    const queryKey = this.getQueryKey(performanceData.query);

    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        query: performanceData.query,
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errorCount: 0,
        lastExecuted: null,
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += performanceData.executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, performanceData.executionTime);
    stats.maxTime = Math.max(stats.maxTime, performanceData.executionTime);
    stats.lastExecuted = performanceData.timestamp;

    if (!performanceData.success) {
      stats.errorCount++;
    }
  }

  /**
   * Check for performance issues
   * @param {Object} performanceData - Query performance data
   */
  checkPerformanceIssues(performanceData) {
    const issues = [];

    // Check execution time
    if (performanceData.executionTime > this.thresholds.verySlowQuery) {
      issues.push({
        type: "very_slow_query",
        severity: "critical",
        message: `Query took ${performanceData.executionTime}ms (threshold: ${this.thresholds.verySlowQuery}ms)`,
        data: performanceData,
      });
    } else if (performanceData.executionTime > this.thresholds.slowQuery) {
      issues.push({
        type: "slow_query",
        severity: "warning",
        message: `Query took ${performanceData.executionTime}ms (threshold: ${this.thresholds.slowQuery}ms)`,
        data: performanceData,
      });
    }

    // Check memory usage
    if (performanceData.memoryDelta > this.thresholds.highMemoryUsage) {
      issues.push({
        type: "high_memory_usage",
        severity: "warning",
        message: `Query used ${Math.round(performanceData.memoryDelta / 1024 / 1024)}MB memory`,
        data: performanceData,
      });
    }

    // Check for errors
    if (!performanceData.success) {
      issues.push({
        type: "query_error",
        severity: "error",
        message: `Query failed: ${performanceData.error}`,
        data: performanceData,
      });
    }

    // Emit issues
    issues.forEach((issue) => {
      this.emit("performanceIssue", issue);
      this.logger.warn(`Performance issue: ${issue.message}`);
    });
  }

  /**
   * Get query statistics
   * @param {string} query - SQL query (optional)
   * @returns {Object} Query statistics
   */
  getStats(query = null) {
    if (query) {
      const queryKey = this.getQueryKey(query);
      return this.queryStats.get(queryKey) || null;
    }

    // Overall statistics
    const allStats = Array.from(this.queryStats.values());
    const totalQueries = allStats.reduce((sum, stats) => sum + stats.count, 0);
    const totalTime = allStats.reduce((sum, stats) => sum + stats.totalTime, 0);
    const totalErrors = allStats.reduce(
      (sum, stats) => sum + stats.errorCount,
      0,
    );

    return {
      totalQueries,
      totalTime,
      avgTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      errorRate: totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0,
      activeQueries: this.activeQueries.size,
      uniqueQueries: this.queryStats.size,
      historySize: this.queryHistory.length,
    };
  }

  /**
   * Get recent query history
   * @param {number} limit - Number of recent queries
   * @param {string} filter - Filter by query type
   * @returns {Array} Recent query history
   */
  getRecentHistory(limit = 100, filter = null) {
    let history = this.queryHistory;

    if (filter) {
      history = history.filter((query) =>
        query.query.toLowerCase().includes(filter.toLowerCase()),
      );
    }

    return history
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get slow queries
   * @param {number} limit - Number of slow queries
   * @returns {Array} Slow queries
   */
  getSlowQueries(limit = 50) {
    return this.queryHistory
      .filter((query) => query.executionTime > this.thresholds.slowQuery)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get top queries by execution time
   * @param {number} limit - Number of top queries
   * @returns {Array} Top queries by execution time
   */
  getTopQueriesByTime(limit = 10) {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  /**
   * Get most frequent queries
   * @param {number} limit - Number of frequent queries
   * @returns {Array} Most frequent queries
   */
  getMostFrequentQueries(limit = 10) {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get query key for statistics
   * @param {string} query - SQL query
   * @returns {string} Query key
   */
  getQueryKey(query) {
    return query
      .replace(/\s+/g, " ")
      .replace(/\$\d+/g, "?")
      .trim()
      .toLowerCase();
  }

  /**
   * Sanitize query for logging
   * @param {string} query - SQL query
   * @returns {string} Sanitized query
   */
  sanitizeQuery(query) {
    return query.replace(/\s+/g, " ").trim().substring(0, 500); // Limit length
  }

  /**
   * Clear query history
   */
  clearHistory() {
    this.queryHistory = [];
    this.queryStats.clear();
    this.executionPlans.clear();
    this.logger.info("Query history cleared");
  }

  /**
   * Export query data
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported data
   */
  exportData(format = "json") {
    const data = {
      stats: this.getStats(),
      history: this.queryHistory,
      executionPlans: Array.from(this.executionPlans.values()),
    };

    if (format === "csv") {
      // Simple CSV export
      const headers = [
        "timestamp",
        "query",
        "executionTime",
        "success",
        "error",
      ];
      const rows = this.queryHistory.map((query) => [
        query.timestamp,
        query.query,
        query.executionTime,
        query.success,
        query.error || "",
      ]);

      return [headers, ...rows].map((row) => row.join(",")).join("\n");
    }

    return JSON.stringify(data, null, 2);
  }
}

module.exports = QueryMonitor;
