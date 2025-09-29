/**
 * IDE Configuration Repository
 * Handles persistence operations for IDE configurations
 * Created: 2025-09-29T19:51:09.000Z
 */

const Logger = require('@logging/Logger');
const IDEConfiguration = require('@domain/entities/IDEConfiguration');

const logger = new Logger('IDEConfigurationRepository');

class IDEConfigurationRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Create a new IDE configuration
   * @param {IDEConfiguration} config IDE configuration to create
   * @returns {Promise<IDEConfiguration>} Created configuration
   */
  async create(config) {
    try {
      const validation = config.validate();
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const dbData = config.toDatabase();
      const query = `
        INSERT INTO ide_configurations (
          user_id, ide_type, executable_path, version, build_number,
          installation_path, is_default, is_active, last_used, usage_count,
          port_range_start, port_range_end, startup_options, metadata,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `;

      const values = [
        dbData.user_id, dbData.ide_type, dbData.executable_path, dbData.version,
        dbData.build_number, dbData.installation_path, dbData.is_default,
        dbData.is_active, dbData.last_used, dbData.usage_count,
        dbData.port_range_start, dbData.port_range_end, dbData.startup_options,
        dbData.metadata, dbData.created_at, dbData.updated_at
      ];

      const result = await this.database.query(query, values);
      logger.info('Created IDE configuration:', result[0]);
      
      return IDEConfiguration.fromDatabase(result[0]);
    } catch (error) {
      logger.error('Error creating IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Get IDE configuration by ID
   * @param {string} id Configuration ID
   * @returns {Promise<IDEConfiguration|null>} Configuration or null if not found
   */
  async findById(id) {
    try {
      const query = 'SELECT * FROM ide_configurations WHERE id = ?';
      const result = await this.database.query(query, [id]);
      
      if (result.length === 0) {
        return null;
      }

      return IDEConfiguration.fromDatabase(result[0]);
    } catch (error) {
      logger.error('Error finding IDE configuration by ID:', error);
      throw error;
    }
  }

  /**
   * Get all IDE configurations for a user
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration[]>} Array of configurations
   */
  async findByUserId(userId = 'me') {
    try {
      const query = 'SELECT * FROM ide_configurations WHERE user_id = ? ORDER BY created_at DESC';
      const result = await this.database.query(query, [userId]);
      
      return result.map(row => IDEConfiguration.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding IDE configurations by user ID:', error);
      throw error;
    }
  }

  /**
   * Get active IDE configurations for a user
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration[]>} Array of active configurations
   */
  async findActiveByUserId(userId = 'me') {
    try {
      const query = 'SELECT * FROM ide_configurations WHERE user_id = ? AND is_active = true ORDER BY is_default DESC, usage_count DESC';
      const result = await this.database.query(query, [userId]);
      
      return result.map(row => IDEConfiguration.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding active IDE configurations:', error);
      throw error;
    }
  }

  /**
   * Get default IDE configuration for a type
   * @param {string} ideType IDE type
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration|null>} Default configuration or null
   */
  async findDefaultByType(ideType, userId = 'me') {
    try {
      const query = 'SELECT * FROM ide_configurations WHERE user_id = ? AND ide_type = ? AND is_default = true AND is_active = true';
      const result = await this.database.query(query, [userId, ideType]);
      
      if (result.length === 0) {
        return null;
      }

      return IDEConfiguration.fromDatabase(result[0]);
    } catch (error) {
      logger.error('Error finding default IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Update IDE configuration
   * @param {string} id Configuration ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<IDEConfiguration|null>} Updated configuration or null
   */
  async update(id, updates) {
    try {
      const config = await this.findById(id);
      if (!config) {
        return null;
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (config.hasOwnProperty(key)) {
          config[key] = updates[key];
        }
      });

      config.updatedAt = new Date().toISOString();

      const validation = config.validate();
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const dbData = config.toDatabase();
      const query = `
        UPDATE ide_configurations SET
          executable_path = ?, version = ?, build_number = ?, installation_path = ?,
          is_default = ?, is_active = ?, last_used = ?, usage_count = ?,
          port_range_start = ?, port_range_end = ?, startup_options = ?,
          metadata = ?, updated_at = ?
        WHERE id = ?
      `;

      const values = [
        dbData.executable_path, dbData.version, dbData.build_number,
        dbData.installation_path, dbData.is_default, dbData.is_active,
        dbData.last_used, dbData.usage_count, dbData.port_range_start,
        dbData.port_range_end, dbData.startup_options, dbData.metadata,
        dbData.updated_at, id
      ];

      await this.database.query(query, values);
      logger.info('Updated IDE configuration:', id);
      
      return config;
    } catch (error) {
      logger.error('Error updating IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Delete IDE configuration
   * @param {string} id Configuration ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const query = 'DELETE FROM ide_configurations WHERE id = ?';
      const result = await this.database.query(query, [id]);
      
      const deleted = result.affectedRows > 0;
      if (deleted) {
        logger.info('Deleted IDE configuration:', id);
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Update usage statistics for a configuration
   * @param {string} id Configuration ID
   * @returns {Promise<boolean>} True if updated
   */
  async updateUsage(id) {
    try {
      const query = `
        UPDATE ide_configurations SET
          usage_count = usage_count + 1,
          last_used = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const now = new Date().toISOString();
      const result = await this.database.query(query, [now, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating IDE configuration usage:', error);
      throw error;
    }
  }

  /**
   * Set default configuration for an IDE type
   * @param {string} ideType IDE type
   * @param {string} configId Configuration ID to set as default
   * @param {string} userId User ID
   * @returns {Promise<boolean>} True if updated
   */
  async setDefault(ideType, configId, userId = 'me') {
    try {
      // First, unset all defaults for this IDE type
      await this.database.query(
        'UPDATE ide_configurations SET is_default = false WHERE user_id = ? AND ide_type = ?',
        [userId, ideType]
      );

      // Then set the specified configuration as default
      const result = await this.database.query(
        'UPDATE ide_configurations SET is_default = true WHERE id = ? AND user_id = ?',
        [configId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error setting default IDE configuration:', error);
      throw error;
    }
  }
}

module.exports = IDEConfigurationRepository;
