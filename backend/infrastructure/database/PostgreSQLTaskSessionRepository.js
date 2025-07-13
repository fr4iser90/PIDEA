const TaskSession = require('@entities/TaskSession');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * PostgreSQLTaskSessionRepository - PostgreSQL implementation of TaskSessionRepository
 * Handles CRUD operations for task sessions using PostgreSQL
 */
class PostgreSQLTaskSessionRepository {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.tableName = 'task_sessions';
    this.logger = logger;
  }

  /**
   * Initialize the repository
   */
  async initialize() {
    try {
      await this.initTable();
      this.logger.info('[PostgreSQLTaskSessionRepository] Initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('[PostgreSQLTaskSessionRepository] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize the task_sessions table
   */
  async initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        project_id TEXT,
        todo_input TEXT NOT NULL,
        options JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        tasks JSONB,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        failed_tasks INTEGER DEFAULT 0,
        current_task_index INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0,
        result JSONB,
        error TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db.execute(createTableSQL);
    
    // Create indexes for better performance
    await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON ${this.tableName} (user_id)`);
    await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON ${this.tableName} (project_id)`);
    await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName} (status)`);
    await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName} (created_at)`);
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

      const upsertSQL = `
        INSERT INTO ${this.tableName} (
          id, user_id, project_id, todo_input, options, status, tasks,
          total_tasks, completed_tasks, failed_tasks, current_task_index,
          progress, start_time, end_time, duration, result, error, metadata, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          project_id = EXCLUDED.project_id,
          todo_input = EXCLUDED.todo_input,
          options = EXCLUDED.options,
          status = EXCLUDED.status,
          tasks = EXCLUDED.tasks,
          total_tasks = EXCLUDED.total_tasks,
          completed_tasks = EXCLUDED.completed_tasks,
          failed_tasks = EXCLUDED.failed_tasks,
          current_task_index = EXCLUDED.current_task_index,
          progress = EXCLUDED.progress,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          duration = EXCLUDED.duration,
          result = EXCLUDED.result,
          error = EXCLUDED.error,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
      `;

      const values = [
        session.id,
        session.userId,
        session.projectId,
        session.todoInput,
        session.options ? JSON.stringify(session.options) : null,
        session.status,
        session.tasks ? JSON.stringify(session.tasks) : null,
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
        session.metadata ? JSON.stringify(session.metadata) : null
      ];

      await this.db.execute(upsertSQL, values);
      this.logger.debug(`[PostgreSQLTaskSessionRepository] Saved session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to save session:`, error.message);
      throw error;
    }
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

      const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const row = await this.db.getOne(selectSQL, [id]);
      
      if (!row) {
        return null;
      }

      return this.mapRowToSession(row);
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to find session ${id}:`, error.message);
      return null;
    }
  }

  /**
   * Find sessions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<TaskSession[]>} Task sessions
   */
  async findByUserId(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      let selectSQL = `SELECT * FROM ${this.tableName} WHERE user_id = $1`;
      const params = [userId];

      if (options.status) {
        selectSQL += ' AND status = $2';
        params.push(options.status);
      }

      selectSQL += ' ORDER BY created_at DESC';

      if (options.limit) {
        selectSQL += ' LIMIT $' + (params.length + 1);
        params.push(options.limit);
      }

      const rows = await this.db.query(selectSQL, params);
      return rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to find sessions by user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Find sessions by project ID
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<TaskSession[]>} Task sessions
   */
  async findByProjectId(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      let selectSQL = `SELECT * FROM ${this.tableName} WHERE project_id = $1`;
      const params = [projectId];

      if (options.status) {
        selectSQL += ' AND status = $2';
        params.push(options.status);
      }

      selectSQL += ' ORDER BY created_at DESC';

      if (options.limit) {
        selectSQL += ' LIMIT $' + (params.length + 1);
        params.push(options.limit);
      }

      const rows = await this.db.query(selectSQL, params);
      return rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to find sessions by project ${projectId}:`, error.message);
      return [];
    }
  }

  /**
   * Find active sessions
   * @param {Object} options - Query options
   * @returns {Promise<TaskSession[]>} Active task sessions
   */
  async findActive(options = {}) {
    try {
      let selectSQL = `SELECT * FROM ${this.tableName} WHERE status IN ('pending', 'running')`;
      const params = [];

      if (options.userId) {
        selectSQL += ' AND user_id = $1';
        params.push(options.userId);
      }

      if (options.projectId) {
        selectSQL += options.userId ? ' AND project_id = $2' : ' AND project_id = $1';
        params.push(options.projectId);
      }

      selectSQL += ' ORDER BY created_at DESC';

      if (options.limit) {
        selectSQL += ' LIMIT $' + (params.length + 1);
        params.push(options.limit);
      }

      const rows = await this.db.query(selectSQL, params);
      return rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to find active sessions:`, error.message);
      return [];
    }
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

      const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.db.execute(deleteSQL, [id]);
      return result.rowsAffected > 0;
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to delete session ${id}:`, error.message);
      return false;
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getStats() {
    try {
      const statsSQL = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          AVG(progress) as average_progress,
          AVG(duration) as average_duration
        FROM ${this.tableName}
      `;

      const result = await this.db.getOne(statsSQL);
      
      return {
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        running: result.running,
        pending: result.pending,
        averageProgress: result.average_progress || 0,
        averageDuration: result.average_duration || 0
      };
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to get stats:`, error.message);
      return {
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 0,
        averageProgress: 0,
        averageDuration: 0
      };
    }
  }

  /**
   * Map database row to TaskSession entity
   * @param {Object} row - Database row
   * @returns {TaskSession} TaskSession entity
   */
  mapRowToSession(row) {
    try {
      const sessionData = {
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
      };

      return TaskSession.fromJSON(sessionData);
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to map row to session:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up old sessions
   * @param {number} daysOld - Number of days old
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      const deleteSQL = `
        DELETE FROM ${this.tableName} 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND status IN ('completed', 'failed')
      `;

      const result = await this.db.execute(deleteSQL);
      return result.rowsAffected;
    } catch (error) {
      this.logger.error(`[PostgreSQLTaskSessionRepository] Failed to cleanup old sessions:`, error.message);
      return 0;
    }
  }
}

module.exports = PostgreSQLTaskSessionRepository; 