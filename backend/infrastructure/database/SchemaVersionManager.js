/**
 * Schema Version Manager - Schema Versioning Implementation
 *
 * Provides schema versioning capabilities for database evolution
 * Tracks schema changes, validates migrations, and supports rollbacks
 */

const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const Logger = require("@logging/Logger");

class SchemaVersionManager {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger("SchemaVersionManager");
  }

  /**
   * Record a schema version
   * @param {string} version - Version identifier
   * @param {string} description - Description of the change
   * @param {string} migrationFile - Path to the migration file
   * @param {string} userId - User who applied the migration
   * @param {string} rollbackSql - SQL for rolling back the migration
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Version record ID
   */
  async recordSchemaVersion(
    version,
    description,
    migrationFile,
    userId = "system",
    rollbackSql = null,
    metadata = {},
  ) {
    try {
      // Calculate checksum of the migration file
      const checksum = await this.calculateFileChecksum(migrationFile);

      const sql = `
        INSERT INTO schema_versions (
          id, version, description, migration_file, checksum,
          applied_at, applied_by, rollback_sql, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const versionId = require("uuid").v4();
      await this.databaseConnection.execute(sql, [
        versionId,
        version,
        description,
        migrationFile,
        checksum,
        new Date().toISOString(),
        userId,
        rollbackSql,
        JSON.stringify(metadata),
      ]);

      this.logger.debug(`Schema version recorded: ${version}`);
      return versionId;
    } catch (error) {
      this.logger.error("Error recording schema version:", error);
      throw new Error(`Failed to record schema version: ${error.message}`);
    }
  }

  /**
   * Get all schema versions
   * @param {number} limit - Maximum number of versions to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of schema versions
   */
  async getSchemaVersions(limit = 100, offset = 0) {
    try {
      const sql = `
        SELECT id, version, description, migration_file, checksum,
               applied_at, applied_by, rollback_sql, metadata
        FROM schema_versions
        ORDER BY applied_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [limit, offset]);

      return rows.map((row) => ({
        id: row.id,
        version: row.version,
        description: row.description,
        migrationFile: row.migration_file,
        checksum: row.checksum,
        appliedAt: row.applied_at,
        appliedBy: row.applied_by,
        rollbackSql: row.rollback_sql,
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      this.logger.error("Error getting schema versions:", error);
      throw new Error(`Failed to get schema versions: ${error.message}`);
    }
  }

  /**
   * Get the current schema version
   * @returns {Promise<string|null>} Current version or null
   */
  async getCurrentSchemaVersion() {
    try {
      const sql = `
        SELECT version FROM schema_versions
        ORDER BY applied_at DESC
        LIMIT 1
      `;

      const rows = await this.databaseConnection.query(sql);
      return rows.length > 0 ? rows[0].version : null;
    } catch (error) {
      this.logger.error("Error getting current schema version:", error);
      throw new Error(`Failed to get current schema version: ${error.message}`);
    }
  }

  /**
   * Validate a schema version
   * @param {string} version - Version to validate
   * @param {string} validationType - Type of validation
   * @param {Object} result - Validation result
   * @param {string} userId - User performing the validation
   * @returns {Promise<string>} Validation record ID
   */
  async validateSchemaVersion(
    version,
    validationType,
    result,
    userId = "system",
  ) {
    try {
      const sql = `
        INSERT INTO schema_validations (
          id, version, validation_type, status, result,
          validated_at, validated_by, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const validationId = require("uuid").v4();
      const status = result.success ? "passed" : "failed";

      await this.databaseConnection.execute(sql, [
        validationId,
        version,
        validationType,
        status,
        JSON.stringify(result),
        new Date().toISOString(),
        userId,
        JSON.stringify({}),
      ]);

      this.logger.debug(
        `Schema validation recorded: ${version} - ${validationType} - ${status}`,
      );
      return validationId;
    } catch (error) {
      this.logger.error("Error validating schema version:", error);
      throw new Error(`Failed to validate schema version: ${error.message}`);
    }
  }

  /**
   * Get validation results for a schema version
   * @param {string} version - Version to get validations for
   * @returns {Promise<Array>} Array of validation results
   */
  async getSchemaValidations(version) {
    try {
      const sql = `
        SELECT id, version, validation_type, status, result,
               validated_at, validated_by, metadata
        FROM schema_validations
        WHERE version = ?
        ORDER BY validated_at DESC
      `;

      const rows = await this.databaseConnection.query(sql, [version]);

      return rows.map((row) => ({
        id: row.id,
        version: row.version,
        validationType: row.validation_type,
        status: row.status,
        result: JSON.parse(row.result),
        validatedAt: row.validated_at,
        validatedBy: row.validated_by,
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      this.logger.error("Error getting schema validations:", error);
      throw new Error(`Failed to get schema validations: ${error.message}`);
    }
  }

  /**
   * Rollback to a previous schema version
   * @param {string} targetVersion - Version to rollback to
   * @param {string} userId - User performing the rollback
   * @returns {Promise<boolean>} Success status
   */
  async rollbackToVersion(targetVersion, userId = "system") {
    try {
      // Get all versions after the target version
      const sql = `
        SELECT version, rollback_sql FROM schema_versions
        WHERE applied_at > (
          SELECT applied_at FROM schema_versions WHERE version = ?
        )
        ORDER BY applied_at DESC
      `;

      const rows = await this.databaseConnection.query(sql, [targetVersion]);

      // Execute rollback SQL for each version
      for (const row of rows) {
        if (row.rollback_sql) {
          await this.databaseConnection.execute(row.rollback_sql);
          this.logger.debug(`Rolled back version: ${row.version}`);
        }
      }

      // Record the rollback
      await this.recordSchemaVersion(
        `rollback-${Date.now()}`,
        `Rollback to version ${targetVersion}`,
        "rollback",
        userId,
        null,
        { targetVersion, rolledBackVersions: rows.map((r) => r.version) },
      );

      this.logger.debug(`Rollback completed to version: ${targetVersion}`);
      return true;
    } catch (error) {
      this.logger.error("Error rolling back schema version:", error);
      throw new Error(`Failed to rollback schema version: ${error.message}`);
    }
  }

  /**
   * Validate current schema integrity
   * @returns {Promise<Object>} Validation result
   */
  async validateSchemaIntegrity() {
    try {
      const result = {
        errors: [],
        warnings: [],
        checks: {},
      };

      // Check if all tables exist
      const tableCheck = await this.validateTablesExist();
      result.checks.tablesExist = tableCheck;

      // Check if all indexes exist
      const indexCheck = await this.validateIndexesExist();
      result.checks.indexesExist = indexCheck;

      // Check if all constraints exist
      const constraintCheck = await this.validateConstraintsExist();
      result.checks.constraintsExist = constraintCheck;

      // Check for orphaned records
      const orphanCheck = await this.validateNoOrphanedRecords();
      result.checks.noOrphanedRecords = orphanCheck;

      // Determine overall success
      result.success = Object.values(result.checks).every(
        (check) => check.success,
      );

      return result;
    } catch (error) {
      this.logger.error("Error validating schema integrity:", error);
      return {
       
        errors: [error.message],
        warnings: [],
        checks: {},
      };
    }
  }

  /**
   * Get schema statistics
   * @returns {Promise<Object>} Schema statistics
   */
  async getSchemaStatistics() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_versions,
          MIN(applied_at) as first_migration,
          MAX(applied_at) as last_migration,
          COUNT(DISTINCT applied_by) as unique_appliers
        FROM schema_versions
      `;

      const rows = await this.databaseConnection.query(sql);
      const stats = rows[0];

      // Get validation statistics
      const validationSql = `
        SELECT 
          COUNT(*) as total_validations,
          COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_validations,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_validations
        FROM schema_validations
      `;

      const validationRows = await this.databaseConnection.query(validationSql);
      const validationStats = validationRows[0];

      return {
        ...stats,
        ...validationStats,
      };
    } catch (error) {
      this.logger.error("Error getting schema statistics:", error);
      throw new Error(`Failed to get schema statistics: ${error.message}`);
    }
  }

  /**
   * Calculate file checksum
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} SHA-256 checksum
   */
  async calculateFileChecksum(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch (error) {
      this.logger.error("Error calculating file checksum:", error);
      throw new Error(`Failed to calculate file checksum: ${error.message}`);
    }
  }

  /**
   * Validate that all expected tables exist
   * @returns {Promise<Object>} Validation result
   */
  async validateTablesExist() {
    try {
      const expectedTables = [
        "tasks",
        "projects",
        "users",
        "analysis",
        "user_sessions",
        "queue_history",
        "workflow_type_detection",
        "ide_configurations",
        "playwright_configs",
        "project_interfaces",
        "event_store",
        "event_store_snapshots",
        "soft_delete_metadata",
        "schema_versions",
        "schema_validations",
        "audit_trail",
        "audit_trail_summary",
      ];

      const sql = `
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;

      const rows = await this.databaseConnection.query(sql);
      const existingTables = rows.map((row) => row.table_name);

      const missingTables = expectedTables.filter(
        (table) => !existingTables.includes(table),
      );

      return {
        success: missingTables.length === 0,
        missingTables,
        existingTables: existingTables.length,
      };
    } catch (error) {
      return {
       
        error: error.message,
      };
    }
  }

  /**
   * Validate that all expected indexes exist
   * @returns {Promise<Object>} Validation result
   */
  async validateIndexesExist() {
    try {
      const sql = `
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
      `;

      const rows = await this.databaseConnection.query(sql);
      const existingIndexes = rows.map((row) => row.indexname);

      return {
        totalIndexes: existingIndexes.length,
        indexes: existingIndexes,
      };
    } catch (error) {
      return {
       
        error: error.message,
      };
    }
  }

  /**
   * Validate that all expected constraints exist
   * @returns {Promise<Object>} Validation result
   */
  async validateConstraintsExist() {
    try {
      const sql = `
        SELECT constraint_name, table_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
      `;

      const rows = await this.databaseConnection.query(sql);
      const constraints = rows.map((row) => ({
        name: row.constraint_name,
        table: row.table_name,
        type: row.constraint_type,
      }));

      return {
        totalConstraints: constraints.length,
        constraints,
      };
    } catch (error) {
      return {
       
        error: error.message,
      };
    }
  }

  /**
   * Validate that there are no orphaned records
   * @returns {Promise<Object>} Validation result
   */
  async validateNoOrphanedRecords() {
    try {
      const checks = [];

      // Check for orphaned task sessions
      const taskSessionCheck = await this.databaseConnection.query(`
        SELECT COUNT(*) as count FROM task_sessions ts
        LEFT JOIN tasks t ON ts.task_id = t.id
        WHERE t.id IS NULL
      `);
      checks.push({
        name: "orphaned_task_sessions",
        count: taskSessionCheck[0].count,
        success: taskSessionCheck[0].count === 0,
      });

      // Check for orphaned analysis steps
      const analysisStepCheck = await this.databaseConnection.query(`
        SELECT COUNT(*) as count FROM analysis_steps ast
        LEFT JOIN analysis a ON ast.analysis_id = a.id
        WHERE a.id IS NULL
      `);
      checks.push({
        name: "orphaned_analysis_steps",
        count: analysisStepCheck[0].count,
        success: analysisStepCheck[0].count === 0,
      });

      const hasOrphans = checks.some((check) => !check.success);

      return {
        success: !hasOrphans,
        checks,
        totalOrphans: checks.reduce((sum, check) => sum + check.count, 0),
      };
    } catch (error) {
      return {
       
        error: error.message,
      };
    }
  }
}

module.exports = SchemaVersionManager;
