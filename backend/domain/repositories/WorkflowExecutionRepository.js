/**
 * WorkflowExecutionRepository
 * Repository interface and implementation for workflow execution persistence
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Interface for workflow execution repository
 */
class WorkflowExecutionRepository {
  /**
   * Create workflow execution
   * @param {Object} execution - Execution data
   * @returns {Promise<Object>} Created execution
   */
  async create(execution) {
    throw new Error('create method must be implemented');
  }

  /**
   * Find execution by ID
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object|null>} Execution or null
   */
  async findByExecutionId(executionId) {
    throw new Error('findByExecutionId method must be implemented');
  }

  /**
   * Update execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async update(executionId, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * Find executions by workflow ID
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByWorkflowId(workflowId, options = {}) {
    throw new Error('findByWorkflowId method must be implemented');
  }

  /**
   * Find executions by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Executions
   */
  async findByTaskId(taskId) {
    throw new Error('findByTaskId method must be implemented');
  }

  /**
   * Find executions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByUserId(userId, options = {}) {
    throw new Error('findByUserId method must be implemented');
  }

  /**
   * Find executions by status
   * @param {string} status - Execution status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByStatus(status, options = {}) {
    throw new Error('findByStatus method must be implemented');
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    throw new Error('getStatistics method must be implemented');
  }

  /**
   * Delete execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(executionId) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Clean up old executions
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted executions
   */
  async cleanupOldExecutions(daysOld = 30) {
    throw new Error('cleanupOldExecutions method must be implemented');
  }
}

/**
 * PostgreSQL implementation of WorkflowExecutionRepository
 */
