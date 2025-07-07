/**
 * PostgreSQLTaskRepository
 * PostgreSQL/SQLite implementation of TaskRepository interface using DatabaseConnection
 */
const TaskRepository = require('@/domain/repositories/TaskRepository');
const Task = require('@/domain/entities/Task');
const TaskStatus = require('../../domain/value-objects/TaskStatus');
const TaskPriority = require('../../domain/value-objects/TaskPriority');
const TaskType = require('../../domain/value-objects/TaskType');

class PostgreSQLTaskRepository extends TaskRepository {
  constructor(databaseConnection) {
    super();
    this.databaseConnection = databaseConnection;
    this.tableName = 'tasks';
    this.init();
  }

  /**
   * Initialize the tasks table
   */
  async init() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        projectId TEXT,
        userId TEXT,
        estimatedDuration INTEGER,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        dependencies TEXT,
        tags TEXT,
        assignee TEXT,
        dueDate TEXT,
        startedAt TEXT,
        completedAt TEXT,
        executionHistory TEXT
      )
    `;

    try {
      await this.databaseConnection.execute(createTableSQL);
    } catch (error) {
      throw new Error(`Failed to initialize tasks table: ${error.message}`);
    }
  }

  /**
   * Create a new task
   * @param {Task} task - Task to create
   * @returns {Promise<Task>} Created task
   */
  async create(task) {
    return this.save(task);
  }

  /**
   * Save a task
   * @param {Task} task - Task to save
   * @returns {Promise<Task>} Saved task
   */
  async save(task) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} (
          id, title, description, type, priority, status, projectId, userId,
          estimatedDuration, metadata, createdAt, updatedAt, dependencies,
          tags, assignee, dueDate, startedAt, completedAt, executionHistory
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

             const params = [
         task.id,
         task.title,
         task.description,
         task.type?.value || task.type,
         task.priority?.value || task.priority,
         task.status?.value || task.status,
         task.projectId,
         task.userId,
         task.estimatedDuration,
         JSON.stringify(task.metadata || {}),
         task.createdAt ? task.createdAt.toISOString() : new Date().toISOString(),
         task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
         JSON.stringify(task.dependencies || []),
         JSON.stringify(task.tags || []),
         task.assignee,
         task.dueDate ? task.dueDate.toISOString() : null,
         task.startedAt ? task.startedAt.toISOString() : null,
         task.completedAt ? task.completedAt.toISOString() : null,
         JSON.stringify(task.executionHistory || [])
       ];

      await this.databaseConnection.execute(sql, params);
      return task;
    } catch (error) {
      throw new Error(`Failed to save task: ${error.message}`);
    }
  }

  /**
   * Find task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Task|null>} Task or null if not found
   */
  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const row = await this.databaseConnection.getOne(sql, [id]);
      return row ? this._rowToTask(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task by ID: ${error.message}`);
    }
  }

  /**
   * Find task by title
   * @param {string} title - Task title
   * @returns {Promise<Task|null>} Task or null if not found
   */
  async findByTitle(title) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE title = ?`;
      const row = await this.databaseConnection.getOne(sql, [title]);
      return row ? this._rowToTask(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task by title: ${error.message}`);
    }
  }

  /**
   * Find tasks by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Task[]>} Array of tasks for the project
   */
  async findByProject(projectId) {
    return this.findAll({ projectId });
  }

  /**
   * Find all tasks
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findAll(filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      if (filters.priority) {
        conditions.push('priority = ?');
        params.push(filters.priority);
      }

      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (filters.assignee) {
        conditions.push('assignee = ?');
        params.push(filters.assignee);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // Add sorting
      sql += ' ORDER BY createdAt DESC';

      const rows = await this.databaseConnection.query(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks: ${error.message}`);
    }
  }

  /**
   * Update a task
   * @param {Task} task - Task to update
   * @returns {Promise<Task>} Updated task
   */
  async update(task) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET
          title = ?, description = ?, type = ?, priority = ?, status = ?,
          projectId = ?, userId = ?, estimatedDuration = ?, metadata = ?,
          updatedAt = ?, dependencies = ?, tags = ?, assignee = ?, dueDate = ?,
          startedAt = ?, completedAt = ?, executionHistory = ?
        WHERE id = ?
      `;

             const params = [
         task.title,
         task.description,
         task.type?.value || task.type,
         task.priority?.value || task.priority,
         task.status?.value || task.status,
         task.projectId,
         task.userId,
         task.estimatedDuration,
         JSON.stringify(task.metadata || {}),
         task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
         JSON.stringify(task.dependencies || []),
         JSON.stringify(task.tags || []),
         task.assignee,
         task.dueDate ? task.dueDate.toISOString() : null,
         task.startedAt ? task.startedAt.toISOString() : null,
         task.completedAt ? task.completedAt.toISOString() : null,
         JSON.stringify(task.executionHistory || []),
         task.id
       ];

      await this.databaseConnection.execute(sql, params);
      return task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.databaseConnection.execute(sql, [id]);
      return result.rowsAffected > 0;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Convert database row to Task entity
   * @param {Object} row - Database row
   * @returns {Task} Task entity
   */
  _rowToTask(row) {
    try {
      // Use Task constructor with parameters in correct order
      const task = new Task(
        row.id || '',
        row.projectId || null,
        row.title || 'Untitled Task',
        row.description || '',
        row.status || 'pending',
        row.priority || 'medium',
        row.type || 'feature',
        row.metadata ? JSON.parse(row.metadata) : {},
        row.createdAt ? new Date(row.createdAt) : new Date(),
        row.updatedAt ? new Date(row.updatedAt) : new Date()
      );

      // Set additional properties that aren't in the constructor
      if (row.dependencies) {
        const deps = JSON.parse(row.dependencies);
        deps.forEach(dep => task.addDependency(dep));
      }

      if (row.tags) {
        const tags = JSON.parse(row.tags);
        tags.forEach(tag => task.addTag(tag));
      }

      if (row.assignee) {
        task.assign(row.assignee);
      }

      if (row.dueDate) {
        task.setDueDate(new Date(row.dueDate));
      }

      if (row.startedAt) {
        task._startedAt = new Date(row.startedAt);
      }

      if (row.completedAt) {
        task._completedAt = new Date(row.completedAt);
      }

      if (row.executionHistory) {
        task._executionHistory = JSON.parse(row.executionHistory);
      }

      return task;
    } catch (error) {
      console.error('[PostgreSQLTaskRepository] Error converting row to task:', error);
      console.error('[PostgreSQLTaskRepository] Row data:', row);
      throw new Error(`Failed to convert database row to Task: ${error.message}`);
    }
  }
}

module.exports = PostgreSQLTaskRepository; 