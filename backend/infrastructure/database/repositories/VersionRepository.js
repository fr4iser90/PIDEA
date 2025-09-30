/**
 * VersionRepository - Repository for version data persistence
 * Handles database operations for version management
 */

const Logger = require('@logging/Logger');
const logger = new Logger('VersionRepository');

class VersionRepository {
  constructor(database) {
    this.database = database;
    this.logger = logger;
    this.tableName = 'versions';
  }

  /**
   * Create a new version record
   * @param {Object} versionData - Version data
   * @returns {Promise<Object>} Created version record
   */
  async create(versionData) {
    try {
      const query = `
        INSERT INTO ${this.tableName} (
          id, version, previous_version, bump_type, task_id, 
          created_at, metadata, created_by, git_commit_hash, package_files
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        versionData.id,
        versionData.version,
        versionData.previous_version,
        versionData.bump_type,
        versionData.task_id,
        versionData.created_at,
        JSON.stringify(versionData.metadata || {}),
        versionData.created_by,
        versionData.git_commit_hash,
        versionData.package_files
      ];

      await this.database.run(query, params);

      this.logger.info('Created version record', {
        id: versionData.id,
        version: versionData.version,
        bumpType: versionData.bump_type
      });

      return await this.findById(versionData.id);

    } catch (error) {
      this.logger.error('Error creating version record', {
        error: error.message,
        versionData
      });
      throw error;
    }
  }

  /**
   * Find version by ID
   * @param {string} id - Version ID
   * @returns {Promise<Object|null>} Version record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.database.get(query, [id]);

      if (result) {
        // Parse JSON fields
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
      }

      return result;

    } catch (error) {
      this.logger.error('Error finding version by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Find versions by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object[]>} Version records
   */
  async findByTaskId(taskId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE task_id = ? ORDER BY created_at DESC`;
      const results = await this.database.all(query, [taskId]);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
        return result;
      });

    } catch (error) {
      this.logger.error('Error finding versions by task ID', {
        error: error.message,
        taskId
      });
      throw error;
    }
  }

  /**
   * Find versions with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object[]>} Version records
   */
  async find(filters = {}) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.taskId) {
        conditions.push('task_id = ?');
        params.push(filters.taskId);
      }

      if (filters.bumpType) {
        conditions.push('bump_type = ?');
        params.push(filters.bumpType);
      }

      if (filters.createdBy) {
        conditions.push('created_by = ?');
        params.push(filters.createdBy);
      }

      if (filters.since) {
        conditions.push('created_at >= ?');
        params.push(filters.since);
      }

      if (filters.until) {
        conditions.push('created_at <= ?');
        params.push(filters.until);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Apply ordering
      const orderBy = filters.orderBy || 'created_at DESC';
      query += ` ORDER BY ${orderBy}`;

      // Apply limit
      if (filters.limit) {
        query += ` LIMIT ${filters.limit}`;
      }

      const results = await this.database.all(query, params);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
        return result;
      });

    } catch (error) {
      this.logger.error('Error finding versions with filters', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get latest version
   * @returns {Promise<Object|null>} Latest version record or null
   */
  async getLatest() {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT 1`;
      const result = await this.database.get(query);

      if (result) {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
      }

      return result;

    } catch (error) {
      this.logger.error('Error getting latest version', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get version statistics
   * @returns {Promise<Object>} Version statistics
   */
  async getStatistics() {
    try {
      const queries = [
        `SELECT COUNT(*) as total FROM ${this.tableName}`,
        `SELECT COUNT(*) as major FROM ${this.tableName} WHERE bump_type = 'major'`,
        `SELECT COUNT(*) as minor FROM ${this.tableName} WHERE bump_type = 'minor'`,
        `SELECT COUNT(*) as patch FROM ${this.tableName} WHERE bump_type = 'patch'`,
        `SELECT MIN(created_at) as first_version FROM ${this.tableName}`,
        `SELECT MAX(created_at) as last_version FROM ${this.tableName}`
      ];

      const results = await Promise.all(queries.map(query => this.database.get(query)));

      return {
        total: results[0].total,
        major: results[1].major,
        minor: results[2].minor,
        patch: results[3].patch,
        firstVersion: results[4].first_version,
        lastVersion: results[5].last_version
      };

    } catch (error) {
      this.logger.error('Error getting version statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update version record
   * @param {string} id - Version ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated version record
   */
  async update(id, updateData) {
    try {
      const allowedFields = ['metadata', 'git_commit_hash', 'package_files'];
      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          params.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;
      params.push(id);

      await this.database.run(query, params);

      this.logger.info('Updated version record', {
        id,
        updatedFields: Object.keys(updateData)
      });

      return await this.findById(id);

    } catch (error) {
      this.logger.error('Error updating version record', {
        error: error.message,
        id,
        updateData
      });
      throw error;
    }
  }

  /**
   * Delete version record
   * @param {string} id - Version ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.database.run(query, [id]);

      this.logger.info('Deleted version record', {
        id,
        changes: result.changes
      });

      return result.changes > 0;

    } catch (error) {
      this.logger.error('Error deleting version record', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get versions by date range
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object[]>} Version records
   */
  async getByDateRange(startDate, endDate) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE created_at >= ? AND created_at <= ? 
        ORDER BY created_at DESC
      `;
      const results = await this.database.all(query, [startDate, endDate]);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
        return result;
      });

    } catch (error) {
      this.logger.error('Error getting versions by date range', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get versions by bump type
   * @param {string} bumpType - Bump type (major, minor, patch)
   * @returns {Promise<Object[]>} Version records
   */
  async getByBumpType(bumpType) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE bump_type = ? ORDER BY created_at DESC`;
      const results = await this.database.all(query, [bumpType]);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        result.package_files = result.package_files ? JSON.parse(result.package_files) : [];
        return result;
      });

    } catch (error) {
      this.logger.error('Error getting versions by bump type', {
        error: error.message,
        bumpType
      });
      throw error;
    }
  }

  /**
   * Check if version exists
   * @param {string} version - Version string
   * @returns {Promise<boolean>} True if exists
   */
  async exists(version) {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE version = ?`;
      const result = await this.database.get(query, [version]);
      return result.count > 0;

    } catch (error) {
      this.logger.error('Error checking if version exists', {
        error: error.message,
        version
      });
      throw error;
    }
  }

  /**
   * Get version count
   * @returns {Promise<number>} Total version count
   */
  async count() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const result = await this.database.get(query);
      return result.count;

    } catch (error) {
      this.logger.error('Error getting version count', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = VersionRepository;
