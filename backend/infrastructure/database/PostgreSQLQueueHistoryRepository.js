/**
 * PostgreSQLQueueHistoryRepository - PostgreSQL implementation for queue history operations
 * Provides comprehensive CRUD operations with query optimization and connection management
 */

const Logger = require('@logging/Logger');
const { v4: uuidv4 } = require('uuid');

class PostgreSQLQueueHistoryRepository {
  constructor(databaseConnection) {
    this.logger = new Logger('PostgreSQLQueueHistoryRepository');
    this.db = databaseConnection;
    this.tableName = 'queue_history';
    
    if (!this.db) {
      throw new Error('Database connection is required');
    }
    
    this.logger.info('PostgreSQLQueueHistoryRepository initialized');
  }

  /**
   * Initialize the queue_history table
   */
  async initTable() {
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          workflow_type TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          steps_data JSONB,
          execution_time_ms INTEGER,
          error_message TEXT,
          created_by TEXT NOT NULL DEFAULT 'me',
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `;

      await this.db.execute(createTableSQL);
      
      // Create indexes for better performance
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_workflow_id ON ${this.tableName} (workflow_id)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_workflow_type ON ${this.tableName} (workflow_type)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName} (status)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName} (created_at)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON ${this.tableName} (created_by)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_completed_at ON ${this.tableName} (completed_at)`);
      
