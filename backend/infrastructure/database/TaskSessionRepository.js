const TaskSession = require('@entities/TaskSession');
const { logger } = require('@infrastructure/logging/Logger');

/**
 * TaskSessionRepository - Repository for managing task session persistence
 * Handles CRUD operations for task sessions
 */
class TaskSessionRepository {
  constructor(database = null) {
    this.database = database;
    this.tableName = 'task_sessions';
    this.logger = console;
  }

  /**
   * Initialize the repository
   */
  async initialize() {
    try {
      if (this.database) {
        await this.createTable();
        this.logger.info('[TaskSessionRepository] Initialized successfully');
      } else {
        this.logger.warn('[TaskSessionRepository] No database provided, using in-memory storage');
      }
      return true;
    } catch (error) {
      this.logger.error('[TaskSessionRepository] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Create the task_sessions table
   */
  async createTable() {
    if (!this.database) {
      return;
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        project_id VARCHAR(36),
        todo_input TEXT NOT NULL,
        options TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        tasks TEXT,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        failed_tasks INTEGER DEFAULT 0,
        current_task_index INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        result TEXT,
        error TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes separately for SQLite
    const indexSQLs = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON ${this.tableName} (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON ${this.tableName} (project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName} (status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName} (created_at)`
    ];

    await this.database.query(createTableSQL);
    
    for (const indexSQL of indexSQLs) {
      await this.database.query(indexSQL);
    }
  }

  /**
   * Save a task session
   * @param {TaskSession} session - Task session to save
   * @returns {Promise<TaskSession>} Saved session
   */
  async save(session) {
    try {
      if (!session || !(session instanceof TaskSession)) {
        throw new Error('Invalid session: must be a TaskSession instance');
      }

      if (this.database) {
        await this.saveToDatabase(session);
      } else {
        await this.saveToMemory(session);
      }

      this.logger.debug(`[TaskSessionRepository] Saved session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`[TaskSessionRepository] Failed to save session:`, error.message);
      throw error;
    }
  }

  /**
   * Save session to database
   * @param {TaskSession} session - Task session
   */
  async saveToDatabase(session) {
    // SQLite doesn't support ON DUPLICATE KEY UPDATE, so we use REPLACE INTO
    const upsertSQL = `
      REPLACE INTO ${this.tableName} (
        id, user_id, project_id, todo_input, options, status, tasks,
        total_tasks, completed_tasks, failed_tasks, current_task_index,
        progress, start_time, end_time, duration, result, error, metadata, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const values = [
      session.id,
      session.userId,
      session.projectId,
      session.todoInput,
      JSON.stringify(session.options),
      session.status,
      JSON.stringify(session.tasks),
      session.totalTasks,
      session.completedTasks,
      session.failedTasks,
      session.currentTaskIndex,
      session.progress,
      session.startTime,
      session.endTime,
      session.duration,
      session.result ? JSON.stringify(session.result) : null,
      session.error,
      JSON.stringify(session.metadata)
    ];

    await this.database.query(upsertSQL, values);
  }

  /**
   * Save session to memory (fallback)
   * @param {TaskSession} session - Task session
   */
  async saveToMemory(session) {
    // In-memory storage for development/testing
    if (!this.memoryStorage) {
      this.memoryStorage = new Map();
    }
    
    this.memoryStorage.set(session.id, session.toJSON());
  }

  /**
   * Find session by ID
   * @param {string} id - Session ID
   * @returns {Promise<TaskSession|null>} Task session
   */
  async findById(id) {
    try {
      if (!id) {
        throw new Error('Session ID is required');
      }

      if (this.database) {
        return await this.findByIdFromDatabase(id);
      } else {
        return await this.findByIdFromMemory(id);
      }
    } catch (error) {
      this.logger.error(`[TaskSessionRepository] Failed to find session ${id}:`, error.message);
      return null;
    }
  }

  /**
   * Find session by ID from database
   * @param {string} id - Session ID
   * @returns {Promise<TaskSession|null>} Task session
   */
  async findByIdFromDatabase(id) {
    const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const [rows] = await this.database.query(selectSQL, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return this.mapRowToSession(row);
  }

  /**
   * Find session by ID from memory
   * @param {string} id - Session ID
   * @returns {Promise<TaskSession|null>} Task session
   */
  async findByIdFromMemory(id) {
    if (!this.memoryStorage) {
      return null;
    }
    
    const sessionData = this.memoryStorage.get(id);
    return sessionData ? TaskSession.fromJSON(sessionData) : null;
  }

  /**
   * Find sessions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByUserId(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { limit = 50, offset = 0, status = null } = options;

      if (this.database) {
        return await this.findByUserIdFromDatabase(userId, { limit, offset, status });
      } else {
        return await this.findByUserIdFromMemory(userId, { limit, offset, status });
      }
    } catch (error) {
      this.logger.error(`[TaskSessionRepository] Failed to find sessions for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Find sessions by user ID from database
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByUserIdFromDatabase(userId, options) {
    let selectSQL = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    const values = [userId];

    if (options.status) {
      selectSQL += ' AND status = ?';
      values.push(options.status);
    }

    selectSQL += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(options.limit, options.offset);

    const [rows] = await this.database.query(selectSQL, values);
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Find sessions by user ID from memory
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByUserIdFromMemory(userId, options) {
    if (!this.memoryStorage) {
      return [];
    }

    let sessions = Array.from(this.memoryStorage.values())
      .filter(session => session.userId === userId)
      .map(session => TaskSession.fromJSON(session));

    if (options.status) {
      sessions = sessions.filter(session => session.status === options.status);
    }

    sessions.sort((a, b) => b.createdAt - a.createdAt);

    return sessions.slice(options.offset, options.offset + options.limit);
  }

  /**
   * Find sessions by project ID
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByProjectId(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const { limit = 50, offset = 0, status = null } = options;

      if (this.database) {
        return await this.findByProjectIdFromDatabase(projectId, { limit, offset, status });
      } else {
        return await this.findByProjectIdFromMemory(projectId, { limit, offset, status });
      }
    } catch (error) {
      this.logger.error(`[TaskSessionRepository] Failed to find sessions for project ${projectId}:`, error.message);
      return [];
    }
  }

  /**
   * Find sessions by project ID from database
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByProjectIdFromDatabase(projectId, options) {
    let selectSQL = `SELECT * FROM ${this.tableName} WHERE project_id = ?`;
    const values = [projectId];

    if (options.status) {
      selectSQL += ' AND status = ?';
      values.push(options.status);
    }

    selectSQL += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(options.limit, options.offset);

    const [rows] = await this.database.query(selectSQL, values);
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Find sessions by project ID from memory
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of task sessions
   */
  async findByProjectIdFromMemory(projectId, options) {
    if (!this.memoryStorage) {
      return [];
    }

    let sessions = Array.from(this.memoryStorage.values())
      .filter(session => session.projectId === projectId)
      .map(session => TaskSession.fromJSON(session));

    if (options.status) {
      sessions = sessions.filter(session => session.status === options.status);
    }

    sessions.sort((a, b) => b.createdAt - a.createdAt);

    return sessions.slice(options.offset, options.offset + options.limit);
  }

  /**
   * Find active sessions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of active task sessions
   */
  async findActive(options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      if (this.database) {
        return await this.findActiveFromDatabase({ limit, offset });
      } else {
        return await this.findActiveFromMemory({ limit, offset });
      }
    } catch (error) {
      this.logger.error('[TaskSessionRepository] Failed to find active sessions:', error.message);
      return [];
    }
  }

  /**
   * Find active sessions from database
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of active task sessions
   */
  async findActiveFromDatabase(options) {
    const selectSQL = `
      SELECT * FROM ${this.tableName} 
      WHERE status IN ('pending', 'started', 'running')
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await this.database.query(selectSQL, [options.limit, options.offset]);
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Find active sessions from memory
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of active task sessions
   */
  async findActiveFromMemory(options) {
    if (!this.memoryStorage) {
      return [];
    }

    const sessions = Array.from(this.memoryStorage.values())
      .filter(session => ['pending', 'started', 'running'].includes(session.status))
      .map(session => TaskSession.fromJSON(session))
      .sort((a, b) => b.createdAt - a.createdAt);

    return sessions.slice(options.offset, options.offset + options.limit);
  }

  /**
   * Delete session by ID
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(id) {
    try {
      if (!id) {
        throw new Error('Session ID is required');
      }

      if (this.database) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const [result] = await this.database.query(deleteSQL, [id]);
        return result.affectedRows > 0;
      } else {
        if (this.memoryStorage) {
          return this.memoryStorage.delete(id);
        }
        return false;
      }
    } catch (error) {
      this.logger.error(`[TaskSessionRepository] Failed to delete session ${id}:`, error.message);
      return false;
    }
  }

  /**
   * Get repository statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    try {
      if (this.database) {
        return await this.getStatsFromDatabase();
      } else {
        return await this.getStatsFromMemory();
      }
    } catch (error) {
      this.logger.error('[TaskSessionRepository] Failed to get stats:', error.message);
      return {};
    }
  }

  /**
   * Get statistics from database
   * @returns {Promise<Object>} Statistics
   */
  async getStatsFromDatabase() {
    const statsSQL = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status IN ('pending', 'started', 'running') THEN 1 ELSE 0 END) as active,
        AVG(duration) as avg_duration
      FROM ${this.tableName}
    `;

    const [rows] = await this.database.query(statsSQL);
    return rows[0] || {};
  }

  /**
   * Get statistics from memory
   * @returns {Promise<Object>} Statistics
   */
  async getStatsFromMemory() {
    if (!this.memoryStorage) {
      return { total: 0, completed: 0, failed: 0, active: 0, avg_duration: 0 };
    }

    const sessions = Array.from(this.memoryStorage.values());
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;
    const active = sessions.filter(s => ['pending', 'started', 'running'].includes(s.status)).length;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / total;

    return { total, completed, failed, active, avg_duration: avgDuration };
  }

  /**
   * Map database row to TaskSession
   * @param {Object} row - Database row
   * @returns {TaskSession} Task session
   */
  mapRowToSession(row) {
    return new TaskSession({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      todoInput: row.todo_input,
      options: row.options ? JSON.parse(row.options) : {},
      status: row.status,
      tasks: row.tasks ? JSON.parse(row.tasks) : [],
      totalTasks: row.total_tasks,
      completedTasks: row.completed_tasks,
      failedTasks: row.failed_tasks,
      currentTaskIndex: row.current_task_index,
      progress: row.progress,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      result: row.result ? JSON.parse(row.result) : null,
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  /**
   * Cleanup old sessions
   * @param {number} daysOld - Days old threshold
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      if (this.database) {
        const deleteSQL = `
          DELETE FROM ${this.tableName} 
          WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
          AND status IN ('completed', 'failed', 'cancelled')
        `;
        const [result] = await this.database.query(deleteSQL, [daysOld]);
        return result.affectedRows;
      } else {
        // Memory cleanup
        if (!this.memoryStorage) {
          return 0;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let deletedCount = 0;
        for (const [id, session] of this.memoryStorage.entries()) {
          if (new Date(session.createdAt) < cutoffDate && 
              ['completed', 'failed', 'cancelled'].includes(session.status)) {
            this.memoryStorage.delete(id);
            deletedCount++;
          }
        }
        return deletedCount;
      }
    } catch (error) {
      this.logger.error('[TaskSessionRepository] Failed to cleanup old sessions:', error.message);
      return 0;
    }
  }
}

module.exports = TaskSessionRepository; 