/**
 * ReleaseRepository - Repository for release data persistence
 * Handles database operations for release management
 */

const Logger = require('@logging/Logger');
const logger = new Logger('ReleaseRepository');

class ReleaseRepository {
  constructor(database) {
    this.database = database;
    this.logger = logger;
    this.tableName = 'releases';
  }

  /**
   * Create a new release record
   * @param {Object} releaseData - Release data
   * @returns {Promise<Object>} Created release record
   */
  async create(releaseData) {
    try {
      const query = `
        INSERT INTO ${this.tableName} (
          id, version, release_date, changelog, status, git_tag, 
          metadata, created_by, published_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        releaseData.id,
        releaseData.version,
        releaseData.release_date,
        releaseData.changelog,
        releaseData.status || 'draft',
        releaseData.git_tag,
        JSON.stringify(releaseData.metadata || {}),
        releaseData.created_by,
        releaseData.published_at,
        releaseData.archived_at
      ];

      await this.database.run(query, params);

      this.logger.info('Created release record', {
        id: releaseData.id,
        version: releaseData.version,
        status: releaseData.status
      });

      return await this.findById(releaseData.id);

    } catch (error) {
      this.logger.error('Error creating release record', {
        error: error.message,
        releaseData
      });
      throw error;
    }
  }

  /**
   * Find release by ID
   * @param {string} id - Release ID
   * @returns {Promise<Object|null>} Release record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.database.get(query, [id]);

      if (result) {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
      }

      return result;

    } catch (error) {
      this.logger.error('Error finding release by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Find release by version
   * @param {string} version - Version string
   * @returns {Promise<Object|null>} Release record or null
   */
  async findByVersion(version) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE version = ?`;
      const result = await this.database.get(query, [version]);

      if (result) {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
      }

      return result;

    } catch (error) {
      this.logger.error('Error finding release by version', {
        error: error.message,
        version
      });
      throw error;
    }
  }

  /**
   * Find releases with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object[]>} Release records
   */
  async find(filters = {}) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.createdBy) {
        conditions.push('created_by = ?');
        params.push(filters.createdBy);
      }

      if (filters.since) {
        conditions.push('release_date >= ?');
        params.push(filters.since);
      }

      if (filters.until) {
        conditions.push('release_date <= ?');
        params.push(filters.until);
      }

      if (filters.gitTag) {
        conditions.push('git_tag = ?');
        params.push(filters.gitTag);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Apply ordering
      const orderBy = filters.orderBy || 'release_date DESC';
      query += ` ORDER BY ${orderBy}`;

      // Apply limit
      if (filters.limit) {
        query += ` LIMIT ${filters.limit}`;
      }

      const results = await this.database.all(query, params);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        return result;
      });

    } catch (error) {
      this.logger.error('Error finding releases with filters', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get latest release
   * @returns {Promise<Object|null>} Latest release record or null
   */
  async getLatest() {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY release_date DESC LIMIT 1`;
      const result = await this.database.get(query);

      if (result) {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
      }

      return result;

    } catch (error) {
      this.logger.error('Error getting latest release', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get published releases
   * @returns {Promise<Object[]>} Published release records
   */
  async getPublished() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE status = 'published' ORDER BY release_date DESC`;
      const results = await this.database.all(query);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        return result;
      });

    } catch (error) {
      this.logger.error('Error getting published releases', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get draft releases
   * @returns {Promise<Object[]>} Draft release records
   */
  async getDrafts() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE status = 'draft' ORDER BY release_date DESC`;
      const results = await this.database.all(query);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        return result;
      });

    } catch (error) {
      this.logger.error('Error getting draft releases', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update release record
   * @param {string} id - Release ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated release record
   */
  async update(id, updateData) {
    try {
      const allowedFields = ['status', 'changelog', 'metadata', 'published_at', 'archived_at'];
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

      this.logger.info('Updated release record', {
        id,
        updatedFields: Object.keys(updateData)
      });

      return await this.findById(id);

    } catch (error) {
      this.logger.error('Error updating release record', {
        error: error.message,
        id,
        updateData
      });
      throw error;
    }
  }

  /**
   * Publish release
   * @param {string} id - Release ID
   * @returns {Promise<Object>} Updated release record
   */
  async publish(id) {
    try {
      const publishedAt = new Date().toISOString();
      
      const query = `
        UPDATE ${this.tableName} 
        SET status = 'published', published_at = ? 
        WHERE id = ?
      `;

      await this.database.run(query, [publishedAt, id]);

      this.logger.info('Published release', {
        id,
        publishedAt
      });

      return await this.findById(id);

    } catch (error) {
      this.logger.error('Error publishing release', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Archive release
   * @param {string} id - Release ID
   * @returns {Promise<Object>} Updated release record
   */
  async archive(id) {
    try {
      const archivedAt = new Date().toISOString();
      
      const query = `
        UPDATE ${this.tableName} 
        SET status = 'archived', archived_at = ? 
        WHERE id = ?
      `;

      await this.database.run(query, [archivedAt, id]);

      this.logger.info('Archived release', {
        id,
        archivedAt
      });

      return await this.findById(id);

    } catch (error) {
      this.logger.error('Error archiving release', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Delete release record
   * @param {string} id - Release ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.database.run(query, [id]);

      this.logger.info('Deleted release record', {
        id,
        changes: result.changes
      });

      return result.changes > 0;

    } catch (error) {
      this.logger.error('Error deleting release record', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get release statistics
   * @returns {Promise<Object>} Release statistics
   */
  async getStatistics() {
    try {
      const queries = [
        `SELECT COUNT(*) as total FROM ${this.tableName}`,
        `SELECT COUNT(*) as published FROM ${this.tableName} WHERE status = 'published'`,
        `SELECT COUNT(*) as draft FROM ${this.tableName} WHERE status = 'draft'`,
        `SELECT COUNT(*) as archived FROM ${this.tableName} WHERE status = 'archived'`,
        `SELECT MIN(release_date) as first_release FROM ${this.tableName}`,
        `SELECT MAX(release_date) as last_release FROM ${this.tableName}`
      ];

      const results = await Promise.all(queries.map(query => this.database.get(query)));

      return {
        total: results[0].total,
        published: results[1].published,
        draft: results[2].draft,
        archived: results[3].archived,
        firstRelease: results[4].first_release,
        lastRelease: results[5].last_release
      };

    } catch (error) {
      this.logger.error('Error getting release statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get releases by date range
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object[]>} Release records
   */
  async getByDateRange(startDate, endDate) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE release_date >= ? AND release_date <= ? 
        ORDER BY release_date DESC
      `;
      const results = await this.database.all(query, [startDate, endDate]);

      return results.map(result => {
        result.metadata = result.metadata ? JSON.parse(result.metadata) : {};
        return result;
      });

    } catch (error) {
      this.logger.error('Error getting releases by date range', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Check if release exists
   * @param {string} version - Version string
   * @returns {Promise<boolean>} True if exists
   */
  async exists(version) {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE version = ?`;
      const result = await this.database.get(query, [version]);
      return result.count > 0;

    } catch (error) {
      this.logger.error('Error checking if release exists', {
        error: error.message,
        version
      });
      throw error;
    }
  }

  /**
   * Get release count
   * @returns {Promise<number>} Total release count
   */
  async count() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const result = await this.database.get(query);
      return result.count;

    } catch (error) {
      this.logger.error('Error getting release count', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ReleaseRepository;