      this.logger.info('Queue history table initialized with indexes');
    } catch (error) {
      this.logger.error('Failed to initialize queue history table', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new history item
   * @param {Object} historyData - History data to create
   * @returns {Promise<Object>} Created history item
   */
  async create(historyData) {
    try {
      this.logger.debug('Creating history item', { workflowId: historyData.workflowId });

      const id = uuidv4();
      const now = new Date().toISOString();

      const sql = `
        INSERT INTO ${this.tableName} (
          id, workflow_id, workflow_type, status, created_at, completed_at,
          metadata, steps_data, execution_time_ms, error_message, created_by, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const params = [
        id,
        historyData.workflowId,
        historyData.workflowType,
        historyData.status,
        historyData.createdAt || now,
        historyData.completedAt || null,
        JSON.stringify(historyData.metadata || {}),
        JSON.stringify(historyData.stepsData || []),
        historyData.executionTimeMs || null,
        historyData.errorMessage || null,
        historyData.createdBy || 'me',
        now
      ];

      await this.db.execute(sql, params);

      const createdItem = await this.findById(id);
      
      this.logger.info('History item created', { 
        id, 
        workflowId: historyData.workflowId 
      });

      return createdItem;

    } catch (error) {
      this.logger.error('Failed to create history item', { 
        workflowId: historyData?.workflowId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find history items with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} History items with pagination metadata
   */
  async find(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      this.logger.debug('Finding history items', { filters, pagination });

      const { whereClause, params } = this.buildWhereClause(filters);
      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await this.db.query(countSql, params);
      const totalItems = parseInt(countResult[0]?.total) || 0;

      // Get items with pagination
      const sql = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const queryParams = [...params, pagination.limit, offset];
      const items = await this.db.query(sql, queryParams);

      // Parse JSON fields
      const parsedItems = items.map(item => this.parseHistoryItem(item));

      const result = {
        items: parsedItems,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalItems: totalItems,
          totalPages: Math.ceil(totalItems / pagination.limit),
          hasNext: pagination.page < Math.ceil(totalItems / pagination.limit),
          hasPrev: pagination.page > 1
        }
      };

      this.logger.debug('History items found', { 
        itemCount: parsedItems.length,
        totalItems: totalItems 
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to find history items', { 
        filters, 
        pagination, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find history item by ID
   * @param {string} id - History item ID
   * @returns {Promise<Object|null>} History item or null
   */
  async findById(id) {
    try {
      this.logger.debug('Finding history item by ID', { id });

      const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const items = await this.db.query(sql, [id]);

      if (items.length === 0) {
        return null;
      }

      const item = this.parseHistoryItem(items[0]);
      
      this.logger.debug('History item found by ID', { id });

      return item;

    } catch (error) {
      this.logger.error('Failed to find history item by ID', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update history item
   * @param {string} id - History item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated history item or null
   */
  async update(id, updates) {
    try {
      this.logger.debug('Updating history item', { id, updates });

      const now = new Date().toISOString();
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      // Build update fields
      if (updates.workflowType !== undefined) {
        updateFields.push(`workflow_type = $${paramIndex}`);
        params.push(updates.workflowType);
        paramIndex++;
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(updates.status);
        paramIndex++;
      }

      if (updates.completedAt !== undefined) {
        updateFields.push(`completed_at = $${paramIndex}`);
        params.push(updates.completedAt);
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (updates.stepsData !== undefined) {
        updateFields.push(`steps_data = $${paramIndex}`);
        params.push(JSON.stringify(updates.stepsData));
        paramIndex++;
      }

      if (updates.executionTimeMs !== undefined) {
        updateFields.push(`execution_time_ms = $${paramIndex}`);
        params.push(updates.executionTimeMs);
        paramIndex++;
      }

      if (updates.errorMessage !== undefined) {
        updateFields.push(`error_message = $${paramIndex}`);
        params.push(updates.errorMessage);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return await this.findById(id);
      }

      updateFields.push(`updated_at = $${paramIndex}`);
      params.push(now);
      paramIndex++;
      params.push(id);

      const sql = `
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await this.db.execute(sql, params);

      const updatedItem = await this.findById(id);
      
      this.logger.info('History item updated', { id });

      return updatedItem;

    } catch (error) {
      this.logger.error('Failed to update history item', { 
        id, 
        updates, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete history items older than specified date
   * @param {Date} cutoffDate - Cutoff date for deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOlderThan(cutoffDate) {
    try {
      this.logger.info('Deleting history items older than', { cutoffDate });

      // Get IDs of items to delete
      const selectSql = `
        SELECT id FROM ${this.tableName} 
        WHERE created_at < $1
      `;
      
      const itemsToDelete = await this.db.query(selectSql, [cutoffDate.toISOString()]);
      const deletedIds = itemsToDelete.map(item => item.id);

      if (deletedIds.length === 0) {
        return { deletedCount: 0, deletedIds: [] };
      }

      // Delete items
      const placeholders = deletedIds.map((_, index) => `$${index + 1}`).join(',');
      const deleteSql = `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`;
      await this.db.execute(deleteSql, deletedIds);

      this.logger.info('History items deleted', { 
        deletedCount: deletedIds.length 
      });

      return {
        deletedCount: deletedIds.length,
        deletedIds: deletedIds
      };

    } catch (error) {
      this.logger.error('Failed to delete old history items', { 
        cutoffDate, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get history statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    try {
      this.logger.debug('Getting history statistics', { filters });

      const { whereClause, params } = this.buildWhereClause(filters);

      const sql = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
          AVG(execution_time_ms) as avg_execution_time,
          MIN(created_at) as earliest_item,
          MAX(created_at) as latest_item,
          COUNT(DISTINCT workflow_type) as unique_types,
          COUNT(DISTINCT created_by) as unique_users
        FROM ${this.tableName} 
        ${whereClause}
      `;

      const result = await this.db.query(sql, params);
      const stats = result[0] || {};

      // Get type distribution
      const typeSql = `
        SELECT workflow_type, COUNT(*) as count
        FROM ${this.tableName} 
        ${whereClause}
        GROUP BY workflow_type
        ORDER BY count DESC
      `;

      const typeResults = await this.db.query(typeSql, params);
      const typeDistribution = typeResults.reduce((acc, row) => {
        acc[row.workflow_type] = parseInt(row.count);
        return acc;
      }, {});

      const statistics = {
        totalItems: parseInt(stats.total_items) || 0,
        completedCount: parseInt(stats.completed_count) || 0,
        failedCount: parseInt(stats.failed_count) || 0,
        cancelledCount: parseInt(stats.cancelled_count) || 0,
        avgExecutionTime: parseFloat(stats.avg_execution_time) || 0,
        earliestItem: stats.earliest_item,
        latestItem: stats.latest_item,
        uniqueTypes: parseInt(stats.unique_types) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0,
        typeDistribution: typeDistribution,
        successRate: stats.total_items > 0 ? (parseInt(stats.completed_count) / parseInt(stats.total_items)) * 100 : 0
      };

      this.logger.debug('History statistics retrieved', { statistics });

      return statistics;

    } catch (error) {
      this.logger.error('Failed to get history statistics', { 
        filters, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Build WHERE clause for filtering
   * @param {Object} filters - Filter criteria
   * @returns {Object} WHERE clause and parameters
   */
  buildWhereClause(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.type) {
      conditions.push(`workflow_type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(workflow_id LIKE $${paramIndex} OR error_message LIKE $${paramIndex + 1})`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    if (filters.createdBy) {
      conditions.push(`created_by = $${paramIndex}`);
      params.push(filters.createdBy);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }

  /**
   * Parse history item from database row
   * @param {Object} row - Database row
   * @returns {Object} Parsed history item
   */
  parseHistoryItem(row) {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowType: row.workflow_type,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      metadata: row.metadata || {},
      stepsData: row.steps_data || [],
      executionTimeMs: row.execution_time_ms,
      errorMessage: row.error_message,
      createdBy: row.created_by,
      updatedAt: row.updated_at
    };
  }

  /**
   * Search history items by text
   * @param {string} searchTerm - Search term
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Search results
   */
  async search(searchTerm, pagination = { page: 1, limit: 20 }) {
    try {
      this.logger.debug('Searching history items', { searchTerm, pagination });

      const filters = { search: searchTerm };
      return await this.find(filters, pagination);

    } catch (error) {
      this.logger.error('Failed to search history items', { 
        searchTerm, 
        pagination, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get history items by workflow type
   * @param {string} type - Workflow type
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Filtered results
   */
  async findByType(type, pagination = { page: 1, limit: 20 }) {
    try {
      this.logger.debug('Finding history items by type', { type, pagination });

      const filters = { type };
      return await this.find(filters, pagination);

    } catch (error) {
      this.logger.error('Failed to find history items by type', { 
        type, 
        pagination, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get history items by status
   * @param {string} status - Workflow status
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Filtered results
   */
  async findByStatus(status, pagination = { page: 1, limit: 20 }) {
    try {
      this.logger.debug('Finding history items by status', { status, pagination });

      const filters = { status };
      return await this.find(filters, pagination);

    } catch (error) {
      this.logger.error('Failed to find history items by status', { 
        status, 
        pagination, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = PostgreSQLQueueHistoryRepository; 