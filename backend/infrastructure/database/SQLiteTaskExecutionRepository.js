const TaskExecution = require('@domain/entities/TaskExecution');
const TaskStatus = require('@domain/value-objects/TaskStatus');

/**
 * SQLiteTaskExecutionRepository - SQLite implementation of TaskExecutionRepository
 * Provides persistence for task execution records using SQLite database
 */
class SQLiteTaskExecutionRepository {
    constructor(database) {
        this.database = database;
        this.tableName = 'task_executions';
        this.initTable();
    }

    /**
     * Initialize the task_executions table
     */
    async initTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                taskId TEXT NOT NULL,
                status TEXT NOT NULL,
                startedAt TEXT NOT NULL,
                completedAt TEXT,
                executionTime INTEGER,
                progress INTEGER DEFAULT 0,
                result TEXT,
                error TEXT,
                resourceUsage TEXT,
                options TEXT,
                metadata TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `;

        await this.database.run(createTableSQL);
        
        // Create indexes for better performance
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON ${this.tableName} (taskId)`);
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_executions_status ON ${this.tableName} (status)`);
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_executions_started_at ON ${this.tableName} (startedAt)`);
    }

    /**
     * Save task execution
     * @param {TaskExecution} taskExecution - Task execution to save
     * @returns {Promise<TaskExecution>} Saved task execution
     */
    async save(taskExecution) {
        const now = new Date().toISOString();
        
        if (taskExecution.id) {
            // Update existing execution
            return await this.update(taskExecution, now);
        } else {
            // Create new execution
            return await this.create(taskExecution, now);
        }
    }

    /**
     * Create new task execution
     * @param {TaskExecution} taskExecution - Task execution to create
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskExecution>} Created task execution
     */
    async create(taskExecution, now) {
        const id = taskExecution.id || this.generateId();
        taskExecution.id = id;

        const insertSQL = `
            INSERT INTO ${this.tableName} (
                id, taskId, status, startedAt, completedAt, executionTime,
                progress, result, error, resourceUsage, options, metadata,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            taskExecution.taskId,
            taskExecution.status.value,
            taskExecution.startedAt.toISOString(),
            taskExecution.completedAt ? taskExecution.completedAt.toISOString() : null,
            taskExecution.executionTime || null,
            taskExecution.progress || 0,
            taskExecution.result ? JSON.stringify(taskExecution.result) : null,
            taskExecution.error || null,
            taskExecution.resourceUsage ? JSON.stringify(taskExecution.resourceUsage) : null,
            taskExecution.options ? JSON.stringify(taskExecution.options) : null,
            taskExecution.metadata ? JSON.stringify(taskExecution.metadata) : null,
            now,
            now
        ];

        await this.database.run(insertSQL, params);
        return taskExecution;
    }

    /**
     * Update existing task execution
     * @param {TaskExecution} taskExecution - Task execution to update
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskExecution>} Updated task execution
     */
    async update(taskExecution, now) {
        const updateSQL = `
            UPDATE ${this.tableName} SET
                status = ?,
                startedAt = ?,
                completedAt = ?,
                executionTime = ?,
                progress = ?,
                result = ?,
                error = ?,
                resourceUsage = ?,
                options = ?,
                metadata = ?,
                updatedAt = ?
            WHERE id = ?
        `;

        const params = [
            taskExecution.status.value,
            taskExecution.startedAt.toISOString(),
            taskExecution.completedAt ? taskExecution.completedAt.toISOString() : null,
            taskExecution.executionTime || null,
            taskExecution.progress || 0,
            taskExecution.result ? JSON.stringify(taskExecution.result) : null,
            taskExecution.error || null,
            taskExecution.resourceUsage ? JSON.stringify(taskExecution.resourceUsage) : null,
            taskExecution.options ? JSON.stringify(taskExecution.options) : null,
            taskExecution.metadata ? JSON.stringify(taskExecution.metadata) : null,
            now,
            taskExecution.id
        ];

        await this.database.run(updateSQL, params);
        return taskExecution;
    }

    /**
     * Find task execution by ID
     * @param {string} id - Task execution ID
     * @returns {Promise<TaskExecution|null>} Task execution or null
     */
    async findById(id) {
        const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const row = await this.database.get(selectSQL, [id]);
        
        if (!row) {
            return null;
        }

        return this.mapRowToTaskExecution(row);
    }

    /**
     * Find task executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<Array<TaskExecution>>} Task executions
     */
    async findByTaskId(taskId) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE taskId = ? 
            ORDER BY startedAt DESC
        `;
        
        const rows = await this.database.all(selectSQL, [taskId]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Find latest task execution by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<TaskExecution|null>} Latest task execution or null
     */
    async findLatestByTaskId(taskId) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE taskId = ? 
            ORDER BY startedAt DESC 
            LIMIT 1
        `;
        
        const row = await this.database.get(selectSQL, [taskId]);
        
        if (!row) {
            return null;
        }

        return this.mapRowToTaskExecution(row);
    }

    /**
     * Find task executions by status
     * @param {string} status - Task execution status
     * @returns {Promise<Array<TaskExecution>>} Task executions
     */
    async findByStatus(status) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE status = ? 
            ORDER BY startedAt DESC
        `;
        
        const rows = await this.database.all(selectSQL, [status]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Find task executions by date range
     * @param {string} taskId - Task ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array<TaskExecution>>} Task executions
     */
    async findByTaskIdAndDateRange(taskId, startDate, endDate) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE taskId = ? 
            AND startedAt >= ? 
            AND startedAt <= ? 
            ORDER BY startedAt DESC
        `;
        
        const params = [
            taskId,
            startDate.toISOString(),
            endDate.toISOString()
        ];
        
        const rows = await this.database.all(selectSQL, params);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Find running task executions
     * @returns {Promise<Array<TaskExecution>>} Running task executions
     */
    async findRunning() {
        return await this.findByStatus(TaskStatus.RUNNING.value);
    }

    /**
     * Find completed task executions
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskExecution>>} Completed task executions
     */
    async findCompleted(limit = 100) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE status = ? 
            ORDER BY completedAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.all(selectSQL, [TaskStatus.COMPLETED.value, limit]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Find failed task executions
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskExecution>>} Failed task executions
     */
    async findFailed(limit = 100) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE status = ? 
            ORDER BY startedAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.all(selectSQL, [TaskStatus.FAILED.value, limit]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Delete task execution by ID
     * @param {string} id - Task execution ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteById(id) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.database.run(deleteSQL, [id]);
        return result.changes > 0;
    }

    /**
     * Delete task executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<number>} Number of deleted executions
     */
    async deleteByTaskId(taskId) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE taskId = ?`;
        const result = await this.database.run(deleteSQL, [taskId]);
        return result.changes;
    }

    /**
     * Count task executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<number>} Count of executions
     */
    async countByTaskId(taskId) {
        const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE taskId = ?`;
        const result = await this.database.get(countSQL, [taskId]);
        return result.count;
    }

    /**
     * Get execution statistics
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Execution statistics
     */
    async getExecutionStatistics(taskId) {
        const statsSQL = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = ? THEN 1 END) as completed,
                COUNT(CASE WHEN status = ? THEN 1 END) as failed,
                COUNT(CASE WHEN status = ? THEN 1 END) as running,
                AVG(executionTime) as averageExecutionTime,
                MIN(executionTime) as minExecutionTime,
                MAX(executionTime) as maxExecutionTime,
                AVG(progress) as averageProgress
            FROM ${this.tableName} 
            WHERE taskId = ?
        `;

        const params = [
            TaskStatus.COMPLETED.value,
            TaskStatus.FAILED.value,
            TaskStatus.RUNNING.value,
            taskId
        ];

        const result = await this.database.get(statsSQL, params);
        
        return {
            total: result.total,
            completed: result.completed,
            failed: result.failed,
            running: result.running,
            successRate: result.total > 0 ? result.completed / result.total : 0,
            averageExecutionTime: result.averageExecutionTime || 0,
            minExecutionTime: result.minExecutionTime || 0,
            maxExecutionTime: result.maxExecutionTime || 0,
            averageProgress: result.averageProgress || 0
        };
    }

    /**
     * Get recent executions
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskExecution>>} Recent executions
     */
    async getRecentExecutions(limit = 50) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            ORDER BY startedAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.all(selectSQL, [limit]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Get executions by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array<TaskExecution>>} Executions in date range
     */
    async getExecutionsByDateRange(startDate, endDate) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE startedAt >= ? 
            AND startedAt <= ? 
            ORDER BY startedAt DESC
        `;
        
        const params = [
            startDate.toISOString(),
            endDate.toISOString()
        ];
        
        const rows = await this.database.all(selectSQL, params);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Map database row to TaskExecution entity
     * @param {Object} row - Database row
     * @returns {TaskExecution} TaskExecution entity
     */
    mapRowToTaskExecution(row) {
        return new TaskExecution({
            id: row.id,
            taskId: row.taskId,
            status: TaskStatus.fromValue(row.status),
            startedAt: new Date(row.startedAt),
            completedAt: row.completedAt ? new Date(row.completedAt) : null,
            executionTime: row.executionTime,
            progress: row.progress,
            result: row.result ? JSON.parse(row.result) : null,
            error: row.error,
            resourceUsage: row.resourceUsage ? JSON.parse(row.resourceUsage) : null,
            options: row.options ? JSON.parse(row.options) : null,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old executions
     * @param {number} daysToKeep - Number of days to keep
     * @returns {Promise<number>} Number of deleted executions
     */
    async cleanupOldExecutions(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const deleteSQL = `
            DELETE FROM ${this.tableName} 
            WHERE startedAt < ? 
            AND status IN (?, ?)
        `;

        const params = [
            cutoffDate.toISOString(),
            TaskStatus.COMPLETED.value,
            TaskStatus.FAILED.value
        ];

        const result = await this.database.run(deleteSQL, params);
        return result.changes;
    }

    /**
     * Get database size information
     * @returns {Promise<Object>} Database size information
     */
    async getDatabaseInfo() {
        const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const sizeSQL = `SELECT COUNT(*) as size FROM ${this.tableName}`;
        
        const countResult = await this.database.get(countSQL);
        const sizeResult = await this.database.get(sizeSQL);
        
        return {
            totalExecutions: countResult.count,
            databaseSize: sizeResult.size,
            tableName: this.tableName
        };
    }
}

module.exports = SQLiteTaskExecutionRepository; 