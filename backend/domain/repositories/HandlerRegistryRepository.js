/**
 * HandlerRegistryRepository
 * Repository interface and implementation for handler registry persistence
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Interface for handler registry repository
 */
class HandlerRegistryRepository {
  /**
   * Register handler
   * @param {Object} handler - Handler data
   * @returns {Promise<Object>} Registered handler
   */
  async registerHandler(handler) {
    throw new Error('registerHandler method must be implemented');
  }

  /**
   * Get handler by type
   * @param {string} handlerType - Handler type
   * @returns {Promise<Object|null>} Handler or null
   */
  async getHandlerByType(handlerType) {
    throw new Error('getHandlerByType method must be implemented');
  }

  /**
   * Update handler
   * @param {string} handlerType - Handler type
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated handler
   */
  async updateHandler(handlerType, updates) {
    throw new Error('updateHandler method must be implemented');
  }

  /**
   * Get all handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Handlers
   */
  async getAllHandlers(options = {}) {
    throw new Error('getAllHandlers method must be implemented');
  }

  /**
   * Get active handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Active handlers
   */
  async getActiveHandlers(options = {}) {
    throw new Error('getActiveHandlers method must be implemented');
  }

  /**
   * Get default handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Default handlers
   */
  async getDefaultHandlers(options = {}) {
    throw new Error('getDefaultHandlers method must be implemented');
  }

  /**
   * Get best handler for type
   * @param {string} handlerType - Handler type
   * @returns {Promise<Object|null>} Best handler or null
   */
  async getBestHandler(handlerType) {
    throw new Error('getBestHandler method must be implemented');
  }

  /**
   * Update handler statistics
   * @param {string} handlerType - Handler type
   * @param {Object} statistics - Statistics data
   * @returns {Promise<Object>} Updated handler
   */
  async updateHandlerStatistics(handlerType, statistics) {
    throw new Error('updateHandlerStatistics method must be implemented');
  }

  /**
   * Record handler usage
   * @param {Object} usage - Usage data
   * @returns {Promise<Object>} Recorded usage
   */
  async recordHandlerUsage(usage) {
    throw new Error('recordHandlerUsage method must be implemented');
  }

  /**
   * Get handler usage history
   * @param {string} handlerType - Handler type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Usage history
   */
  async getHandlerUsageHistory(handlerType, options = {}) {
    throw new Error('getHandlerUsageHistory method must be implemented');
  }

  /**
   * Get handler performance summary
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Performance summary
   */
  async getHandlerPerformanceSummary(options = {}) {
    throw new Error('getHandlerPerformanceSummary method must be implemented');
  }

  /**
   * Delete handler
   * @param {string} handlerType - Handler type
   * @returns {Promise<boolean>} Success status
   */
  async deleteHandler(handlerType) {
    throw new Error('deleteHandler method must be implemented');
  }

