/**
 * WorkflowMetricsRepository
 * Repository interface and implementation for workflow metrics persistence
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Interface for workflow metrics repository
 */
class WorkflowMetricsRepository {
  /**
   * Record metric
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordMetric(metric) {
    throw new Error('recordMetric method must be implemented');
  }

  /**
   * Get metrics for execution
   * @param {string} executionId - Execution ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsForExecution(executionId, options = {}) {
    throw new Error('getMetricsForExecution method must be implemented');
  }

  /**
   * Get aggregated metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Aggregated metrics
   */
  async getAggregatedMetrics(filters = {}) {
    throw new Error('getAggregatedMetrics method must be implemented');
  }

  /**
   * Get metrics by type
   * @param {string} metricType - Metric type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsByType(metricType, options = {}) {
    throw new Error('getMetricsByType method must be implemented');
  }

  /**
   * Get metrics by name
   * @param {string} metricName - Metric name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsByName(metricName, options = {}) {
    throw new Error('getMetricsByName method must be implemented');
  }

  /**
   * Get metrics statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getMetricsStatistics(filters = {}) {
    throw new Error('getMetricsStatistics method must be implemented');
  }

  /**
   * Delete metrics for execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<number>} Number of deleted metrics
   */
  async deleteMetricsForExecution(executionId) {
    throw new Error('deleteMetricsForExecution method must be implemented');
  }

  /**
   * Clean up old metrics
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted metrics
   */
  async cleanupOldMetrics(daysOld = 30) {
    throw new Error('cleanupOldMetrics method must be implemented');
  }
}

/**
 * PostgreSQL implementation of WorkflowMetricsRepository
 */