class PostgreSQLWorkflowExecutionRepository extends WorkflowExecutionRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
    this.tableName = 'workflow_executions';
  }

  /**
   * Create workflow execution
   * @param {Object} execution - Execution data
   * @returns {Promise<Object>} Created execution
   */
  async create(execution) {
    const query = `
      INSERT INTO ${this.tableName} (
        execution_id, workflow_id, workflow_name, workflow_version,
        task_id, user_id, status, strategy, priority, estimated_time,
        start_time, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      execution.executionId || `exec_${uuidv4()}`,
      execution.workflowId,
      execution.workflowName,
      execution.workflowVersion || '1.0.0',
      execution.taskId,
      execution.userId,
      execution.status || 'pending',
      execution.strategy,
      execution.priority || 1,
      execution.estimatedTime,
      execution.startTime || new Date(),
      JSON.stringify(execution.metadata || {})
    ];

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to create workflow execution: ${error.message}`);
    }
  }

  /**
   * Find execution by ID
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object|null>} Execution or null
   */
  async findByExecutionId(executionId) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE execution_id = $1
    `;

    try {
      const result = await this.db.query(query, [executionId]);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find workflow execution: ${error.message}`);
    }
  }

  /**
   * Update execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async update(executionId, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'resultData' || key === 'errorData' || key === 'metadata') {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    values.push(executionId);

    const query = `
      UPDATE ${this.tableName} 
      SET ${setClause.join(', ')}
      WHERE execution_id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to update workflow execution: ${error.message}`);
    }
  }

  /**
   * Find executions by workflow ID
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByWorkflowId(workflowId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE workflow_id = $1
    `;
    const values = [workflowId];
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
      throw new Error(`Failed to find workflow executions by workflow ID: ${error.message}`);
    }
  }

  /**
   * Find executions by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Executions
   */
  async findByTaskId(taskId) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE task_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query(query, [taskId]);
      return result;
    } catch (error) {
      throw new Error(`Failed to find workflow executions by task ID: ${error.message}`);
    }
  }

  /**
   * Find executions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByUserId(userId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = $1
    `;
    const values = [userId];
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
      throw new Error(`Failed to find workflow executions by user ID: ${error.message}`);
    }
  }

  /**
   * Find executions by status
   * @param {string} status - Execution status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByStatus(status, options = {}) {
    const { limit = 50, offset = 0, workflowId } = options;

    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE status = $1
    `;
    const values = [status];
    let paramIndex = 2;

    if (workflowId) {
      query += ` AND workflow_id = $${paramIndex}`;
      values.push(workflowId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result;
    } catch (error) {
      throw new Error(`Failed to find workflow executions by status: ${error.message}`);
    }
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (filters.workflowId) {
      whereClause += ` WHERE workflow_id = $${paramIndex}`;
      values.push(filters.workflowId);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += whereClause ? ` AND status = $${paramIndex}` : ` WHERE status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.userId) {
      whereClause += whereClause ? ` AND user_id = $${paramIndex}` : ` WHERE user_id = $${paramIndex}`;
      values.push(filters.userId);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_executions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_executions,
        AVG(actual_duration) as average_duration,
        MIN(actual_duration) as min_duration,
        MAX(actual_duration) as max_duration,
        AVG(estimated_time) as average_estimated_time
      FROM ${this.tableName}
      ${whereClause}
    `;

    try {
      const result = await this.db.query(query, values);
      return result[0];
    } catch (error) {
      throw new Error(`Failed to get workflow execution statistics: ${error.message}`);
    }
  }

  /**
   * Delete execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(executionId) {
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE execution_id = $1
    `;

    try {
      const result = await this.db.query(query, [executionId]);
      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete workflow execution: ${error.message}`);
    }
  }

  /**
   * Clean up old executions
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted executions
   */
  async cleanupOldExecutions(daysOld = 30) {
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
      AND status IN ('completed', 'failed', 'cancelled')
    `;

    try {
      const result = await this.db.query(query);
      return result.length;
    } catch (error) {
      throw new Error(`Failed to cleanup old workflow executions: ${error.message}`);
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
class InMemoryWorkflowExecutionRepository extends WorkflowExecutionRepository {
  constructor() {
    super();
    this.executions = new Map();
  }

  async create(execution) {
    const executionId = execution.executionId || `exec_${uuidv4()}`;
    const executionRecord = {
      id: uuidv4(),
      executionId,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
      workflowVersion: execution.workflowVersion || '1.0.0',
      taskId: execution.taskId,
      userId: execution.userId,
      status: execution.status || 'pending',
      strategy: execution.strategy,
      priority: execution.priority || 1,
      estimatedTime: execution.estimatedTime,
      actualDuration: execution.actualDuration,
      startTime: execution.startTime || new Date(),
      endTime: execution.endTime,
      resultData: execution.resultData,
      errorData: execution.errorData,
      metadata: execution.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.executions.set(executionId, executionRecord);
    return executionRecord;
  }

  async findByExecutionId(executionId) {
    return this.executions.get(executionId) || null;
  }

  async update(executionId, updates) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    Object.assign(execution, updates, { updatedAt: new Date() });
    return execution;
  }

  async findByWorkflowId(workflowId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    let executions = Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId);

    if (status) {
      executions = executions.filter(exec => exec.status === status);
    }

    executions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return executions.slice(offset, offset + limit);
  }

  async findByTaskId(taskId) {
    return Array.from(this.executions.values())
      .filter(exec => exec.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async findByUserId(userId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    let executions = Array.from(this.executions.values())
      .filter(exec => exec.userId === userId);

    if (status) {
      executions = executions.filter(exec => exec.status === status);
    }

    executions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return executions.slice(offset, offset + limit);
  }

  async findByStatus(status, options = {}) {
    const { limit = 50, offset = 0, workflowId } = options;
    
    let executions = Array.from(this.executions.values())
      .filter(exec => exec.status === status);

    if (workflowId) {
      executions = executions.filter(exec => exec.workflowId === workflowId);
    }

    executions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return executions.slice(offset, offset + limit);
  }

  async getStatistics(filters = {}) {
    let executions = Array.from(this.executions.values());

    if (filters.workflowId) {
      executions = executions.filter(exec => exec.workflowId === filters.workflowId);
    }

    if (filters.status) {
      executions = executions.filter(exec => exec.status === filters.status);
    }

    if (filters.userId) {
      executions = executions.filter(exec => exec.userId === filters.userId);
    }

    const totalExecutions = executions.length;
    const completedExecutions = executions.filter(exec => exec.status === 'completed').length;
    const failedExecutions = executions.filter(exec => exec.status === 'failed').length;
    const runningExecutions = executions.filter(exec => exec.status === 'running').length;

    const durations = executions
      .filter(exec => exec.actualDuration)
      .map(exec => exec.actualDuration);

    const estimatedTimes = executions
      .filter(exec => exec.estimatedTime)
      .map(exec => exec.estimatedTime);

    return {
      total_executions: totalExecutions,
      completed_executions: completedExecutions,
      failed_executions: failedExecutions,
      running_executions: runningExecutions,
      average_duration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      min_duration: durations.length > 0 ? Math.min(...durations) : null,
      max_duration: durations.length > 0 ? Math.max(...durations) : null,
      average_estimated_time: estimatedTimes.length > 0 ? estimatedTimes.reduce((a, b) => a + b, 0) / estimatedTimes.length : null
    };
  }

  async delete(executionId) {
    return this.executions.delete(executionId);
  }

  async cleanupOldExecutions(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    for (const [executionId, execution] of this.executions.entries()) {
      if (execution.createdAt < cutoffDate && 
          ['completed', 'failed', 'cancelled'].includes(execution.status)) {
        this.executions.delete(executionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = {
  WorkflowExecutionRepository,
  PostgreSQLWorkflowExecutionRepository,
  InMemoryWorkflowExecutionRepository
}; 