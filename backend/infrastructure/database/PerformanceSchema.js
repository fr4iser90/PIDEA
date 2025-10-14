/**
 * PerformanceSchema - Database performance optimization schema
 * Provides performance optimization schema management and utilities
 */
const Logger = require("@logging/Logger");

class PerformanceSchema {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.logger = new Logger("PerformanceSchema");
    this.schemaCache = new Map();
    this.optimizationRules = new Map();

    this.initializeOptimizationRules();
  }

  /**
   * Initialize performance optimization rules
   */
  initializeOptimizationRules() {
    this.optimizationRules.set("index_optimization", {
      description: "Optimize database indexes for better performance",
      rules: [
        "Create indexes on frequently queried columns",
        "Use composite indexes for multi-column queries",
        "Remove unused indexes",
        "Consider partial indexes for filtered queries",
      ],
      impact: "high",
    });

    this.optimizationRules.set("query_optimization", {
      description: "Optimize database queries for better performance",
      rules: [
        "Use specific column names instead of SELECT *",
        "Add appropriate WHERE clauses",
        "Use JOINs instead of subqueries when possible",
        "Limit result sets with LIMIT clause",
      ],
      impact: "medium",
    });

    this.optimizationRules.set("partition_optimization", {
      description: "Optimize table partitioning for better performance",
      rules: [
        "Partition large tables by date ranges",
        "Use appropriate partitioning strategies",
        "Maintain partition statistics",
        "Archive old partitions",
      ],
      impact: "high",
    });

    this.optimizationRules.set("materialized_view_optimization", {
      description: "Optimize materialized views for better performance",
      rules: [
        "Create materialized views for complex queries",
        "Schedule regular refreshes",
        "Use appropriate refresh strategies",
        "Monitor view usage",
      ],
      impact: "medium",
    });
  }

  /**
   * Create performance optimization schema
   * @param {Object} options - Schema options
   * @returns {Promise<Object>} Schema creation result
   */
  async createPerformanceSchema(options = {}) {
    try {
      this.logger.info("Creating performance optimization schema", { options });

      const schemaName = options.schemaName || "performance_optimization";
      const tables = await this.createPerformanceTables(schemaName, options);
      const indexes = await this.createPerformanceIndexes(schemaName, options);
      const views = await this.createPerformanceViews(schemaName, options);

      const result = {
        schemaName,
        tables,
        indexes,
        views,
        createdAt: new Date().toISOString(),
        status: "active",
      };

      // Cache the schema
      this.schemaCache.set(schemaName, result);

      this.logger.info("Performance optimization schema created successfully", {
        schemaName,
      });

      return result;
    } catch (error) {
      this.logger.error("Performance schema creation failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create performance optimization tables
   * @param {string} schemaName - Schema name
   * @param {Object} options - Schema options
   * @returns {Promise<Array>} Created tables
   */
  async createPerformanceTables(schemaName, options) {
    try {
      this.logger.debug("Creating performance optimization tables", {
        schemaName,
      });

      const tables = [];

      // Performance metrics table
      const performanceMetricsTable = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.performance_metrics (
          id SERIAL PRIMARY KEY,
          metric_name TEXT NOT NULL,
          metric_value DECIMAL,
          metric_unit TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `;

      await this.db.execute(performanceMetricsTable);
      tables.push("performance_metrics");

      // Query performance table
      const queryPerformanceTable = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.query_performance (
          id SERIAL PRIMARY KEY,
          query_hash TEXT NOT NULL,
          query_text TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          rows_affected INTEGER DEFAULT 0,
          rows_returned INTEGER DEFAULT 0,
          database_type TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `;

      await this.db.execute(queryPerformanceTable);
      tables.push("query_performance");

      // Index usage table
      const indexUsageTable = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.index_usage (
          id SERIAL PRIMARY KEY,
          index_name TEXT NOT NULL,
          table_name TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          last_used TIMESTAMP,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `;

      await this.db.execute(indexUsageTable);
      tables.push("index_usage");

      // Optimization recommendations table
      const optimizationRecommendationsTable = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.optimization_recommendations (
          id SERIAL PRIMARY KEY,
          recommendation_type TEXT NOT NULL,
          recommendation_text TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          estimated_improvement DECIMAL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          applied_at TIMESTAMP,
          metadata JSONB
        )
      `;

      await this.db.execute(optimizationRecommendationsTable);
      tables.push("optimization_recommendations");

      // Performance alerts table
      const performanceAlertsTable = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.performance_alerts (
          id SERIAL PRIMARY KEY,
          alert_type TEXT NOT NULL,
          alert_message TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'medium',
          threshold_value DECIMAL,
          actual_value DECIMAL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP,
          metadata JSONB
        )
      `;

      await this.db.execute(performanceAlertsTable);
      tables.push("performance_alerts");

      this.logger.debug("Performance optimization tables created", {
        schemaName,
        count: tables.length,
      });

      return tables;
    } catch (error) {
      this.logger.error("Failed to create performance tables", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create performance optimization indexes
   * @param {string} schemaName - Schema name
   * @param {Object} options - Schema options
   * @returns {Promise<Array>} Created indexes
   */
  async createPerformanceIndexes(schemaName, options) {
    try {
      this.logger.debug("Creating performance optimization indexes", {
        schemaName,
      });

      const indexes = [];

      // Performance metrics indexes
      const performanceMetricsIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_performance_metrics_metric_name ON ${schemaName}.performance_metrics (metric_name)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_performance_metrics_timestamp ON ${schemaName}.performance_metrics (timestamp)`,
      ];

      for (const indexSQL of performanceMetricsIndexes) {
        await this.db.execute(indexSQL);
        indexes.push(indexSQL);
      }

      // Query performance indexes
      const queryPerformanceIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_query_performance_query_hash ON ${schemaName}.query_performance (query_hash)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_query_performance_execution_time ON ${schemaName}.query_performance (execution_time_ms)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_query_performance_timestamp ON ${schemaName}.query_performance (timestamp)`,
      ];

      for (const indexSQL of queryPerformanceIndexes) {
        await this.db.execute(indexSQL);
        indexes.push(indexSQL);
      }

      // Index usage indexes
      const indexUsageIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_index_usage_index_name ON ${schemaName}.index_usage (index_name)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_index_usage_table_name ON ${schemaName}.index_usage (table_name)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_index_usage_last_used ON ${schemaName}.index_usage (last_used)`,
      ];

      for (const indexSQL of indexUsageIndexes) {
        await this.db.execute(indexSQL);
        indexes.push(indexSQL);
      }

      // Optimization recommendations indexes
      const optimizationRecommendationsIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_optimization_recommendations_type ON ${schemaName}.optimization_recommendations (recommendation_type)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_optimization_recommendations_priority ON ${schemaName}.optimization_recommendations (priority)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_optimization_recommendations_status ON ${schemaName}.optimization_recommendations (status)`,
      ];

      for (const indexSQL of optimizationRecommendationsIndexes) {
        await this.db.execute(indexSQL);
        indexes.push(indexSQL);
      }

      // Performance alerts indexes
      const performanceAlertsIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_performance_alerts_alert_type ON ${schemaName}.performance_alerts (alert_type)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_performance_alerts_severity ON ${schemaName}.performance_alerts (severity)`,
        `CREATE INDEX IF NOT EXISTS idx_${schemaName}_performance_alerts_timestamp ON ${schemaName}.performance_alerts (timestamp)`,
      ];

      for (const indexSQL of performanceAlertsIndexes) {
        await this.db.execute(indexSQL);
        indexes.push(indexSQL);
      }

      this.logger.debug("Performance optimization indexes created", {
        schemaName,
        count: indexes.length,
      });

      return indexes;
    } catch (error) {
      this.logger.error("Failed to create performance indexes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create performance optimization views
   * @param {string} schemaName - Schema name
   * @param {Object} options - Schema options
   * @returns {Promise<Array>} Created views
   */
  async createPerformanceViews(schemaName, options) {
    try {
      this.logger.debug("Creating performance optimization views", {
        schemaName,
      });

      const views = [];

      // Performance summary view
      const performanceSummaryView = `
        CREATE OR REPLACE VIEW ${schemaName}.performance_summary AS
        SELECT 
          DATE(timestamp) as date,
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as measurement_count
        FROM ${schemaName}.performance_metrics
        WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(timestamp), metric_name
        ORDER BY date DESC, metric_name
      `;

      await this.db.execute(performanceSummaryView);
      views.push("performance_summary");

      // Query performance summary view
      const queryPerformanceSummaryView = `
        CREATE OR REPLACE VIEW ${schemaName}.query_performance_summary AS
        SELECT 
          DATE(timestamp) as date,
          database_type,
          COUNT(*) as total_queries,
          AVG(execution_time_ms) as avg_execution_time,
          MIN(execution_time_ms) as min_execution_time,
          MAX(execution_time_ms) as max_execution_time,
          SUM(rows_affected) as total_rows_affected,
          SUM(rows_returned) as total_rows_returned
        FROM ${schemaName}.query_performance
        WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(timestamp), database_type
        ORDER BY date DESC, database_type
      `;

      await this.db.execute(queryPerformanceSummaryView);
      views.push("query_performance_summary");

      // Index usage summary view
      const indexUsageSummaryView = `
        CREATE OR REPLACE VIEW ${schemaName}.index_usage_summary AS
        SELECT 
          table_name,
          index_name,
          SUM(usage_count) as total_usage,
          MAX(last_used) as last_used,
          COUNT(*) as measurement_count
        FROM ${schemaName}.index_usage
        WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY table_name, index_name
        ORDER BY total_usage DESC
      `;

      await this.db.execute(indexUsageSummaryView);
      views.push("index_usage_summary");

      // Optimization recommendations summary view
      const optimizationRecommendationsSummaryView = `
        CREATE OR REPLACE VIEW ${schemaName}.optimization_recommendations_summary AS
        SELECT 
          recommendation_type,
          priority,
          status,
          COUNT(*) as recommendation_count,
          AVG(estimated_improvement) as avg_estimated_improvement,
          MAX(created_at) as latest_recommendation
        FROM ${schemaName}.optimization_recommendations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY recommendation_type, priority, status
        ORDER BY priority DESC, recommendation_count DESC
      `;

      await this.db.execute(optimizationRecommendationsSummaryView);
      views.push("optimization_recommendations_summary");

      this.logger.debug("Performance optimization views created", {
        schemaName,
        count: views.length,
      });

      return views;
    } catch (error) {
      this.logger.error("Failed to create performance views", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get performance schema information
   * @param {string} schemaName - Schema name
   * @returns {Promise<Object>} Schema information
   */
  async getPerformanceSchema(schemaName) {
    try {
      // Check cache first
      if (this.schemaCache.has(schemaName)) {
        return this.schemaCache.get(schemaName);
      }

      // Query database for schema information
      const query = `
        SELECT 
          schema_name,
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name
      `;

      const result = await this.db.execute(query, [schemaName]);

      if (result.rows.length === 0) {
        return null;
      }

      const schema = {
        schemaName,
        tables: result.rows.map((row) => ({
          name: row.table_name,
          type: row.table_type,
        })),
        status: "active",
      };

      // Cache the schema
      this.schemaCache.set(schemaName, schema);

      return schema;
    } catch (error) {
      this.logger.error("Failed to get performance schema", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Drop performance schema
   * @param {string} schemaName - Schema name
   * @returns {Promise<Object>} Schema drop result
   */
  async dropPerformanceSchema(schemaName) {
    try {
      this.logger.info("Dropping performance schema", { schemaName });

      const schema = await this.getPerformanceSchema(schemaName);
      if (!schema) {
        throw new Error(`Performance schema ${schemaName} not found`);
      }

      const dropSQL = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
      await this.db.execute(dropSQL);

      // Remove from cache
      this.schemaCache.delete(schemaName);

      const result = {
        schemaName,
        droppedAt: new Date().toISOString(),
        status: "dropped",
      };

      this.logger.info("Performance schema dropped successfully", {
        schemaName,
      });

      return result;
    } catch (error) {
      this.logger.error("Performance schema drop failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get optimization rules
   * @returns {Object} Optimization rules
   */
  getOptimizationRules() {
    return Object.fromEntries(this.optimizationRules);
  }

  /**
   * Get performance schema statistics
   * @returns {Object} Schema statistics
   */
  getSchemaStats() {
    return {
      totalSchemas: this.schemaCache.size,
      optimizationRules: Array.from(this.optimizationRules.keys()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear schema cache
   */
  clearCache() {
    this.schemaCache.clear();
    this.logger.info("Performance schema cache cleared");
  }
}

module.exports = PerformanceSchema;
