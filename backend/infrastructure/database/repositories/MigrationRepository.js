/**
 * MigrationRepository - Database operations for migration infrastructure
 * 
 * This class provides comprehensive database operations for migration
 * tracking, metrics, rollback, and analytics.
 */
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class MigrationRepository {
  /**
   * Create a new migration repository
   * @param {Object} options - Repository options
   */
  constructor(options = {}) {
    this.pool = options.pool || new Pool(options.databaseConfig);
    this.tablePrefix = options.tablePrefix || '';
    
    this.tables = {
      tracking: `${this.tablePrefix}migration_tracking`,
      phases: `${this.tablePrefix}migration_phases`,
      steps: `${this.tablePrefix}migration_steps`,
      metrics: `${this.tablePrefix}migration_metrics`,
      performanceSnapshots: `${this.tablePrefix}migration_performance_snapshots`,
      performanceAlerts: `${this.tablePrefix}migration_performance_alerts`,
      analytics: `${this.tablePrefix}migration_analytics`,
      rollback: `${this.tablePrefix}migration_rollback`,
      backup: `${this.tablePrefix}migration_backup`,
      rollbackHistory: `${this.tablePrefix}migration_rollback_history`
    };
  }

  /**
   * Initialize repository
   */
  async initialize() {
    try {
      // Test database connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('MigrationRepository initialized successfully');
      return true;
    } catch (error) {
      console.error('MigrationRepository initialization failed:', error);
      throw new Error(`Repository initialization failed: ${error.message}`);
    }
  }

  // ===== MIGRATION TRACKING OPERATIONS =====

  /**
   * Create migration tracking record
   * @param {Object} migrationData - Migration data
   * @returns {Object} Created migration record
   */
  async createMigration(migrationData) {
    try {
      const {
        migrationId,
        migrationName,
        migrationDescription,
        riskLevel = 'medium',
        dependencies = [],
        configuration = {},
        metadata = {}
      } = migrationData;

      const query = `
        INSERT INTO ${this.tables.tracking} (
          migration_id, migration_name, migration_description, risk_level,
          dependencies, configuration, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        migrationId,
        migrationName,
        migrationDescription,
        riskLevel,
        JSON.stringify(dependencies),
        JSON.stringify(configuration),
        JSON.stringify(metadata)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to create migration:', error);
      throw new Error(`Migration creation failed: ${error.message}`);
    }
  }

  /**
   * Get migration by ID
   * @param {string} migrationId - Migration ID
   * @returns {Object} Migration record
   */
  async getMigration(migrationId) {
    try {
      const query = `SELECT * FROM ${this.tables.tracking} WHERE migration_id = $1`;
      const result = await this.pool.query(query, [migrationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get migration:', error);
      throw new Error(`Migration retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update migration status
   * @param {string} migrationId - Migration ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated migration record
   */
  async updateMigration(migrationId, updateData) {
    try {
      const {
        status,
        startTime,
        endTime,
        duration,
        currentPhase,
        currentStep,
        progressPercentage,
        totalPhases,
        completedPhases,
        totalSteps,
        completedSteps,
        errorCount,
        warningCount,
        rollbackCount
      } = updateData;

      const query = `
        UPDATE ${this.tables.tracking}
        SET 
          status = COALESCE($2, status),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          duration = COALESCE($5, duration),
          current_phase = COALESCE($6, current_phase),
          current_step = COALESCE($7, current_step),
          progress_percentage = COALESCE($8, progress_percentage),
          total_phases = COALESCE($9, total_phases),
          completed_phases = COALESCE($10, completed_phases),
          total_steps = COALESCE($11, total_steps),
          completed_steps = COALESCE($12, completed_steps),
          error_count = COALESCE($13, error_count),
          warning_count = COALESCE($14, warning_count),
          rollback_count = COALESCE($15, rollback_count),
          updated_at = CURRENT_TIMESTAMP
        WHERE migration_id = $1
        RETURNING *
      `;

      const values = [
        migrationId,
        status,
        startTime,
        endTime,
        duration,
        currentPhase,
        currentStep,
        progressPercentage,
        totalPhases,
        completedPhases,
        totalSteps,
        completedSteps,
        errorCount,
        warningCount,
        rollbackCount
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Failed to update migration:', error);
      throw new Error(`Migration update failed: ${error.message}`);
    }
  }

  /**
   * Get all migrations with optional filters
   * @param {Object} filters - Filter options
   * @returns {Array} Migration records
   */
  async getMigrations(filters = {}) {
    try {
      const {
        status,
        riskLevel,
        limit = 100,
        offset = 0,
        orderBy = 'created_at',
        orderDirection = 'DESC'
      } = filters;

      let query = `SELECT * FROM ${this.tables.tracking}`;
      const values = [];
      let valueIndex = 1;

      // Add filters
      const conditions = [];
      if (status) {
        conditions.push(`status = $${valueIndex++}`);
        values.push(status);
      }
      if (riskLevel) {
        conditions.push(`risk_level = $${valueIndex++}`);
        values.push(riskLevel);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ordering and pagination
      query += ` ORDER BY ${orderBy} ${orderDirection} LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
      values.push(limit, offset);

      const result = await this.pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Failed to get migrations:', error);
      throw new Error(`Migrations retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get migration summary
   * @param {string} migrationId - Migration ID
   * @returns {Object} Migration summary
   */
  async getMigrationSummary(migrationId) {
    try {
      const query = `SELECT * FROM migration_summary WHERE migration_id = $1`;
      const result = await this.pool.query(query, [migrationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get migration summary:', error);
      throw new Error(`Migration summary retrieval failed: ${error.message}`);
    }
  }

  // ===== MIGRATION PHASES OPERATIONS =====

  /**
   * Create migration phase
   * @param {Object} phaseData - Phase data
   * @returns {Object} Created phase record
   */
  async createPhase(phaseData) {
    try {
      const {
        migrationId,
        phaseId,
        phaseName,
        phaseDescription,
        dependencies = [],
        rollbackSteps = []
      } = phaseData;

      const query = `
        INSERT INTO ${this.tables.phases} (
          migration_id, phase_id, phase_name, phase_description,
          dependencies, rollback_steps
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        migrationId,
        phaseId,
        phaseName,
        phaseDescription,
        JSON.stringify(dependencies),
        JSON.stringify(rollbackSteps)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to create phase:', error);
      throw new Error(`Phase creation failed: ${error.message}`);
    }
  }

  /**
   * Update phase status
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated phase record
   */
  async updatePhase(migrationId, phaseId, updateData) {
    try {
      const {
        status,
        startTime,
        endTime,
        duration,
        totalSteps,
        completedSteps,
        errorCount,
        warningCount,
        progressPercentage,
        result
      } = updateData;

      const query = `
        UPDATE ${this.tables.phases}
        SET 
          status = COALESCE($3, status),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          duration = COALESCE($6, duration),
          total_steps = COALESCE($7, total_steps),
          completed_steps = COALESCE($8, completed_steps),
          error_count = COALESCE($9, error_count),
          warning_count = COALESCE($10, warning_count),
          progress_percentage = COALESCE($11, progress_percentage),
          result = COALESCE($12, result),
          updated_at = CURRENT_TIMESTAMP
        WHERE migration_id = $1 AND phase_id = $2
        RETURNING *
      `;

      const values = [
        migrationId,
        phaseId,
        status,
        startTime,
        endTime,
        duration,
        totalSteps,
        completedSteps,
        errorCount,
        warningCount,
        progressPercentage,
        result ? JSON.stringify(result) : null
      ];

      const queryResult = await this.pool.query(query, values);
      return queryResult.rows[0] || null;

    } catch (error) {
      console.error('Failed to update phase:', error);
      throw new Error(`Phase update failed: ${error.message}`);
    }
  }

  /**
   * Get phases for migration
   * @param {string} migrationId - Migration ID
   * @returns {Array} Phase records
   */
  async getPhases(migrationId) {
    try {
      const query = `SELECT * FROM ${this.tables.phases} WHERE migration_id = $1 ORDER BY created_at`;
      const result = await this.pool.query(query, [migrationId]);
      return result.rows;
    } catch (error) {
      console.error('Failed to get phases:', error);
      throw new Error(`Phases retrieval failed: ${error.message}`);
    }
  }

  // ===== MIGRATION STEPS OPERATIONS =====

  /**
   * Create migration step
   * @param {Object} stepData - Step data
   * @returns {Object} Created step record
   */
  async createStep(stepData) {
    try {
      const {
        migrationId,
        phaseId,
        stepId,
        stepName,
        stepType,
        configuration = {}
      } = stepData;

      const query = `
        INSERT INTO ${this.tables.steps} (
          migration_id, phase_id, step_id, step_name, step_type, configuration
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        migrationId,
        phaseId,
        stepId,
        stepName,
        stepType,
        JSON.stringify(configuration)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to create step:', error);
      throw new Error(`Step creation failed: ${error.message}`);
    }
  }

  /**
   * Update step status
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {string} stepId - Step ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated step record
   */
  async updateStep(migrationId, phaseId, stepId, updateData) {
    try {
      const {
        status,
        startTime,
        endTime,
        duration,
        result,
        errorMessage,
        retryCount
      } = updateData;

      const query = `
        UPDATE ${this.tables.steps}
        SET 
          status = COALESCE($4, status),
          start_time = COALESCE($5, start_time),
          end_time = COALESCE($6, end_time),
          duration = COALESCE($7, duration),
          result = COALESCE($8, result),
          error_message = COALESCE($9, error_message),
          retry_count = COALESCE($10, retry_count),
          updated_at = CURRENT_TIMESTAMP
        WHERE migration_id = $1 AND phase_id = $2 AND step_id = $3
        RETURNING *
      `;

      const values = [
        migrationId,
        phaseId,
        stepId,
        status,
        startTime,
        endTime,
        duration,
        result ? JSON.stringify(result) : null,
        errorMessage,
        retryCount
      ];

      const queryResult = await this.pool.query(query, values);
      return queryResult.rows[0] || null;

    } catch (error) {
      console.error('Failed to update step:', error);
      throw new Error(`Step update failed: ${error.message}`);
    }
  }

  /**
   * Get steps for phase
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @returns {Array} Step records
   */
  async getSteps(migrationId, phaseId) {
    try {
      const query = `SELECT * FROM ${this.tables.steps} WHERE migration_id = $1 AND phase_id = $2 ORDER BY created_at`;
      const result = await this.pool.query(query, [migrationId, phaseId]);
      return result.rows;
    } catch (error) {
      console.error('Failed to get steps:', error);
      throw new Error(`Steps retrieval failed: ${error.message}`);
    }
  }

  // ===== MIGRATION METRICS OPERATIONS =====

  /**
   * Store migration metric
   * @param {Object} metricData - Metric data
   * @returns {Object} Created metric record
   */
  async storeMetric(metricData) {
    try {
      const {
        migrationId,
        collectionId,
        metricType,
        metricName,
        metricValue,
        metricUnit,
        timestamp,
        phaseId,
        stepId,
        context = {}
      } = metricData;

      const query = `
        INSERT INTO ${this.tables.metrics} (
          migration_id, collection_id, metric_type, metric_name, metric_value,
          metric_unit, timestamp, phase_id, step_id, context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        migrationId,
        collectionId,
        metricType,
        metricName,
        metricValue,
        metricUnit,
        timestamp,
        phaseId,
        stepId,
        JSON.stringify(context)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to store metric:', error);
      throw new Error(`Metric storage failed: ${error.message}`);
    }
  }

  /**
   * Store performance snapshot
   * @param {Object} snapshotData - Snapshot data
   * @returns {Object} Created snapshot record
   */
  async storePerformanceSnapshot(snapshotData) {
    try {
      const {
        migrationId,
        collectionId,
        snapshotTimestamp,
        executionTime,
        memoryUsage,
        cpuUsage,
        databaseQueries,
        databaseQueryTime,
        fileOperations,
        fileOperationTime,
        apiCalls,
        apiCallTime,
        errors,
        warnings,
        metadata = {}
      } = snapshotData;

      const query = `
        INSERT INTO ${this.tables.performanceSnapshots} (
          migration_id, collection_id, snapshot_timestamp, execution_time,
          memory_usage, cpu_usage, database_queries, database_query_time,
          file_operations, file_operation_time, api_calls, api_call_time,
          errors, warnings, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        migrationId,
        collectionId,
        snapshotTimestamp,
        executionTime,
        memoryUsage,
        cpuUsage,
        databaseQueries,
        databaseQueryTime,
        fileOperations,
        fileOperationTime,
        apiCalls,
        apiCallTime,
        errors,
        warnings,
        JSON.stringify(metadata)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to store performance snapshot:', error);
      throw new Error(`Performance snapshot storage failed: ${error.message}`);
    }
  }

  /**
   * Store performance alert
   * @param {Object} alertData - Alert data
   * @returns {Object} Created alert record
   */
  async storePerformanceAlert(alertData) {
    try {
      const {
        migrationId,
        collectionId,
        alertType,
        metricName,
        metricValue,
        thresholdValue,
        severity,
        message,
        timestamp,
        context = {}
      } = alertData;

      const query = `
        INSERT INTO ${this.tables.performanceAlerts} (
          migration_id, collection_id, alert_type, metric_name, metric_value,
          threshold_value, severity, message, timestamp, context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        migrationId,
        collectionId,
        alertType,
        metricName,
        metricValue,
        thresholdValue,
        severity,
        message,
        timestamp,
        JSON.stringify(context)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to store performance alert:', error);
      throw new Error(`Performance alert storage failed: ${error.message}`);
    }
  }

  // ===== MIGRATION ROLLBACK OPERATIONS =====

  /**
   * Create rollback record
   * @param {Object} rollbackData - Rollback data
   * @returns {Object} Created rollback record
   */
  async createRollback(rollbackData) {
    try {
      const {
        migrationId,
        rollbackId,
        rollbackType,
        triggerReason,
        rollbackData: data,
        rollbackSteps = [],
        metadata = {}
      } = rollbackData;

      const query = `
        INSERT INTO ${this.tables.rollback} (
          migration_id, rollback_id, rollback_type, trigger_reason,
          rollback_data, rollback_steps, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        migrationId,
        rollbackId,
        rollbackType,
        triggerReason,
        JSON.stringify(data),
        JSON.stringify(rollbackSteps),
        JSON.stringify(metadata)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to create rollback:', error);
      throw new Error(`Rollback creation failed: ${error.message}`);
    }
  }

  /**
   * Update rollback status
   * @param {string} rollbackId - Rollback ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated rollback record
   */
  async updateRollback(rollbackId, updateData) {
    try {
      const {
        status,
        startTime,
        endTime,
        duration,
        result,
        errorMessage,
        retryCount
      } = updateData;

      const query = `
        UPDATE ${this.tables.rollback}
        SET 
          status = COALESCE($2, status),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          duration = COALESCE($5, duration),
          result = COALESCE($6, result),
          error_message = COALESCE($7, error_message),
          retry_count = COALESCE($8, retry_count),
          updated_at = CURRENT_TIMESTAMP
        WHERE rollback_id = $1
        RETURNING *
      `;

      const values = [
        rollbackId,
        status,
        startTime,
        endTime,
        duration,
        result ? JSON.stringify(result) : null,
        errorMessage,
        retryCount
      ];

      const queryResult = await this.pool.query(query, values);
      return queryResult.rows[0] || null;

    } catch (error) {
      console.error('Failed to update rollback:', error);
      throw new Error(`Rollback update failed: ${error.message}`);
    }
  }

  /**
   * Get rollback by ID
   * @param {string} rollbackId - Rollback ID
   * @returns {Object} Rollback record
   */
  async getRollback(rollbackId) {
    try {
      const query = `SELECT * FROM ${this.tables.rollback} WHERE rollback_id = $1`;
      const result = await this.pool.query(query, [rollbackId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get rollback:', error);
      throw new Error(`Rollback retrieval failed: ${error.message}`);
    }
  }

  // ===== MIGRATION BACKUP OPERATIONS =====

  /**
   * Create backup record
   * @param {Object} backupData - Backup data
   * @returns {Object} Created backup record
   */
  async createBackup(backupData) {
    try {
      const {
        migrationId,
        backupId,
        backupType,
        backupData: data,
        backupSize,
        checksum,
        compressionType = 'none',
        encryptionType = 'none',
        backupPath,
        retentionDays = 30,
        metadata = {}
      } = backupData;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retentionDays);

      const query = `
        INSERT INTO ${this.tables.backup} (
          migration_id, backup_id, backup_type, backup_data, backup_size,
          checksum, compression_type, encryption_type, backup_path,
          retention_days, expires_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        migrationId,
        backupId,
        backupType,
        JSON.stringify(data),
        backupSize,
        checksum,
        compressionType,
        encryptionType,
        backupPath,
        retentionDays,
        expiresAt,
        JSON.stringify(metadata)
      ];

      const queryResult = await this.pool.query(query, values);
      return queryResult.rows[0];

    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Get backup by ID
   * @param {string} backupId - Backup ID
   * @returns {Object} Backup record
   */
  async getBackup(backupId) {
    try {
      const query = `SELECT * FROM ${this.tables.backup} WHERE backup_id = $1`;
      const result = await this.pool.query(query, [backupId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get backup:', error);
      throw new Error(`Backup retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update backup validation status
   * @param {string} backupId - Backup ID
   * @param {boolean} isValid - Validation status
   * @param {string} validationChecksum - Validation checksum
   * @returns {Object} Updated backup record
   */
  async updateBackupValidation(backupId, isValid, validationChecksum) {
    try {
      const query = `
        UPDATE ${this.tables.backup}
        SET 
          is_valid = $2,
          validation_checksum = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE backup_id = $1
        RETURNING *
      `;

      const result = await this.pool.query(query, [backupId, isValid, validationChecksum]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Failed to update backup validation:', error);
      throw new Error(`Backup validation update failed: ${error.message}`);
    }
  }

  // ===== STATISTICS AND ANALYTICS =====

  /**
   * Get migration statistics
   * @returns {Object} Migration statistics
   */
  async getMigrationStatistics() {
    try {
      const query = `SELECT * FROM get_migration_statistics()`;
      const result = await this.pool.query(query);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Failed to get migration statistics:', error);
      throw new Error(`Migration statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  async getPerformanceStatistics() {
    try {
      const query = `SELECT * FROM get_migration_performance_statistics()`;
      const result = await this.pool.query(query);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Failed to get performance statistics:', error);
      throw new Error(`Performance statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get rollback statistics
   * @returns {Object} Rollback statistics
   */
  async getRollbackStatistics() {
    try {
      const query = `SELECT * FROM get_migration_rollback_statistics()`;
      const result = await this.pool.query(query);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Failed to get rollback statistics:', error);
      throw new Error(`Rollback statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Calculate performance analytics
   * @param {string} migrationId - Migration ID
   * @param {string} analyticsType - Analytics type
   * @returns {Object} Analytics result
   */
  async calculatePerformanceAnalytics(migrationId, analyticsType = 'performance_summary') {
    try {
      const query = `SELECT calculate_migration_performance_analytics($1, $2) as analytics`;
      const result = await this.pool.query(query, [migrationId, analyticsType]);
      return result.rows[0]?.analytics || {};
    } catch (error) {
      console.error('Failed to calculate performance analytics:', error);
      throw new Error(`Performance analytics calculation failed: ${error.message}`);
    }
  }

  // ===== CLEANUP OPERATIONS =====

  /**
   * Cleanup expired backups
   * @returns {number} Number of deleted backups
   */
  async cleanupExpiredBackups() {
    try {
      const query = `SELECT cleanup_expired_backups() as deleted_count`;
      const result = await this.pool.query(query);
      return result.rows[0]?.deleted_count || 0;
    } catch (error) {
      console.error('Failed to cleanup expired backups:', error);
      throw new Error(`Backup cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleanup old metrics data
   * @param {number} daysToKeep - Number of days to keep
   * @returns {number} Number of deleted records
   */
  async cleanupOldMetrics(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const tables = [
        this.tables.metrics,
        this.tables.performanceSnapshots,
        this.tables.performanceAlerts,
        this.tables.analytics
      ];

      let totalDeleted = 0;

      for (const table of tables) {
        const query = `DELETE FROM ${table} WHERE created_at < $1`;
        const result = await this.pool.query(query, [cutoffDate]);
        totalDeleted += result.rowCount;
      }

      return totalDeleted;

    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
      throw new Error(`Metrics cleanup failed: ${error.message}`);
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      await this.pool.end();
      console.log('MigrationRepository connection closed');
    } catch (error) {
      console.error('Failed to close repository connection:', error);
    }
  }
}

module.exports = MigrationRepository; 