class PostgreSQLWorkflowMetricsRepository extends WorkflowMetricsRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
    this.tableName = 'workflow_metrics';
  }

  /**
   * Record metric
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordMetric(metric) {
    const query = `
      INSERT INTO ${this.tableName} (
        execution_id, metric_name, metric_value, metric_unit,
        metric_type, metric_category, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      metric.executionId,
      metric.metricName,
      metric.metricValue,
      metric.metricUnit,
      metric.metricType || 'performance',
      metric.metricCategory,
      JSON.stringify(metric.metadata || {})
    ];

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to record workflow metric: ${error.message}`);
    }
  }

  /**
   * Get metrics for execution
   * @param {string} executionId - Execution ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsForExecution(executionId, options = {}) {
    const { metricType, metricCategory, limit = 100 } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE execution_id = $1
    `;
    const values = [executionId];
    let paramIndex = 2;

    if (metricType) {
      query += ` AND metric_type = $${paramIndex}`;
      values.push(metricType);
      paramIndex++;
    }

    if (metricCategory) {
      query += ` AND metric_category = $${paramIndex}`;
      values.push(metricCategory);
      paramIndex++;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`;
    values.push(limit);

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to get metrics for execution: ${error.message}`);
    }
  }

  /**
   * Get aggregated metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Aggregated metrics
   */
  async getAggregatedMetrics(filters = {}) {
    const { metricName, metricType, metricCategory, timeRange, executionId } = filters;

    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (executionId) {
      whereClause += ` WHERE execution_id = $${paramIndex}`;
      values.push(executionId);
      paramIndex++;
    }

    if (metricName) {
      whereClause += whereClause ? ` AND metric_name = $${paramIndex}` : ` WHERE metric_name = $${paramIndex}`;
      values.push(metricName);
      paramIndex++;
    }

    if (metricType) {
      whereClause += whereClause ? ` AND metric_type = $${paramIndex}` : ` WHERE metric_type = $${paramIndex}`;
      values.push(metricType);
      paramIndex++;
    }

    if (metricCategory) {
      whereClause += whereClause ? ` AND metric_category = $${paramIndex}` : ` WHERE metric_category = $${paramIndex}`;
      values.push(metricCategory);
      paramIndex++;
    }

    if (timeRange) {
      const timeCondition = whereClause ? ` AND recorded_at >= $${paramIndex}` : ` WHERE recorded_at >= $${paramIndex}`;
      whereClause += timeCondition;
      values.push(timeRange);
      paramIndex++;
    }

    const query = `
      SELECT 
        metric_name,
        metric_type,
        metric_category,
        AVG(metric_value) as average_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as count,
        STDDEV(metric_value) as standard_deviation
      FROM ${this.tableName}
      ${whereClause}
      GROUP BY metric_name, metric_type, metric_category
      ORDER BY metric_name, metric_type, metric_category
    `;

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to get aggregated metrics: ${error.message}`);
    }
  }

  /**
   * Get metrics by type
   * @param {string} metricType - Metric type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsByType(metricType, options = {}) {
    const { executionId, limit = 100, offset = 0 } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE metric_type = $1
    `;
    const values = [metricType];
    let paramIndex = 2;

    if (executionId) {
      query += ` AND execution_id = $${paramIndex}`;
      values.push(executionId);
      paramIndex++;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to get metrics by type: ${error.message}`);
    }
  }

  /**
   * Get metrics by name
   * @param {string} metricName - Metric name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsByName(metricName, options = {}) {
    const { executionId, limit = 100, offset = 0 } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE metric_name = $1
    `;
    const values = [metricName];
    let paramIndex = 2;

    if (executionId) {
      query += ` AND execution_id = $${paramIndex}`;
      values.push(executionId);
      paramIndex++;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to get metrics by name: ${error.message}`);
    }
  }

  /**
   * Get metrics statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getMetricsStatistics(filters = {}) {
    const { executionId, metricType, timeRange } = filters;

    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (executionId) {
      whereClause += ` WHERE execution_id = $${paramIndex}`;
      values.push(executionId);
      paramIndex++;
    }

    if (metricType) {
      whereClause += whereClause ? ` AND metric_type = $${paramIndex}` : ` WHERE metric_type = $${paramIndex}`;
      values.push(metricType);
      paramIndex++;
    }

    if (timeRange) {
      const timeCondition = whereClause ? ` AND recorded_at >= $${paramIndex}` : ` WHERE recorded_at >= $${paramIndex}`;
      whereClause += timeCondition;
      values.push(timeRange);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(*) as total_metrics,
        COUNT(DISTINCT execution_id) as unique_executions,
        COUNT(DISTINCT metric_name) as unique_metric_names,
        COUNT(DISTINCT metric_type) as unique_metric_types,
        AVG(metric_value) as average_metric_value,
        MIN(metric_value) as min_metric_value,
        MAX(metric_value) as max_metric_value,
        MIN(recorded_at) as earliest_metric,
        MAX(recorded_at) as latest_metric
      FROM ${this.tableName}
      ${whereClause}
    `;

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to get metrics statistics: ${error.message}`);
    }
  }

  /**
   * Delete metrics for execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<number>} Number of deleted metrics
   */
  async deleteMetricsForExecution(executionId) {
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE execution_id = $1
    `;

    try {
      const result = await this.db.query(query, [executionId]);
      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete metrics for execution: ${error.message}`);
    }
  }

  /**
   * Clean up old metrics
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted metrics
   */
  async cleanupOldMetrics(daysOld = 30) {
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    try {
      const result = await this.db.query(query);
      return result.length;
    } catch (error) {
      throw new Error(`Failed to cleanup old metrics: ${error.message}`);
    }
  }
}

/**
 * In-memory implementation for testing
 */
class InMemoryWorkflowMetricsRepository extends WorkflowMetricsRepository {
  constructor() {
    super();
    this.metrics = new Map();
  }

  async recordMetric(metric) {
    const metricId = uuidv4();
    const metricRecord = {
      id: metricId,
      executionId: metric.executionId,
      metricName: metric.metricName,
      metricValue: metric.metricValue,
      metricUnit: metric.metricUnit,
      metricType: metric.metricType || 'performance',
      metricCategory: metric.metricCategory,
      metadata: metric.metadata || {},
      recordedAt: new Date()
    };

    this.metrics.set(metricId, metricRecord);
    return metricRecord;
  }

  async getMetricsForExecution(executionId, options = {}) {
    const { metricType, metricCategory, limit = 100 } = options;
    
    let metrics = Array.from(this.metrics.values())
      .filter(metric => metric.executionId === executionId);

    if (metricType) {
      metrics = metrics.filter(metric => metric.metricType === metricType);
    }

    if (metricCategory) {
      metrics = metrics.filter(metric => metric.metricCategory === metricCategory);
    }

    metrics.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    
    return metrics.slice(0, limit);
  }

  async getAggregatedMetrics(filters = {}) {
    const { metricName, metricType, metricCategory, timeRange, executionId } = filters;
    
    let metrics = Array.from(this.metrics.values());

    if (executionId) {
      metrics = metrics.filter(metric => metric.executionId === executionId);
    }

    if (metricName) {
      metrics = metrics.filter(metric => metric.metricName === metricName);
    }

    if (metricType) {
      metrics = metrics.filter(metric => metric.metricType === metricType);
    }

    if (metricCategory) {
      metrics = metrics.filter(metric => metric.metricCategory === metricCategory);
    }

    if (timeRange) {
      const cutoffDate = new Date(timeRange);
      metrics = metrics.filter(metric => metric.recordedAt >= cutoffDate);
    }

    // Group by metric name, type, and category
    const grouped = {};
    metrics.forEach(metric => {
      const key = `${metric.metricName}_${metric.metricType}_${metric.metricCategory}`;
      if (!grouped[key]) {
        grouped[key] = {
          metric_name: metric.metricName,
          metric_type: metric.metricType,
          metric_category: metric.metricCategory,
          values: []
        };
      }
      grouped[key].values.push(metric.metricValue);
    });

    // Calculate aggregates
    return Object.values(grouped).map(group => {
      const values = group.values;
      return {
        metric_name: group.metric_name,
        metric_type: group.metric_type,
        metric_category: group.metric_category,
        average_value: values.reduce((a, b) => a + b, 0) / values.length,
        min_value: Math.min(...values),
        max_value: Math.max(...values),
        count: values.length,
        standard_deviation: this.calculateStandardDeviation(values)
      };
    });
  }

  async getMetricsByType(metricType, options = {}) {
    const { executionId, limit = 100, offset = 0 } = options;
    
    let metrics = Array.from(this.metrics.values())
      .filter(metric => metric.metricType === metricType);

    if (executionId) {
      metrics = metrics.filter(metric => metric.executionId === executionId);
    }

    metrics.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    
    return metrics.slice(offset, offset + limit);
  }

  async getMetricsByName(metricName, options = {}) {
    const { executionId, limit = 100, offset = 0 } = options;
    
    let metrics = Array.from(this.metrics.values())
      .filter(metric => metric.metricName === metricName);

    if (executionId) {
      metrics = metrics.filter(metric => metric.executionId === executionId);
    }

    metrics.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    
    return metrics.slice(offset, offset + limit);
  }

  async getMetricsStatistics(filters = {}) {
    const { executionId, metricType, timeRange } = filters;
    
    let metrics = Array.from(this.metrics.values());

    if (executionId) {
      metrics = metrics.filter(metric => metric.executionId === executionId);
    }

    if (metricType) {
      metrics = metrics.filter(metric => metric.metricType === metricType);
    }

    if (timeRange) {
      const cutoffDate = new Date(timeRange);
      metrics = metrics.filter(metric => metric.recordedAt >= cutoffDate);
    }

    const uniqueExecutions = new Set(metrics.map(m => m.executionId)).size;
    const uniqueMetricNames = new Set(metrics.map(m => m.metricName)).size;
    const uniqueMetricTypes = new Set(metrics.map(m => m.metricType)).size;
    const values = metrics.map(m => m.metricValue);
    const recordedAts = metrics.map(m => m.recordedAt);

    return {
      total_metrics: metrics.length,
      unique_executions: uniqueExecutions,
      unique_metric_names: uniqueMetricNames,
      unique_metric_types: uniqueMetricTypes,
      average_metric_value: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
      min_metric_value: values.length > 0 ? Math.min(...values) : null,
      max_metric_value: values.length > 0 ? Math.max(...values) : null,
      earliest_metric: recordedAts.length > 0 ? new Date(Math.min(...recordedAts)) : null,
      latest_metric: recordedAts.length > 0 ? new Date(Math.max(...recordedAts)) : null
    };
  }

  async deleteMetricsForExecution(executionId) {
    let deletedCount = 0;
    for (const [metricId, metric] of this.metrics.entries()) {
      if (metric.executionId === executionId) {
        this.metrics.delete(metricId);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async cleanupOldMetrics(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    for (const [metricId, metric] of this.metrics.entries()) {
      if (metric.recordedAt < cutoffDate) {
        this.metrics.delete(metricId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Calculate standard deviation
   * @param {Array<number>} values - Array of values
   * @returns {number} Standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const averageSquaredDifference = squaredDifferences.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(averageSquaredDifference);
  }
}

module.exports = {
  WorkflowMetricsRepository,
  PostgreSQLWorkflowMetricsRepository,
  InMemoryWorkflowMetricsRepository
}; 