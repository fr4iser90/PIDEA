const TaskSuggestion = require('@entities/TaskSuggestion');
const TaskType = require('@value-objects/TaskType')
const TaskPriority = require('@value-objects/TaskPriority');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


/**
 * SQLiteTaskSuggestionRepository - SQLite implementation of TaskSuggestionRepository
 * Provides persistence for AI-generated task suggestions using SQLite database
 */
class SQLiteTaskSuggestionRepository {
    constructor(database) {
        this.database = database;
        this.tableName = 'task_suggestions';
        this.initIndexes();
    }

    /**
     * Initialize indexes for the task_suggestions table
     */
    async initIndexes() {
        try {
            // Create indexes for better performance
            await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_status ON ${this.tableName} (status)`);
            await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_project ON ${this.tableName} (projectPath)`);
            await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_confidence ON ${this.tableName} (confidence)`);
            await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_approved ON ${this.tableName} (isApproved)`);
            await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_created_at ON ${this.tableName} (createdAt)`);
        } catch (error) {
            // Indexes might already exist, ignore errors
            logger.info(`Index creation skipped: ${error.message}`);
        }
    }

    /**
     * Save task suggestion
     * @param {TaskSuggestion} taskSuggestion - Task suggestion to save
     * @returns {Promise<TaskSuggestion>} Saved task suggestion
     */
    async save(taskSuggestion) {
        const now = new Date().toISOString();
        
        if (taskSuggestion.id) {
            // Update existing suggestion
            return await this.update(taskSuggestion, now);
        } else {
            // Create new suggestion
            return await this.create(taskSuggestion, now);
        }
    }

    /**
     * Create new task suggestion
     * @param {TaskSuggestion} taskSuggestion - Task suggestion to create
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskSuggestion>} Created task suggestion
     */
    async create(taskSuggestion, now) {
        const id = taskSuggestion.id || this.generateId();
        taskSuggestion.id = id;

        const insertSQL = `
            INSERT INTO ${this.tableName} (
                id, title, description, taskType, priority, estimatedTime,
                tags, confidence, reasoning, context, projectPath, metadata,
                status, isApproved, isRejected, appliedAt, appliedBy, aiModel,
                aiResponse, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            taskSuggestion.title,
            taskSuggestion.description,
            taskSuggestion.taskType.value,
            taskSuggestion.priority.value,
            taskSuggestion.estimatedTime || null,
            taskSuggestion.tags ? JSON.stringify(taskSuggestion.tags) : null,
            taskSuggestion.confidence || 0.0,
            taskSuggestion.reasoning || null,
            taskSuggestion.context || null,
            taskSuggestion.projectPath || null,
            taskSuggestion.metadata ? JSON.stringify(taskSuggestion.metadata) : null,
            taskSuggestion.status.value,
            taskSuggestion.isApproved ? 1 : 0,
            taskSuggestion.isRejected ? 1 : 0,
            taskSuggestion.appliedAt ? taskSuggestion.appliedAt.toISOString() : null,
            taskSuggestion.appliedBy || null,
            taskSuggestion.aiModel || null,
            taskSuggestion.aiResponse || null,
            now,
            now
        ];

