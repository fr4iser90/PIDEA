const TaskExecution = require('@entities/TaskExecution');
const TaskStatus = require('@value-objects/TaskStatus');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * PostgreSQLTaskExecutionRepository - PostgreSQL implementation of TaskExecutionRepository
 * Provides persistence for task execution records using PostgreSQL database
 */
class PostgreSQLTaskExecutionRepository {
    constructor(databaseConnection) {
        this.databaseConnection = databaseConnection;
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
                task_id TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP,
                execution_time INTEGER,
                progress INTEGER DEFAULT 0,
                result JSONB,
                error TEXT,
                resource_usage JSONB,
                options JSONB,
                metadata JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `;

        await this.databaseConnection.execute(createTableSQL);
        
        // Create indexes for better performance
        await this.databaseConnection.execute(`CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON ${this.tableName} (task_id)`);
        await this.databaseConnection.execute(`CREATE INDEX IF NOT EXISTS idx_task_executions_status ON ${this.tableName} (status)`);
        await this.databaseConnection.execute(`CREATE INDEX IF NOT EXISTS idx_task_executions_started_at ON ${this.tableName} (started_at)`);
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
                id, task_id, status, started_at, completed_at, execution_time,
                progress, result, error, resource_usage, options, metadata,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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

        await this.databaseConnection.execute(insertSQL, params);
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
                status = $2,
                started_at = $3,
                completed_at = $4,
                execution_time = $5,
                progress = $6,
                result = $7,
                error = $8,
                resource_usage = $9,
                options = $10,
                metadata = $11,
                updated_at = $12
            WHERE id = $1
        `;

        const params = [
            taskExecution.id,
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
            now
        ];

        await this.databaseConnection.execute(updateSQL, params);
        return taskExecution;
    }

    /**
     * Find task execution by ID
     * @param {string} id - Task execution ID
     * @returns {Promise<TaskExecution|null>} Task execution or null
     */
    async findById(id) {
        const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const row = await this.databaseConnection.getOne(selectSQL, [id]);
        
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
            WHERE task_id = $1 
            ORDER BY started_at DESC
        `;
        
        const rows = await this.databaseConnection.query(selectSQL, [taskId]);
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
            WHERE task_id = $1 
            ORDER BY started_at DESC 
            LIMIT 1
        `;
        
        const row = await this.databaseConnection.getOne(selectSQL, [taskId]);
        
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
            WHERE status = $1 
            ORDER BY started_at DESC
        `;
        
        const rows = await this.databaseConnection.query(selectSQL, [status]);
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
            WHERE status = $1 
            ORDER BY completed_at DESC 
            LIMIT $2
        `;
        
        const rows = await this.databaseConnection.query(selectSQL, [TaskStatus.COMPLETED.value, limit]);
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
            WHERE status = $1 
            ORDER BY started_at DESC 
            LIMIT $2
        `;
        
        const rows = await this.databaseConnection.query(selectSQL, [TaskStatus.FAILED.value, limit]);
        return rows.map(row => this.mapRowToTaskExecution(row));
    }

    /**
     * Delete task execution by ID
     * @param {string} id - Task execution ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteById(id) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = $1`;
        const result = await this.databaseConnection.execute(deleteSQL, [id]);
        return result.rowsAffected > 0;
    }

    /**
     * Delete task executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<number>} Number of deleted executions
     */
    async deleteByTaskId(taskId) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE task_id = $1`;
        const result = await this.databaseConnection.execute(deleteSQL, [taskId]);
        return result.rowsAffected;
    }

    /**
     * Count task executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<number>} Count of executions
     */
    async countByTaskId(taskId) {
        const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE task_id = $1`;
        const result = await this.databaseConnection.getOne(countSQL, [taskId]);
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
                COUNT(CASE WHEN status = $2 THEN 1 END) as completed,
                COUNT(CASE WHEN status = $3 THEN 1 END) as failed,
                COUNT(CASE WHEN status = $4 THEN 1 END) as running,
                AVG(execution_time) as average_execution_time,
                MIN(execution_time) as min_execution_time,
                MAX(execution_time) as max_execution_time,
                AVG(progress) as average_progress
            FROM ${this.tableName} 
            WHERE task_id = $1
        `;

        const params = [
            taskId,
            TaskStatus.COMPLETED.value,
            TaskStatus.FAILED.value,
            TaskStatus.RUNNING.value
        ];

        const result = await this.databaseConnection.getOne(statsSQL, params);
        
        return {
            total: result.total,
            completed: result.completed,
            failed: result.failed,
            running: result.running,
            successRate: result.total > 0 ? result.completed / result.total : 0,
            averageExecutionTime: result.average_execution_time || 0,
            minExecutionTime: result.min_execution_time || 0,
            maxExecutionTime: result.max_execution_time || 0,
            averageProgress: result.average_progress || 0
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
            ORDER BY started_at DESC 
            LIMIT $1
        `;
        
        const rows = await this.databaseConnection.query(selectSQL, [limit]);
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
            taskId: row.task_id,
            status: TaskStatus.fromValue(row.status),
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : null,
            executionTime: row.execution_time,
            progress: row.progress,
            result: row.result ? JSON.parse(row.result) : null,
            error: row.error,
            resourceUsage: row.resource_usage ? JSON.parse(row.resource_usage) : null,
            options: row.options ? JSON.parse(row.options) : null,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
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
            WHERE started_at < $1 
            AND status IN ($2, $3)
        `;

        const params = [
            cutoffDate.toISOString(),
            TaskStatus.COMPLETED.value,
            TaskStatus.FAILED.value
        ];

        const result = await this.databaseConnection.execute(deleteSQL, params);
        return result.rowsAffected;
    }
}

module.exports = PostgreSQLTaskExecutionRepository; 