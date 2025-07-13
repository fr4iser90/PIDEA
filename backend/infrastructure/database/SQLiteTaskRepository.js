
/**
 * SQLiteTaskRepository
 * SQLite implementation of TaskRepository interface
 */
const TaskRepository = require('@repositories/TaskRepository');
const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SQLiteTaskRepository extends TaskRepository {
  constructor(database) {
    super();
    this.database = database;
    this.tableName = 'tasks';
    this.init();
  }

  /**
   * Initialize the tasks table
   * Note: Table is created by DatabaseConnection.js with proper Foreign Key constraints
   */
  async init() {
    // The tasks table is created by DatabaseConnection.js with proper schema
    // This repository just uses the existing table
    logger.log('✅ [SQLiteTaskRepository] Using centralized tasks table from DatabaseConnection');
  }

  /**
   * Save a task
   * @param {Task} task - The task to save
   * @returns {Promise<Task>} The saved task
   */
  async save(task) {
    try {
      const taskData = task.toJSON();
      
      const sql = `
        INSERT OR REPLACE INTO ${this.tableName} (
          id, title, description, type, category, priority, status, project_id, user_id,
          estimated_time, metadata, created_at, updated_at, tags,
          assignee, due_date, started_at, completed_at, execution_history,
          parent_task_id, child_task_ids, phase, stage, phase_order, task_level, root_task_id,
          is_phase_task, progress, phase_progress, blocked_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        taskData.id,
        taskData.title,
        taskData.description,
        taskData.type,
        taskData.category || null,
        taskData.priority,
        taskData.status,
        taskData.projectId,
        taskData.userId,
        taskData.estimatedDuration,
        JSON.stringify(taskData.metadata),
        taskData.createdAt,
        taskData.updatedAt,
        JSON.stringify(taskData.tags),
        taskData.assignee,
        taskData.dueDate,
        taskData.startedAt,
        taskData.completedAt,
        JSON.stringify(taskData.executionHistory),
        taskData.parentTaskId || null,
        JSON.stringify(taskData.childTaskIds || []),
        taskData.phase || null,
        taskData.stage || null,
        taskData.phaseOrder || null,
        taskData.taskLevel || 0,
        taskData.rootTaskId || null,
        taskData.isPhaseTask || false,
        taskData.progress || 0,
        JSON.stringify(taskData.phaseProgress || {}),
        JSON.stringify(taskData.blockedBy || [])
      ];

      await this.database.run(sql, params);
      return task;
    } catch (error) {
      throw new Error(`Failed to save task: ${error.message}`);
    }
  }

  /**
   * Find a task by ID
   * @param {string} id - The task ID
   * @returns {Promise<Task|null>} The found task or null
   */
  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const row = await this.database.get(sql, [id]);
      
      if (!row) {
        return null;
      }

      return this._rowToTask(row);
    } catch (error) {
      throw new Error(`Failed to find task by ID: ${error.message}`);
    }
  }

  /**
   * Find a task by title
   * @param {string} title - The task title
   * @returns {Promise<Task|null>} The found task or null
   */
  async findByTitle(title) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE title = ?`;
      const row = await this.database.get(sql, [title]);
      
      if (!row) {
        return null;
      }

      return this._rowToTask(row);
    } catch (error) {
      throw new Error(`Failed to find task by title: ${error.message}`);
    }
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

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks: ${error.message}`);
    }
  }

  /**
   * Find tasks by project ID
   * @param {string} projectId - The project ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByProjectId(projectId, filters = {}) {
    return this.findAll({ ...filters, projectId });
  }

  /**
   * Find tasks by project (alias for findByProjectId)
   * @param {string} projectId - The project ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByProject(projectId, filters = {}) {
    return this.findByProjectId(projectId, filters);
  }

  /**
   * Find tasks by user ID
   * @param {string} userId - The user ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByUserId(userId, filters = {}) {
    return this.findAll({ ...filters, userId });
  }

  /**
   * Find tasks by status
   * @param {string} status - The task status
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByStatus(status, filters = {}) {
    return this.findAll({ ...filters, status });
  }

  /**
   * Find tasks by type
   * @param {string} type - The task type
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByType(type, filters = {}) {
    return this.findAll({ ...filters, type });
  }

  /**
   * Find tasks by priority
   * @param {string} priority - The task priority
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByPriority(priority, filters = {}) {
    return this.findAll({ ...filters, priority });
  }

  /**
   * Find overdue tasks
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of overdue tasks
   */
  async findOverdue(filters = {}) {
    try {
      const now = new Date().toISOString();
      let sql = `
        SELECT * FROM ${this.tableName} 
        WHERE dueDate IS NOT NULL 
        AND dueDate < ? 
        AND status NOT IN (?, ?)
      `;
      const params = [now, TaskStatus.COMPLETED, TaskStatus.CANCELLED];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY dueDate ASC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find overdue tasks: ${error.message}`);
    }
  }

  /**
   * Find tasks assigned to a user
   * @param {string} assigneeId - The assignee ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of assigned tasks
   */
  async findByAssignee(assigneeId, filters = {}) {
    return this.findAll({ ...filters, assignee: assigneeId });
  }

  /**
   * Find tasks with specific tags
   * @param {string[]} tags - Array of tags
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks with matching tags
   */
  async findByTags(tags, filters = {}) {
    try {
      // This is a simplified implementation
      // In a production environment, you might want to use a more sophisticated approach
      const allTasks = await this.findAll(filters);
      return allTasks.filter(task => 
        tags.some(tag => task.tags.includes(tag))
      );
    } catch (error) {
      throw new Error(`Failed to find tasks by tags: ${error.message}`);
    }
  }

  /**
   * Find tasks created within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks in date range
   */
  async findByDateRange(startDate, endDate, filters = {}) {
    try {
      let sql = `
        SELECT * FROM ${this.tableName} 
        WHERE createdAt >= ? AND createdAt <= ?
      `;
      const params = [startDate.toISOString(), endDate.toISOString()];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY createdAt DESC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by date range: ${error.message}`);
    }
  }

  /**
   * Find tasks that require AI
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of AI-required tasks
   */
  async findRequiringAI(filters = {}) {
    try {
      const aiTypes = ['analysis', 'optimization', 'security', 'ai_generated', 'auto'];
      let sql = `SELECT * FROM ${this.tableName} WHERE type IN (${aiTypes.map(() => '?').join(',')})`;
      const params = [...aiTypes];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY createdAt DESC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find AI-required tasks: ${error.message}`);
    }
  }

  /**
   * Find tasks that require execution
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of execution-required tasks
   */
  async findRequiringExecution(filters = {}) {
    try {
      const executionTypes = ['script', 'build', 'deployment', 'testing', 'migration', 'auto'];
      let sql = `SELECT * FROM ${this.tableName} WHERE type IN (${executionTypes.map(() => '?').join(',')})`;
      const params = [...executionTypes];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY createdAt DESC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find execution-required tasks: ${error.message}`);
    }
  }

  /**
   * Find tasks that require human review
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of human-review-required tasks
   */
  async findRequiringHumanReview(filters = {}) {
    try {
      const reviewTypes = ['refactoring', 'security', 'deployment', 'migration'];
      let sql = `SELECT * FROM ${this.tableName} WHERE type IN (${reviewTypes.map(() => '?').join(',')})`;
      const params = [...reviewTypes];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY createdAt DESC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find human-review-required tasks: ${error.message}`);
    }
  }

  /**
   * Count tasks by status
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Object with status counts
   */
  async countByStatus(filters = {}) {
    try {
      let sql = `SELECT status, COUNT(*) as count FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY status';

      const rows = await this.database.all(sql, params);
      const counts = {};
      rows.forEach(row => {
        counts[row.status] = row.count;
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to count tasks by status: ${error.message}`);
    }
  }

  /**
   * Count tasks by type
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Object with type counts
   */
  async countByType(filters = {}) {
    try {
      let sql = `SELECT type, COUNT(*) as count FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY type';

      const rows = await this.database.all(sql, params);
      const counts = {};
      rows.forEach(row => {
        counts[row.type] = row.count;
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to count tasks by type: ${error.message}`);
    }
  }

  /**
   * Count tasks by priority
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Object with priority counts
   */
  async countByPriority(filters = {}) {
    try {
      let sql = `SELECT priority, COUNT(*) as count FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY priority';

      const rows = await this.database.all(sql, params);
      const counts = {};
      rows.forEach(row => {
        counts[row.priority] = row.count;
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to count tasks by priority: ${error.message}`);
    }
  }

  /**
   * Get task statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Task statistics
   */
  async getStatistics(filters = {}) {
    try {
      const statusCounts = await this.countByStatus(filters);
      const typeCounts = await this.countByType(filters);
      const priorityCounts = await this.countByPriority(filters);

      // Get total count
      let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const totalRow = await this.database.get(sql, params);
      const total = totalRow.total;

      return {
        total,
        statusCounts,
        typeCounts,
        priorityCounts,
        overdue: await this.findOverdue(filters).then(tasks => tasks.length),
        requiringAI: await this.findRequiringAI(filters).then(tasks => tasks.length),
        requiringExecution: await this.findRequiringExecution(filters).then(tasks => tasks.length),
        requiringHumanReview: await this.findRequiringHumanReview(filters).then(tasks => tasks.length)
      };
    } catch (error) {
      throw new Error(`Failed to get task statistics: ${error.message}`);
    }
  }

  /**
   * Update a task
   * @param {string} id - The task ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Task>} The updated task
   */
  async update(id, updates) {
    try {
      const task = await this.findById(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (task[key] !== undefined) {
          task[key] = updates[key];
        }
      });

      // Update the updatedAt timestamp
      task._updatedAt = new Date();

      return await this.save(task);
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string} id - The task ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.database.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Delete tasks by project ID
   * @param {string} projectId - The project ID
   * @returns {Promise<number>} Number of deleted tasks
   */
  async deleteByProjectId(projectId) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE projectId = ?`;
      const result = await this.database.run(sql, [projectId]);
      return result.changes;
    } catch (error) {
      throw new Error(`Failed to delete tasks by project ID: ${error.message}`);
    }
  }

  /**
   * Delete tasks by user ID
   * @param {string} userId - The user ID
   * @returns {Promise<number>} Number of deleted tasks
   */
  async deleteByUserId(userId) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE userId = ?`;
      const result = await this.database.run(sql, [userId]);
      return result.changes;
    } catch (error) {
      throw new Error(`Failed to delete tasks by user ID: ${error.message}`);
    }
  }

  /**
   * Bulk save tasks
   * @param {Task[]} tasks - Array of tasks to save
   * @returns {Promise<Task[]>} Array of saved tasks
   */
  async bulkSave(tasks) {
    try {
      const savedTasks = [];
      for (const task of tasks) {
        const savedTask = await this.save(task);
        savedTasks.push(savedTask);
      }
      return savedTasks;
    } catch (error) {
      throw new Error(`Failed to bulk save tasks: ${error.message}`);
    }
  }

  /**
   * Bulk update tasks
   * @param {Object[]} updates - Array of update objects with id and updates
   * @returns {Promise<Task[]>} Array of updated tasks
   */
  async bulkUpdate(updates) {
    try {
      const updatedTasks = [];
      for (const update of updates) {
        const updatedTask = await this.update(update.id, update.updates);
        updatedTasks.push(updatedTask);
      }
      return updatedTasks;
    } catch (error) {
      throw new Error(`Failed to bulk update tasks: ${error.message}`);
    }
  }

  /**
   * Bulk delete tasks
   * @param {string[]} ids - Array of task IDs to delete
   * @returns {Promise<number>} Number of deleted tasks
   */
  async bulkDelete(ids) {
    try {
      let deletedCount = 0;
      for (const id of ids) {
        const deleted = await this.delete(id);
        if (deleted) deletedCount++;
      }
      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to bulk delete tasks: ${error.message}`);
    }
  }

  /**
   * Search tasks by text
   * @param {string} searchTerm - The search term
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of matching tasks
   */
  async search(searchTerm, filters = {}) {
    try {
      let sql = `
        SELECT * FROM ${this.tableName} 
        WHERE (title LIKE ? OR description LIKE ?)
      `;
      const params = [`%${searchTerm}%`, `%${searchTerm}%`];

      // Apply additional filters
      if (filters.projectId) {
        sql += ' AND projectId = ?';
        params.push(filters.projectId);
      }

      if (filters.userId) {
        sql += ' AND userId = ?';
        params.push(filters.userId);
      }

      sql += ' ORDER BY createdAt DESC';

      const rows = await this.database.all(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to search tasks: ${error.message}`);
    }
  }

  /**
   * Get tasks with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @param {Object} filters - Optional filters
   * @param {Object} sort - Optional sort options
   * @returns {Promise<Object>} Object with tasks and pagination info
   */
  async findWithPagination(page = 1, limit = 10, filters = {}, sort = {}) {
    try {
      const offset = (page - 1) * limit;
      
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

      if (filters.projectId) {
        conditions.push('projectId = ?');
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push('userId = ?');
        params.push(filters.userId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // Add sorting
      const sortField = sort.field || 'createdAt';
      const sortOrder = sort.order || 'DESC';
      sql += ` ORDER BY ${sortField} ${sortOrder}`;

      // Add pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const rows = await this.database.all(sql, params);
      const tasks = rows.map(row => this._rowToTask(row));

      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      if (conditions.length > 0) {
        countSql += ' WHERE ' + conditions.join(' AND ');
      }
      const countRow = await this.database.get(countSql, params.slice(0, -2));
      const total = countRow.total;

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get tasks with pagination: ${error.message}`);
    }
  }

  /**
   * Check if a task exists
   * @param {string} id - The task ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`;
      const row = await this.database.get(sql, [id]);
      return row.count > 0;
    } catch (error) {
      throw new Error(`Failed to check task existence: ${error.message}`);
    }
  }

  /**
   * Get task dependencies
   * @param {string} taskId - The task ID
   * @returns {Promise<Task[]>} Array of dependency tasks
   */
  async getDependencies(taskId) {
    try {
      const task = await this.findById(taskId);
      if (!task || !task.dependencies.length) {
        return [];
      }

      const sql = `SELECT * FROM ${this.tableName} WHERE id IN (${task.dependencies.map(() => '?').join(',')})`;
      const rows = await this.database.all(sql, task.dependencies);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to get task dependencies: ${error.message}`);
    }
  }

  /**
   * Get tasks that depend on this task
   * @param {string} taskId - The task ID
   * @returns {Promise<Task[]>} Array of dependent tasks
   */
  async getDependents(taskId) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE dependencies LIKE ?`;
      const rows = await this.database.all(sql, [`%${taskId}%`]);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to get task dependents: ${error.message}`);
    }
  }

  /**
   * Add dependency between tasks
   * @param {string} taskId - The task ID
   * @param {string} dependencyId - The dependency task ID
   * @returns {Promise<boolean>} True if added, false otherwise
   */
  async addDependency(taskId, dependencyId) {
    try {
      const task = await this.findById(taskId);
      if (!task) {
        return false;
      }

      task.addDependency(dependencyId);
      await this.save(task);
      return true;
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error.message}`);
    }
  }

  /**
   * Remove dependency between tasks
   * @param {string} taskId - The task ID
   * @param {string} dependencyId - The dependency task ID
   * @returns {Promise<boolean>} True if removed, false otherwise
   */
  async removeDependency(taskId, dependencyId) {
    try {
      const task = await this.findById(taskId);
      if (!task) {
        return false;
      }

      task.removeDependency(dependencyId);
      await this.save(task);
      return true;
    } catch (error) {
      throw new Error(`Failed to remove dependency: ${error.message}`);
    }
  }

  /**
   * Get task execution history
   * @param {string} taskId - The task ID
   * @returns {Promise<Object[]>} Array of execution history entries
   */
  async getExecutionHistory(taskId) {
    try {
      const task = await this.findById(taskId);
      if (!task) {
        return [];
      }

      return task.executionHistory;
    } catch (error) {
      throw new Error(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Clear all tasks (for testing)
   * @returns {Promise<number>} Number of cleared tasks
   */
  async clear() {
    try {
      const sql = `DELETE FROM ${this.tableName}`;
      const result = await this.database.run(sql);
      return result.changes;
    } catch (error) {
      throw new Error(`Failed to clear tasks: ${error.message}`);
    }
  }

  /**
   * Convert database row to Task entity
   * @param {Object} row - Database row
   * @returns {Task} Task entity
   */
  _rowToTask(row) {
    try {
      return Task.fromJSON({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        category: row.category,
        priority: row.priority,
        status: row.status,
        projectId: row.projectId,
        userId: row.userId,
        estimatedDuration: row.estimatedDuration,
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        dependencies: JSON.parse(row.dependencies || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        assignee: row.assignee,
        dueDate: row.dueDate,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        executionHistory: JSON.parse(row.executionHistory || '[]'),
        parentTaskId: row.parentTaskId,
        childTaskIds: JSON.parse(row.childTaskIds || '[]'),
        phase: row.phase,
        stage: row.stage,
        phaseOrder: row.phaseOrder,
        taskLevel: row.taskLevel,
        rootTaskId: row.rootTaskId,
        isPhaseTask: row.isPhaseTask,
        progress: row.progress,
        phaseProgress: JSON.parse(row.phaseProgress || '{}'),
        blockedBy: JSON.parse(row.blockedBy || '[]')
      });
    } catch (error) {
      throw new Error(`Failed to convert row to task: ${error.message}`);
    }
  }
}

module.exports = SQLiteTaskRepository; 