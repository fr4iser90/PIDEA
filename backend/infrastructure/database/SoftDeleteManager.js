/**
 * Soft Delete Manager - Soft Delete Pattern Implementation
 * 
 * Provides soft delete capabilities for database records
 * Allows recovery of deleted records and maintains audit trail
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');

class SoftDeleteManager {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('SoftDeleteManager');
  }

  /**
   * Soft delete a record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record to delete
   * @param {string} userId - User performing the deletion
   * @param {string} reason - Reason for deletion
   * @param {Object} metadata - Additional metadata
   * @param {Date} expiresAt - Expiration date for recovery (optional)
   * @returns {Promise<string>} Recovery token
   */
  async softDelete(tableName, recordId, userId = 'system', reason = null, metadata = {}, expiresAt = null) {
    try {
      // Validate table name
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Check if record exists and is not already soft deleted
      const existingRecord = await this.getRecord(tableName, recordId);
      if (!existingRecord) {
        throw new Error(`Record not found: ${tableName}:${recordId}`);
      }

      if (existingRecord.is_deleted) {
        throw new Error(`Record already soft deleted: ${tableName}:${recordId}`);
      }

      // Generate recovery token
      const recoveryToken = uuidv4();

      // Update the record with soft delete information
      const updateSql = `
        UPDATE ${tableName}
        SET is_deleted = true,
            deleted_at = ?,
            deleted_by = ?
        WHERE id = ?
      `;

      await this.databaseConnection.execute(updateSql, [
        new Date().toISOString(),
        userId,
        recordId
      ]);

      // Create soft delete metadata
      const metadataSql = `
        INSERT INTO soft_delete_metadata (
          id, table_name, record_id, deleted_at, deleted_by,
          reason, metadata, recovery_token, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.databaseConnection.execute(metadataSql, [
        uuidv4(),
        tableName,
        recordId,
        new Date().toISOString(),
        userId,
        reason,
        JSON.stringify(metadata),
        recoveryToken,
        expiresAt ? expiresAt.toISOString() : null
      ]);

      this.logger.debug(`Soft deleted record: ${tableName}:${recordId}`);
      return recoveryToken;

    } catch (error) {
      this.logger.error('Error soft deleting record:', error);
      throw new Error(`Failed to soft delete record: ${error.message}`);
    }
  }

  /**
   * Recover a soft deleted record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record to recover
   * @param {string} recoveryToken - Recovery token
   * @param {string} userId - User performing the recovery
   * @returns {Promise<boolean>} Success status
   */
  async recover(tableName, recordId, recoveryToken, userId = 'system') {
    try {
      // Validate table name
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Get soft delete metadata
      const metadataSql = `
        SELECT * FROM soft_delete_metadata
        WHERE table_name = ? AND record_id = ? AND recovery_token = ?
      `;

      const metadataRows = await this.databaseConnection.query(metadataSql, [
        tableName, recordId, recoveryToken
      ]);

      if (metadataRows.length === 0) {
        throw new Error(`Invalid recovery token for ${tableName}:${recordId}`);
      }

      const metadata = metadataRows[0];

      // Check if recovery has expired
      if (metadata.expires_at && new Date(metadata.expires_at) < new Date()) {
        throw new Error(`Recovery token expired for ${tableName}:${recordId}`);
      }

      // Update the record to remove soft delete information
      const updateSql = `
        UPDATE ${tableName}
        SET is_deleted = false,
            deleted_at = NULL,
            deleted_by = NULL
        WHERE id = ?
      `;

      await this.databaseConnection.execute(updateSql, [recordId]);

      // Remove soft delete metadata
      const deleteMetadataSql = `
        DELETE FROM soft_delete_metadata
        WHERE table_name = ? AND record_id = ? AND recovery_token = ?
      `;

      await this.databaseConnection.execute(deleteMetadataSql, [
        tableName, recordId, recoveryToken
      ]);

      this.logger.debug(`Recovered record: ${tableName}:${recordId}`);
      return true;

    } catch (error) {
      this.logger.error('Error recovering record:', error);
      throw new Error(`Failed to recover record: ${error.message}`);
    }
  }

  /**
   * Permanently delete a soft deleted record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record to permanently delete
   * @param {string} userId - User performing the permanent deletion
   * @returns {Promise<boolean>} Success status
   */
  async permanentDelete(tableName, recordId, userId = 'system') {
    try {
      // Validate table name
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Check if record is soft deleted
      const existingRecord = await this.getRecord(tableName, recordId);
      if (!existingRecord || !existingRecord.is_deleted) {
        throw new Error(`Record not soft deleted: ${tableName}:${recordId}`);
      }

      // Permanently delete the record
      const deleteSql = `DELETE FROM ${tableName} WHERE id = ?`;
      await this.databaseConnection.execute(deleteSql, [recordId]);

      // Remove soft delete metadata
      const deleteMetadataSql = `
        DELETE FROM soft_delete_metadata
        WHERE table_name = ? AND record_id = ?
      `;

      await this.databaseConnection.execute(deleteMetadataSql, [tableName, recordId]);

      this.logger.debug(`Permanently deleted record: ${tableName}:${recordId}`);
      return true;

    } catch (error) {
      this.logger.error('Error permanently deleting record:', error);
      throw new Error(`Failed to permanently delete record: ${error.message}`);
    }
  }

  /**
   * Get soft deleted records for a table
   * @param {string} tableName - Name of the table
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of soft deleted records
   */
  async getSoftDeletedRecords(tableName, limit = 100, offset = 0) {
    try {
      // Validate table name
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const sql = `
        SELECT t.*, sdm.deleted_at, sdm.deleted_by, sdm.reason,
               sdm.recovery_token, sdm.expires_at
        FROM ${tableName} t
        LEFT JOIN soft_delete_metadata sdm ON t.id = sdm.record_id AND sdm.table_name = ?
        WHERE t.is_deleted = true
        ORDER BY sdm.deleted_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [tableName, limit, offset]);
      return rows;

    } catch (error) {
      this.logger.error('Error getting soft deleted records:', error);
      throw new Error(`Failed to get soft deleted records: ${error.message}`);
    }
  }

  /**
   * Get soft delete metadata for a record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Promise<Object|null>} Soft delete metadata or null
   */
  async getSoftDeleteMetadata(tableName, recordId) {
    try {
      const sql = `
        SELECT * FROM soft_delete_metadata
        WHERE table_name = ? AND record_id = ?
      `;

      const rows = await this.databaseConnection.query(sql, [tableName, recordId]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        deletedAt: row.deleted_at,
        deletedBy: row.deleted_by,
        reason: row.reason,
        metadata: JSON.parse(row.metadata),
        recoveryToken: row.recovery_token,
        expiresAt: row.expires_at
      };

    } catch (error) {
      this.logger.error('Error getting soft delete metadata:', error);
      throw new Error(`Failed to get soft delete metadata: ${error.message}`);
    }
  }

  /**
   * Clean up expired soft deleted records
   * @param {string} tableName - Name of the table (optional, null for all tables)
   * @param {Date} beforeDate - Delete records deleted before this date
   * @returns {Promise<number>} Number of records cleaned up
   */
  async cleanupExpiredRecords(tableName = null, beforeDate = null) {
    try {
      let sql = `
        SELECT sdm.table_name, sdm.record_id
        FROM soft_delete_metadata sdm
        WHERE sdm.expires_at IS NOT NULL AND sdm.expires_at < ?
      `;

      const params = [beforeDate ? beforeDate.toISOString() : new Date().toISOString()];

      if (tableName) {
        sql += ' AND sdm.table_name = ?';
        params.push(tableName);
      }

      const rows = await this.databaseConnection.query(sql, params);
      let cleanedCount = 0;

      for (const row of rows) {
        try {
          await this.permanentDelete(row.table_name, row.record_id, 'system');
          cleanedCount++;
        } catch (error) {
          this.logger.warn(`Failed to clean up expired record: ${row.table_name}:${row.record_id}`, error);
        }
      }

      this.logger.debug(`Cleaned up ${cleanedCount} expired soft deleted records`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('Error cleaning up expired records:', error);
      throw new Error(`Failed to clean up expired records: ${error.message}`);
    }
  }

  /**
   * Get soft delete statistics
   * @returns {Promise<Object>} Soft delete statistics
   */
  async getSoftDeleteStatistics() {
    try {
      const sql = `
        SELECT 
          table_name,
          COUNT(*) as total_soft_deleted,
          COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired_count,
          MIN(deleted_at) as first_deletion,
          MAX(deleted_at) as last_deletion
        FROM soft_delete_metadata
        GROUP BY table_name
        ORDER BY table_name
      `;

      const rows = await this.databaseConnection.query(sql);
      return rows;

    } catch (error) {
      this.logger.error('Error getting soft delete statistics:', error);
      throw new Error(`Failed to get soft delete statistics: ${error.message}`);
    }
  }

  /**
   * Check if a record is soft deleted
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Promise<boolean>} True if soft deleted
   */
  async isSoftDeleted(tableName, recordId) {
    try {
      const record = await this.getRecord(tableName, recordId);
      return record ? record.is_deleted : false;

    } catch (error) {
      this.logger.error('Error checking soft delete status:', error);
      throw new Error(`Failed to check soft delete status: ${error.message}`);
    }
  }

  /**
   * Get a record from the database
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Promise<Object|null>} Record or null
   */
  async getRecord(tableName, recordId) {
    try {
      const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
      const rows = await this.databaseConnection.query(sql, [recordId]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      this.logger.error('Error getting record:', error);
      throw new Error(`Failed to get record: ${error.message}`);
    }
  }

  /**
   * Validate table name
   * @param {string} tableName - Table name to validate
   * @returns {boolean} True if valid
   */
  isValidTableName(tableName) {
    const allowedTables = [
      'tasks', 'projects', 'users', 'analysis', 'user_sessions',
      'queue_history', 'workflow_type_detection', 'ide_configurations',
      'playwright_configs', 'project_interfaces'
    ];
    
    return allowedTables.includes(tableName);
  }
}

module.exports = SoftDeleteManager;