  /**
   * Clean up old usage history
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldUsageHistory(daysOld = 30) {
    throw new Error('cleanupOldUsageHistory method must be implemented');
  }
}

/**
 * PostgreSQL implementation of HandlerRegistryRepository
 */
class PostgreSQLHandlerRegistryRepository extends HandlerRegistryRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
    this.handlerTable = 'handler_registry';
    this.usageTable = 'handler_usage_history';
  }

  /**
   * Register handler
   * @param {Object} handler - Handler data
   * @returns {Promise<Object>} Registered handler
   */
  async registerHandler(handler) {
    const query = `
      INSERT INTO ${this.handlerTable} (
        handler_type, handler_name, handler_class, handler_path,
        version, description, capabilities, configuration, dependencies,
        metadata, is_active, is_default, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (handler_type) DO UPDATE SET
        handler_name = EXCLUDED.handler_name,
        handler_class = EXCLUDED.handler_class,
        handler_path = EXCLUDED.handler_path,
        version = EXCLUDED.version,
        description = EXCLUDED.description,
        capabilities = EXCLUDED.capabilities,
        configuration = EXCLUDED.configuration,
        dependencies = EXCLUDED.dependencies,
        metadata = EXCLUDED.metadata,
        is_active = EXCLUDED.is_active,
        is_default = EXCLUDED.is_default,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      handler.handlerType,
      handler.handlerName,
      handler.handlerClass,
      handler.handlerPath,
      handler.version || '1.0.0',
      handler.description,
      JSON.stringify(handler.capabilities || {}),
      JSON.stringify(handler.configuration || {}),
      JSON.stringify(handler.dependencies || []),
      JSON.stringify(handler.metadata || {}),
      handler.isActive !== false,
      handler.isDefault || false,
      handler.priority || 1
    ];

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to register handler: ${error.message}`);
    }
  }

  /**
   * Get handler by type
   * @param {string} handlerType - Handler type
   * @returns {Promise<Object|null>} Handler or null
   */
  async getHandlerByType(handlerType) {
    const query = `
      SELECT * FROM ${this.handlerTable} 
      WHERE handler_type = $1
    `;

    try {
      const result = await this.db.query(query, [handlerType]);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to get handler by type: ${error.message}`);
    }
  }

  /**
   * Update handler
   * @param {string} handlerType - Handler type
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated handler
   */
  async updateHandler(handlerType, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (['capabilities', 'configuration', 'dependencies', 'metadata'].includes(key)) {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    values.push(handlerType);

    const query = `
      UPDATE ${this.handlerTable} 
      SET ${setClause.join(', ')}
      WHERE handler_type = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to update handler: ${error.message}`);
    }
  }

  /**
   * Get all handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Handlers
   */
  async getAllHandlers(options = {}) {
    const { limit = 100, offset = 0, sortBy = 'handler_type' } = options;

    const query = `
      SELECT * FROM ${this.handlerTable} 
      ORDER BY ${sortBy} ASC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result;
    } catch (error) {
      throw new Error(`Failed to get all handlers: ${error.message}`);
    }
  }

  /**
   * Get active handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Active handlers
   */
  async getActiveHandlers(options = {}) {
    const { limit = 100, offset = 0, sortBy = 'priority DESC' } = options;

    const query = `
      SELECT * FROM ${this.handlerTable} 
      WHERE is_active = true
      ORDER BY ${sortBy}
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result;
    } catch (error) {
      throw new Error(`Failed to get active handlers: ${error.message}`);
    }
  }

  /**
   * Get default handlers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Default handlers
   */
  async getDefaultHandlers(options = {}) {
    const { limit = 100, offset = 0 } = options;

    const query = `
      SELECT * FROM ${this.handlerTable} 
      WHERE is_default = true AND is_active = true
      ORDER BY priority DESC, handler_type ASC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result;
    } catch (error) {
      throw new Error(`Failed to get default handlers: ${error.message}`);
    }
  }

  /**
   * Get best handler for type
   * @param {string} handlerType - Handler type
   * @returns {Promise<Object|null>} Best handler or null
   */
  async getBestHandler(handlerType) {
    const query = `
      SELECT * FROM ${this.handlerTable} 
      WHERE handler_type = $1 AND is_active = true
      ORDER BY is_default DESC, priority DESC, success_rate DESC, average_execution_time ASC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [handlerType]);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to get best handler: ${error.message}`);
    }
  }

  /**
   * Update handler statistics
   * @param {string} handlerType - Handler type
   * @param {Object} statistics - Statistics data
   * @returns {Promise<Object>} Updated handler
   */
  async updateHandlerStatistics(handlerType, statistics) {
    const { executionTime, status } = statistics;

    const query = `
      UPDATE ${this.handlerTable} 
      SET 
        usage_count = usage_count + 1,
        success_count = CASE WHEN $2 = 'success' THEN success_count + 1 ELSE success_count END,
        failure_count = CASE WHEN $2 != 'success' THEN failure_count + 1 ELSE failure_count END,
        average_execution_time = CASE 
          WHEN usage_count = 0 THEN $1
          ELSE ((average_execution_time * usage_count) + $1) / (usage_count + 1)
        END,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE handler_type = $3
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [executionTime, status, handlerType]);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to update handler statistics: ${error.message}`);
    }
  }

  /**
   * Record handler usage
   * @param {Object} usage - Usage data
   * @returns {Promise<Object>} Recorded usage
   */
  async recordHandlerUsage(usage) {
    const query = `
      INSERT INTO ${this.usageTable} (
        handler_type, execution_id, status, execution_time, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      usage.handlerType,
      usage.executionId,
      usage.status,
      usage.executionTime,
      usage.errorMessage,
      JSON.stringify(usage.metadata || {})
    ];

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to record handler usage: ${error.message}`);
    }
  }

  /**
   * Get handler usage history
   * @param {string} handlerType - Handler type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Usage history
   */
  async getHandlerUsageHistory(handlerType, options = {}) {
    const { limit = 100, offset = 0, status } = options;

    let query = `
      SELECT * FROM ${this.usageTable} 
      WHERE handler_type = $1
    `;
    const values = [handlerType];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to get handler usage history: ${error.message}`);
    }
  }

  /**
   * Get handler performance summary
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Performance summary
   */
  async getHandlerPerformanceSummary(options = {}) {
    const { limit = 100, offset = 0 } = options;

    const query = `
      SELECT * FROM handler_performance_summary
      ORDER BY success_rate DESC, average_execution_time ASC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result;
    } catch (error) {
      throw new Error(`Failed to get handler performance summary: ${error.message}`);
    }
  }

  /**
   * Delete handler
   * @param {string} handlerType - Handler type
   * @returns {Promise<boolean>} Success status
   */
  async deleteHandler(handlerType) {
    const query = `
      DELETE FROM ${this.handlerTable} 
      WHERE handler_type = $1
    `;

    try {
      const result = await this.db.query(query, [handlerType]);
      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete handler: ${error.message}`);
    }
  }

  /**
   * Clean up old usage history
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldUsageHistory(daysOld = 30) {
    const query = `
      DELETE FROM ${this.usageTable} 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    try {
      const result = await this.db.query(query);
      return result.length;
    } catch (error) {
      throw new Error(`Failed to cleanup old usage history: ${error.message}`);
    }
  }

  /**
   * Convert camelCase to snake_case
   * @param {string} str - String to convert
   * @returns {string} Converted string
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

/**
 * In-memory implementation for testing
 */
class InMemoryHandlerRegistryRepository extends HandlerRegistryRepository {
  constructor() {
    super();
    this.handlers = new Map();
    this.usageHistory = new Map();
  }

  async registerHandler(handler) {
    const handlerRecord = {
      id: uuidv4(),
      handlerType: handler.handlerType,
      handlerName: handler.handlerName,
      handlerClass: handler.handlerClass,
      handlerPath: handler.handlerPath,
      version: handler.version || '1.0.0',
      description: handler.description,
      capabilities: handler.capabilities || {},
      configuration: handler.configuration || {},
      dependencies: handler.dependencies || [],
      metadata: handler.metadata || {},
      isActive: handler.isActive !== false,
      isDefault: handler.isDefault || false,
      priority: handler.priority || 1,
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      registeredAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null
    };

    this.handlers.set(handler.handlerType, handlerRecord);
    return handlerRecord;
  }

  async getHandlerByType(handlerType) {
    return this.handlers.get(handlerType) || null;
  }

  async updateHandler(handlerType, updates) {
    const handler = this.handlers.get(handlerType);
    if (!handler) {
      throw new Error(`Handler not found: ${handlerType}`);
    }

    Object.assign(handler, updates, { updatedAt: new Date() });
    return handler;
  }

  async getAllHandlers(options = {}) {
    const { limit = 100, offset = 0, sortBy = 'handlerType' } = options;
    
    let handlers = Array.from(this.handlers.values());

    // Sort handlers
    handlers.sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority - a.priority;
      }
      return a[sortBy].localeCompare(b[sortBy]);
    });

    return handlers.slice(offset, offset + limit);
  }

  async getActiveHandlers(options = {}) {
    const { limit = 100, offset = 0, sortBy = 'priority' } = options;
    
    let handlers = Array.from(this.handlers.values())
      .filter(handler => handler.isActive);

    // Sort handlers
    if (sortBy === 'priority') {
      handlers.sort((a, b) => b.priority - a.priority);
    } else {
      handlers.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
    }

    return handlers.slice(offset, offset + limit);
  }

  async getDefaultHandlers(options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const handlers = Array.from(this.handlers.values())
      .filter(handler => handler.isDefault && handler.isActive)
      .sort((a, b) => b.priority - a.priority);

    return handlers.slice(offset, offset + limit);
  }

  async getBestHandler(handlerType) {
    const handler = this.handlers.get(handlerType);
    if (!handler || !handler.isActive) {
      return null;
    }

    return handler;
  }

  async updateHandlerStatistics(handlerType, statistics) {
    const handler = this.handlers.get(handlerType);
    if (!handler) {
      throw new Error(`Handler not found: ${handlerType}`);
    }

    const { executionTime, status } = statistics;

    handler.usageCount++;
    if (status === 'success') {
      handler.successCount++;
    } else {
      handler.failureCount++;
    }

    // Update average execution time
    if (handler.usageCount === 1) {
      handler.averageExecutionTime = executionTime;
    } else {
      handler.averageExecutionTime = ((handler.averageExecutionTime * (handler.usageCount - 1)) + executionTime) / handler.usageCount;
    }

    handler.lastUsedAt = new Date();
    handler.updatedAt = new Date();

    return handler;
  }

  async recordHandlerUsage(usage) {
    const usageId = uuidv4();
    const usageRecord = {
      id: usageId,
      handlerType: usage.handlerType,
      executionId: usage.executionId,
      status: usage.status,
      executionTime: usage.executionTime,
      errorMessage: usage.errorMessage,
      metadata: usage.metadata || {},
      createdAt: new Date()
    };

    this.usageHistory.set(usageId, usageRecord);
    return usageRecord;
  }

  async getHandlerUsageHistory(handlerType, options = {}) {
    const { limit = 100, offset = 0, status } = options;
    
    let usage = Array.from(this.usageHistory.values())
      .filter(record => record.handlerType === handlerType);

    if (status) {
      usage = usage.filter(record => record.status === status);
    }

    usage.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return usage.slice(offset, offset + limit);
  }

  async getHandlerPerformanceSummary(options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const summaries = Array.from(this.handlers.values())
      .filter(handler => handler.isActive)
      .map(handler => {
        const successRate = handler.usageCount > 0 ? (handler.successCount / handler.usageCount) * 100 : 0;
        
        // Get recent usage (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentUsage = Array.from(this.usageHistory.values())
          .filter(record => record.handlerType === handler.handlerType && record.createdAt >= thirtyDaysAgo);
        
        const recentAvgExecutionTime = recentUsage.length > 0 
          ? recentUsage.reduce((sum, record) => sum + record.executionTime, 0) / recentUsage.length 
          : 0;

        return {
          handler_type: handler.handlerType,
          handler_name: handler.handlerName,
          version: handler.version,
          is_active: handler.isActive,
          is_default: handler.isDefault,
          priority: handler.priority,
          usage_count: handler.usageCount,
          success_count: handler.successCount,
          failure_count: handler.failureCount,
          average_execution_time: handler.averageExecutionTime,
          success_rate: successRate,
          recent_usage_count: recentUsage.length,
          recent_avg_execution_time: recentAvgExecutionTime,
          last_used: handler.lastUsedAt
        };
      })
      .sort((a, b) => b.success_rate - a.success_rate || a.average_execution_time - b.average_execution_time);

    return summaries.slice(offset, offset + limit);
  }

  async deleteHandler(handlerType) {
    return this.handlers.delete(handlerType);
  }

  async cleanupOldUsageHistory(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    for (const [usageId, usage] of this.usageHistory.entries()) {
      if (usage.createdAt < cutoffDate) {
        this.usageHistory.delete(usageId);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = {
  HandlerRegistryRepository,
  PostgreSQLHandlerRegistryRepository,
  InMemoryHandlerRegistryRepository
}; 