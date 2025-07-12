/**
 * IntegrationRepository - Database operations for integration system
 * 
 * This class provides database operations for the integration system,
 * including test results, metrics, health checks, and configurations.
 * It handles all data persistence for the integration framework.
 */
const { v4: uuidv4 } = require('uuid');

class IntegrationRepository {
  /**
   * Create a new integration repository
   * @param {Object} database - Database connection
   * @param {Object} options - Repository options
   */
  constructor(database, options = {}) {
    this.database = database;
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 100,
      enableValidation: options.enableValidation !== false,
      ...options
    };
    
    this.cache = new Map();
  }

  /**
   * Save test result
   * @param {Object} testResult - Test result data
   * @returns {Promise<Object>} Saved test result
   */
  async saveTestResult(testResult) {
    try {
      const id = testResult.id || uuidv4();
      const query = `
        INSERT INTO integration_test_results (
          id, test_id, suite_name, test_name, test_type, status, success,
          duration_ms, retries, error_message, error_stack, result_data, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          success = VALUES(success),
          duration_ms = VALUES(duration_ms),
          retries = VALUES(retries),
          error_message = VALUES(error_message),
          error_stack = VALUES(error_stack),
          result_data = VALUES(result_data),
          metadata = VALUES(metadata),
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        id,
        testResult.test_id,
        testResult.suite_name,
        testResult.test_name,
        testResult.test_type,
        testResult.status || 'pending',
        testResult.success ? 1 : 0,
        testResult.duration_ms || 0,
        testResult.retries || 0,
        testResult.error_message || null,
        testResult.error_stack || null,
        testResult.result_data ? JSON.stringify(testResult.result_data) : null,
        testResult.metadata ? JSON.stringify(testResult.metadata) : null
      ];

      await this.database.execute(query, params);

      const savedResult = { ...testResult, id };
      
      // Cache the result
      if (this.options.enableCaching) {
        this.cacheResult(`test_result:${id}`, savedResult);
      }

      return savedResult;

    } catch (error) {
      throw new Error(`Failed to save test result: ${error.message}`);
    }
  }

  /**
   * Get test result by ID
   * @param {string} id - Test result ID
   * @returns {Promise<Object|null>} Test result
   */
  async getTestResult(id) {
    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cached = this.getCachedResult(`test_result:${id}`);
        if (cached) return cached;
      }

      const query = `
        SELECT * FROM integration_test_results 
        WHERE id = ?
      `;

      const [rows] = await this.database.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }

      const result = this.mapTestResultFromRow(rows[0]);
      
      // Cache the result
      if (this.options.enableCaching) {
        this.cacheResult(`test_result:${id}`, result);
      }

      return result;

    } catch (error) {
      throw new Error(`Failed to get test result: ${error.message}`);
    }
  }

  /**
   * Get test results by suite name
   * @param {string} suiteName - Suite name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Test results
   */
  async getTestResultsBySuite(suiteName, options = {}) {
    try {
      const { limit = 100, offset = 0, status, success } = options;
      
      let query = `
        SELECT * FROM integration_test_results 
        WHERE suite_name = ?
      `;
      
      const params = [suiteName];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (success !== undefined) {
        query += ' AND success = ?';
        params.push(success ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await this.database.execute(query, params);
      
      return rows.map(row => this.mapTestResultFromRow(row));

    } catch (error) {
      throw new Error(`Failed to get test results by suite: ${error.message}`);
    }
  }

  /**
   * Save metric
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Saved metric
   */
  async saveMetric(metric) {
    try {
      const id = metric.id || uuidv4();
      const query = `
        INSERT INTO integration_metrics (
          id, integration_id, metric_type, metric_name, metric_value,
          metric_unit, metric_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        metric.integration_id,
        metric.metric_type,
        metric.metric_name,
        metric.metric_value || null,
        metric.metric_unit || null,
        metric.metric_data ? JSON.stringify(metric.metric_data) : null
      ];

      await this.database.execute(query, params);

      const savedMetric = { ...metric, id };
      
      // Cache the metric
      if (this.options.enableCaching) {
        this.cacheResult(`metric:${id}`, savedMetric);
      }

      return savedMetric;

    } catch (error) {
      throw new Error(`Failed to save metric: ${error.message}`);
    }
  }

  /**
   * Get metrics by integration ID
   * @param {string} integrationId - Integration ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsByIntegrationId(integrationId, options = {}) {
    try {
      const { metricType, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT * FROM integration_metrics 
        WHERE integration_id = ?
      `;
      
      const params = [integrationId];

      if (metricType) {
        query += ' AND metric_type = ?';
        params.push(metricType);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await this.database.execute(query, params);
      
      return rows.map(row => this.mapMetricFromRow(row));

    } catch (error) {
      throw new Error(`Failed to get metrics by integration ID: ${error.message}`);
    }
  }

  /**
   * Save health check
   * @param {Object} healthCheck - Health check data
   * @returns {Promise<Object>} Saved health check
   */
  async saveHealthCheck(healthCheck) {
    try {
      const id = healthCheck.id || uuidv4();
      const query = `
        INSERT INTO integration_health_checks (
          id, component_type, component_name, health_status, health_data
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          health_status = VALUES(health_status),
          health_data = VALUES(health_data),
          last_check_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        id,
        healthCheck.component_type,
        healthCheck.component_name,
        healthCheck.health_status,
        healthCheck.health_data ? JSON.stringify(healthCheck.health_data) : null
      ];

      await this.database.execute(query, params);

      const savedHealthCheck = { ...healthCheck, id };
      
      // Cache the health check
      if (this.options.enableCaching) {
        this.cacheResult(`health_check:${id}`, savedHealthCheck);
      }

      return savedHealthCheck;

    } catch (error) {
      throw new Error(`Failed to save health check: ${error.message}`);
    }
  }

  /**
   * Get health checks by component type
   * @param {string} componentType - Component type
   * @returns {Promise<Array>} Health checks
   */
  async getHealthChecksByComponentType(componentType) {
    try {
      const query = `
        SELECT * FROM integration_health_checks 
        WHERE component_type = ?
        ORDER BY last_check_at DESC
      `;

      const [rows] = await this.database.execute(query, [componentType]);
      
      return rows.map(row => this.mapHealthCheckFromRow(row));

    } catch (error) {
      throw new Error(`Failed to get health checks by component type: ${error.message}`);
    }
  }

  /**
   * Save report
   * @param {Object} report - Report data
   * @returns {Promise<Object>} Saved report
   */
  async saveReport(report) {
    try {
      const id = report.id || uuidv4();
      const query = `
        INSERT INTO integration_reports (
          id, report_type, report_name, report_data
        ) VALUES (?, ?, ?, ?)
      `;

      const params = [
        id,
        report.report_type,
        report.report_name,
        JSON.stringify(report.report_data)
      ];

      await this.database.execute(query, params);

      const savedReport = { ...report, id };
      
      // Cache the report
      if (this.options.enableCaching) {
        this.cacheResult(`report:${id}`, savedReport);
      }

      return savedReport;

    } catch (error) {
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Get reports by type
   * @param {string} reportType - Report type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Reports
   */
  async getReportsByType(reportType, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const query = `
        SELECT * FROM integration_reports 
        WHERE report_type = ?
        ORDER BY generated_at DESC 
        LIMIT ? OFFSET ?
      `;

      const [rows] = await this.database.execute(query, [reportType, limit, offset]);
      
      return rows.map(row => this.mapReportFromRow(row));

    } catch (error) {
      throw new Error(`Failed to get reports by type: ${error.message}`);
    }
  }

  /**
   * Save configuration
   * @param {Object} config - Configuration data
   * @returns {Promise<Object>} Saved configuration
   */
  async saveConfiguration(config) {
    try {
      const id = config.id || uuidv4();
      const query = `
        INSERT INTO integration_configurations (
          id, config_name, config_type, config_data, is_active
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          config_data = VALUES(config_data),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        id,
        config.config_name,
        config.config_type,
        JSON.stringify(config.config_data),
        config.is_active !== false ? 1 : 0
      ];

      await this.database.execute(query, params);

      const savedConfig = { ...config, id };
      
      // Cache the configuration
      if (this.options.enableCaching) {
        this.cacheResult(`config:${id}`, savedConfig);
      }

      return savedConfig;

    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration by name
   * @param {string} configName - Configuration name
   * @returns {Promise<Object|null>} Configuration
   */
  async getConfigurationByName(configName) {
    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cached = this.getCachedResult(`config_name:${configName}`);
        if (cached) return cached;
      }

      const query = `
        SELECT * FROM integration_configurations 
        WHERE config_name = ? AND is_active = 1
      `;

      const [rows] = await this.database.execute(query, [configName]);
      
      if (rows.length === 0) {
        return null;
      }

      const config = this.mapConfigurationFromRow(rows[0]);
      
      // Cache the configuration
      if (this.options.enableCaching) {
        this.cacheResult(`config_name:${configName}`, config);
      }

      return config;

    } catch (error) {
      throw new Error(`Failed to get configuration by name: ${error.message}`);
    }
  }

  /**
   * Get test summary statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Summary statistics
   */
  async getTestSummary(options = {}) {
    try {
      const { suiteName, testType, days = 30 } = options;
      
      let query = `
        SELECT 
          suite_name,
          test_type,
          COUNT(*) as total_tests,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as passed_tests,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_tests,
          AVG(duration_ms) as avg_duration_ms,
          MAX(duration_ms) as max_duration_ms,
          MIN(duration_ms) as min_duration_ms,
          AVG(retries) as avg_retries
        FROM integration_test_results 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      
      const params = [days];

      if (suiteName) {
        query += ' AND suite_name = ?';
        params.push(suiteName);
      }

      if (testType) {
        query += ' AND test_type = ?';
        params.push(testType);
      }

      query += ' GROUP BY suite_name, test_type';

      const [rows] = await this.database.execute(query, params);
      
      return rows.map(row => ({
        suite_name: row.suite_name,
        test_type: row.test_type,
        total_tests: parseInt(row.total_tests),
        passed_tests: parseInt(row.passed_tests),
        failed_tests: parseInt(row.failed_tests),
        success_rate: row.total_tests > 0 ? (row.passed_tests / row.total_tests) * 100 : 0,
        avg_duration_ms: parseFloat(row.avg_duration_ms) || 0,
        max_duration_ms: parseInt(row.max_duration_ms) || 0,
        min_duration_ms: parseInt(row.min_duration_ms) || 0,
        avg_retries: parseFloat(row.avg_retries) || 0
      }));

    } catch (error) {
      throw new Error(`Failed to get test summary: ${error.message}`);
    }
  }

  /**
   * Get performance metrics summary
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Performance summary
   */
  async getPerformanceSummary(options = {}) {
    try {
      const { integrationId, metricName, days = 30 } = options;
      
      let query = `
        SELECT 
          integration_id,
          metric_name,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value,
          COUNT(*) as measurement_count
        FROM integration_metrics 
        WHERE metric_type = 'performance' 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      
      const params = [days];

      if (integrationId) {
        query += ' AND integration_id = ?';
        params.push(integrationId);
      }

      if (metricName) {
        query += ' AND metric_name = ?';
        params.push(metricName);
      }

      query += ' GROUP BY integration_id, metric_name';

      const [rows] = await this.database.execute(query, params);
      
      return rows.map(row => ({
        integration_id: row.integration_id,
        metric_name: row.metric_name,
        avg_value: parseFloat(row.avg_value) || 0,
        max_value: parseFloat(row.max_value) || 0,
        min_value: parseFloat(row.min_value) || 0,
        measurement_count: parseInt(row.measurement_count)
      }));

    } catch (error) {
      throw new Error(`Failed to get performance summary: ${error.message}`);
    }
  }

  /**
   * Cleanup old data
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldData(options = {}) {
    try {
      const { daysToKeep = 30 } = options;
      
      const query = 'CALL sp_cleanup_old_integration_data(?)';
      await this.database.execute(query, [daysToKeep]);

      // Clear cache
      if (this.options.enableCaching) {
        this.cache.clear();
      }

      return {
        success: true,
        message: `Cleaned up data older than ${daysToKeep} days`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to cleanup old data: ${error.message}`);
    }
  }

  /**
   * Get diagnostics information
   * @returns {Promise<Object>} Diagnostics data
   */
  async getDiagnostics() {
    try {
      const query = 'CALL sp_get_integration_diagnostics()';
      const [rows] = await this.database.execute(query);
      
      return rows.map(row => ({
        table_name: row.table_name,
        record_count: parseInt(row.record_count),
        last_record: row.last_record
      }));

    } catch (error) {
      throw new Error(`Failed to get diagnostics: ${error.message}`);
    }
  }

  /**
   * Map test result from database row
   * @param {Object} row - Database row
   * @returns {Object} Mapped test result
   */
  mapTestResultFromRow(row) {
    return {
      id: row.id,
      test_id: row.test_id,
      suite_name: row.suite_name,
      test_name: row.test_name,
      test_type: row.test_type,
      status: row.status,
      success: Boolean(row.success),
      duration_ms: parseInt(row.duration_ms),
      retries: parseInt(row.retries),
      error_message: row.error_message,
      error_stack: row.error_stack,
      result_data: row.result_data ? JSON.parse(row.result_data) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Map metric from database row
   * @param {Object} row - Database row
   * @returns {Object} Mapped metric
   */
  mapMetricFromRow(row) {
    return {
      id: row.id,
      integration_id: row.integration_id,
      metric_type: row.metric_type,
      metric_name: row.metric_name,
      metric_value: parseFloat(row.metric_value),
      metric_unit: row.metric_unit,
      metric_data: row.metric_data ? JSON.parse(row.metric_data) : null,
      timestamp: row.timestamp,
      created_at: row.created_at
    };
  }

  /**
   * Map health check from database row
   * @param {Object} row - Database row
   * @returns {Object} Mapped health check
   */
  mapHealthCheckFromRow(row) {
    return {
      id: row.id,
      component_type: row.component_type,
      component_name: row.component_name,
      health_status: row.health_status,
      health_data: row.health_data ? JSON.parse(row.health_data) : null,
      last_check_at: row.last_check_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Map report from database row
   * @param {Object} row - Database row
   * @returns {Object} Mapped report
   */
  mapReportFromRow(row) {
    return {
      id: row.id,
      report_type: row.report_type,
      report_name: row.report_name,
      report_data: JSON.parse(row.report_data),
      generated_at: row.generated_at,
      created_at: row.created_at
    };
  }

  /**
   * Map configuration from database row
   * @param {Object} row - Database row
   * @returns {Object} Mapped configuration
   */
  mapConfigurationFromRow(row) {
    return {
      id: row.id,
      config_name: row.config_name,
      config_type: row.config_type,
      config_data: JSON.parse(row.config_data),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Cache result
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   */
  cacheResult(key, value) {
    if (this.cache.size >= this.options.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result
   */
  getCachedResult(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = IntegrationRepository; 