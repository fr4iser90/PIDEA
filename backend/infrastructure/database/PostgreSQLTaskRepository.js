
/**
 * PostgreSQLTaskRepository
 * PostgreSQL/SQLite implementation of TaskRepository interface using DatabaseConnection
 */
const TaskRepository = require('@repositories/TaskRepository');
const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class PostgreSQLTaskRepository extends TaskRepository {
  constructor(databaseConnection, eventBus = null, statusTransitionService = null) {
    super();
    this.databaseConnection = databaseConnection;
    this.tableName = 'tasks';
    this.eventBus = eventBus;
    this.statusTransitionService = statusTransitionService;
    // Disable init() to prevent overriding the correct schema from DatabaseConnection.js
    // this.init();
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
        category TEXT,
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
        executionHistory TEXT,
        parentTaskId TEXT,
        childTaskIds TEXT,
        phase TEXT,
        stage TEXT,
        phaseOrder INTEGER,
        taskLevel INTEGER,
        rootTaskId TEXT,
        isPhaseTask BOOLEAN,
        progress INTEGER,
        phaseProgress TEXT,
        blockedBy TEXT
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
          id, title, description, type, category, priority, status, project_id,
          created_by, estimated_time, metadata, created_at, updated_at, completed_at, due_date, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;

      // Extract string values from value objects
      const taskType = task.type?.value || task.type;
      const taskPriority = task.priority?.value || task.priority;
      const taskStatus = task.status?.value || task.status;

      const params = [
        task.id,
        task.title,
        task.description,
        taskType,
        task.category || null,
        taskPriority,
        taskStatus,
        task.projectId, // camelCase property
        task.userId || 'me', // Use userId or default to 'me'
        task.estimatedTime || null,
        JSON.stringify(task.metadata || {}),
        task.createdAt ? task.createdAt.toISOString() : new Date().toISOString(),
        task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
        task.completedAt ? task.completedAt.toISOString() : null,
        task.dueDate ? task.dueDate.toISOString() : null,
        JSON.stringify(task.tags || [])
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
      const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;
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
      const sql = `SELECT * FROM ${this.tableName} WHERE title = $1`;
      const row = await this.databaseConnection.getOne(sql, [title]);
      return row ? this._rowToTask(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task by title: ${error.message}`);
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
   * @param {string} projectId - Project ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Task[]>} Array of tasks for the project
   */
  async findByProject(projectId, filters = {}) {
    return this.findByProjectId(projectId, filters);
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
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (filters.priority) {
        conditions.push(`priority = $${params.length + 1}`);
        params.push(filters.priority);
      }

      if (filters.projectId) {
        conditions.push(`project_id = $${params.length + 1}`);
        params.push(filters.projectId);
      }

      if (filters.userId) {
        conditions.push(`created_by = $${params.length + 1}`);
        params.push(filters.userId);
      }

      if (filters.assignee) {
        conditions.push(`assignee = $${params.length + 1}`);
        params.push(filters.assignee);
      }

      if (filters.title) {
        conditions.push(`title = $${params.length + 1}`);
        params.push(filters.title);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // Add sorting
      sql += ' ORDER BY created_at DESC';

      const rows = await this.databaseConnection.query(sql, params);
      return rows.map(row => this._rowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks: ${error.message}`);
    }
  }

  /**
   * Update a task
   * @param {string|Task} idOrTask - Task ID or Task object
   * @param {Task|Object} taskOrUpdates - Task object or updates object
   * @returns {Promise<Task>} Updated task
   */
  async update(idOrTask, taskOrUpdates) {
    try {
      let task;
      let taskId;

      // ✅ FIXED: Handle both parameter patterns
      if (typeof idOrTask === 'string') {
        // Called as: update(id, task) or update(id, updates)
        taskId = idOrTask;
        if (taskOrUpdates && typeof taskOrUpdates === 'object' && taskOrUpdates.id === taskId) {
          // Second parameter is a complete task object
          task = taskOrUpdates;
        } else {
          // Second parameter is updates object - load existing task and apply updates
          task = await this.findById(taskId);
          if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
          }
          // ✅ FIXED: Apply updates safely without setting getter-only properties
          // Instead of trying to set properties directly, we'll use the updates in the SQL query
          // The task object will be updated with the new data from the database after the query
        }
      } else {
        // Called as: update(task) - backward compatibility
        task = idOrTask;
        taskId = task.id;
      }

      // ✅ FIXED: Handle updates properly
      let sql, params;
      
      if (taskOrUpdates && typeof taskOrUpdates === 'object' && !taskOrUpdates.id) {
        // We have specific updates to apply
        const updates = [];
        const updateParams = [];
        let paramIndex = 1;
        
        // Build dynamic SQL for specific updates
        if (taskOrUpdates.title !== undefined) {
          updates.push(`title = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.title);
        }
        
        if (taskOrUpdates.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.description);
        }
        
        if (taskOrUpdates.type !== undefined) {
          updates.push(`type = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.type?.value || taskOrUpdates.type);
        }
        
        if (taskOrUpdates.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.status?.value || taskOrUpdates.status);
        }
        
        if (taskOrUpdates.priority !== undefined) {
          updates.push(`priority = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.priority?.value || taskOrUpdates.priority);
        }
        
        if (taskOrUpdates.createdAt !== undefined) {
          updates.push(`created_at = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.createdAt.toISOString());
        }
        
        if (taskOrUpdates.updatedAt !== undefined) {
          updates.push(`updated_at = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.updatedAt.toISOString());
        }
        
        if (taskOrUpdates.completedAt !== undefined) {
          updates.push(`completed_at = $${paramIndex++}`);
          updateParams.push(taskOrUpdates.completedAt.toISOString());
        }
        
        if (taskOrUpdates.metadata !== undefined) {
          updates.push(`metadata = $${paramIndex++}`);
          updateParams.push(JSON.stringify(taskOrUpdates.metadata));
        }
        
        if (updates.length === 0) {
          // No updates to apply
          return task;
        }
        
        sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
        updateParams.push(taskId);
        params = updateParams;
      } else {
        // Full task update (existing logic)
        sql = `
          UPDATE ${this.tableName} SET
            title = $1, description = $2, type = $3, category = $4, priority = $5, status = $6,
            project_id = $7, created_by = $8, estimated_time = $9, metadata = $10,
            updated_at = $11, tags = $12, due_date = $13, completed_at = $14
          WHERE id = $15
        `;

        // Extract string values from value objects
        const taskType = task.type?.value || task.type;
        const taskPriority = task.priority?.value || task.priority;
        const taskStatus = task.status?.value || task.status;

        params = [
          task.title,
          task.description,
          taskType,
          task.category || null,
          taskPriority,
          taskStatus,
          task.projectId, // camelCase property
          task.userId || 'me', // camelCase property with fallback
          task.estimatedTime || null,
          JSON.stringify(task.metadata || {}),
          task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
          JSON.stringify(task.tags || []),
          task.dueDate ? task.dueDate.toISOString() : null,
          task.completedAt ? task.completedAt.toISOString() : null,
          taskId
        ];
      }

      await this.databaseConnection.execute(sql, params);
      
      // 🔄 AUTOMATIC FILE MOVING: Check if status changed and trigger file movement
      await this.handleStatusChange(taskId, task, taskOrUpdates);
      
      return task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Handle status changes by automatically moving files
   * @param {string} taskId - Task ID
   * @param {Task} task - Task object
   * @param {Object} updates - Updates object
   */
  async handleStatusChange(taskId, task, updates) {
    try {
      // Create TaskStatusTransitionService if not provided
      if (!this.statusTransitionService) {
        const TaskStatusTransitionService = require('@domain/services/task/TaskStatusTransitionService');
        const FileSystemService = require('@domain/services/shared/FileSystemService');
        this.statusTransitionService = new TaskStatusTransitionService(
          this,
          new FileSystemService(),
          this.eventBus
        );
      }

      // Check if status was updated
      let statusChanged = false;
      let newStatus = null;
      let oldStatus = null;

      if (updates && typeof updates === 'object' && updates.status !== undefined) {
        // Direct status update
        newStatus = updates.status;
        oldStatus = task.status?.value || task.status;
        statusChanged = newStatus !== oldStatus;
      } else if (task.status && task.status.value) {
        // Task object with status
        newStatus = task.status.value;
        // We need to get the old status from database
        const oldTask = await this.findById(taskId);
        oldStatus = oldTask?.status?.value || oldTask?.status;
        statusChanged = newStatus !== oldStatus;
      }

      if (statusChanged && newStatus && oldStatus) {
        logger.info(`🔄 Status changed detected: ${taskId} ${oldStatus} -> ${newStatus}`);
        
        // Trigger automatic file movement based on status change
        try {
          switch (newStatus) {
            case 'completed':
              await this.statusTransitionService.moveTaskToCompleted(taskId);
              break;
            case 'in-progress':
            case 'in_progress':
              await this.statusTransitionService.moveTaskToInProgress(taskId);
              break;
            case 'blocked':
              await this.statusTransitionService.moveTaskToBlocked(taskId);
              break;
            case 'cancelled':
              await this.statusTransitionService.moveTaskToCancelled(taskId);
              break;
            default:
              logger.debug(`No automatic file movement for status: ${newStatus}`);
          }
          
          // Emit event if eventBus is available
          if (this.eventBus) {
            this.eventBus.emit('task:status:changed', {
              taskId,
              oldStatus,
              newStatus,
              timestamp: new Date(),
              source: 'database_update'
            });
          }
          
        } catch (fileMoveError) {
          logger.error(`❌ Failed to move files for status change: ${fileMoveError.message}`);
          // Don't throw - we don't want to break the database update
        }
      }
      
    } catch (error) {
      logger.error(`❌ Error handling status change: ${error.message}`);
      // Don't throw - we don't want to break the database update
    }
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
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
      // Provide default title if missing
      const title = row.title || 'Untitled Task';
      
      // Use Task constructor with parameters in correct order
      // Map snake_case database columns to camelCase properties
      const task = new Task(
        row.id || '',
        row.project_id || null, // snake_case from DB
        title,
        row.description || '',
        row.status || 'pending',
        row.priority || 'medium',
        row.type || 'feature',
        row.category || null,
        row.metadata ? JSON.parse(row.metadata) : {},
        row.created_at ? new Date(row.created_at) : new Date(), // snake_case from DB
        row.updated_at ? new Date(row.updated_at) : new Date() // snake_case from DB
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

      if (row.due_date) {
        task.setDueDate(new Date(row.due_date));
      }

      if (row.completed_at) {
        task._completedAt = new Date(row.completed_at);
      }

      // Set estimated time if available
      if (row.estimated_time) {
        task._estimatedTime = row.estimated_time;
      }

      // Note: executionHistory is not in the current schema, so we skip it
      // if (row.execution_history) {
      //   task._executionHistory = JSON.parse(row.execution_history);
      // }

      // Note: Phase properties are not in the current schema, so we skip them
      // Store phase/hierarchy properties in metadata since they're not part of the core Task entity
      // const phaseMetadata = {};
      // if (row.parent_task_id) {
      //   phaseMetadata.parentTaskId = row.parent_task_id;
      // }
      // if (row.child_task_ids) {
      //   phaseMetadata.childTaskIds = JSON.parse(row.child_task_ids);
      // }
      // if (row.phase) {
      //   phaseMetadata.phase = row.phase;
      // }
      // if (row.stage) {
      //   phaseMetadata.stage = row.stage;
      // }
      // if (row.phase_order) {
      //   phaseMetadata.phaseOrder = row.phase_order;
      // }
      // if (row.task_level) {
      //   phaseMetadata.taskLevel = row.task_level;
      // }
      // if (row.root_task_id) {
      //   phaseMetadata.rootTaskId = row.root_task_id;
      // }
      // if (row.is_phase_task) {
      //   phaseMetadata.isPhaseTask = row.is_phase_task;
      // }
      // if (row.progress) {
      //   phaseMetadata.progress = row.progress;
      // }
      // if (row.phase_progress) {
      //   phaseMetadata.phaseProgress = JSON.parse(row.phase_progress);
      // }
      // if (row.blocked_by) {
      //   phaseMetadata.blockedBy = JSON.parse(row.blocked_by);
      // }
      
      // Add phase metadata to task metadata
      // if (Object.keys(phaseMetadata).length > 0) {
      //   Object.assign(task._metadata, phaseMetadata);
      // }

      return task;
    } catch (error) {
      logger.error('Error converting row to task:', error);
      logger.error('Row data:', row);
      throw new Error(`Failed to convert database row to Task: ${error.message}`);
    }
  }
}

module.exports = PostgreSQLTaskRepository; 