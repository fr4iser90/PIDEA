/**
 * IndexManager - Database index management utilities
 * Provides index creation, analysis, and optimization
 */
const Logger = require("@logging/Logger");

class IndexManager {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.logger = new Logger("IndexManager");
    this.indexCache = new Map();
    this.usageStats = new Map();
    this.maintenanceSchedule = new Map();

    this.initializeIndexRules();
  }

  /**
   * Initialize index management rules
   */
  initializeIndexRules() {
    this.indexRules = {
      // Common index patterns
      patterns: {
        primaryKey: /PRIMARY KEY/i,
        foreignKey: /FOREIGN KEY/i,
        unique: /UNIQUE/i,
        composite: /INDEX.*\(.*,.*\)/i,
      },

      // Index types
      types: {
        btree: "BTREE",
        hash: "HASH",
        gist: "GIST",
        gin: "GIN",
      },

      // Index recommendations
      recommendations: {
        highCardinality: "Create index on high cardinality columns",
        frequentQueries: "Create index for frequently queried columns",
        joinColumns: "Create index on JOIN columns",
        whereClause: "Create index on WHERE clause columns",
      },
    };
  }

  /**
   * Create database index
   * @param {string} table - Table name
   * @param {Array} columns - Column names
   * @param {Object} options - Index options
   * @returns {Promise<Object>} Index creation result
   */
  async createIndex(table, columns, options = {}) {
    try {
      this.logger.info("Creating index", { table, columns, options });

      const indexName = this.generateIndexName(table, columns);
      const indexSQL = this.generateIndexSQL(table, columns, options);

      // Check if index already exists
      const existingIndex = await this.getIndex(indexName);
      if (existingIndex) {
        this.logger.warn("Index already exists", { indexName });
        return existingIndex;
      }

      // Create the index
      await this.db.execute(indexSQL);

      const result = {
        indexName,
        table,
        columns,
        options,
        createdAt: new Date().toISOString(),
        status: "active",
      };

      // Cache the index
      this.indexCache.set(indexName, result);

      // Initialize usage statistics
      this.usageStats.set(indexName, {
        usageCount: 0,
        lastUsed: null,
        averageUsage: 0,
        created: new Date(),
      });

      this.logger.info("Index created successfully", { indexName });

      return result;
    } catch (error) {
      this.logger.error("Index creation failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Drop database index
   * @param {string} indexName - Index name
   * @returns {Promise<Object>} Index drop result
   */
  async dropIndex(indexName) {
    try {
      this.logger.info("Dropping index", { indexName });

      const index = await this.getIndex(indexName);
      if (!index) {
        throw new Error(`Index ${indexName} not found`);
      }

      const dropSQL = `DROP INDEX IF EXISTS ${indexName}`;
      await this.db.execute(dropSQL);

      // Remove from cache
      this.indexCache.delete(indexName);
      this.usageStats.delete(indexName);

      const result = {
        indexName,
        droppedAt: new Date().toISOString(),
        status: "dropped",
      };

      this.logger.info("Index dropped successfully", { indexName });

      return result;
    } catch (error) {
      this.logger.error("Index drop failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze index usage
   * @returns {Promise<Object>} Index usage analysis
   */
  async analyzeIndexUsage() {
    try {
      this.logger.debug("Analyzing index usage");

      const usageStats = await this.getIndexUsageStats();
      const recommendations =
        await this.generateIndexRecommendations(usageStats);
      const unusedIndexes = await this.findUnusedIndexes(usageStats);
      const duplicateIndexes = await this.findDuplicateIndexes();

      const analysis = {
        usageStats,
        recommendations,
        unusedIndexes,
        duplicateIndexes,
        summary: {
          totalIndexes: this.indexCache.size,
          usedIndexes: usageStats.filter((stat) => stat.usageCount > 0).length,
          unusedIndexes: unusedIndexes.length,
          duplicateIndexes: duplicateIndexes.length,
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Index usage analysis completed", {
        totalIndexes: analysis.summary.totalIndexes,
        usedIndexes: analysis.summary.usedIndexes,
        unusedIndexes: analysis.summary.unusedIndexes,
      });

      return analysis;
    } catch (error) {
      this.logger.error("Index usage analysis failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get index information
   * @param {string} indexName - Index name
   * @returns {Promise<Object>} Index information
   */
  async getIndex(indexName) {
    try {
      // Check cache first
      if (this.indexCache.has(indexName)) {
        return this.indexCache.get(indexName);
      }

      // Query database for index information
      const query = `
        SELECT 
          indexname,
          tablename,
          indexdef,
          schemaname
        FROM pg_indexes 
        WHERE indexname = $1
      `;

      const result = await this.db.execute(query, [indexName]);

      if (result.rows.length === 0) {
        return null;
      }

      const indexInfo = result.rows[0];
      const index = {
        indexName: indexInfo.indexname,
        table: indexInfo.tablename,
        definition: indexInfo.indexdef,
        schema: indexInfo.schemaname,
        status: "active",
      };

      // Cache the index
      this.indexCache.set(indexName, index);

      return index;
    } catch (error) {
      this.logger.error("Failed to get index", { error: error.message });
      throw error;
    }
  }

  /**
   * Get all indexes for a table
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Table indexes
   */
  async getTableIndexes(tableName) {
    try {
      this.logger.debug("Getting indexes for table", { tableName });

      const query = `
        SELECT 
          indexname,
          tablename,
          indexdef,
          schemaname
        FROM pg_indexes 
        WHERE tablename = $1
        ORDER BY indexname
      `;

      const result = await this.db.execute(query, [tableName]);

      const indexes = result.rows.map((row) => ({
        indexName: row.indexname,
        table: row.tablename,
        definition: row.indexdef,
        schema: row.schemaname,
        status: "active",
      }));

      this.logger.debug("Retrieved table indexes", {
        tableName,
        count: indexes.length,
      });

      return indexes;
    } catch (error) {
      this.logger.error("Failed to get table indexes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate index name
   * @param {string} table - Table name
   * @param {Array} columns - Column names
   * @returns {string} Index name
   */
  generateIndexName(table, columns) {
    const columnStr = columns.join("_");
    return `idx_${table}_${columnStr}`;
  }

  /**
   * Generate index SQL
   * @param {string} table - Table name
   * @param {Array} columns - Column names
   * @param {Object} options - Index options
   * @returns {string} Index SQL
   */
  generateIndexSQL(table, columns, options) {
    const indexName = this.generateIndexName(table, columns);
    const columnList = columns.join(", ");
    const unique = options.unique ? "UNIQUE " : "";
    const indexType = options.type || "BTREE";
    const concurrent = options.concurrent ? "CONCURRENTLY " : "";

    return `CREATE ${unique}INDEX ${concurrent}${indexName} ON ${table} USING ${indexType} (${columnList})`;
  }

  /**
   * Get index usage statistics
   * @returns {Promise<Array>} Usage statistics
   */
  async getIndexUsageStats() {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `;

      const result = await this.db.execute(query);

      const stats = result.rows.map((row) => ({
        schema: row.schemaname,
        table: row.tablename,
        indexName: row.indexname,
        tuplesRead: parseInt(row.idx_tup_read) || 0,
        tuplesFetched: parseInt(row.idx_tup_fetch) || 0,
        scanCount: parseInt(row.idx_scan) || 0,
        usageCount: parseInt(row.idx_scan) || 0,
        lastUsed: new Date().toISOString(),
      }));

      // Update cache with usage statistics
      for (const stat of stats) {
        this.usageStats.set(stat.indexName, stat);
      }

      return stats;
    } catch (error) {
      this.logger.error("Failed to get index usage statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate index recommendations
   * @param {Array} usageStats - Usage statistics
   * @returns {Promise<Array>} Index recommendations
   */
  async generateIndexRecommendations(usageStats) {
    try {
      const recommendations = [];

      // Find frequently used indexes that might need optimization
      const frequentlyUsed = usageStats.filter((stat) => stat.scanCount > 1000);
      for (const stat of frequentlyUsed) {
        recommendations.push({
          type: "optimize_heavy_usage",
          indexName: stat.indexName,
          table: stat.table,
          description: "Index has heavy usage - consider optimization",
          priority: "medium",
          estimatedImprovement: 20,
        });
      }

      // Find indexes with low usage
      const lowUsage = usageStats.filter((stat) => stat.scanCount < 10);
      for (const stat of lowUsage) {
        recommendations.push({
          type: "low_usage",
          indexName: stat.indexName,
          table: stat.table,
          description: "Index has low usage - consider removing",
          priority: "low",
          estimatedImprovement: 0,
        });
      }

      // Find missing indexes for common query patterns
      const missingIndexes = await this.findMissingIndexes();
      for (const missing of missingIndexes) {
        recommendations.push({
          type: "missing_index",
          table: missing.table,
          columns: missing.columns,
          description: "Missing index for common query pattern",
          priority: "high",
          estimatedImprovement: 50,
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error("Failed to generate index recommendations", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find unused indexes
   * @param {Array} usageStats - Usage statistics
   * @returns {Promise<Array>} Unused indexes
   */
  async findUnusedIndexes(usageStats) {
    try {
      const unusedIndexes = usageStats.filter((stat) => stat.scanCount === 0);

      this.logger.debug("Found unused indexes", {
        count: unusedIndexes.length,
      });

      return unusedIndexes;
    } catch (error) {
      this.logger.error("Failed to find unused indexes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find duplicate indexes
   * @returns {Promise<Array>} Duplicate indexes
   */
  async findDuplicateIndexes() {
    try {
      const query = `
        SELECT 
          tablename,
          indexdef,
          COUNT(*) as count
        FROM pg_indexes
        GROUP BY tablename, indexdef
        HAVING COUNT(*) > 1
      `;

      const result = await this.db.execute(query);

      const duplicates = result.rows.map((row) => ({
        table: row.tablename,
        definition: row.indexdef,
        count: parseInt(row.count),
      }));

      this.logger.debug("Found duplicate indexes", {
        count: duplicates.length,
      });

      return duplicates;
    } catch (error) {
      this.logger.error("Failed to find duplicate indexes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find missing indexes
   * @returns {Promise<Array>} Missing indexes
   */
  async findMissingIndexes() {
    try {
      // This is a simplified implementation
      // In a real system, you would analyze query patterns to find missing indexes
      const missingIndexes = [
        {
          table: "tasks",
          columns: ["status", "priority"],
          description: "Composite index for status and priority queries",
        },
        {
          table: "queue_history",
          columns: ["workflow_type", "status"],
          description: "Composite index for workflow type and status queries",
        },
      ];

      this.logger.debug("Found missing indexes", {
        count: missingIndexes.length,
      });

      return missingIndexes;
    } catch (error) {
      this.logger.error("Failed to find missing indexes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule index maintenance
   * @param {string} indexName - Index name
   * @param {Object} schedule - Maintenance schedule
   */
  scheduleIndexMaintenance(indexName, schedule) {
    this.maintenanceSchedule.set(indexName, {
      ...schedule,
      lastMaintenance: null,
      nextMaintenance: new Date(Date.now() + schedule.interval),
    });

    this.logger.info("Index maintenance scheduled", { indexName, schedule });
  }

  /**
   * Perform index maintenance
   * @param {string} indexName - Index name
   * @returns {Promise<Object>} Maintenance result
   */
  async performIndexMaintenance(indexName) {
    try {
      this.logger.info("Performing index maintenance", { indexName });

      // Reindex the index
      const reindexSQL = `REINDEX INDEX ${indexName}`;
      await this.db.execute(reindexSQL);

      // Update maintenance schedule
      const schedule = this.maintenanceSchedule.get(indexName);
      if (schedule) {
        schedule.lastMaintenance = new Date();
        schedule.nextMaintenance = new Date(Date.now() + schedule.interval);
      }

      const result = {
        indexName,
        maintainedAt: new Date().toISOString(),
        status: "completed",
      };

      this.logger.info("Index maintenance completed", { indexName });

      return result;
    } catch (error) {
      this.logger.error("Index maintenance failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Get index statistics
   * @returns {Object} Index statistics
   */
  getIndexStats() {
    return {
      totalIndexes: this.indexCache.size,
      usageStats: Array.from(this.usageStats.values()),
      maintenanceSchedule: Array.from(this.maintenanceSchedule.values()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear index cache
   */
  clearCache() {
    this.indexCache.clear();
    this.usageStats.clear();
    this.maintenanceSchedule.clear();
    this.logger.info("Index cache cleared");
  }
}

module.exports = IndexManager;
