/**
 * Audit Trail Manager - Audit Trail Pattern Implementation
 *
 * Provides audit trail capabilities for tracking database changes
 * Records all INSERT, UPDATE, DELETE, and SOFT_DELETE operations
 */

const { v4: uuidv4 } = require("uuid");
const Logger = require("@logging/Logger");

class AuditTrailManager {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger("AuditTrailManager");
  }

  /**
   * Record an audit trail entry
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @param {string} operation - Operation type (INSERT, UPDATE, DELETE, SOFT_DELETE)
   * @param {Object} oldValues - Previous values (for UPDATE/DELETE)
   * @param {Object} newValues - New values (for INSERT/UPDATE)
   * @param {string} userId - User performing the operation
   * @param {string} sessionId - Session ID (optional)
   * @param {string} ipAddress - IP address (optional)
   * @param {string} userAgent - User agent (optional)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Audit trail entry ID
   */
  async recordAuditTrail(
    tableName,
    recordId,
    operation,
    oldValues = null,
    newValues = null,
    userId = "system",
    sessionId = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
  ) {
    try {
      // Calculate changed fields
      const changedFields = this.calculateChangedFields(oldValues, newValues);

      const sql = `
        INSERT INTO audit_trail (
          id, table_name, record_id, operation, old_values, new_values,
          changed_fields, user_id, session_id, ip_address, user_agent,
          timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const auditId = uuidv4();
      await this.databaseConnection.execute(sql, [
        auditId,
        tableName,
        recordId,
        operation,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        JSON.stringify(changedFields),
        userId,
        sessionId,
        ipAddress,
        userAgent,
        new Date().toISOString(),
        JSON.stringify(metadata),
      ]);

      // Update audit trail summary
      await this.updateAuditTrailSummary(
        tableName,
        recordId,
        operation,
        userId,
      );

      this.logger.debug(
        `Audit trail recorded: ${operation} on ${tableName}:${recordId}`,
      );
      return auditId;
    } catch (error) {
      this.logger.error("Error recording audit trail:", error);
      throw new Error(`Failed to record audit trail: ${error.message}`);
    }
  }

  /**
   * Get audit trail entries for a record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @param {number} limit - Maximum number of entries to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of audit trail entries
   */
  async getAuditTrailForRecord(tableName, recordId, limit = 100, offset = 0) {
    try {
      const sql = `
        SELECT id, table_name, record_id, operation, old_values, new_values,
               changed_fields, user_id, session_id, ip_address, user_agent,
               timestamp, metadata
        FROM audit_trail
        WHERE table_name = ? AND record_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [
        tableName,
        recordId,
        limit,
        offset,
      ]);

      return rows.map((row) => ({
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        operation: row.operation,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        changedFields: JSON.parse(row.changed_fields),
        userId: row.user_id,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      this.logger.error("Error getting audit trail for record:", error);
      throw new Error(`Failed to get audit trail for record: ${error.message}`);
    }
  }

  /**
   * Get audit trail entries by user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of entries to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of audit trail entries
   */
  async getAuditTrailByUser(userId, limit = 100, offset = 0) {
    try {
      const sql = `
        SELECT id, table_name, record_id, operation, old_values, new_values,
               changed_fields, user_id, session_id, ip_address, user_agent,
               timestamp, metadata
        FROM audit_trail
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [
        userId,
        limit,
        offset,
      ]);

      return rows.map((row) => ({
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        operation: row.operation,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        changedFields: JSON.parse(row.changed_fields),
        userId: row.user_id,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      this.logger.error("Error getting audit trail by user:", error);
      throw new Error(`Failed to get audit trail by user: ${error.message}`);
    }
  }

  /**
   * Get audit trail entries by operation type
   * @param {string} operation - Operation type
   * @param {number} limit - Maximum number of entries to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of audit trail entries
   */
  async getAuditTrailByOperation(operation, limit = 100, offset = 0) {
    try {
      const sql = `
        SELECT id, table_name, record_id, operation, old_values, new_values,
               changed_fields, user_id, session_id, ip_address, user_agent,
               timestamp, metadata
        FROM audit_trail
        WHERE operation = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [
        operation,
        limit,
        offset,
      ]);

      return rows.map((row) => ({
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        operation: row.operation,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        changedFields: JSON.parse(row.changed_fields),
        userId: row.user_id,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      this.logger.error("Error getting audit trail by operation:", error);
      throw new Error(
        `Failed to get audit trail by operation: ${error.message}`,
      );
    }
  }

  /**
   * Get audit trail summary for a record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Promise<Object|null>} Audit trail summary or null
   */
  async getAuditTrailSummary(tableName, recordId) {
    try {
      const sql = `
        SELECT id, table_name, record_id, total_changes, first_change,
               last_change, last_changed_by, change_types, metadata
        FROM audit_trail_summary
        WHERE table_name = ? AND record_id = ?
      `;

      const rows = await this.databaseConnection.query(sql, [
        tableName,
        recordId,
      ]);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        totalChanges: row.total_changes,
        firstChange: row.first_change,
        lastChange: row.last_change,
        lastChangedBy: row.last_changed_by,
        changeTypes: row.change_types,
        metadata: JSON.parse(row.metadata),
      };
    } catch (error) {
      this.logger.error("Error getting audit trail summary:", error);
      throw new Error(`Failed to get audit trail summary: ${error.message}`);
    }
  }

  /**
   * Get audit trail statistics
   * @returns {Promise<Object>} Audit trail statistics
   */
  async getAuditTrailStatistics() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT table_name) as unique_tables,
          COUNT(DISTINCT record_id) as unique_records,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT operation) as unique_operations,
          MIN(timestamp) as first_entry,
          MAX(timestamp) as last_entry
        FROM audit_trail
      `;

      const rows = await this.databaseConnection.query(sql);
      const stats = rows[0];

      // Get operation breakdown
      const operationSql = `
        SELECT operation, COUNT(*) as count
        FROM audit_trail
        GROUP BY operation
        ORDER BY count DESC
      `;

      const operationRows = await this.databaseConnection.query(operationSql);
      const operationBreakdown = operationRows.reduce((acc, row) => {
        acc[row.operation] = row.count;
        return acc;
      }, {});

      // Get table breakdown
      const tableSql = `
        SELECT table_name, COUNT(*) as count
        FROM audit_trail
        GROUP BY table_name
        ORDER BY count DESC
      `;

      const tableRows = await this.databaseConnection.query(tableSql);
      const tableBreakdown = tableRows.reduce((acc, row) => {
        acc[row.table_name] = row.count;
        return acc;
      }, {});

      return {
        ...stats,
        operationBreakdown,
        tableBreakdown,
      };
    } catch (error) {
      this.logger.error("Error getting audit trail statistics:", error);
      throw new Error(`Failed to get audit trail statistics: ${error.message}`);
    }
  }

  /**
   * Clean up old audit trail entries
   * @param {Date} beforeDate - Delete entries before this date
   * @param {number} batchSize - Batch size for deletion
   * @returns {Promise<number>} Number of entries deleted
   */
  async cleanupOldAuditTrailEntries(beforeDate, batchSize = 1000) {
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        const sql = `
          DELETE FROM audit_trail
          WHERE timestamp < ?
          AND id IN (
            SELECT id FROM audit_trail
            WHERE timestamp < ?
            LIMIT ?
          )
        `;

        const result = await this.databaseConnection.execute(sql, [
          beforeDate.toISOString(),
          beforeDate.toISOString(),
          batchSize,
        ]);

        const deletedCount = result.affectedRows || 0;
        totalDeleted += deletedCount;
        hasMore = deletedCount === batchSize;

        if (deletedCount > 0) {
          this.logger.debug(`Deleted ${deletedCount} old audit trail entries`);
        }
      }

      this.logger.debug(
        `Total deleted ${totalDeleted} old audit trail entries`,
      );
      return totalDeleted;
    } catch (error) {
      this.logger.error("Error cleaning up old audit trail entries:", error);
      throw new Error(
        `Failed to clean up old audit trail entries: ${error.message}`,
      );
    }
  }

  /**
   * Update audit trail summary
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @param {string} operation - Operation type
   * @param {string} userId - User performing the operation
   * @returns {Promise<void>}
   */
  async updateAuditTrailSummary(tableName, recordId, operation, userId) {
    try {
      // Check if summary exists
      const existingSummary = await this.getAuditTrailSummary(
        tableName,
        recordId,
      );

      if (existingSummary) {
        // Update existing summary
        const sql = `
          UPDATE audit_trail_summary
          SET total_changes = total_changes + 1,
              last_change = ?,
              last_changed_by = ?,
              change_types = array_append(change_types, ?)
          WHERE table_name = ? AND record_id = ?
        `;

        await this.databaseConnection.execute(sql, [
          new Date().toISOString(),
          userId,
          operation,
          tableName,
          recordId,
        ]);
      } else {
        // Create new summary
        const sql = `
          INSERT INTO audit_trail_summary (
            id, table_name, record_id, total_changes, first_change,
            last_change, last_changed_by, change_types, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const now = new Date().toISOString();
        await this.databaseConnection.execute(sql, [
          uuidv4(),
          tableName,
          recordId,
          1,
          now,
          now,
          userId,
          JSON.stringify([operation]),
          JSON.stringify({}),
        ]);
      }
    } catch (error) {
      this.logger.error("Error updating audit trail summary:", error);
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Calculate changed fields between old and new values
   * @param {Object} oldValues - Previous values
   * @param {Object} newValues - New values
   * @returns {Array} Array of changed field names
   */
  calculateChangedFields(oldValues, newValues) {
    if (!oldValues && !newValues) return [];
    if (!oldValues) return Object.keys(newValues || {});
    if (!newValues) return Object.keys(oldValues || {});

    const changedFields = [];
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue !== newValue) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Generate audit trail report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Audit trail report
   */
  async generateAuditTrailReport(filters = {}) {
    try {
      const {
        tableName = null,
        userId = null,
        operation = null,
        startDate = null,
        endDate = null,
        limit = 1000,
      } = filters;

      let sql = `
        SELECT id, table_name, record_id, operation, old_values, new_values,
               changed_fields, user_id, session_id, ip_address, user_agent,
               timestamp, metadata
        FROM audit_trail
        WHERE 1=1
      `;

      const params = [];

      if (tableName) {
        sql += " AND table_name = ?";
        params.push(tableName);
      }

      if (userId) {
        sql += " AND user_id = ?";
        params.push(userId);
      }

      if (operation) {
        sql += " AND operation = ?";
        params.push(operation);
      }

      if (startDate) {
        sql += " AND timestamp >= ?";
        params.push(startDate.toISOString());
      }

      if (endDate) {
        sql += " AND timestamp <= ?";
        params.push(endDate.toISOString());
      }

      sql += " ORDER BY timestamp DESC LIMIT ?";
      params.push(limit);

      const rows = await this.databaseConnection.query(sql, params);

      const report = {
        filters,
        totalEntries: rows.length,
        entries: rows.map((row) => ({
          id: row.id,
          tableName: row.table_name,
          recordId: row.record_id,
          operation: row.operation,
          oldValues: row.old_values ? JSON.parse(row.old_values) : null,
          newValues: row.new_values ? JSON.parse(row.new_values) : null,
          changedFields: JSON.parse(row.changed_fields),
          userId: row.user_id,
          sessionId: row.session_id,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          timestamp: row.timestamp,
          metadata: JSON.parse(row.metadata),
        })),
        generatedAt: new Date().toISOString(),
      };

      return report;
    } catch (error) {
      this.logger.error("Error generating audit trail report:", error);
      throw new Error(
        `Failed to generate audit trail report: ${error.message}`,
      );
    }
  }
}

module.exports = AuditTrailManager;