        await this.database.execute(insertSQL, params);
        return taskSuggestion;
    }

    /**
     * Update existing task suggestion
     * @param {TaskSuggestion} taskSuggestion - Task suggestion to update
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskSuggestion>} Updated task suggestion
     */
    async update(taskSuggestion, now) {
        const updateSQL = `
            UPDATE ${this.tableName} SET
                title = ?,
                description = ?,
                taskType = ?,
                priority = ?,
                estimatedTime = ?,
                tags = ?,
                confidence = ?,
                reasoning = ?,
                context = ?,
                projectPath = ?,
                metadata = ?,
                status = ?,
                isApproved = ?,
                isRejected = ?,
                appliedAt = ?,
                appliedBy = ?,
                aiModel = ?,
                aiResponse = ?,
                updatedAt = ?
            WHERE id = ?
        `;

        const params = [
            taskSuggestion.title,
            taskSuggestion.description,
            taskSuggestion.taskType.value,
            taskSuggestion.priority.value,
            taskSuggestion.estimatedTime || null,
            taskSuggestion.tags ? JSON.stringify(taskSuggestion.tags) : null,
            taskSuggestion.confidence || 0.0,
            taskSuggestion.reasoning || null,
            taskSuggestion.context || null,
            taskSuggestion.projectPath || null,
            taskSuggestion.metadata ? JSON.stringify(taskSuggestion.metadata) : null,
            taskSuggestion.status.value,
            taskSuggestion.isApproved ? 1 : 0,
            taskSuggestion.isRejected ? 1 : 0,
            taskSuggestion.appliedAt ? taskSuggestion.appliedAt.toISOString() : null,
            taskSuggestion.appliedBy || null,
            taskSuggestion.aiModel || null,
            taskSuggestion.aiResponse || null,
            now,
            taskSuggestion.id
        ];

        await this.database.execute(updateSQL, params);
        return taskSuggestion;
    }

    /**
     * Find task suggestion by ID
     * @param {string} id - Task suggestion ID
     * @returns {Promise<TaskSuggestion|null>} Task suggestion or null
     */
    async findById(id) {
        const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const row = await this.database.getOne(selectSQL, [id]);
        
        if (!row) {
            return null;
        }

        return this.mapRowToTaskSuggestion(row);
    }

    /**
     * Find task suggestions by project path
     * @param {string} projectPath - Project path
     * @returns {Promise<Array<TaskSuggestion>>} Task suggestions
     */
    async findByProjectPath(projectPath) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE projectPath = ? 
            ORDER BY createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL, [projectPath]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find task suggestions by status
     * @param {string} status - Suggestion status
     * @returns {Promise<Array<TaskSuggestion>>} Task suggestions
     */
    async findByStatus(status) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE status = ? 
            ORDER BY createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL, [status]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find approved task suggestions
     * @returns {Promise<Array<TaskSuggestion>>} Approved task suggestions
     */
    async findApproved() {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isApproved = 1 
            ORDER BY createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find rejected task suggestions
     * @returns {Promise<Array<TaskSuggestion>>} Rejected task suggestions
     */
    async findRejected() {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isRejected = 1 
            ORDER BY createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find pending task suggestions
     * @returns {Promise<Array<TaskSuggestion>>} Pending task suggestions
     */
    async findPending() {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isApproved = 0 AND isRejected = 0 
            ORDER BY confidence DESC, createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find task suggestions by confidence threshold
     * @param {number} minConfidence - Minimum confidence threshold
     * @returns {Promise<Array<TaskSuggestion>>} Task suggestions
     */
    async findByConfidenceThreshold(minConfidence) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE confidence >= ? 
            ORDER BY confidence DESC, createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL, [minConfidence]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find task suggestions by type
     * @param {string} taskType - Task type
     * @returns {Promise<Array<TaskSuggestion>>} Task suggestions
     */
    async findByType(taskType) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE taskType = ? 
            ORDER BY confidence DESC, createdAt DESC
        `;
        
        const rows = await this.database.query(selectSQL, [taskType]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Find task suggestions by tags
     * @param {Array<string>} tags - Tags to search for
     * @returns {Promise<Array<TaskSuggestion>>} Task suggestions
     */
    async findByTags(tags) {
        if (!tags || tags.length === 0) {
            return [];
        }

        const placeholders = tags.map(() => '?').join(',');
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE (
                ${tags.map(() => `tags LIKE '%' || ? || '%'`).join(' OR ')}
            )
            ORDER BY confidence DESC, createdAt DESC
        `;
        
        const params = [...tags]; // For LIKE conditions
        const rows = await this.database.query(selectSQL, params);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Search task suggestions
     * @param {string} query - Search query
     * @returns {Promise<Array<TaskSuggestion>>} Matching task suggestions
     */
    async search(query) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE (
                title LIKE ? 
                OR description LIKE ? 
                OR reasoning LIKE ?
            )
            ORDER BY confidence DESC, createdAt DESC
        `;
        
        const searchPattern = `%${query}%`;
        const params = [searchPattern, searchPattern, searchPattern];
        
        const rows = await this.database.query(selectSQL, params);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Get all task suggestions
     * @param {Object} options - Query options
     * @returns {Promise<Array<TaskSuggestion>>} All task suggestions
     */
    async findAll(options = {}) {
        let selectSQL = `SELECT * FROM ${this.tableName}`;
        const params = [];

        // Add filters
        const filters = [];
        if (options.status) {
            filters.push('status = ?');
            params.push(options.status);
        }
        if (options.projectPath) {
            filters.push('projectPath = ?');
            params.push(options.projectPath);
        }
        if (options.taskType) {
            filters.push('taskType = ?');
            params.push(options.taskType);
        }
        if (options.minConfidence !== undefined) {
            filters.push('confidence >= ?');
            params.push(options.minConfidence);
        }
        if (options.approvedOnly) {
            filters.push('isApproved = 1');
        }
        if (options.rejectedOnly) {
            filters.push('isRejected = 1');
        }
        if (options.pendingOnly) {
            filters.push('isApproved = 0 AND isRejected = 0');
        }

        if (filters.length > 0) {
            selectSQL += ` WHERE ${filters.join(' AND ')}`;
        }

        // Add ordering
        selectSQL += ` ORDER BY ${options.orderBy || 'confidence DESC, createdAt DESC'}`;

        // Add limit
        if (options.limit) {
            selectSQL += ` LIMIT ?`;
            params.push(options.limit);
        }

        const rows = await this.database.query(selectSQL, params);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Approve task suggestion
     * @param {string} id - Task suggestion ID
     * @param {string} approvedBy - User who approved
     * @returns {Promise<boolean>} Success status
     */
    async approve(id, approvedBy) {
        const updateSQL = `
            UPDATE ${this.tableName} 
            SET isApproved = 1, isRejected = 0, status = 'approved', updatedAt = ? 
            WHERE id = ?
        `;
        const result = await this.database.execute(updateSQL, [new Date().toISOString(), id]);
        return result.changes > 0;
    }

    /**
     * Reject task suggestion
     * @param {string} id - Task suggestion ID
     * @param {string} rejectedBy - User who rejected
     * @returns {Promise<boolean>} Success status
     */
    async reject(id, rejectedBy) {
        const updateSQL = `
            UPDATE ${this.tableName} 
            SET isApproved = 0, isRejected = 1, status = 'rejected', updatedAt = ? 
            WHERE id = ?
        `;
        const result = await this.database.execute(updateSQL, [new Date().toISOString(), id]);
        return result.changes > 0;
    }

    /**
     * Apply task suggestion
     * @param {string} id - Task suggestion ID
     * @param {string} appliedBy - User who applied
     * @returns {Promise<boolean>} Success status
     */
    async apply(id, appliedBy) {
        const updateSQL = `
            UPDATE ${this.tableName} 
            SET appliedAt = ?, appliedBy = ?, status = 'applied', updatedAt = ? 
            WHERE id = ?
        `;
        const result = await this.database.execute(updateSQL, [
            new Date().toISOString(),
            appliedBy,
            new Date().toISOString(),
            id
        ]);
        return result.changes > 0;
    }

    /**
     * Delete task suggestion by ID
     * @param {string} id - Task suggestion ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteById(id) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.database.execute(deleteSQL, [id]);
        return result.changes > 0;
    }

    /**
     * Count task suggestions
     * @param {Object} options - Count options
     * @returns {Promise<number>} Count of suggestions
     */
    async count(options = {}) {
        let countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];

        // Add filters
        const filters = [];
        if (options.status) {
            filters.push('status = ?');
            params.push(options.status);
        }
        if (options.projectPath) {
            filters.push('projectPath = ?');
            params.push(options.projectPath);
        }
        if (options.taskType) {
            filters.push('taskType = ?');
            params.push(options.taskType);
        }
        if (options.minConfidence !== undefined) {
            filters.push('confidence >= ?');
            params.push(options.minConfidence);
        }

        if (filters.length > 0) {
            countSQL += ` WHERE ${filters.join(' AND ')}`;
        }

        const result = await this.database.getOne(countSQL, params);
        return result.count;
    }

    /**
     * Get suggestion statistics
     * @returns {Promise<Object>} Suggestion statistics
     */
    async getSuggestionStatistics() {
        const statsSQL = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN isApproved = 1 THEN 1 END) as approved,
                COUNT(CASE WHEN isRejected = 1 THEN 1 END) as rejected,
                COUNT(CASE WHEN isApproved = 0 AND isRejected = 0 THEN 1 END) as pending,
                COUNT(CASE WHEN appliedAt IS NOT NULL THEN 1 END) as applied,
                AVG(confidence) as averageConfidence,
                MIN(confidence) as minConfidence,
                MAX(confidence) as maxConfidence
            FROM ${this.tableName}
        `;

        const result = await this.database.getOne(statsSQL);
        
        // Get type distribution
        const typeSQL = `
            SELECT taskType, COUNT(*) as count 
            FROM ${this.tableName} 
            GROUP BY taskType
        `;
        
        const typeRows = await this.database.query(typeSQL);
        const typeDistribution = {};
        typeRows.forEach(row => {
            typeDistribution[row.taskType] = row.count;
        });

        // Get confidence distribution
        const confidenceSQL = `
            SELECT 
                CASE 
                    WHEN confidence >= 0.9 THEN 'high'
                    WHEN confidence >= 0.7 THEN 'medium'
                    ELSE 'low'
                END as confidence_level,
                COUNT(*) as count
            FROM ${this.tableName} 
            GROUP BY confidence_level
        `;
        
        const confidenceRows = await this.database.query(confidenceSQL);
        const confidenceDistribution = {};
        confidenceRows.forEach(row => {
            confidenceDistribution[row.confidence_level] = row.count;
        });

        return {
            total: result.total,
            approved: result.approved,
            rejected: result.rejected,
            pending: result.pending,
            applied: result.applied,
            approvalRate: result.total > 0 ? result.approved / result.total : 0,
            averageConfidence: result.averageConfidence || 0,
            minConfidence: result.minConfidence || 0,
            maxConfidence: result.maxConfidence || 0,
            typeDistribution,
            confidenceDistribution
        };
    }

    /**
     * Get recent suggestions
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskSuggestion>>} Recent suggestions
     */
    async getRecentSuggestions(limit = 20) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            ORDER BY createdAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.query(selectSQL, [limit]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Get high confidence suggestions
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskSuggestion>>} High confidence suggestions
     */
    async getHighConfidenceSuggestions(limit = 10) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE confidence >= 0.8 
            ORDER BY confidence DESC, createdAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.query(selectSQL, [limit]);
        return rows.map(row => this.mapRowToTaskSuggestion(row));
    }

    /**
     * Map database row to TaskSuggestion entity
     * @param {Object} row - Database row
     * @returns {TaskSuggestion} TaskSuggestion entity
     */
    mapRowToTaskSuggestion(row) {
        return new TaskSuggestion({
            id: row.id,
            title: row.title,
            description: row.description,
            taskType: TaskType.fromValue(row.taskType),
            priority: TaskPriority.fromValue(row.priority),
            estimatedTime: row.estimatedTime,
            tags: row.tags ? JSON.parse(row.tags) : [],
            confidence: row.confidence,
            reasoning: row.reasoning,
            context: row.context,
            projectPath: row.projectPath,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            status: row.status,
            isApproved: Boolean(row.isApproved),
            isRejected: Boolean(row.isRejected),
            appliedAt: row.appliedAt ? new Date(row.appliedAt) : null,
            appliedBy: row.appliedBy,
            aiModel: row.aiModel,
            aiResponse: row.aiResponse,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old suggestions
     * @param {number} daysToKeep - Number of days to keep
     * @returns {Promise<number>} Number of deleted suggestions
     */
    async cleanupOldSuggestions(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const deleteSQL = `
            DELETE FROM ${this.tableName} 
            WHERE createdAt < ? 
            AND isApproved = 0 
            AND isRejected = 0
        `;

        const result = await this.database.execute(deleteSQL, [cutoffDate.toISOString()]);
        return result.changes;
    }

    /**
     * Get database size information
     * @returns {Promise<Object>} Database size information
     */
    async getDatabaseInfo() {
        const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const pendingSQL = `SELECT COUNT(*) as pending FROM ${this.tableName} WHERE isApproved = 0 AND isRejected = 0`;
        
        const countResult = await this.database.getOne(countSQL);
        const pendingResult = await this.database.getOne(pendingSQL);
        
        return {
            totalSuggestions: countResult.count,
            pendingSuggestions: pendingResult.pending,
            tableName: this.tableName
        };
    }
}

module.exports = SQLiteTaskSuggestionRepository; 